import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://learn.quantumbtc.dev',
      lastmod: new Date(),
      changefreq: 'weekly',
      priority: 1,
    },
    {
      url: 'https://learn.quantumbtc.dev/en',
      lastmod: new Date(),
      changefreq: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://learn.quantumbtc.dev/es',
      lastmod: new Date(),
      changefreq: 'weekly',
      priority: 0.8,
    },
  ]
}
