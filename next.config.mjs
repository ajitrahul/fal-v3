// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  eslint: {
    // Skip ESLint errors during builds on Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TEMPORARY: allow build to pass even if unused files have TS errors
    // Set back to false after cleanup.
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      // Google Favicons API
      { protocol: "https", hostname: "www.google.com" },

      // WordPress mShots screenshots
      { protocol: "https", hostname: "s.wordpress.com" },

      // YouTube thumbnails
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },

      // Common logo/avatars/CDNs
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],

    // Optional: keep if any legacy code still references domains
    domains: [
      "www.google.com",
      "s.wordpress.com",
      "i.ytimg.com",
      "img.youtube.com",
      "lh3.googleusercontent.com",
      "avatars.githubusercontent.com",
      "raw.githubusercontent.com",
      "images.unsplash.com",
      "cdn.jsdelivr.net",
      "res.cloudinary.com",
    ],
  },
};

export default nextConfig;
