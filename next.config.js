/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "@prisma/adapter-libsql",
      "@libsql/client",
      "@libsql/hrana-client",
      "@libsql/isomorphic-fetch",
    ],
  },
};

module.exports = nextConfig;
