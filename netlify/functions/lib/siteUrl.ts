export function buildSiteUrl(path: string): string {
  const base = (process.env.SITE_URL || "http://localhost:8080").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
