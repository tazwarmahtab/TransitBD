import { pgTable, text, serial, boolean, timestamp, integer, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Keep existing tables unchanged...

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  transportTypeId: integer("transport_type_id").references(() => transportTypes.id).notNull(),
  name: text("name").notNull(),
  startLocation: jsonb("start_location").notNull(), // {lat: number, lng: number}
  endLocation: jsonb("end_location").notNull(), // {lat: number, lng: number}
  waypoints: jsonb("waypoints"), // Array of {lat: number, lng: number}
  schedule: jsonb("schedule").notNull(), // Array of departure times
  isActive: boolean("is_active").notNull().default(true),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  language: text("language").notNull().default("en"),
});

export const transitCards = pgTable("transit_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  cardNumber: text("card_number").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transitCardId: integer("transit_card_id").references(() => transitCards.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // 'TOPUP', 'PAYMENT', 'SPLIT_PAYMENT'
  paymentMethod: text("payment_method").notNull(), // 'BKASH', 'NAGAD', 'CARD', etc.
  status: text("status").notNull(), // 'PENDING', 'COMPLETED', 'FAILED'
  splitGroupId: integer("split_group_id").references(() => splitPaymentGroups.id),
  splitDetails: jsonb("split_details"), // Details of how payment was split
  metadata: jsonb("metadata"), // Additional payment gateway data
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transportTypes = pgTable("transport_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // 'BUS', 'TRAIN', 'CNG', etc.
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }).notNull(),
  ratePerKm: decimal("rate_per_km", { precision: 10, scale: 2 }).notNull(),
  icon: text("icon").notNull(), // Icon identifier for the frontend
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  transportTypeId: integer("transport_type_id").references(() => transportTypes.id).notNull(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  registrationNumber: text("registration_number").notNull().unique(),
  currentLocation: jsonb("current_location").notNull(), // {lat: number, lng: number}
  heading: integer("heading").notNull(), // 0-359 degrees
  speed: decimal("speed", { precision: 5, scale: 2 }), // km/h
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default("ONLINE"), // 'ONLINE', 'OFFLINE', 'MAINTENANCE'
});

export const vehicleUpdates = pgTable("vehicle_updates", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  location: jsonb("location").notNull(), // {lat: number, lng: number}
  heading: integer("heading").notNull(),
  speed: decimal("speed", { precision: 5, scale: 2 }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const physicalCards = pgTable("physical_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  orderStatus: text("order_status").notNull().default("PENDING"), // PENDING, SHIPPED, DELIVERED
  shippingAddress: jsonb("shipping_address").notNull(),
  trackingNumber: text("tracking_number"),
  orderedAt: timestamp("ordered_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  language: text("language").notNull().default("en"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  points: integer("points").notNull().default(0),
  level: integer("level").notNull().default(1),
  streak: integer("streak").notNull().default(0),
  lastRideDate: timestamp("last_ride_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  pointsRequired: integer("points_required").notNull(),
  type: text("type").notNull(), // 'STREAK', 'RIDES', 'DISTANCE', etc.
  threshold: integer("threshold").notNull(), // Number of rides/days/km required
  rewardPoints: integer("reward_points").notNull(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id).notNull(),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
  progress: integer("progress").notNull().default(0),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  stripePaymentMethodId: text("stripe_payment_method_id").notNull(),
  type: text("type").notNull(), // 'card', 'bkash', etc.
  last4: text("last4"), // Last 4 digits of card/phone
  isDefault: boolean("is_default").notNull().default(false),
  metadata: jsonb("metadata"), // Additional payment method details
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const autoRechargeSettings = pgTable("auto_recharge_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  transitCardId: integer("transit_card_id").references(() => transitCards.id).notNull(),
  paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id).notNull(),
  thresholdAmount: decimal("threshold_amount", { precision: 10, scale: 2 }).notNull(),
  rechargeAmount: decimal("recharge_amount", { precision: 10, scale: 2 }).notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  lastRechargeAt: timestamp("last_recharge_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const splitPaymentGroups = pgTable("split_payment_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  creatorId: integer("creator_id").references(() => users.id).notNull(),
  members: jsonb("members").notNull(), // Array of user IDs and their share percentages
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).pick({
  transportTypeId: true,
  routeId: true,
  registrationNumber: true,
  currentLocation: true,
  heading: true,
  speed: true,
  status: true,
});

export const insertVehicleUpdateSchema = createInsertSchema(vehicleUpdates).pick({
  vehicleId: true,
  location: true,
  heading: true,
  speed: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  language: true,
});

export const insertTransitCardSchema = createInsertSchema(transitCards).pick({
  userId: true,
  cardNumber: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  transitCardId: true,
  amount: true,
  type: true,
  paymentMethod: true,
  status: true,
  metadata: true,
  splitGroupId: true,
  splitDetails: true,
});

export const insertWaitlistSchema = createInsertSchema(waitlist).pick({
  email: true,
  language: true,
});

export const insertPhysicalCardSchema = createInsertSchema(physicalCards).pick({
  userId: true,
  shippingAddress: true,
});

export const insertRewardSchema = createInsertSchema(rewards).pick({
  userId: true,
  points: true,
  level: true,
  streak: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).pick({
  name: true,
  description: true,
  icon: true,
  pointsRequired: true,
  type: true,
  threshold: true,
  rewardPoints: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).pick({
  userId: true,
  achievementId: true,
  progress: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).pick({
  userId: true,
  stripePaymentMethodId: true,
  type: true,
  last4: true,
  isDefault: true,
  metadata: true,
});

export const insertAutoRechargeSettingsSchema = createInsertSchema(autoRechargeSettings).pick({
  userId: true,
  transitCardId: true,
  paymentMethodId: true,
  thresholdAmount: true,
  rechargeAmount: true,
  isEnabled: true,
});

export const insertSplitPaymentGroupSchema = createInsertSchema(splitPaymentGroups).pick({
  name: true,
  creatorId: true,
  members: true,
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertVehicleUpdate = z.infer<typeof insertVehicleUpdateSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type VehicleUpdate = typeof vehicleUpdates.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type TransitCard = typeof transitCards.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type TransportType = typeof transportTypes.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type Waitlist = typeof waitlist.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type InsertPhysicalCard = z.infer<typeof insertPhysicalCardSchema>;
export type PhysicalCard = typeof physicalCards.$inferSelect;

export type Reward = typeof rewards.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type InsertAutoRechargeSettings = z.infer<typeof insertAutoRechargeSettingsSchema>;
export type InsertSplitPaymentGroup = z.infer<typeof insertSplitPaymentGroupSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type AutoRechargeSettings = typeof autoRechargeSettings.$inferSelect;
export type SplitPaymentGroup = typeof splitPaymentGroups.$inferSelect;