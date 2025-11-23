// src/services/hierarchy/__tests__/hierarchyService.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hierarchyService } from '../hierarchyService';
import { supabase } from '../../base/supabase';
import type { UserProfile } from '../../../types/hierarchy.types';

// Mock Supabase
vi.mock('../../base/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('HierarchyService', () => {
  const mockUser = { id: 'user-1', email: 'user@example.com' };
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockLike = vi.fn();
  const mockOrder = vi.fn();
  const mockIn = vi.fn();
  const mockUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockSingle.mockReturnThis();
    mockLike.mockReturnThis();
    mockOrder.mockReturnThis();
    mockIn.mockReturnThis();
    mockUpdate.mockReturnThis();

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      like: mockLike,
      order: mockOrder,
      in: mockIn,
      update: mockUpdate,
    } as any);
  });

  describe('getMyHierarchyTree', () => {
    it('should fetch hierarchy tree for current user', async () => {
      const mockProfile: UserProfile = {
        id: 'user-1',
        email: 'user@example.com',
        upline_id: null,
        hierarchy_path: 'user-1',
        hierarchy_depth: 0,
        approval_status: 'approved',
        is_admin: false,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
      };

      const mockDownlines: UserProfile[] = [
        {
          id: 'downline-1',
          email: 'downline@example.com',
          upline_id: 'user-1',
          hierarchy_path: 'user-1.downline-1',
          hierarchy_depth: 1,
          approval_status: 'approved',
          is_admin: false,
          created_at: new Date('2025-01-01'),
          updated_at: new Date('2025-01-01'),
        },
      ];

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);

      // Mock profile fetch
      mockSingle.mockResolvedValueOnce({ data: mockProfile, error: null });

      // Mock downlines fetch
      mockOrder.mockResolvedValueOnce({ data: mockDownlines, error: null });

      const result = await hierarchyService.getMyHierarchyTree();

      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user-1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('downline-1');
    });

    it('should handle user with no downlines', async () => {
      const mockProfile: UserProfile = {
        id: 'user-1',
        email: 'user@example.com',
        upline_id: null,
        hierarchy_path: 'user-1',
        hierarchy_depth: 0,
        approval_status: 'approved',
        is_admin: false,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);

      mockSingle.mockResolvedValueOnce({ data: mockProfile, error: null });
      mockOrder.mockResolvedValueOnce({ data: [], error: null });

      const result = await hierarchyService.getMyHierarchyTree();

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(0);
    });

    it('should handle authentication errors', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      } as any);

      await expect(hierarchyService.getMyHierarchyTree()).rejects.toThrow('Not authenticated');
    });
  });

  describe('getMyDownlines', () => {
    it('should fetch all downlines for current user', async () => {
      const mockProfile = {
        id: 'user-1',
        hierarchy_path: 'user-1',
      };

      const mockDownlines: UserProfile[] = [
        {
          id: 'downline-1',
          email: 'downline1@example.com',
          upline_id: 'user-1',
          hierarchy_path: 'user-1.downline-1',
          hierarchy_depth: 1,
          approval_status: 'approved',
          is_admin: false,
          created_at: new Date('2025-01-01'),
          updated_at: new Date('2025-01-01'),
        },
        {
          id: 'downline-2',
          email: 'downline2@example.com',
          upline_id: 'user-1',
          hierarchy_path: 'user-1.downline-2',
          hierarchy_depth: 1,
          approval_status: 'approved',
          is_admin: false,
          created_at: new Date('2025-01-01'),
          updated_at: new Date('2025-01-01'),
        },
      ];

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);

      mockSingle.mockResolvedValueOnce({ data: mockProfile, error: null });
      mockOrder.mockResolvedValueOnce({ data: mockDownlines, error: null });

      const result = await hierarchyService.getMyDownlines();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('downline-1');
      expect(result[1].id).toBe('downline-2');
    });

    it('should return empty array when user has no downlines', async () => {
      const mockProfile = {
        id: 'user-1',
        hierarchy_path: 'user-1',
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);

      mockSingle.mockResolvedValueOnce({ data: mockProfile, error: null });
      mockOrder.mockResolvedValueOnce({ data: [], error: null });

      const result = await hierarchyService.getMyDownlines();

      expect(result).toEqual([]);
    });
  });

  describe('updateAgentHierarchy', () => {
    it('should update agent hierarchy successfully', async () => {
      const request = {
        agent_id: 'downline-1',
        new_upline_id: 'user-2',
        reason: 'Organizational restructure',
      };

      const updatedProfile: UserProfile = {
        id: 'downline-1',
        email: 'downline@example.com',
        upline_id: 'user-2',
        hierarchy_path: 'user-2.downline-1',
        hierarchy_depth: 1,
        approval_status: 'approved',
        is_admin: false,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
      };

      // Mock validation check
      mockSingle
        .mockResolvedValueOnce({
          data: { id: 'downline-1', hierarchy_path: 'user-1.downline-1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'user-2', hierarchy_path: 'user-2' },
          error: null,
        });

      // Mock update
      mockSingle.mockResolvedValueOnce({ data: updatedProfile, error: null });

      const result = await hierarchyService.updateAgentHierarchy(request);

      expect(result.upline_id).toBe('user-2');
      expect(result.id).toBe('downline-1');
    });

    it('should prevent circular reference', async () => {
      const request = {
        agent_id: 'user-1',
        new_upline_id: 'downline-1',
        reason: 'Invalid move',
      };

      // Mock agent fetch
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'user-1',
          hierarchy_path: 'user-1',
        },
        error: null,
      });

      // Mock proposed upline fetch (which is in agent's downline tree)
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'downline-1',
          hierarchy_path: 'user-1.downline-1', // Contains user-1, so circular!
        },
        error: null,
      });

      await expect(hierarchyService.updateAgentHierarchy(request)).rejects.toThrow();
    });

    it('should allow setting upline to null (making root agent)', async () => {
      const request = {
        agent_id: 'downline-1',
        new_upline_id: null,
        reason: 'Promote to root',
      };

      const updatedProfile: UserProfile = {
        id: 'downline-1',
        email: 'downline@example.com',
        upline_id: null,
        hierarchy_path: 'downline-1',
        hierarchy_depth: 0,
        approval_status: 'approved',
        is_admin: false,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
      };

      // Mock agent fetch for validation
      mockSingle.mockResolvedValueOnce({
        data: { id: 'downline-1', hierarchy_path: 'user-1.downline-1' },
        error: null,
      });

      // Mock update
      mockSingle.mockResolvedValueOnce({ data: updatedProfile, error: null });

      const result = await hierarchyService.updateAgentHierarchy(request);

      expect(result.upline_id).toBeNull();
      expect(result.hierarchy_depth).toBe(0);
    });
  });
});
