import type { NextConfig } from "next";

const isDockerBuild = process.env.DOCKER_BUILD === "1";
const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  ...(isDockerBuild && isProduction ? { output: "standalone" as const } : {}),
  async redirects() {
    return [
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
