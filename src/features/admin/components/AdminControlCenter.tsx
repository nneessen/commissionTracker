// src/features/admin/components/AdminControlCenter.tsx
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Users, Shield, Settings } from "lucide-react";
import { UserManagementPage } from "./UserManagementPage";
import { RoleManagementPage } from "./RoleManagementPage";
import { PermissionManagementPage } from "./PermissionManagementPage";

export default function AdminControlCenter() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Control Center</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, permissions, and system settings
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users & Access
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="p-6">
            <UserManagementPage />
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Role Management</h2>
              <RoleManagementPage />
            </Card>
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Permission Assignment</h2>
              <PermissionManagementPage />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">System Settings</h2>
            <div className="text-muted-foreground">
              <p>System settings coming soon...</p>
              <ul className="mt-4 space-y-2 list-disc list-inside">
                <li>Company Information</li>
                <li>Email Templates</li>
                <li>Backup & Restore</li>
                <li>System Configuration</li>
              </ul>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
