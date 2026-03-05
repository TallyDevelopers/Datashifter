import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
        "/",
        "/features/",
        "/pricing",
        "/security",
        "/docs",
        "/about",
        "/privacy",
        "/terms",
      ],
        disallow: [
          "/dashboard",
          "/orgs",
          "/syncs",
          "/logs",
          "/support",
          "/help",
          "/settings",
          "/api/",
        ],
      },
    ],
    sitemap: "https://swiftport.io/sitemap.xml",
  };
}
