import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/app/",
        "/billing/",
        "/onboarding/",
        "/reset-password/",
      ],
    },
    sitemap: "https://www.afroloveapp.com/sitemap.xml",
    host: "https://www.afroloveapp.com",
  };
}
