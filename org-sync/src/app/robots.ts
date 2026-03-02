import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/docs", "/pricing", "/about", "/privacy", "/terms"],
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
    sitemap: "https://orgsync.io/sitemap.xml",
  };
}
