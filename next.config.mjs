/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/live-daten": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
