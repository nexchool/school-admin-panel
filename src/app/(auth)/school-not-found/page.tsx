"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/externalLinks";
import { getSubdomain } from "@/lib/subdomain";

export default function SchoolNotFoundPage() {
  const [subdomain, setSubdomain] = useState<string | null>(null);

  useEffect(() => {
    // Show which subdomain failed so the user can confirm they typed the right URL.
    setSubdomain(getSubdomain(window.location.hostname));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>School not found</CardTitle>
          <CardDescription>
            {subdomain ? (
              <>
                We couldn&apos;t find a school registered as{" "}
                <strong>{subdomain}.nexchool.in</strong>.
              </>
            ) : (
              "We couldn't find a school at this address."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Double-check the URL or contact your school administrator to get the
            correct link.
          </p>
          <Button asChild variant="outline" className="w-full">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("School URL not found")}`}
            >
              Contact support
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
