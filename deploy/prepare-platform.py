#!/usr/bin/env python3
"""Provision only the dedicated JP database/logins; keep credentials off stdout/argv.
Run on the Docker host. Existing unmarked databases and mismatched logins are refused.
"""
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys

MARKER = 'JPPerformance.Website.v1'

def private_write(path, content):
    # Atomic replace; never follow an existing target symlink.
    if path.is_symlink():
        raise RuntimeError('Refusing a symlink for a private configuration file.')
    temporary = path.with_name(path.name + '.tmp-' + secrets.token_hex(6))
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, 'w') as stream:
            stream.write(content)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)

def hex_password(value):
    return '0x' + value.encode('utf-16-le').hex()

def provision_sql(config):
    lines = ["USE [master];", "SET NOCOUNT ON;", "SET XACT_ABORT ON;", "GO",
        "IF DB_ID(N'JPPerformance') IS NOT NULL BEGIN",
        "    DECLARE @owned bit = 0;",
        "    EXEC sys.sp_executesql N'SELECT @result = 1 FROM [JPPerformance].sys.extended_properties WHERE class = 0 AND name = N''JPPerformance.ProvisionedBy'' AND CONVERT(nvarchar(128), value) = N''" + MARKER + "''', N'@result bit OUTPUT', @result=@owned OUTPUT;",
        "    IF @owned <> 1 THROW 51000, 'JPPerformance already exists without the deployment marker. No existing database was changed.', 1;",
        "END;", "GO"]
    # Validate both existing logins before creating/changing the database.
    for login, key in [('jpperformance_app', 'runtime_password'), ('jpperformance_migrate', 'migration_password')]:
        lines += [f"DECLARE @password nvarchar(128) = CONVERT(nvarchar(128), {hex_password(config[key])});",
            f"IF EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'{login}') AND NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = N'{login}' AND PWDCOMPARE(@password, password_hash) = 1)",
            f"    THROW 51001, 'Existing {login} login does not match the saved deployment credential. No password was reset.', 1;", "GO"]
    # CREATE DATABASE must be its own batch and outside user transactions.
    lines += ["IF DB_ID(N'JPPerformance') IS NULL EXEC(N'CREATE DATABASE [JPPerformance]');", "GO",
        "USE [JPPerformance];", "GO",
        "IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE class = 0 AND name = N'JPPerformance.ProvisionedBy')",
        "    EXEC sys.sp_addextendedproperty @name=N'JPPerformance.ProvisionedBy', @value=N'" + MARKER + "';", "GO", "USE [master];", "GO"]
    for login, key in [('jpperformance_app', 'runtime_password'), ('jpperformance_migrate', 'migration_password')]:
        lines += [f"DECLARE @password nvarchar(128) = CONVERT(nvarchar(128), {hex_password(config[key])});",
            f"IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'{login}') BEGIN",
            f"    DECLARE @statement nvarchar(max) = N'CREATE LOGIN [{login}] WITH PASSWORD = ' + QUOTENAME(@password, '''') + N', CHECK_POLICY=ON, CHECK_EXPIRATION=OFF, DEFAULT_DATABASE=[JPPerformance]';",
            "    EXEC sys.sp_executesql @statement;", "END;", "GO"]
    lines += ["USE [JPPerformance];", "GO"]
    for login in ['jpperformance_app', 'jpperformance_migrate']:
        lines += [f"IF USER_ID(N'{login}') IS NULL CREATE USER [{login}] FOR LOGIN [{login}];", "GO"]
    for role, login in [('db_datareader', 'jpperformance_app'), ('db_datawriter', 'jpperformance_app'), ('db_owner', 'jpperformance_migrate')]:
        lines += [f"IF IS_ROLEMEMBER(N'{role}', N'{login}') <> 1 ALTER ROLE [{role}] ADD MEMBER [{login}];", "GO"]
    lines += ["GRANT EXECUTE TO [jpperformance_app];", "GO", "PRINT 'Dedicated JPPerformance database and accounts are ready.';"]
    return '\n'.join(lines) + '\n'

