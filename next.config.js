/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SCORM packages typically need to be served as static asset bundles -
  // revisit headers/rewrites here once SCORM storage approach is finalized.
};

module.exports = nextConfig;
