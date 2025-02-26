import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import mongoose from 'mongoose';
import { cleanEnv, str, port, url } from 'envalid';
import { validationResult, check } from 'express-validator';
import axios from 'axios';
import Redis from 'ioredis';
import RedisStore from 'rate-limit-redis';
import moment from 'moment-timezone';
import { OpenAI } from 'openai';
import os from 'os';
import WebSocket from 'ws';
import { validateEnv } from './config/validateEnv';

// Load and validate environment variables
dotenv.config();

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'] }),
  PORT: port({ default: 3000 }),
  MONGODB_URI: url(),
  REDIS_URL: url(),
  STRIPE_SECRET_KEY: str(),
  OPENAI_API_KEY: str(),
  JWT_SECRET: str(),
  BKASH_API_KEY: str({ optional: true }),
  NAGAD_API_KEY: str({ optional: true }),
  WEATHER_API_KEY: str({ optional: true }),
  REALTIME_WS_URL: str({ optional: true }),
  LOG_LEVEL: str({ default: 'info' })
});

// Types and Interfaces
interface AppError extends Error {
  status: number;
  details?: any;
}

type UserRole = 'admin' | 'user' | 'guest';
type TransportType = 'bus' | 'train' | 'launch' | 'cng' | 'rickshaw';

interface Location {
  division: string;
  district: string;
  area: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Setup Logger
const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Redis Client Setup
const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  }
});

redisClient.on('error', (err) => logger.error('Redis Error:', err));

// Setup Express App
const app = express();

// Basic Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Custom Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  next();
});

// Rate Limiting
const rateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000,
  max: (req: Request) => {
    const role = (req.user?.role || 'guest') as UserRole;
    return role === 'admin' ? 1000 : role === 'user' ? 200 : 50;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(rateLimiter);

// Health Check Route
app.get('/health', async (req: Request, res: Response) => {
  try {
    const metrics = {
      uptime: process.uptime(),
      responseTime: process.hrtime(),
      memory: process.memoryUsage(),
      cpu: os.cpus(),
      mongodb: mongoose.connection.readyState === 1,
      redis: redisClient.status === 'ready'
    };

    res.json({
      status: 'healthy',
      timestamp: new Date(),
      ...metrics
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// API Routes
const router = express.Router();

// Validation Middleware
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Route: Search Transit Routes
router.get('/routes', [
  check('from').notEmpty(),
  check('to').notEmpty(),
  check('type').optional().isIn(['bus', 'train', 'launch']),
], validate, async (req: Request, res: Response) => {
  try {
    const { from, to, type } = req.query;
    
    // Check cache first
    const cacheKey = `route:${from}:${to}:${type}`;
    const cachedResult = await redisClient.get(cacheKey);
    
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }

    // Simulated route search logic
    const routes = [
      { id: '1', from, to, type, duration: '2h', price: 250 },
      { id: '2', from, to, type, duration: '2.5h', price: 200 }
    ];

    // Cache the result
    await redisClient.setex(cacheKey, 3600, JSON.stringify(routes));

    res.json(routes);
  } catch (error) {
    next(error);
  }
});

// Route: Book Ticket
router.post('/booking', [
  check('routeId').notEmpty(),
  check('passengers').isArray(),
  check('date').isISO8601()
], validate, async (req: Request, res: Response) => {
  try {
    const booking = {
      id: uuidv4(),
      ...req.body,
      status: 'confirmed',
      timestamp: new Date()
    };

    // Add to database (simulated)
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

// Route: Process Payment
router.post('/payment', [
  check('bookingId').notEmpty(),
  check('amount').isNumeric(),
  check('method').isIn(['bkash', 'nagad', 'card'])
], validate, async (req: Request, res: Response) => {
  try {
    const { bookingId, amount, method } = req.body;
    
    let paymentResult;
    switch (method) {
      case 'bkash':
        // Implement bKash payment
        break;
      case 'nagad':
        // Implement Nagad payment
        break;
      case 'card':
        // Implement card payment
        break;
    }

    res.json({ success: true, transactionId: uuidv4() });
  } catch (error) {
    next(error);
  }
});

// AI Assistant Route
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

router.post('/ai/assist', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful Bangladeshi transit assistant. Respond in Bangla."
        },
        {
          role: "user",
          content: query
        }
      ]
    });

    res.json({
      success: true,
      response: completion.choices[0].message.content
    });
  } catch (error) {
    next(error);
  }
});

// Mount router
app.use('/api/v1', router);

// Error Handling Middleware
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id']
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    requestId: req.headers['x-request-id'],
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start Server
const PORT = env.PORT;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// WebSocket Server for Real-time Updates
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Handle real-time messages
    // Example: Location updates, service alerts
  });
});

// Graceful Shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received: starting graceful shutdown`);
  
  try {
    await Promise.all([
      new Promise((resolve) => server.close(resolve)),
      mongoose.connection.close(),
      redisClient.quit()
    ]);
    
    logger.info('All connections closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle various shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

// Connect to Database
connectDB();

export default app;
