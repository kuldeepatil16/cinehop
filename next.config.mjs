/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "m.media-amazon.com"
      },
      {
        protocol: "https",
        hostname: "ia.media-imdb.com"
      },
      {
        protocol: "https",
        hostname: "img.omdbapi.com"
      }
    ]
  }
};

export default nextConfig;
