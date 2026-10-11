/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Receipt photos are compressed client side, but leave headroom for big ones.
    serverActions: { bodySizeLimit: '6mb' },
  },
};

export default nextConfig;
