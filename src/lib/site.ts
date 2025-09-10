export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fallback = 'https://fromyou.ai';
  const base = fromEnv && fromEnv.length > 0 ? fromEnv : fallback;
  return base.replace(/\/$/, '');
}

export function getAbsoluteUrl(pathname: string): string {
  const pathWithLeadingSlash = pathname.startsWith('/')
    ? pathname
    : `/${pathname}`;
  return `${getSiteUrl()}${pathWithLeadingSlash}`;
}


