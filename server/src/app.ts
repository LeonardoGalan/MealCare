import { Hono } from "hono";
import { cors } from "hono/cors";
import authRouter from "./auth";
import fhirRouter from "./fhir";
import mealRouter from "./meal";
import mealPlanRouter from "./meal-plan";
import { authMiddleware } from "./middleware";
import prisma from "./lib/prisma";

type Variables = {
  userId: string;
};

export function createApp() {
  const app = new Hono<{ Variables: Variables }>();

  app.use("*", cors());

  app.route("/auth", authRouter);
  app.route("/fhir", fhirRouter);
  app.route("/meal-logs", mealRouter);
  app.route("/meal-plan", mealPlanRouter);

  app.get("/me", authMiddleware, async (c) => {
    const userId = c.get("userId");
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) return c.json({ error: "User not found" }, 404);

    let calorieGoal = 2000;

    if (user.weightLbs && user.heightIn && user.fhirPatientId) {
      const fhirPatient = await prisma.fhirPatient.findUnique({
        where: { fhirId: user.fhirPatientId },
      });

      if (fhirPatient?.birthDate && fhirPatient?.gender) {
        const birth = new Date(fhirPatient.birthDate);
        const age = Math.floor(
          (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        );
        const weightKg = user.weightLbs * 0.453592;
        const heightCm = user.heightIn * 2.54;

        if (fhirPatient.gender === "male") {
          calorieGoal = Math.round(
            10 * weightKg + 6.25 * heightCm - 5 * age + 5,
          );
        } else {
          calorieGoal = Math.round(
            10 * weightKg + 6.25 * heightCm - 5 * age - 161,
          );
        }

        // Multiply by activity factor (assuming lightly active)
        calorieGoal = Math.round(calorieGoal * 1.375);
      }
    }

    return c.json({ ...user, calorieGoal });
  });


  app.get("/", (c) => c.text("MealCare API is running!"));

  return app;
}

export const app = createApp();
