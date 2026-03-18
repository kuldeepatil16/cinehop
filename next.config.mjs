import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "ia.media-imdb.com" },
      { protocol: "https", hostname: "img.omdbapi.com" },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Silent during local dev; verbose in CI
  silent: !process.env.CI,

  // Only upload source maps when SENTRY_AUTH_TOKEN is present (i.e. in CI/CD)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Disable Sentry entirely if no DSN is set (local dev without Sentry account)
  sourcemaps: {
    disable: !process.env.NEXT_PUBLIC_SENTRY_DSN,
  },

  // Don't fail the build if Sentry upload fails
  errorHandler(err, invokeErr, compilation) {
    compilation.warnings.push("Sentry CLI: " + err.message);
  },
});
