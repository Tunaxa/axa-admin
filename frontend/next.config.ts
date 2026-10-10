import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Traces the modules the server actually imports and emits a self-contained
  // server next to them, so the container image needs no node_modules. This is
  // what makes the runtime image small; see the Docker section of the README.
  output: 'standalone',
};

export default nextConfig;
