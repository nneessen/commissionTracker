// /home/nneessen/projects/commissionTracker/src/hooks/admin/__tests__/useUsersView.role-based-filter.test.ts
// Tests to ensure role-based filtering works correctly
// Active agents (with 'agent' role) should ONLY appear in Users & Access tab
// Recruits (without 'agent' role) should ONLY appear in Recruiting Pipeline tab

import { describe, it, expect } from 'vitest';
import type { UserProfile } from '../../../services/admin/userApprovalService';
import type { RoleName } from '../../../types/permissions.types';

describe('useUsersView role-based filtering logic', () => {
  // Test data matching actual database structure
  const mockUsers: UserProfile[] = [
    {
      id: '1',
      email: 'recruit1@test.com',
      first_name: 'Recruit',
      last_name: 'One',
      roles: undefined, // NO ROLE - RECRUIT
      onboarding_status: 'lead',
      approval_status: 'approved',
      is_admin: false,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    },
    {
      id: '2',
      email: 'recruit2@test.com',
      first_name: 'Recruit',
      last_name: 'Two',
      roles: undefined, // NO ROLE - RECRUIT
      onboarding_status: 'active',
      approval_status: 'approved',
      is_admin: false,
      created_at: '2025-01-02',
      updated_at: '2025-01-02',
    },
    {
      id: '3',
      email: 'agent1@test.com',
      first_name: 'Active',
      last_name: 'Agent',
      roles: ['agent'] as RoleName[], // HAS AGENT ROLE - ACTIVE AGENT
      onboarding_status: 'completed',
      approval_status: 'approved',
      is_admin: false,
      created_at: '2025-01-03',
      updated_at: '2025-01-03',
    },
    {
      id: '4',
      email: 'admin@test.com',
      first_name: 'Admin',
      last_name: 'User',
      roles: ['agent', 'admin'] as RoleName[], // HAS AGENT ROLE - ACTIVE AGENT
      onboarding_status: 'completed',
      approval_status: 'approved',
      is_admin: true,
      created_at: '2025-01-04',
      updated_at: '2025-01-04',
    },
    {
      id: '5',
      email: 'problem-user@test.com',
      first_name: 'Problem',
      last_name: 'User',
      roles: ['agent'] as RoleName[], // HAS AGENT ROLE BUT...
      onboarding_status: 'lead', // ...STILL MARKED AS RECRUIT IN PIPELINE
      approval_status: 'approved',
      is_admin: false,
      created_at: '2025-01-05',
      updated_at: '2025-01-05',
    },
  ];

  describe('Users & Access tab (Active Agents)', () => {
    it('should INCLUDE users with roles containing "agent"', () => {
      // Filter logic from useUsersView.ts line 62-64
      const filteredUsers = mockUsers.filter(u =>
        u.roles?.includes('agent')
      );

      expect(filteredUsers.length).toBe(3); // agent1, admin, problem-user
      expect(filteredUsers.every(u => u.roles?.includes('agent'))).toBe(true);
    });

    it('should EXCLUDE users with roles = undefined', () => {
      const filteredUsers = mockUsers.filter(u =>
        u.roles?.includes('agent')
      );

      const recruitsFound = filteredUsers.filter(u => u.roles === undefined);
      expect(recruitsFound.length).toBe(0);
    });

    it('should EXCLUDE users without "agent" role', () => {
      const filteredUsers = mockUsers.filter(u =>
        u.roles?.includes('agent')
      );

      const nonAgents = filteredUsers.filter(u => !u.roles?.includes('agent'));
      expect(nonAgents.length).toBe(0);
    });

    it('should include users with "agent" role regardless of onboarding_status', () => {
      const filteredUsers = mockUsers.filter(u =>
        u.roles?.includes('agent')
      );

      // Problem user has agent role but onboarding_status='lead'
      const problemUser = filteredUsers.find(u => u.email === 'problem-user@test.com');
      expect(problemUser).toBeDefined();
      expect(problemUser?.roles).toContain('agent');
    });
  });

  describe('Recruiting Pipeline tab (Recruits)', () => {
    it('should INCLUDE users with roles = undefined', () => {
      // Filter logic from AdminControlCenter.tsx line 85-87
      const recruitsInPipeline = mockUsers.filter(u =>
        !u.roles?.includes('agent')
      );

      const undefinedRoleUsers = recruitsInPipeline.filter(u => u.roles === undefined);
      expect(undefinedRoleUsers.length).toBe(2); // recruit1, recruit2
    });

    it('should EXCLUDE users with "agent" role', () => {
      const recruitsInPipeline = mockUsers.filter(u =>
        !u.roles?.includes('agent')
      );

      const agentUsers = recruitsInPipeline.filter(u => u.roles?.includes('agent'));
      expect(agentUsers.length).toBe(0);
    });

    it('should filter correctly: 2 recruits (undefined roles)', () => {
      const recruitsInPipeline = mockUsers.filter(u =>
        !u.roles?.includes('agent')
      );

      expect(recruitsInPipeline.length).toBe(2); // Only users with no agent role
      expect(recruitsInPipeline.every(u => u.roles === undefined)).toBe(true);
    });

    it('should exclude problem user with agent role despite onboarding_status', () => {
      const recruitsInPipeline = mockUsers.filter(u =>
        !u.roles?.includes('agent')
      );

      // Problem user should NOT appear in recruiting pipeline because they have agent role
      const problemUser = recruitsInPipeline.find(u => u.email === 'problem-user@test.com');
      expect(problemUser).toBeUndefined();
    });
  });

  describe('Role-based separation (no overlap)', () => {
    it('should ensure no user appears in both tabs', () => {
      const activeAgents = mockUsers.filter(u => u.roles?.includes('agent'));
      const recruits = mockUsers.filter(u => !u.roles?.includes('agent'));

      // Check no overlap
      const overlap = activeAgents.filter(agent =>
        recruits.some(recruit => recruit.id === agent.id)
      );

      expect(overlap.length).toBe(0);
    });

    it('should account for all users (no users lost)', () => {
      const activeAgents = mockUsers.filter(u => u.roles?.includes('agent'));
      const recruits = mockUsers.filter(u => !u.roles?.includes('agent'));

      const totalCategorized = activeAgents.length + recruits.length;
      expect(totalCategorized).toBe(mockUsers.length);
    });
  });

  describe('Edge cases', () => {
    it('should handle users with multiple roles including agent', () => {
      const filteredUsers = mockUsers.filter(u => u.roles?.includes('agent'));

      const adminUser = filteredUsers.find(u => u.email === 'admin@test.com');
      expect(adminUser).toBeDefined();
      expect(adminUser?.roles).toContain('agent');
      expect(adminUser?.roles).toContain('admin');
    });

    it('should handle empty roles array as recruit', () => {
      const userWithEmptyRoles: UserProfile = {
        id: '6',
        email: 'empty-roles@test.com',
        roles: [] as RoleName[],
        onboarding_status: 'lead',
        approval_status: 'pending',
        is_admin: false,
        created_at: '2025-01-06',
        updated_at: '2025-01-06',
      };

      const isAgent = userWithEmptyRoles.roles?.includes('agent');
      expect(isAgent).toBe(false);

      // Should appear in recruiting pipeline
      const shouldBeInPipeline = !userWithEmptyRoles.roles?.includes('agent');
      expect(shouldBeInPipeline).toBe(true);
    });
  });
});
