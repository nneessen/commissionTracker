// /home/nneessen/projects/commissionTracker/src/test/checkUser.tsx
// Component to test user access for nick.neessen@gmail.com

import React, { useEffect, useState } from 'react';
import {userService} from '../services/users/userService';
import {usePermissionCheck} from '../hooks/permissions/usePermissions';

export function UserAccessTest() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { roles, permissions, can, is } = usePermissionCheck();

  useEffect(() => {
    async function checkUser() {
      try {
        const profile = await userService.getCurrentUserProfile();
        setUserInfo(profile);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>User Access Test for: {userInfo?.email}</h2>

      <h3>Profile Info:</h3>
      <pre>{JSON.stringify({
        id: userInfo?.id,
        email: userInfo?.email,
        roles: userInfo?.roles,
        agent_status: userInfo?.agent_status,
        approval_status: userInfo?.approval_status,
        contract_level: userInfo?.contract_level,
        is_admin: userInfo?.is_admin,
      }, null, 2)}</pre>

      <h3>Role Checks:</h3>
      <ul>
        <li>Is Admin: {is('admin') ? '✅' : '❌'}</li>
        <li>Is Active Agent: {is('active_agent') ? '✅' : '❌'}</li>
        <li>Is Agent: {is('agent') ? '✅' : '❌'}</li>
        <li>Is Recruit: {is('recruit') ? '✅' : '❌'}</li>
      </ul>

      <h3>Permission Checks:</h3>
      <ul>
        <li>Can access Dashboard: {can('nav.dashboard') ? '✅' : '❌'}</li>
        <li>Can access Policies: {can('nav.policies') ? '✅' : '❌'}</li>
        <li>Can access Clients: {can('nav.clients') ? '✅' : '❌'}</li>
        <li>Can access Team Dashboard: {can('nav.team_dashboard') ? '✅' : '❌'}</li>
        <li>Can access Recruiting: {can('nav.recruiting_pipeline') ? '✅' : '❌'}</li>
      </ul>

      <h3>All Roles:</h3>
      <pre>{JSON.stringify(roles, null, 2)}</pre>

      <h3>All Permissions (first 10):</h3>
      <pre>{JSON.stringify(permissions.slice(0, 10), null, 2)}</pre>

      <div style={{ marginTop: '20px', padding: '10px', background: userInfo?.roles?.includes('active_agent') ? '#d4f4dd' : '#fdd4d4' }}>
        <strong>Status: </strong>
        {userInfo?.roles?.includes('active_agent') && userInfo?.agent_status === 'licensed' && userInfo?.approval_status === 'approved'
          ? '✅ User is properly configured as an ACTIVE AGENT with full access!'
          : '❌ User is NOT properly configured - may be incorrectly showing in recruiting pipeline'}
      </div>
    </div>
  );
}