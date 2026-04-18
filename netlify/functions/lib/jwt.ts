import { SignJWT, jwtVerify } from "jose";

const secret = () => {
  const key = process.env.JWT_SECRET;
  if (!key) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(key);
};

export async function signAccessToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(await secret());
}

export async function signRefreshToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(await secret());
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, await secret());
  return payload;
}
