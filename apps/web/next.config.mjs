/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@flowdesk/ui", "@flowdesk/db", "@flowdesk/types", "@flowdesk/emails"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
};
export default nextConfig;
