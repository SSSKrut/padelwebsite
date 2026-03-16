const isProd = process.env.NODE_ENV === "production";
const secure = isProd ? "; Secure" : "";

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim().split("="))
      .filter((parts) => parts.length === 2)
      .map(([k, v]) => [k.trim(), decodeURIComponent(v.trim())])
  );
}

export function makeAccessCookie(token: string): string {
  return `access_token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=900${secure}`;
}

export function makeRefreshCookie(token: string): string {
  return `refresh_token=${token}; HttpOnly; Path=/.netlify/functions/auth-refresh; SameSite=Strict; Max-Age=604800${secure}`;
}

export function clearCookies(): string[] {
  return [
    `access_token=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`,
    `refresh_token=; HttpOnly; Path=/.netlify/functions/auth-refresh; SameSite=Strict; Max-Age=0`,
  ];
}
