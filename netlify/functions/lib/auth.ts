import { HandlerEvent } from "@netlify/functions";
import { prisma } from "./prisma";
import { verifyToken } from "./jwt";
import { parseCookies } from "./cookies";

export const verifyUser = async (event: HandlerEvent) => {
  const cookies = parseCookies(event.headers["cookie"] ?? event.headers["Cookie"]);
  const token = cookies["access_token"];
  if (!token) throw new Error("Unauthorized");

  const payload = await verifyToken(token);
  const userId = payload.sub as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      achievements: { include: { achievement: true } },
      premiumSubscriptions: { where: { revokedAt: null }, take: 1 },
    },
  });
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
};

export const verifyAdmin = async (event: HandlerEvent) => {
  const user = await verifyUser(event);
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }
  return user;
};

export const sanitizeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
  role: user.role,
  elo: user.elo,
  achievements: user.achievements || [],
  isPremium: (user.premiumSubscriptions?.length ?? 0) > 0,
});
