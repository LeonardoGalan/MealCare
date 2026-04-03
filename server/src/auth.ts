import { Hono } from 'hono'
import prisma from './lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = new Hono()
const JWT_SECRET = process.env.JWT_SECRET!

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in .env file')
  process.exit(1)
}

// POST /auth/register
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

// POST /auth/login
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

export default router