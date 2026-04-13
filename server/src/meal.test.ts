import test, { mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { Hono } from "hono";
import mealRouter from "./meal";
import prisma from "./lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";

function createAuthenticatedRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const app = new Hono<{ Variables: { userId: string } }>();
  app.route("/meal-logs", mealRouter);

  const token = jwt.sign({ userId: "user-123" }, JWT_SECRET);

  return Promise.resolve(
    app.request(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    }),
  );
}

test("POST /meal-logs returns 400 for invalid payload", async () => {
  const createMock = mock.method(prisma.mealLog, "create", async () => {
    throw new Error("should not be called");
  });

  const response = await createAuthenticatedRequest("/meal-logs", {
    method: "POST",
    body: JSON.stringify({
      mealType: "DINNER",
      items: [],
    }),
  });

  assert.equal(response.status, 400);
  assert.match(await response.text(), /At least one meal item is required/);
  assert.equal(createMock.mock.callCount(), 0);

  createMock.mock.restore();
});

test("POST /meal-logs creates a validated meal log", async () => {
  const createMock = mock.method(
    prisma.mealLog,
    "create",
    async (args: Parameters<typeof prisma.mealLog.create>[0]) => ({
      id: "meal-1",
      mealType: args.data.mealType,
      loggedAt: args.data.loggedAt ?? new Date("2026-04-12T12:00:00.000Z"),
      notes: args.data.notes ?? null,
      items: [],
    }),
  );

  const response = await createAuthenticatedRequest("/meal-logs", {
    method: "POST",
    body: JSON.stringify({
      mealType: "LUNCH",
      notes: "Chicken bowl",
      loggedAt: "2026-04-12T12:00:00.000Z",
      items: [
        {
          fdcId: 555,
          name: "Chicken Bowl",
          brand: "MealCare",
          calories: 520,
          protein: 40,
          carbs: 48,
          fat: 18,
          servingSize: 1,
          servingUnit: "bowl",
          servings: 1.25,
        },
      ],
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.id, "meal-1");
  assert.equal(createMock.mock.callCount(), 1);

  const callArgs = createMock.mock.calls[0]?.arguments[0];
  assert.ok(callArgs);
  assert.equal(callArgs.data.userId, "user-123");
  assert.equal(callArgs.data.mealType, "LUNCH");
  const createdItems = callArgs.data.items as {
    create: Array<{
      servings: number;
      foodItem: {
        connectOrCreate: {
          where: { usdaFdcId: string };
        };
      };
    }>;
  };
  assert.equal(createdItems.create[0].servings, 1.25);
  assert.equal(
    createdItems.create[0].foodItem.connectOrCreate.where.usdaFdcId,
    "555",
  );

  createMock.mock.restore();
});

test("DELETE /meal-logs/:id returns 404 when the meal log is missing", async () => {
  const deleteMock = mock.method(prisma.mealLog, "deleteMany", async () => ({
    count: 0,
  }));

  const response = await createAuthenticatedRequest("/meal-logs/missing-id", {
    method: "DELETE",
  });

  assert.equal(response.status, 404);
  assert.match(await response.text(), /Meal log not found/);
  assert.equal(deleteMock.mock.callCount(), 1);

  deleteMock.mock.restore();
});

test("DELETE /meal-logs/:id deletes a meal log for the current user", async () => {
  const deleteMock = mock.method(prisma.mealLog, "deleteMany", async () => ({
    count: 1,
  }));

  const response = await createAuthenticatedRequest("/meal-logs/meal-123", {
    method: "DELETE",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    message: "Meal log deleted successfully",
  });
  assert.deepEqual(deleteMock.mock.calls[0]?.arguments[0], {
    where: {
      id: "meal-123",
      userId: "user-123",
    },
  });

  deleteMock.mock.restore();
});

test("GET /meal-logs/progress returns zero-filled buckets for the requested range", async () => {
  const findManyMock = mock.method(prisma.mealLog, "findMany", async () => [
    {
      mealType: "BREAKFAST",
      loggedAt: new Date("2026-04-12T12:00:00.000Z"),
      items: [
        {
          servings: 1,
          foodItem: {
            calories: 350,
            protein: 20,
            carbs: 28,
            fat: 12,
          },
        },
      ],
    },
  ]);

  const response = await createAuthenticatedRequest(
    "/meal-logs/progress?date=2026-04-12&days=7",
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.days, 7);
  assert.equal(body.startDate, "2026-04-06");
  assert.equal(body.endDate, "2026-04-12");
  assert.equal(body.buckets.length, 7);
  assert.equal(body.buckets[6].totals.calories, 350);
  assert.equal(body.buckets[0].totals.calories, 0);
  assert.deepEqual(findManyMock.mock.calls[0]?.arguments[0], {
    where: {
      userId: "user-123",
      loggedAt: {
        gte: new Date(2026, 3, 6, 0, 0, 0, 0),
        lt: new Date(2026, 3, 13, 0, 0, 0, 0),
      },
    },
    include: { items: { include: { foodItem: true } } },
    orderBy: { loggedAt: "asc" },
  });

  findManyMock.mock.restore();
});
