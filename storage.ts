import { paymentMethods, autoRechargeSettings, splitPaymentGroups, users, waitlist, transitCards, transactions, routes, type User, type InsertUser, type InsertWaitlist, type TransitCard, type Transaction, type Route, type InsertTransaction, type PaymentMethod, type InsertPaymentMethod, type AutoRechargeSettings, type InsertAutoRechargeSettings, type SplitPaymentGroup, type InsertSplitPaymentGroup } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { customAlphabet } from 'nanoid';

const PostgresSessionStore = connectPg(session);
const generateCardNumber = customAlphabet('1234567890', 16);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  addToWaitlist(data: InsertWaitlist): Promise<void>;
  getTransitCard(userId: number): Promise<TransitCard | undefined>;
  createTransitCard(userId: number): Promise<TransitCard>;
  getTransactions(transitCardId: number): Promise<Transaction[]>;
  createTransaction(data: InsertTransaction): Promise<Transaction>;
  getRoutes(): Promise<Route[]>;
  sessionStore: session.Store;
  getPaymentMethods(userId: number): Promise<PaymentMethod[]>;
  createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod>;
  setDefaultPaymentMethod(userId: number, paymentMethodId: number): Promise<void>;
  deletePaymentMethod(userId: number, paymentMethodId: number): Promise<void>;
  getAutoRechargeSettings(userId: number): Promise<AutoRechargeSettings | undefined>;
  updateAutoRechargeSettings(data: InsertAutoRechargeSettings): Promise<AutoRechargeSettings>;
  disableAutoRecharge(userId: number): Promise<void>;
  getSplitPaymentGroups(userId: number): Promise<SplitPaymentGroup[]>;
  createSplitPaymentGroup(data: InsertSplitPaymentGroup): Promise<SplitPaymentGroup>;
  updateSplitPaymentGroup(groupId: number, data: Partial<InsertSplitPaymentGroup>): Promise<SplitPaymentGroup>;
  deleteSplitPaymentGroup(groupId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
      schemaName: 'public',
      pruneSessionInterval: 60 * 15,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async addToWaitlist(data: InsertWaitlist): Promise<void> {
    await db.insert(waitlist).values(data);
  }

  async getTransitCard(userId: number): Promise<TransitCard | undefined> {
    const [card] = await db
      .select()
      .from(transitCards)
      .where(eq(transitCards.userId, userId));
    return card;
  }

  async createTransitCard(userId: number): Promise<TransitCard> {
    const [card] = await db
      .insert(transitCards)
      .values({
        userId,
        cardNumber: generateCardNumber(),
      })
      .returning();
    return card;
  }

  async getTransactions(transitCardId: number): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.transitCardId, transitCardId))
      .orderBy(transactions.createdAt);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();

    if (transaction.type === "TOPUP" && transaction.status === "COMPLETED") {
      await db
        .update(transitCards)
        .set({
          balance: sql`balance + ${transaction.amount}`,
        })
        .where(eq(transitCards.id, transaction.transitCardId));
    }

    return transaction;
  }

  async getRoutes(): Promise<Route[]> {
    return db.select().from(routes).where(eq(routes.isActive, true));
  }

  async getUserReward(userId: number): Promise<Reward | undefined> {
    const [reward] = await db
      .select()
      .from(rewards)
      .where(eq(rewards.userId, userId));
    return reward;
  }

  async getAchievements(): Promise<Achievement[]> {
    return db.select().from(achievements);
  }

  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));
  }
  async getPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    return db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, userId));
  }

  async createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod> {
    const [paymentMethod] = await db
      .insert(paymentMethods)
      .values(data)
      .returning();
    return paymentMethod;
  }

  async setDefaultPaymentMethod(userId: number, paymentMethodId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // First, set all payment methods for this user to non-default
      await tx
        .update(paymentMethods)
        .set({ isDefault: false })
        .where(eq(paymentMethods.userId, userId));

      // Then set the specified payment method as default
      await tx
        .update(paymentMethods)
        .set({ isDefault: true })
        .where(eq(paymentMethods.id, paymentMethodId));
    });
  }

  async deletePaymentMethod(userId: number, paymentMethodId: number): Promise<void> {
    await db
      .delete(paymentMethods)
      .where(sql`${paymentMethods.id} = ${paymentMethodId} AND ${paymentMethods.userId} = ${userId}`);
  }

  async getAutoRechargeSettings(userId: number): Promise<AutoRechargeSettings | undefined> {
    const [settings] = await db
      .select()
      .from(autoRechargeSettings)
      .where(eq(autoRechargeSettings.userId, userId));
    return settings;
  }

  async updateAutoRechargeSettings(data: InsertAutoRechargeSettings): Promise<AutoRechargeSettings> {
    const [settings] = await db
      .insert(autoRechargeSettings)
      .values(data)
      .onConflict(sql`(user_id, transit_card_id)`)
      .mergeUpdate(["threshold_amount", "recharge_amount", "payment_method_id", "is_enabled", "updated_at"])
      .returning();
    return settings;
  }

  async disableAutoRecharge(userId: number): Promise<void> {
    await db
      .update(autoRechargeSettings)
      .set({ isEnabled: false })
      .where(eq(autoRechargeSettings.userId, userId));
  }

  async getSplitPaymentGroups(userId: number): Promise<SplitPaymentGroup[]> {
    const groups = await db
      .select()
      .from(splitPaymentGroups)
      .where(sql`${splitPaymentGroups.creatorId} = ${userId} OR ${splitPaymentGroups.members}::jsonb @> jsonb_build_array(jsonb_build_object('userId', ${userId}))`);
    return groups;
  }

  async createSplitPaymentGroup(data: InsertSplitPaymentGroup): Promise<SplitPaymentGroup> {
    const [group] = await db
      .insert(splitPaymentGroups)
      .values(data)
      .returning();
    return group;
  }

  async updateSplitPaymentGroup(groupId: number, data: Partial<InsertSplitPaymentGroup>): Promise<SplitPaymentGroup> {
    const [group] = await db
      .update(splitPaymentGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(splitPaymentGroups.id, groupId))
      .returning();
    return group;
  }

  async deleteSplitPaymentGroup(groupId: number): Promise<void> {
    await db
      .update(splitPaymentGroups)
      .set({ isActive: false })
      .where(eq(splitPaymentGroups.id, groupId));
  }
}

export const storage = new DatabaseStorage();