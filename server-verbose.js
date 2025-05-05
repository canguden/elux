// server-verbose.js - Simple wrapper for verbose mode
process.env.NODE_ENV = "development";
process.env.VERBOSE_LOGGING = "true";

console.log("Starting Elux server in verbose mode...");

// Use ES module imports instead of require
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start TSX with appropriate arguments
const tsx = spawn(
  "npx",
  [
    "tsx",
    "--watch",
    "--experimental-specifier-resolution=node",
    path.join(__dirname, "server.ts"),
  ],
  {
    stdio: "inherit",
    shell: true,
  }
);

// Handle process events
tsx.on("error", (err) => {
  console.error("Failed to start TSX:", err);
});

// Handle signals to properly clean up
process.on("SIGINT", () => {
  console.log("Stopping server...");
  tsx.kill("SIGINT");
});

process.on("SIGTERM", () => {
  console.log("Stopping server...");
  tsx.kill("SIGTERM");
});
