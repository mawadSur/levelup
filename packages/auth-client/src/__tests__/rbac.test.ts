/**
 * @levelup/auth-client — RBAC unit tests
 *
 * Tests hasRole and assertRole against the three tiers:
 *   EMPLOYEE (0) < MANAGER (1) < ADMIN (2)
 *
 * Run: pnpm --filter @levelup/auth-client test
 */

process.env['SUPABASE_URL'] = 'PLACEHOLDER_supabase_url';
process.env['SUPABASE_ANON_KEY'] = 'PLACEHOLDER_supabase_anon';
process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'PLACEHOLDER_supabase_service_role';
process.env['COOKIE_DOMAIN'] = 'localhost';
process.env['NODE_ENV'] = 'test';

import { describe, it, expect } from 'vitest';
import { hasRole, assertRole, RolePriority } from '../rbac.js';
import type { Role } from '../rbac.js';

// ============================================================================
// RolePriority
// ============================================================================

describe('RolePriority', () => {
  it('EMPLOYEE has priority 0', () => {
    expect(RolePriority['EMPLOYEE']).toBe(0);
  });

  it('MANAGER has priority 1', () => {
    expect(RolePriority['MANAGER']).toBe(1);
  });

  it('ADMIN has priority 2', () => {
    expect(RolePriority['ADMIN']).toBe(2);
  });
});

// ============================================================================
// hasRole
// ============================================================================

describe('hasRole', () => {
  // exact matches
  it('hasRole(ADMIN, ADMIN) === true', () => {
    expect(hasRole('ADMIN', 'ADMIN')).toBe(true);
  });

  it('hasRole(MANAGER, MANAGER) === true', () => {
    expect(hasRole('MANAGER', 'MANAGER')).toBe(true);
  });

  it('hasRole(EMPLOYEE, EMPLOYEE) === true', () => {
    expect(hasRole('EMPLOYEE', 'EMPLOYEE')).toBe(true);
  });

  // higher than required
  it('hasRole(ADMIN, MANAGER) === true', () => {
    expect(hasRole('ADMIN', 'MANAGER')).toBe(true);
  });

  it('hasRole(ADMIN, EMPLOYEE) === true', () => {
    expect(hasRole('ADMIN', 'EMPLOYEE')).toBe(true);
  });

  it('hasRole(MANAGER, EMPLOYEE) === true', () => {
    expect(hasRole('MANAGER', 'EMPLOYEE')).toBe(true);
  });

  // lower than required
  it('hasRole(EMPLOYEE, MANAGER) === false', () => {
    expect(hasRole('EMPLOYEE', 'MANAGER')).toBe(false);
  });

  it('hasRole(EMPLOYEE, ADMIN) === false', () => {
    expect(hasRole('EMPLOYEE', 'ADMIN')).toBe(false);
  });

  it('hasRole(MANAGER, ADMIN) === false', () => {
    expect(hasRole('MANAGER', 'ADMIN')).toBe(false);
  });
});

// ============================================================================
// assertRole
// ============================================================================

describe('assertRole', () => {
  it('does not throw when role is sufficient', () => {
    expect(() => assertRole('ADMIN', 'MANAGER')).not.toThrow();
    expect(() => assertRole('ADMIN', 'ADMIN')).not.toThrow();
    expect(() => assertRole('MANAGER', 'EMPLOYEE')).not.toThrow();
  });

  it('throws when role is insufficient (EMPLOYEE < MANAGER)', () => {
    expect(() => assertRole('EMPLOYEE', 'MANAGER')).toThrow();
  });

  it('throws when role is insufficient (MANAGER < ADMIN)', () => {
    expect(() => assertRole('MANAGER', 'ADMIN')).toThrow();
  });

  it('throws when role is insufficient (EMPLOYEE < ADMIN)', () => {
    expect(() => assertRole('EMPLOYEE', 'ADMIN')).toThrow();
  });

  it('error message mentions the actual and required roles', () => {
    let errorMessage = '';
    try {
      assertRole('EMPLOYEE', 'MANAGER');
    } catch (err: unknown) {
      if (err instanceof Error) errorMessage = err.message;
    }
    expect(errorMessage).toContain('EMPLOYEE');
    expect(errorMessage).toContain('MANAGER');
  });
});
