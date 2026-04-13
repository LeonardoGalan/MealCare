import { serve } from "@hono/node-server";
import "dotenv/config";
import { app } from "./app";

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
