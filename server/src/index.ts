import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import authRouter from './auth'
import { authMiddleware } from './middleware'
import prisma from './lib/prisma'  
import 'dotenv/config'

const app = new Hono()

app.use('*', cors())

// Public routes
app.route('/auth', authRouter)

// Protected route
app.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, fhirPatientId: true }
  })
  return c.json(user)
})

// Health check
app.get('/', (c) => c.text('MealCare API is running!'))

// Start server
serve(
  {
    fetch: app.fetch,
    port: 3000
  },
  (info) => {
    console.log(`🚀 Server running on http://localhost:${info.port}`)
  }
)