import { Hono } from 'hono'
import prisma from './lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authMiddleware } from "./middleware";

const router = new Hono<{ Variables: { userId: string } }>();
const JWT_SECRET = process.env.JWT_SECRET!

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in .env file')
  process.exit(1)
}

router.post('/register', async (c) => {
  try {
    const { email, password, firstName, lastName } = await c.req.json()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return c.json({ error: 'User already exists' }, 400)

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName },
      select: { id: true, email: true, firstName: true, lastName: true }
    })

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    return c.json({ message: 'User created successfully', token, user })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

router.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, email: true, firstName: true, lastName: true }
    })

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    const { passwordHash, ...safeUser } = user
    return c.json({ message: 'Login successful', token, user: safeUser })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

router.put("/profile", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const { firstName, lastName, email, weightLbs, heightIn } =
    await c.req.json();

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(weightLbs !== undefined && { weightLbs: Number(weightLbs) }),
        ...(heightIn !== undefined && { heightIn: Number(heightIn) }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        fhirPatientId: true,
        weightLbs: true,
        heightIn: true,
      },
    });
    return c.json(user);
  } catch (err: any) {
    if (err.code === "P2002") {
      return c.json({ error: "Email already in use" }, 409);
    }
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

router.put("/password", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const { currentPassword, newPassword } = await c.req.json();

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return c.json({ error: "New password must be at least 8 characters" }, 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return c.json({ error: "User not found" }, 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return c.json({ error: "Current password is incorrect" }, 401);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return c.json({ message: "Password updated successfully" });
});

router.delete("/account", authMiddleware, async (c) => {
  const userId = c.get("userId");
  await prisma.user.delete({ where: { id: userId } });
  return c.json({ message: "Account deleted" });
});

export default router