// Role type is mirrored here to avoid pulling in the full @levelup/db package
// at runtime in environments (e.g. the browser-side session helper) that don't
// have Prisma available. The string values match the Prisma-generated enum exactly.
export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export const RolePriority: Record<Role, number> = {
  EMPLOYEE: 0,
  MANAGER: 1,
  ADMIN: 2,
};

export function hasRole(actual: Role, required: Role): boolean {
  return RolePriority[actual] >= RolePriority[required];
}

export function assertRole(actual: Role, required: Role): void {
  if (!hasRole(actual, required)) {
    throw new Error(
      `[auth-client] Insufficient role: user has "${actual}" but "${required}" is required.`,
    );
  }
}
