export function permissions(user) {
  const roles = new Set(user?.roles || []);
  return {
    coach: roles.has('Coach'),
    supervisor: roles.has('Supervisor'),
    admin: roles.has('Admin'),
    team: roles.has('Supervisor') || roles.has('Admin'),
    label: roles.has('Admin') ? 'System administrator' : roles.has('Supervisor') ? 'Coach supervisor' : roles.has('Coach') ? 'Coach' : 'Athlete',
    home: roles.has('Admin') ? 'admin' : roles.has('Supervisor') ? 'team' : roles.has('Coach') ? 'coach' : 'athlete'
  };
}
