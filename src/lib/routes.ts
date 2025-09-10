import fs from 'node:fs';
import path from 'node:path';

const PAGE_FILENAMES = ['page.tsx', 'page.ts'];

function hasPageFile(dirPath: string): boolean {
  return PAGE_FILENAMES.some((name) => fs.existsSync(path.join(dirPath, name)));
}

export function discoverTopLevelStaticPaths(appDir: string = path.join(process.cwd(), 'src', 'app')): string[] {
  const excluded = new Set(['api']);
  const entries = fs.readdirSync(appDir, { withFileTypes: true });
  const paths: string[] = ['/'];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (excluded.has(name)) continue;
    if (name.startsWith('[')) continue; // dynamic segment
    if (name.startsWith('(')) continue; // route group

    const dirPath = path.join(appDir, name);
    if (hasPageFile(dirPath)) {
      paths.push(`/${name}`);
    }
  }

  // Stable ordering
  return Array.from(new Set(paths)).sort((a, b) => a.localeCompare(b));
}


