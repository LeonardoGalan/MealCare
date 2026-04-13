import { Hono } from "hono";
import { cors } from "hono/cors";
import authRouter from "./auth";
import fhirRouter from "./fhir";
import mealRouter from "./meal";
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
      },
    });
    return c.json(user);
  });

  app.get("/", (c) => c.text("MealCare API is running!"));

  return app;
}

export const app = createApp();
