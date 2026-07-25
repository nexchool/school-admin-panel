import type { NextConfig } from "next";

const isDockerBuild = process.env.DOCKER_BUILD === "1";
const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  ...(isDockerBuild && isProduction ? { output: "standalone" as const } : {}),
  // Keep trailing slashes intact so proxied Flask routes with strict slashes
  // (e.g. POST /api/holidays/) don't bounce through a cross-origin 308.
  skipTrailingSlashRedirect: true,
  // Local dev without the Docker gateway: DEV_API_PROXY=http://localhost:5001
  // proxies /api/* same-origin to the Flask server (avoids CORS entirely).
  async rewrites() {
    const target = process.env.DEV_API_PROXY?.replace(/\/$/, "");
    if (!target) return [];
    return [
      // Slash-suffixed rule first: `:path*` alone drops a trailing slash,
      // which Flask strict-slash routes would 308 to their own origin.
      { source: "/api/:path*/", destination: `${target}/api/:path*/` },
      { source: "/api/:path*", destination: `${target}/api/:path*` },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/school-setup",
        destination: "/school-setup",
        permanent: false,
      },
      // Academics hub removed → its features live in the sidebar group.
      { source: "/academics", destination: "/academics/academic-years", permanent: false },
      // Academic settings promoted to a dedicated top-level module.
      { source: "/academics/settings", destination: "/settings", permanent: false },
      // Holidays are managed inside the Academic Calendar now.
      { source: "/holidays", destination: "/academics/calendar", permanent: false },
      { source: "/dashboard/transport/buses", destination: "/dashboard/transport/fleet", permanent: false },
      { source: "/dashboard/transport/drivers", destination: "/dashboard/transport/staff", permanent: false },
      {
        source: "/dashboard/transport/enrollments",
        destination: "/dashboard/transport/students",
        permanent: false,
      },
      {
        source: "/dashboard/transport/assignments",
        destination: "/dashboard/transport/fleet",
        permanent: false,
      },
      { source: "/dashboard/transport/summary", destination: "/dashboard/transport", permanent: false },
    ];
  },
};

export default nextConfig;
