import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="text-sm font-semibold hover:underline">
            Nexchool Admin
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-lg flex-col justify-center px-4 pb-16 pt-10 sm:px-6">
        <p className="text-sm font-medium text-muted-foreground">Error 404</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Page not found</h1>
        <p className="mt-3 text-pretty text-muted-foreground">
          The page you’re looking for doesn’t exist, or the link may be out of date.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Link
            href="/help"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Help
          </Link>
        </div>
      </main>
    </div>
  );
}
