// Role-based permissions configuration

export type Role = 'SuperAdmin' | 'admin' | 'user' | 'client';

export const PERMISSIONS: Record<Role, string[]> = {
  SuperAdmin: ['*'], // Platform owner - all access
  admin: [
    'users:read', 'users:write', 'users:delete',
    'properties:read', 'properties:write', 'properties:delete',
    'clients:read', 'clients:write', 'clients:delete',
    'billing:read', 'billing:write',
    'portals:read', 'portals:write',
    'ai:use',
  ],
  user: [
    'properties:read', 'properties:write', // Own only (enforced at query level)
    'clients:read', // Own leads only (future)
    'ai:use',
    'portals:read',
  ],
  client: [
    'properties:read', // Read-only access to their tenant's properties
  ],
};

export function hasPermission(role: string, permission: string): boolean {
  const perms = PERMISSIONS[role as Role];
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}
