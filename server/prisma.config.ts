import "dotenv/config";
import { defineConfig } from "prisma/config";
import { Pool } from "pg";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    provider: "postgresql",
    url: process.env.DATABASE_URL,
  },
  adapter: () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,           // adjust as needed
    });
    return pool;
  },
});