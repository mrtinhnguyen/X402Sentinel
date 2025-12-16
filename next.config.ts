import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use webpack instead of Turbopack for better compatibility with thirdweb
  webpack: (config, { isServer, dev }) => {
    // Exclude server-side modules from client bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    // Fix source map warnings in development
    if (dev) {
      config.devtool = 'eval-cheap-module-source-map';
    }
    return config;
  },
  // Exclude server-side packages from being bundled
  serverExternalPackages: [
    'thread-stream',
    'pino',
    'pino-pretty',
    '@walletconnect/sign-client',
  ],
  // Add empty turbopack config to silence warning when using webpack
  turbopack: {},
};

export default nextConfig;
