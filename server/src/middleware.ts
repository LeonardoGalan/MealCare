import { Context, Next } from "hono";
import jwt from "jsonwebtoken";

type Variables = {
  userId: string;
};

const JWT_SECRET = process.env.JWT_SECRET!;

export async function authMiddleware(
  c: Context<{ Variables: Variables }>,
  next: Next,
) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    c.set("userId", payload.userId);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}