def environment(config, network, trust):
    def connection(login, key):
        return f"Server=kpdc-sql-1,1433;Database=JPPerformance;User Id={login};Password={config[key]};Encrypt=True;TrustServerCertificate={'True' if trust else 'False'};Max Pool Size=50;Connect Timeout=15"
    return ("# Managed by deploy/prepare-platform.py. Private; never commit or share.\n"
        f"JP_SQL_NETWORK={network}\n"
        f"JP_DATABASE_CONNECTION='{connection('jpperformance_app', 'runtime_password')}'\n"
        f"JP_MIGRATION_CONNECTION='{connection('jpperformance_migrate', 'migration_password')}'\n")

def prepare(root, args, run=subprocess.run):
    env_path = root / '.env.platform'
    if env_path.exists() or env_path.is_symlink():
        raise RuntimeError('.env.platform already exists. It was not overwritten. Review the existing setup before provisioning.')
    inspection = run(['docker', 'inspect', args.sql_container, '--format', '{{json .NetworkSettings.Networks}}'], capture_output=True, text=True, timeout=20)
    if inspection.returncode != 0:
        raise RuntimeError('SQL container was not found. Check its name and Docker access.')
    networks = json.loads(inspection.stdout)
    if args.network not in networks:
        raise RuntimeError('SQL container is not attached to the requested private network.')
    if args.sql_container != 'kpdc-sql-1':
        raise RuntimeError('This host configuration expects kpdc-sql-1. Review server naming before using a different container.')
    directory = root / '.secrets'
    if directory.is_symlink():
        raise RuntimeError('Refusing a symlink for the secrets directory.')
    directory.mkdir(mode=0o700, exist_ok=True)
    directory.chmod(0o700)
    secret_path = directory / 'platform-sql.json'
    if secret_path.is_symlink():
        raise RuntimeError('Refusing a symlink for the saved credentials.')
    if secret_path.exists():
        config = json.loads(secret_path.read_text())
        secret_path.chmod(0o600)
        # Saved values are deliberately limited to safe connection-string characters.
        import re
        if any(not re.fullmatch(r'JP![a-f0-9]{64}', config.get(key, '')) for key in ('runtime_password', 'migration_password')):
            raise RuntimeError('Saved SQL credential format is invalid. No database changes were attempted.')
    else:
        config = {'runtime_password': 'JP!' + secrets.token_hex(32), 'migration_password': 'JP!' + secrets.token_hex(32)}
        private_write(secret_path, json.dumps(config))
    # SA is read only inside its current container; it is never copied to a host file.
    shell = r'''set -eu
SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-${SA_PASSWORD:-}}"
if [ -z "$SQLCMDPASSWORD" ]; then echo 'No SA credential in SQL container environment.' >&2; exit 20; fi
export SQLCMDPASSWORD
if [ -x /opt/mssql-tools18/bin/sqlcmd ]; then tool=/opt/mssql-tools18/bin/sqlcmd; else tool=/opt/mssql-tools/bin/sqlcmd; fi
exec "$tool" -S tcp:localhost,1433 -U sa -C -b -r 1 -l 15
'''
    result = run(['docker', 'exec', '-i', args.sql_container, '/bin/sh', '-c', shell], input=provision_sql(config), capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        # Prevent SQL errors from accidentally echoing generated secret literals.
        message = (result.stdout + result.stderr)[-6000:]
        for password in config.values():
            message = message.replace(password, '[redacted]').replace(hex_password(password), '[redacted]')
        raise RuntimeError('SQL setup failed. Saved JP credentials are retained for retry; existing passwords were not reset.\n' + message)
    private_write(env_path, environment(config, args.network, args.trust_local_sql_certificate))
    return config

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sql-container', default='kpdc-sql-1')
    parser.add_argument('--network', default='kpdc_database')
    parser.add_argument('--trust-local-sql-certificate', action='store_true', help='Use encrypted SQL on this host private Docker network without validating its self-signed server certificate. HTTPS for the website is unaffected.')
    args = parser.parse_args()
    try:
        prepare(Path(__file__).resolve().parent.parent, args)
    except (RuntimeError, OSError, ValueError, subprocess.TimeoutExpired) as error:
        print(str(error), file=sys.stderr)
        return 1
    print('JP database and separate runtime/migration accounts prepared. Secrets saved locally with mode 600; no passwords printed.')
    print('SQL TLS: encrypted; ' + ('local server certificate validation bypassed by explicit option.' if args.trust_local_sql_certificate else 'server certificate validation required.'))
    print('Next: bash deploy/deploy-platform.sh')
    return 0

if __name__ == '__main__':
    sys.exit(main())
