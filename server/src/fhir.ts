import { Hono } from 'hono'
import prisma from './lib/prisma'
import { authMiddleware } from './middleware'

const router = new Hono()

// Search FHIR patients (by name)
router.get('/search', async (c) => {
  const query = c.req.query('q') || ''
  try {
    const res = await fetch(`http://localhost:8080/fhir/Patient?given=${query}&family=${query}&_format=json`)
    const data = await res.json()
    return c.json(data.entry || [])
  } catch (e) {
    return c.json({ error: 'FHIR server unreachable' }, 500)
  }
})

// Link a FHIR patient to the logged-in user
router.post('/link', authMiddleware, async (c) => {
  const { fhirPatientId } = await c.req.json()
  const userId = c.get('userId')

  const user = await prisma.user.update({
    where: { id: userId },
    data: { fhirPatientId },
    select: { id: true, fhirPatientId: true }
  })

  return c.json({ message: 'Patient linked successfully', user })
})

// Get full patient details (including name, gender, birthDate, etc.)
router.get('/patient/:id', async (c) => {
    const id = c.req.param('id')
    try {
      const url = `http://localhost:8080/fhir/Patient/${id}`
      console.log("Fetching FHIR:", url)
  
      const res = await fetch(url)
      const patient = await res.json()
  
      console.log("FHIR RESPONSE:", patient)
  
      return c.json(patient)
    } catch (err) {
      console.error(err)
      return c.json({ error: 'Patient not found' }, 404)
    }
  })

export default router