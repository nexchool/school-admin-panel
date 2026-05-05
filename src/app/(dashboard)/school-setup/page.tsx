"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks";
import { SetupDashboard } from "@/components/school-setup/SetupDashboard";

export default function SchoolSetupPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("school_setup.manage");

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>School setup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You don&rsquo;t have permission to run school setup. Ask your
            administrator for the <code>school_setup.manage</code> permission.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <SetupDashboard />;
}
