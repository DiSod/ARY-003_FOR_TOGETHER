// ARY MVP — Application Entry Point
// Starts the Express API server + static file serving.
// Usage: node server.js → http://localhost:3000

import { start } from "./src/app.js";

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
