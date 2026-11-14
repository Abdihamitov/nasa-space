import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/compare`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/method`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    {
      url: `${base}/analysis?object=issyk-kul&variable=lake_level&from=2000&to=2025`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/analysis?object=bishkek&variable=t2m&from=2000&to=2025`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/analysis?object=enilchek&variable=snow_days&from=2000&to=2025`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
