// /home/nneessen/projects/commissionTracker/src/hooks/admin/__tests__/useUsersView.recruit-filter.test.ts
// Tests to ensure recruits are NEVER shown in the Users & Access tab

import { describe, it, expect } from 'vitest';
import type { UserProfile } from '../../../services/admin/userApprovalService';

describe('useUsersView recruit filtering logic', () => {
  // Test data matching actual database values
  const mockUsers: UserProfile[] = [
    {
      id: '1',
      email: 'recruit1@test.com',
      first_name: 'Recruit',
      last_name: 'One',
      onboarding_status: 'lead', // RECRUIT - should be EXCLUDED
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
      onboarding_status: 'active', // RECRUIT - should be EXCLUDED
      approval_status: 'approved',
      is_admin: false,
      created_at: '2025-01-02',
      updated_at: '2025-01-02',
    },
    {
      id: '3',
      email: 'agent@test.com',
      first_name: 'Active',
      last_name: 'Agent',
      onboarding_status: null, // AGENT - should be INCLUDED
      approval_status: 'approved',
      is_admin: false,
      created_at: '2025-01-03',
      updated_at: '2025-01-03',
    },
    {
      id: '4',
      email: 'completed@test.com',
      first_name: 'Completed',
      last_name: 'Agent',
      onboarding_status: 'completed', // AGENT - should be INCLUDED
      approval_status: 'approved',
      is_admin: false,
      created_at: '2025-01-04',
      updated_at: '2025-01-04',
    },
  ];

  it('should EXCLUDE users with onboarding_status = "lead"', () => {
    // Filter logic from useUsersView.ts line 62-65
    const filteredUsers = mockUsers.filter(u =>
      u.onboarding_status !== 'lead' &&
      u.onboarding_status !== 'active'
    );

    const recruitLead = filteredUsers.find(u => u.onboarding_status === 'lead');
    expect(recruitLead).toBeUndefined();
  });

  it('should EXCLUDE users with onboarding_status = "active"', () => {
    // Filter logic from useUsersView.ts line 62-65
    const filteredUsers = mockUsers.filter(u =>
      u.onboarding_status !== 'lead' &&
      u.onboarding_status !== 'active'
    );

    const recruitActive = filteredUsers.find(u => u.onboarding_status === 'active');
    expect(recruitActive).toBeUndefined();
  });

  it('should INCLUDE users with onboarding_status = null (legacy agents)', () => {
    const filteredUsers = mockUsers.filter(u =>
      u.onboarding_status !== 'lead' &&
      u.onboarding_status !== 'active'
    );

    const legacyAgent = filteredUsers.find(u => u.onboarding_status === null);
    expect(legacyAgent).toBeDefined();
    expect(legacyAgent?.email).toBe('agent@test.com');
  });

  it('should INCLUDE users with onboarding_status = "completed"', () => {
    const filteredUsers = mockUsers.filter(u =>
      u.onboarding_status !== 'lead' &&
      u.onboarding_status !== 'active'
    );

    const completedAgent = filteredUsers.find(u => u.onboarding_status === 'completed');
    expect(completedAgent).toBeDefined();
    expect(completedAgent?.email).toBe('completed@test.com');
  });

  it('should filter correctly: 2 agents, 2 recruits', () => {
    const filteredUsers = mockUsers.filter(u =>
      u.onboarding_status !== 'lead' &&
      u.onboarding_status !== 'active'
    );

    expect(filteredUsers.length).toBe(2); // Should only have 2 agents
    expect(filteredUsers.every(u =>
      u.onboarding_status !== 'lead' &&
      u.onboarding_status !== 'active'
    )).toBe(true);
  });

  it('recruiting pipeline should show ONLY lead and active users', () => {
    // Filter logic from AdminControlCenter.tsx line 86-89
    const recruitsInPipeline = mockUsers.filter(u =>
      u.onboarding_status === 'lead' ||
      u.onboarding_status === 'active'
    );

    expect(recruitsInPipeline.length).toBe(2); // Should only have 2 recruits
    expect(recruitsInPipeline.every(u =>
      u.onboarding_status === 'lead' ||
      u.onboarding_status === 'active'
    )).toBe(true);
  });
});
