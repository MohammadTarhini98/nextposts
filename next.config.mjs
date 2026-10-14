/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB; allow the 5 MB image limit in lib/storage.js plus form fields
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
