/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    // Domains that are allowed to be image sources
    domains: ['vercel.com'],
    // Don't attempt to optimize these paths as they're already optimized
    unoptimized: true
  },
  // Ensure files in public directory are properly copied to the output
  webpack: (config, { isServer }) => {
    // Optimize loading of static assets
    if (!isServer) {
      // Make sure optimization and splitChunks objects exist
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = config.optimization.splitChunks || {};
      config.optimization.splitChunks.cacheGroups = config.optimization.splitChunks.cacheGroups || {};
      
      // Now it's safe to add the static property
      config.optimization.splitChunks.cacheGroups.static = {
        test: /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
        chunks: 'all',
        name: 'static',
        priority: 10,
        enforce: true,
      };
    }
    
    return config;
  },
  // Add custom headers for images to improve caching
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 