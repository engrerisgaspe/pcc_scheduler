import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createApiRouter } from "./routes.js";
import { errorHandler, requestLogger } from "./middleware/index.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const nodeEnv = process.env.NODE_ENV || 'development';

// Middleware setup
app.use(
  cors({
    exposedHeaders: ["Content-Disposition"]
  })
);
app.use(express.json());
app.use(requestLogger);

// Routes
app.use("/api", createApiRouter());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: nodeEnv,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `No route found for ${req.method} ${req.path}`,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Environment: ${nodeEnv}`);
  console.log(`Log level: ${process.env.LOG_LEVEL || 'info'}`);
});
