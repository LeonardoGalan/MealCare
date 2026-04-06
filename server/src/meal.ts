import { Hono } from 'hono'
import prisma from './lib/prisma'
import { authMiddleware } from './middleware'

const router = new Hono()

// ======================
// FOOD SEARCH (USDA FoodData Central)
// ======================
router.get('/search', async (c) => {
    const q = c.req.query('q') || ''
    if (!q || q.length < 2) return c.json([])
  
    const apiKey = process.env.USDA_API_KEY
    if (!apiKey) {
      console.error('USDA_API_KEY is missing in .env')
      return c.json([])
    }
  
    try {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?` +
        `api_key=${apiKey}` +
        `&query=${encodeURIComponent(q)}` +
        `&dataType=Foundation,SR%20Legacy,Branded` +
        `&pageSize=12` +
        `&pageNumber=1`
  
      const res = await fetch(url)
  
      if (!res.ok) {
        console.error('USDA API error:', res.status)
        return c.json([])
      }
  
      const data = await res.json()
  
      const foods = data.foods?.map((food: any) => {
        const nutrients = food.foodNutrients || []
        return {
          fdcId: food.fdcId,
          name: food.description || food.brandName || 'Unknown',
          brand: food.brandName || 'Generic',
          calories: nutrients.find((n: any) => n.nutrientName === 'Energy')?.value || 0,
          protein: nutrients.find((n: any) => n.nutrientName === 'Protein')?.value || 0,
          carbs: nutrients.find((n: any) => n.nutrientName === 'Carbohydrate, by difference')?.value || 0,
          fat: nutrients.find((n: any) => n.nutrientName === 'Total lipid (fat)')?.value || 0,
          servingSize: food.servingSize || 100,
          servingUnit: food.servingSizeUnit || 'g'
        }
      }) || []
  
      return c.json(foods)
    } catch (err) {
      console.error('USDA search failed:', err)
      return c.json([])
    }
  })

// ======================
// MEAL LOGGING ENDPOINTS
// ======================
router.post('/', authMiddleware, async (c) => {
  const { mealType, notes, items } = await c.req.json()
  const userId = c.get('userId')

  const mealLog = await prisma.mealLog.create({
    data: {
      userId,
      mealType,
      notes,
      items: {
        create: items.map((item: any) => {
          const hasFdcId = item.fdcId !== undefined && item.fdcId !== null
      
          return {
            foodItem: hasFdcId
              ? {
                  connectOrCreate: {
                    where: {
                      usdaFdcId: item.fdcId.toString()
                    },
                    create: {
                      usdaFdcId: item.fdcId.toString(),
                      name: item.name,
                      brand: item.brand || null,
                      calories: item.calories || 0,
                      protein: item.protein || 0,
                      carbs: item.carbs || 0,
                      fat: item.fat || 0,
                      servingSize: item.servingSize || 1,
                      servingUnit: item.servingUnit || 'serving'
                    }
                  }
                }
              : {
                  create: {
                    name: item.name,
                    brand: item.brand || null,
                    calories: item.calories || 0,
                    protein: item.protein || 0,
                    carbs: item.carbs || 0,
                    fat: item.fat || 0,
                    servingSize: item.servingSize || 1,
                    servingUnit: item.servingUnit || 'serving'
                  }
                },
            servings: item.servings || 1
          }
        })
      }
    },
    include: { items: { include: { foodItem: true } } }
  })

  return c.json(mealLog)
})

router.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const logs = await prisma.mealLog.findMany({
    where: { userId },
    include: { items: { include: { foodItem: true } } },
    orderBy: { loggedAt: 'desc' }
  })
  return c.json(logs)
})

export default router