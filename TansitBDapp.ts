import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import winston from 'winston';
import actuator from 'express-actuator';
import { z } from 'zod';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';
import Stripe from 'stripe';
import { BKashGateway, NagadGateway } from './payment-gateways';
import { Location, Route, Vehicle } from './models';
import { VehicleTracker } from './vehicle-tracking';
import { i18n } from './i18n';
import { initDatabase } from './db';
import { validate } from './validators';
import { securityMiddleware } from './security';
import { metricsMiddleware, healthCheck } from './monitoring';
import { createRedisCluster } from './redis-config';
import { AIAssistant } from './ai-service';

// Load environment variables first
dotenv.config();

// Environment variables validation schema
const envSchema = z.object({
  PORT: z.string().transform(val => parseInt(val)),
  JWT_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

try {
  envSchema.parse(process.env);
} catch (error) {
  console.error('Environment validation failed:', error);
  process.exit(1);
}

// Port configuration with validation
const portSchema = z.number().int().positive();
const PORT = portSchema.parse(parseInt(process.env.PORT || '3000'));

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Stripe configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'your_stripe_secret_key', {
  apiVersion: '2020-08-27',
});

// Enhanced logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

declare global {
  namespace Express {
    interface Request {
      user?: { role: string };
      requestId?: string;
    }
  }
}

const app = express();

// Apply middleware
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(actuator());
app.use(metricsMiddleware);
app.use(securityMiddleware);

// Initialize database connections
initDatabase().catch(error => {
  logger.error('Failed to initialize database:', error);
  process.exit(1);
});

// Enhanced rate limiting with Redis
const rateLimiter = rateLimit({
  store: createRedisCluster(),
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
});
app.use(rateLimiter);

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.requestId = crypto.randomUUID();
  next();
});

// Enhanced endpoint logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('Request processed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - start,
      requestId: req.requestId
    });
  });
  next();
});

// Middleware for user authentication
const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user as { role: string };
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Health check endpoint
app.get('/health', healthCheck);

// WebSocket health check endpoint
app.get('/ws-health', (req: Request, res: Response) => {
  if (wss.clients.size > 0) {
    res.status(200).send('WebSocket server is healthy');
  } else {
    res.status(503).send('WebSocket server is not healthy');
  }
});

// Test endpoint to verify API integration
app.get('/test-api', (req: Request, res: Response) => {
  res.status(200).send('API is working properly');
});

// Payment endpoint (example using Stripe)
const paymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3)
});

app.post('/payment', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { amount, currency } = paymentSchema.parse(req.body);
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
    });
    res.status(201).send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    logger.error('Payment validation failed:', error);
    res.status(400).send('Invalid payment data');
  }
});

// Log a message to verify logger integration
logger.info('Logger is working properly');

// Route management
app.post('/routes', authenticateJWT, (req: Request, res: Response) => {
  // Logic to add a new route
  res.status(201).send('Route added');
});

app.get('/routes', (req: Request, res: Response) => {
  // Logic to get all routes
  res.status(200).send('List of routes');
});

app.put('/routes/:id', authenticateJWT, (req: Request, res: Response) => {
  // Logic to update a route
  res.status(200).send('Route updated');
});

app.delete('/routes/:id', authenticateJWT, (req: Request, res: Response) => {
  // Logic to delete a route
  res.status(200).send('Route deleted');
});

// Bangladesh Transit Types
type TransitMode = 'bus' | 'train' | 'launch' | 'cng' | 'rickshaw';

interface TransitRoute {
  id: string;
  mode: TransitMode;
  startLocation: string;
  endLocation: string;
  fareAmount: number;
  schedule: Array<{
    departureTime: string;
    arrivalTime: string;
    seats: number;
  }>;
  operatorName: string;
  operatorContact: string;
}

// Payment Method Types
type BDPaymentMethod = 'bKash' | 'Nagad' | 'Rocket' | 'card' | 'cash';

// Validation Schemas
const locationSchema = z.object({
  name: z.string(),
  district: z.string(),
  division: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  })
});

const transitRouteSchema = z.object({
  mode: z.enum(['bus', 'train', 'launch', 'cng', 'rickshaw']),
  startLocation: locationSchema,
  endLocation: locationSchema,
  fareAmount: z.number().positive(),
  schedule: z.array(z.object({
    departureTime: z.string(),
    arrivalTime: z.string(),
    seats: z.number().int().positive()
  })),
  operatorName: z.string(),
  operatorContact: z.string().regex(/^(\+8801|01)[3-9]\d{8}$/)
});

