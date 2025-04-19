/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    domains: ['maps.googleapis.com', 'maps.gstatic.com'],
  },
  env: {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors 'self' https://www.google.com https://*.google.com https://maps.googleapis.com https://*.gstatic.com;`
          }
        ],
      },
    ]
  }
};

module.exports = nextConfig;
