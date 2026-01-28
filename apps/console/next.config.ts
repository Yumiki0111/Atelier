import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  transpilePackages: ["@atelier/shared", "@atelier/preview"],
  async headers() {
    return [
      {
        // 静的ファイル（3Dモデルなど）にCORSヘッダーを追加
        source: "/3d/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // 開発環境では全てのオリジンを許可
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
