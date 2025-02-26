// Core imports
import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";

// Local imports
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Initialize Express
const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  
  // Only log API requests
  if (!path.startsWith("/api")) {
    return next();
  }

  // Capture JSON response
  let responseBody: Record<string, any> | undefined;
  const originalJson = res.json;
  res.json = function(body, ...args) {
    responseBody = body;
    return originalJson.apply(res, [body, ...args]);
  };

  // Log request completion
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logParts = [
      req.method,
      path,
      res.statusCode,
      `${duration}ms`
    ];

    if (responseBody) {
      const responseSummary = JSON.stringify(responseBody);
      logParts.push(`::`);
      logParts.push(responseSummary.length > 40 
        ? responseSummary.slice(0, 39) + '…'
        : responseSummary
      );
    }

    log(logParts.join(' '));
  });

  next();
};

app.use(requestLogger);

(async () => {
  try {
    console.log('Starting server...');
    const server = registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        status: err.status || err.statusCode,
        path: _req.path,
        method: _req.method
      });
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Setup vite in development
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Always serve on port 5000 and bind to all interfaces
    const PORT = 5000;
    const tryListen = (port: number) => {
      server.listen(port, "0.0.0.0", () => {
        log(`Server running on http://0.0.0.0:${port}`);
      }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          log(`Port ${port} is busy, trying ${port + 1}...`);
          tryListen(port + 1);
        } else {
          console.error('Server error:', err);
          process.exit(1);
        }
      });
    };
    tryListen(PORT);
  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? {
      message: error.message,
      stack: error.stack
    } : error);
    process.exit(1);
  }
})();