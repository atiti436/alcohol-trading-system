/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 在建置時忽略 ESLint，因為 CI 已經執行過 lint 檢查
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  webpack: (config) => {
    const path = require('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': path.resolve(__dirname, '../shared'),
    };
    return config;
  },
};

module.exports = nextConfig;