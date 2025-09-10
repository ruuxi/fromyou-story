import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'
import { discoverTopLevelStaticPaths } from '@/lib/routes'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl()
  const staticPaths = discoverTopLevelStaticPaths()

  const now = new Date()
  const staticUrls: MetadataRoute.Sitemap = staticPaths.map((pathname) => ({
    url: `${baseUrl}${pathname === '/' ? '' : pathname}`,
    lastModified: now,
    changeFrequency: pathname === '/' ? 'daily' : 'weekly',
    priority: pathname === '/' ? 1 : 0.8,
  }))

  return staticUrls
}