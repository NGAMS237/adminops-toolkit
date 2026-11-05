/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdfkit", "@prisma/client", "adm-zip"],
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  poweredByHeader: false,
};
export default nextConfig;
