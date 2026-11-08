import argparse
import importlib.util
import json
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('provision', Path(__file__).parents[1] / 'deploy/prepare-platform.py')
provision = importlib.util.module_from_spec(spec)
spec.loader.exec_module(provision)

class ProvisionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.args = argparse.Namespace(sql_container='kpdc-sql-1', network='kpdc_database', trust_local_sql_certificate=False)
        self.calls = []
    def tearDown(self):
        self.temporary.cleanup()
    def runner(self, command, **options):
        self.calls.append((command, options))
        if command[1] == 'inspect':
            return subprocess.CompletedProcess(command, 0, json.dumps({'kpdc_database': {}}), '')
        return subprocess.CompletedProcess(command, 0, 'success', '')
    def test_private_files_and_separate_accounts(self):
        config = provision.prepare(self.root, self.args, self.runner)
        self.assertNotEqual(config['runtime_password'], config['migration_password'])
        self.assertEqual(stat.S_IMODE((self.root / '.env.platform').stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE((self.root / '.secrets').stat().st_mode), 0o700)
        self.assertEqual(stat.S_IMODE((self.root / '.secrets/platform-sql.json').stat().st_mode), 0o600)
        commands = str([c for c, _ in self.calls])
        for value in config.values():
            self.assertNotIn(value, commands)
        self.assertIn('TrustServerCertificate=False', (self.root / '.env.platform').read_text())
        self.assertIn('JP_MIGRATION_CONNECTION=', (self.root / '.env.platform').read_text())
    def test_existing_environment_never_overwritten(self):
        (self.root / '.env.platform').write_text('existing-private-setup')
        with self.assertRaisesRegex(RuntimeError, 'already exists'):
            provision.prepare(self.root, self.args, self.runner)
        self.assertEqual((self.root / '.env.platform').read_text(), 'existing-private-setup')
        self.assertEqual(len(self.calls), 0)
    def test_wrong_network_stops_before_sql(self):
        self.args.network = 'wrong-network'
        with self.assertRaisesRegex(RuntimeError, 'private network'):
            provision.prepare(self.root, self.args, self.runner)
        self.assertEqual(len(self.calls), 1)
        self.assertFalse((self.root / '.secrets').exists())
    def test_failed_sql_retains_credentials_for_retry_and_redacts_output(self):
        def failed(command, **options):
            if command[1] == 'inspect':
                return self.runner(command, **options)
            saved = json.loads((self.root / '.secrets/platform-sql.json').read_text())
            text = saved['runtime_password'] + provision.hex_password(saved['migration_password'])
            return subprocess.CompletedProcess(command, 1, text, 'SQL failed')
        with self.assertRaises(RuntimeError) as error:
            provision.prepare(self.root, self.args, failed)
        before = (self.root / '.secrets/platform-sql.json').read_bytes()
        for password in json.loads(before).values():
            self.assertNotIn(password, str(error.exception))
            self.assertNotIn(provision.hex_password(password), str(error.exception))
        self.assertFalse((self.root / '.env.platform').exists())
        provision.prepare(self.root, self.args, self.runner)
        self.assertEqual(before, (self.root / '.secrets/platform-sql.json').read_bytes())
    def test_explicit_local_certificate_option(self):
        self.args.trust_local_sql_certificate = True
        provision.prepare(self.root, self.args, self.runner)
        self.assertIn('Encrypt=True;TrustServerCertificate=True', (self.root / '.env.platform').read_text())
    def test_symlink_target_refused(self):
        victim = self.root / 'other-file'
        victim.write_text('preserve')
        (self.root / '.env.platform').symlink_to(victim)
        with self.assertRaises(RuntimeError):
            provision.prepare(self.root, self.args, self.runner)
        self.assertEqual(victim.read_text(), 'preserve')
    def test_sa_stays_inside_container_and_shell_is_valid(self):
        provision.prepare(self.root, self.args, self.runner)
        command, _ = self.calls[-1]
        shell = command[-1]
        self.assertIn('MSSQL_SA_PASSWORD', shell)
        self.assertNotIn(' -P ', shell)
        subprocess.run(['/bin/sh', '-n', '-c', shell], check=True)

if __name__ == '__main__':
    unittest.main()
