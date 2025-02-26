import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import fileUpload from "express-fileupload";
import {
  insertWaitlistSchema,
  insertTransactionSchema,
  vehicles,
  routes,
  type Vehicle,
  physicalCards,
  transitCards,
  transactions,
  type Transaction,
  type UploadedFile,
} from "@shared/schema";
import { ZodError } from "zod";
import { setupWebSocket } from "./socket";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { paymentService } from "./services/payment";
import { routeOptimizationService } from "./services/route-optimization";
import { buffer } from "micro";
import Stripe from "stripe";
import { rewardsService } from "./services/rewards";
import { aiService } from "./services/ai-service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Add file upload middleware
  app.use(fileUpload({
    createParentPath: true,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB max file size
    },
  }));

  // Public endpoints
  app.post("/api/waitlist", async (req, res) => {
    try {
      const data = insertWaitlistSchema.parse(req.body);
      await storage.addToWaitlist(data);
      res.sendStatus(200);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).send(error.message);
      } else {
        res.status(500).send("Internal server error");
      }
    }
  });

  // Protected endpoints - Transit card
  app.get("/api/transit-card", requireAuth, async (req, res) => {
    const card = await storage.getTransitCard(req.user!.id);
    res.json(card);
  });

  app.post("/api/transit-card", requireAuth, async (req, res) => {
    const card = await storage.createTransitCard(req.user!.id);
    res.json(card);
  });

  // Protected endpoints - Transactions
  app.get("/api/transactions", requireAuth, async (req, res) => {
    const card = await storage.getTransitCard(req.user!.id);
    if (!card) return res.sendStatus(404);

    const transactions = await storage.getTransactions(card.id);
    res.json(transactions);
  });

  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      const data = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(data);

      if (transaction.type === "PAYMENT" && transaction.status === "COMPLETED") {
        const distanceKm = parseFloat(transaction.amount) / 10;
        await rewardsService.recordRide(req.user!.id, distanceKm);
      }

      res.json(transaction);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).send(error.message);
      } else {
        console.error('Transaction creation failed:', error);
        res.status(500).send("Internal server error");
      }
    }
  });

  // Protected endpoints - Routes
  app.get("/api/routes", requireAuth, async (req, res) => {
    const routes = await storage.getRoutes();
    res.json(routes);
  });

  // Protected endpoints - Rewards
  app.get("/api/rewards", requireAuth, async (req, res) => {
    try {
      const rewardsData = await rewardsService.getUserRewards(req.user!.id);
      res.json(rewardsData);
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  // Protected endpoints - Payments
  app.post("/api/payment/stripe/create-intent", requireAuth, async (req, res) => {
    try {
      const { amount, transitCardId } = req.body;

      const [card] = await db
        .select()
        .from(transitCards)
        .where(eq(transitCards.id, transitCardId))
        .where(eq(transitCards.userId, req.user!.id));

      if (!card) {
        return res.status(403).json({ error: "Transit card not found or unauthorized" });
      }

      const result = await paymentService.createStripePayment(amount, transitCardId);
      res.json(result);
    } catch (error) {
      console.error('Payment intent creation failed:', error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  app.post("/api/payment/mobile/initiate", requireAuth, async (req, res) => {
    try {
      const { type, amount, transitCardId, phoneNumber } = req.body;

      const [card] = await db
        .select()
        .from(transitCards)
        .where(eq(transitCards.id, transitCardId))
        .where(eq(transitCards.userId, req.user!.id));

      if (!card) {
        return res.status(403).json({ error: "Transit card not found or unauthorized" });
      }

      const payment = await paymentService.initiateMobilePayment(
        type,
        amount,
        transitCardId,
        phoneNumber
      );
      res.json(payment);
    } catch (error) {
      console.error('Mobile payment initiation failed:', error);
      res.status(500).json({ error: "Failed to initiate mobile payment" });
    }
  });

  app.post("/api/payment/mobile/verify", requireAuth, async (req, res) => {
    try {
      const { transactionId } = req.body;

      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      const [card] = await db
        .select()
        .from(transitCards)
        .where(eq(transitCards.id, transaction.transitCardId))
        .where(eq(transitCards.userId, req.user!.id));

      if (!card) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const result = await paymentService.verifyMobilePayment(transactionId);
      res.json(result);
    } catch (error: any) {
      console.error('Payment verification failed:', error);
      res.status(500).json({ error: error.message || "Failed to verify payment" });
    }
  });

  // Stripe webhook - Update to use raw body
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const rawBody = await buffer(req);

    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      await paymentService.handleStripeWebhook(event);
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook handling failed:', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });

  // Protected endpoints - Physical card
  app.post("/api/physical-card/order", requireAuth, async (req, res) => {
    try {
      const order = await db
        .insert(physicalCards)
        .values({
          userId: req.user!.id,
          shippingAddress: req.body.shippingAddress,
        })
        .returning();

      res.json(order[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.get("/api/physical-card/status", requireAuth, async (req, res) => {
    try {
      const orders = await db
        .select()
        .from(physicalCards)
        .where(eq(physicalCards.userId, req.user!.id));

      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Route optimization endpoint
  app.post("/api/routes/:routeId/optimize", async (req, res) => {
    try {
      const routeId = parseInt(req.params.routeId);
      const factors = {
        trafficLevel: parseFloat(req.body.trafficLevel) || 0.5,
        timeOfDay: req.body.timeOfDay || new Date().getHours().toString().padStart(2, '0') + ":00",
        dayOfWeek: req.body.dayOfWeek || new Date().getDay().toString(),
        weatherCondition: req.body.weatherCondition || "clear"
      };

      const optimizedRoute = await routeOptimizationService.optimizeRoute(routeId, factors);
      res.json(optimizedRoute);
    } catch (error) {
      console.error("Route optimization error:", error);
      res.status(500).json({ error: "Failed to optimize route" });
    }
  });

  app.post("/api/routes/multi-modal", async (req, res) => {
    try {
      const { start, end, preferences } = req.body;

      const factors = {
        trafficLevel: parseFloat(preferences?.trafficLevel) || 0.5,
        timeOfDay: preferences?.timeOfDay || new Date().getHours().toString().padStart(2, '0') + ":00",
        dayOfWeek: preferences?.dayOfWeek || new Date().getDay().toString(),
        weatherCondition: preferences?.weatherCondition || "clear",
        preferredModes: preferences?.transportTypes || undefined,
        maxTransfers: preferences?.maxTransfers || 2
      };

      const optimizedRoute = await routeOptimizationService.findMultiModalRoute(
        start,
        end,
        factors
      );

      res.json(optimizedRoute);
    } catch (error) {
      console.error("Multi-modal route optimization error:", error);
      res.status(500).json({ error: "Failed to find multi-modal route" });
    }
  });

    // New chat endpoint
  app.post("/api/chat", requireAuth, async (req, res) => {
    if (!process.env.OPENAI_API_KEY && req.path.includes('/api/chat')) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message is required" });
      
      const response = await aiService.handleUserInput(req.user!.id.toString(), message);
      res.json(response);
    } catch (error) {
      console.error('Chat processing error:', error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Voice assistant endpoint
  app.post("/api/process-voice", requireAuth, async (req, res) => {
    try {
      const audioFile = req.files?.audio as UploadedFile;
      if (!audioFile) {
        throw new Error("No audio file provided");
      }

      const text = await aiService.processSpeechCommand(audioFile.data);
      const response = await aiService.handleUserInput(req.user!.id.toString(), text);
      res.json(response);
    } catch (error: any) {
      console.error('Voice processing error:', error);
      res.status(500).json({ error: error.message || "Failed to process voice command" });
    }
  });

  // Split payment group management
  app.get("/api/split-payment/groups", requireAuth, async (req, res) => {
    try {
      const groups = await storage.getSplitPaymentGroups(req.user!.id);
      res.json(groups);
    } catch (error) {
      console.error('Failed to fetch split payment groups:', error);
      res.status(500).json({ error: "Failed to fetch split payment groups" });
    }
  });

  app.post("/api/split-payment/groups", requireAuth, async (req, res) => {
    try {
      const group = await storage.createSplitPaymentGroup({
        ...req.body,
        creatorId: req.user!.id
      });
      res.json(group);
    } catch (error) {
      console.error('Failed to create split payment group:', error);
      res.status(500).json({ error: "Failed to create split payment group" });
    }
  });

  app.patch("/api/split-payment/groups/:groupId", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const group = await storage.updateSplitPaymentGroup(groupId, req.body);
      res.json(group);
    } catch (error) {
      console.error('Failed to update split payment group:', error);
      res.status(500).json({ error: "Failed to update split payment group" });
    }
  });

  app.delete("/api/split-payment/groups/:groupId", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      await storage.deleteSplitPaymentGroup(groupId);
      res.sendStatus(200);
    } catch (error) {
      console.error('Failed to delete split payment group:', error);
      res.status(500).json({ error: "Failed to delete split payment group" });
    }
  });

  // Split payment transactions
  app.post("/api/split-payment/initiate", requireAuth, async (req, res) => {
    try {
      const { amount, transitCardId, splitGroupId, paymentMethod } = req.body;
      const transaction = await paymentService.initiateSplitPayment(
        amount,
        transitCardId,
        splitGroupId,
        paymentMethod
      );
      res.json(transaction);
    } catch (error) {
      console.error('Failed to initiate split payment:', error);
      res.status(500).json({ error: "Failed to initiate split payment" });
    }
  });

  app.post("/api/split-payment/:transactionId/approve", requireAuth, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const { paymentMethodId } = req.body;

      await paymentService.approveSplitPaymentShare(
        transactionId,
        req.user!.id,
        paymentMethodId
      );

      res.sendStatus(200);
    } catch (error) {
      console.error('Failed to approve split payment share:', error);
      res.status(500).json({ error: "Failed to approve split payment share" });
    }
  });

  const httpServer = createServer(app);
  setupWebSocket(httpServer);
  return httpServer;
}