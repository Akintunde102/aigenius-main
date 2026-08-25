import type { MetadataRoute } from "next";

const BASE_URL = "https://aigenius.noboxlabs.xyz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/docs",
          "/docs/*",
          "/login",
          "/signup",
          "/published-conversations",
          "/published-conversations/*",
        ],
        disallow: [
          "/api/*",
          "/chat/*",
          "/payment-callback",
          "/integrations/*",
          "/servers",
          "/schedules",
          "/workflow/*",
          "/workflows/*",
          "/desktop-login",
          "/desktop-welcome",
          "/desktop-success",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
