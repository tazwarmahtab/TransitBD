import Stripe from "stripe";
import { transitCards, transactions, type Transaction } from "@shared/schema";
import { db, sql } from "../db";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

export class PaymentService {
  async createStripePayment(amount: number, transitCardId: number, currency: string = "bdt") {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to smallest currency unit
        currency,
        metadata: {
          transitCardId: transitCardId.toString(),
          type: 'TOPUP'
        }
      });

      // Create a pending transaction
      const [transaction] = await db
        .insert(transactions)
        .values({
          transitCardId,
          amount: amount.toString(),
          type: 'TOPUP',
          paymentMethod: 'CARD',
          status: 'PENDING',
          metadata: { paymentIntentId: paymentIntent.id }
        })
        .returning();

      return {
        clientSecret: paymentIntent.client_secret,
        transactionId: transaction.id
      };
    } catch (error) {
      console.error('Stripe payment creation failed:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  async handleStripeWebhook(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const transitCardId = parseInt(paymentIntent.metadata.transitCardId);
          const amount = paymentIntent.amount / 100;

          // Update transaction status
          await db
            .update(transactions)
            .set({
              status: 'COMPLETED'
            })
            .where(eq(transactions.metadata['paymentIntentId'], paymentIntent.id));

          // Update transit card balance
          await db
            .update(transitCards)
            .set({
              balance: sql`CAST(balance AS DECIMAL) + ${amount}`
            })
            .where(eq(transitCards.id, transitCardId));

          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;

          // Update transaction status
          await db
            .update(transactions)
            .set({ status: 'FAILED' })
            .where(eq(transactions.metadata['paymentIntentId'], paymentIntent.id));
          break;
        }
      }
    } catch (error) {
      console.error('Webhook handling failed:', error);
      throw error;
    }
  }

  async initiateMobilePayment(
    type: "BKASH" | "NAGAD",
    amount: number,
    transitCardId: number,
    phoneNumber: string
  ) {
    try {
      // Create a pending transaction first
      const [transaction] = await db
        .insert(transactions)
        .values({
          transitCardId,
          amount: amount.toString(),
          type: 'TOPUP',
          paymentMethod: type,
          status: 'PENDING',
          metadata: { phoneNumber }
        })
        .returning();

      // This would integrate with bKash/Nagad APIs in production
      // For now, we'll simulate the payment process
      const paymentId = Math.random().toString(36).substring(7);

      // Update transaction with payment ID
      await db
        .update(transactions)
        .set({
          metadata: { ...transaction.metadata, paymentId }
        })
        .where(eq(transactions.id, transaction.id));

      return {
        paymentId,
        transactionId: transaction.id,
        status: "PENDING",
        amount,
        provider: type,
      };
    } catch (error) {
      console.error('Mobile payment initiation failed:', error);
      throw new Error('Failed to initiate mobile payment');
    }
  }

  async verifyMobilePayment(transactionId: number) {
    try {
      // Get the transaction
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // In production, verify with the actual payment provider
      // For now, simulate success
      const success = Math.random() > 0.1; // 90% success rate

      if (success) {
        // Update transaction status
        await db
          .update(transactions)
          .set({
            status: 'COMPLETED'
          })
          .where(eq(transactions.id, transaction.id));

        // Update transit card balance
        await db
          .update(transitCards)
          .set({
            balance: sql`CAST(balance AS DECIMAL) + ${transaction.amount}`
          })
          .where(eq(transitCards.id, transaction.transitCardId));

        return {
          status: "COMPLETED",
          transactionId: `${transaction.id}_${Date.now()}`,
        };
      } else {
        await db
          .update(transactions)
          .set({ status: 'FAILED' })
          .where(eq(transactions.id, transactionId));

        return {
          status: "FAILED",
          error: "Payment verification failed",
        };
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
      throw new Error('Failed to verify payment');
    }
  }

  async initiateSplitPayment(
    amount: number,
    transitCardId: number,
    splitGroupId: number,
    paymentMethod: string
  ): Promise<Transaction> {
    try {
      // Get the split group to calculate shares
      const [group] = await db
        .select()
        .from(splitPaymentGroups)
        .where(eq(splitPaymentGroups.id, splitGroupId));

      if (!group) {
        throw new Error('Split payment group not found');
      }

      // Calculate individual shares based on the group's sharing rules
      const splitDetails = group.members.map((member: any) => ({
        userId: member.userId,
        share: (amount * member.percentage) / 100,
        status: 'PENDING'
      }));

      // Create the split payment transaction
      const [transaction] = await db
        .insert(transactions)
        .values({
          transitCardId,
          amount: amount.toString(),
          type: 'SPLIT_PAYMENT',
          paymentMethod,
          status: 'PENDING',
          splitGroupId,
          splitDetails,
          metadata: { initiatedAt: new Date().toISOString() }
        })
        .returning();

      return transaction;
    } catch (error) {
      console.error('Split payment initiation failed:', error);
      throw new Error('Failed to initiate split payment');
    }
  }

  async approveSplitPaymentShare(
    transactionId: number,
    userId: number,
    paymentMethodId: string
  ) {
    try {
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Update the split details to mark this user's share as completed
      const updatedSplitDetails = transaction.splitDetails.map((detail: any) =>
        detail.userId === userId
          ? { ...detail, status: 'COMPLETED', paymentMethodId }
          : detail
      );

      await db
        .update(transactions)
        .set({
          splitDetails: updatedSplitDetails,
          // If all shares are completed, mark the transaction as completed
          status: updatedSplitDetails.every((d: any) => d.status === 'COMPLETED')
            ? 'COMPLETED'
            : 'PENDING'
        })
        .where(eq(transactions.id, transactionId));

      // If all shares are paid, update the transit card balance
      if (updatedSplitDetails.every((d: any) => d.status === 'COMPLETED')) {
        await db
          .update(transitCards)
          .set({
            balance: sql`CAST(balance AS DECIMAL) + ${transaction.amount}`
          })
          .where(eq(transitCards.id, transaction.transitCardId));
      }

      return true;
    } catch (error) {
      console.error('Split payment share approval failed:', error);
      throw new Error('Failed to approve split payment share');
    }
  }
}

export const paymentService = new PaymentService();