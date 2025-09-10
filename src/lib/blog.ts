import fs from 'node:fs';
import path from 'node:path';

// Discovers blog slugs based on directories under app/blog/* that contain a page.tsx
export function discoverBlogSlugs(appDir: string = path.join(process.cwd(), 'src', 'app')): string[] {
  const blogDir = path.join(appDir, 'blog');
  if (!fs.existsSync(blogDir)) return [];

  const entries = fs.readdirSync(blogDir, { withFileTypes: true });
  const slugs: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    // Ignore special directories that are not posts
    if (slug === 'layout.tsx' || slug === 'page.tsx') continue;
    // Consider a post if it has page.tsx or page.ts
    const pageTsx = path.join(blogDir, slug, 'page.tsx');
    const pageTs = path.join(blogDir, slug, 'page.ts');
    if (fs.existsSync(pageTsx) || fs.existsSync(pageTs)) {
      slugs.push(slug);
    }
  }

  // Sort alphabetically for stable output; you could sort by mtime if desired
  slugs.sort((a, b) => a.localeCompare(b));
  return slugs;
}

export type BlogEntry = {
  slug: string;
  lastModified?: Date;
};

export function discoverBlogEntries(appDir: string = path.join(process.cwd(), 'src', 'app')): BlogEntry[] {
  const blogDir = path.join(appDir, 'blog');
  if (!fs.existsSync(blogDir)) return [];

  const entries = fs.readdirSync(blogDir, { withFileTypes: true });
  const result: BlogEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    if (slug === 'layout.tsx' || slug === 'page.tsx') continue;
    const pageTsx = path.join(blogDir, slug, 'page.tsx');
    const pageTs = path.join(blogDir, slug, 'page.ts');
    const pageFile = fs.existsSync(pageTsx) ? pageTsx : fs.existsSync(pageTs) ? pageTs : null;
    if (pageFile) {
      let lastModified: Date | undefined = undefined;
      try {
        const stat = fs.statSync(pageFile);
        lastModified = stat.mtime;
      } catch {}
      result.push({ slug, lastModified });
    }
  }

  result.sort((a, b) => a.slug.localeCompare(b.slug));
  return result;
}