// Bangladesh Transit Routes
app.get('/api/routes/search', async (req: Request, res: Response) => {
  const { from, to, mode } = req.query;
  try {
    // Logic to search routes based on locations and mode
    logger.info('Route search', { from, to, mode });
    res.status(200).json(/* route search results */);
  } catch (error) {
    logger.error('Route search failed:', error);
    res.status(500).send('Search failed');
  }
});

app.get('/api/locations/popular', async (_req: Request, res: Response) => {
  const popularLocations = [
    { name: 'Dhaka', district: 'Dhaka', division: 'Dhaka' },
    { name: 'Chittagong', district: 'Chittagong', division: 'Chittagong' },
    { name: 'Sylhet', district: 'Sylhet', division: 'Sylhet' }
    // Add more popular locations
  ];
  res.status(200).json(popularLocations);
});

// Initialize payment gateways
const bkash = new BKashGateway({
  username: process.env.BKASH_USERNAME!,
  password: process.env.BKASH_PASSWORD!,
  appKey: process.env.BKASH_APP_KEY!,
  appSecret: process.env.BKASH_APP_SECRET!,
  baseURL: process.env.BKASH_BASE_URL!
});

const nagad = new NagadGateway({
  merchantID: process.env.NAGAD_MERCHANT_ID!,
  merchantKey: process.env.NAGAD_MERCHANT_KEY!,
  baseURL: process.env.NAGAD_BASE_URL!
});

// Initialize vehicle tracker
const vehicleTracker = new VehicleTracker();

// Initialize AI Assistant
const aiAssistant = new AIAssistant();

// Bangladesh Payment Integration
app.post('/api/payment/mobile', 
  authenticateJWT,
  validate(paymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await processPayment(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// AI Assistant endpoints
app.post('/api/assistant/chat', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { query, language = 'en' } = req.body;
    const userId = req.user?.id;
    
    const response = await aiAssistant.handleUserQuery(
      userId!, 
      query,
      language as 'en' | 'bn'
    );
    
    res.json(response);
  } catch (error) {
    logger.error('AI Assistant error:', error);
    res.status(500).json({
      error: 'AI_ERROR',
      message: i18n.t('errors.AI_PROCESSING_FAILED')
    });
  }
});

app.get('/api/assistant/suggestions', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    const suggestions = await aiAssistant.generateSuggestions(query as string);
    res.json(suggestions);
  } catch (error) {
    logger.error('Suggestions error:', error);
    res.status(500).json({
      error: 'SUGGESTIONS_ERROR',
      message: i18n.t('errors.SUGGESTIONS_FAILED')
    });
  }
});

// Global error handler
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err,
    requestId: req.requestId,
    path: req.path
  });

  if (err instanceof PaymentError) {
    return res.status(400).json({
      error: err.code,
      message: i18n.t(`errors.${err.code}`),
      requestId: req.requestId
    });
  }

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      details: err.errors,
      requestId: req.requestId
    });
  }

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: i18n.t('errors.INTERNAL_SERVER_ERROR'),
    requestId: req.requestId
  });
};

// Graceful shutdown
const server = app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});

// WebSocket server for real-time tracking
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const wsId = crypto.randomUUID();
  logger.info('WebSocket connected', { wsId });

  // Heartbeat implementation
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (message) => {
    try {
      const { type, data } = JSON.parse(message.toString());
      switch (type) {
        case 'LOCATION_UPDATE':
          vehicleTracker.updateLocation(data);
          break;
        case 'TRACK_VEHICLE':
          vehicleTracker.subscribeToVehicle(data.vehicleId, ws);
          break;
      }
      logger.info('WebSocket message received', { wsId, message: { type, data } });
      ws.send(JSON.stringify({ status: 'received' }));
    } catch (error) {
      logger.error('WebSocket message error', { wsId, error });
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error', { wsId, error });
  });

  ws.on('close', () => {
    logger.info('WebSocket closed', { wsId });
  });
});

// WebSocket heartbeat interval
const interval = setInterval(() => {
  wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
    if (ws.isAlive === false) {
      logger.warn('Terminating stale WebSocket connection');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    wss.close(() => {
      logger.info('WebSocket server closed');
      process.exit(0);
    });
  });
});

export default app;