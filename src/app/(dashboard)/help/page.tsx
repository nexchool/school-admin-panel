"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NEXCHOOL_PRIVACY_URL, NEXCHOOL_TERMS_URL, SUPPORT_EMAIL } from "@/lib/externalLinks";
import { ArrowLeft, Mail } from "lucide-react";

const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Nexchool admin support")}`;

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Help &amp; support</h1>
        <p className="text-muted-foreground">
          Contact the Nexchool team for questions about this admin console, your school workspace, or
          your account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email us</CardTitle>
          <CardDescription>
            We typically reply within one business day. Include your school name and a short
            description of the issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Mail className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Support</p>
              <p className="text-sm text-muted-foreground">{SUPPORT_EMAIL}</p>
            </div>
          </div>
          <Button asChild>
            <a href={mailtoHref}>Open in mail app</a>
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        For legal notices, see{" "}
        <a
          href={NEXCHOOL_TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Terms of service
        </a>{" "}
        and{" "}
        <a
          href={NEXCHOOL_PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Privacy policy
        </a>
        .
      </p>
    </div>
  );
}
