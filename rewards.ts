import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { 
  rewards, 
  achievements, 
  userAchievements, 
  type Achievement,
  type UserAchievement,
  type Reward
} from "@shared/schema";

export class RewardsService {
  private static readonly POINTS_PER_RIDE = 10;
  private static readonly STREAK_BONUS_MULTIPLIER = 1.5;
  private static readonly POINTS_PER_KM = 2;

  async initializeUserRewards(userId: number): Promise<Reward> {
    const [reward] = await db
      .insert(rewards)
      .values({
        userId,
        points: 0,
        level: 1,
        streak: 0
      })
      .returning();
    return reward;
  }

  async recordRide(userId: number, distanceKm: number): Promise<void> {
    // Get user's current rewards
    let [reward] = await db
      .select()
      .from(rewards)
      .where(eq(rewards.userId, userId));

    if (!reward) {
      reward = await this.initializeUserRewards(userId);
    }

    // Calculate points for this ride
    const basePoints = this.POINTS_PER_RIDE + (distanceKm * this.POINTS_PER_KM);
    let bonusPoints = 0;

    // Check if streak is maintained (ride within 24 hours of last ride)
    const now = new Date();
    const lastRide = reward.lastRideDate;
    const isStreakMaintained = lastRide && 
      (now.getTime() - lastRide.getTime() <= 24 * 60 * 60 * 1000);

    if (isStreakMaintained) {
      reward.streak += 1;
      bonusPoints = Math.floor(basePoints * this.STREAK_BONUS_MULTIPLIER);
    } else {
      reward.streak = 1;
    }

    const totalPoints = basePoints + bonusPoints;

    // Update user rewards
    await db
      .update(rewards)
      .set({
        points: sql`${rewards.points} + ${totalPoints}`,
        streak: reward.streak,
        lastRideDate: now,
        level: sql`CASE 
          WHEN points + ${totalPoints} >= 1000 THEN 4
          WHEN points + ${totalPoints} >= 500 THEN 3
          WHEN points + ${totalPoints} >= 100 THEN 2
          ELSE 1
        END`
      })
      .where(eq(rewards.userId, userId));

    // Check and update achievements
    await this.checkAchievements(userId);
  }

  private async checkAchievements(userId: number): Promise<void> {
    const [userReward] = await db
      .select()
      .from(rewards)
      .where(eq(rewards.userId, userId));

    if (!userReward) return;

    // Get all achievements
    const allAchievements = await db
      .select()
      .from(achievements);

    // Get user's current achievements
    const userAchievs = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    // Check each achievement
    for (const achievement of allAchievements) {
      const existing = userAchievs.find(ua => ua.achievementId === achievement.id);
      if (existing) continue;

      let isEarned = false;
      let progress = 0;

      switch (achievement.type) {
        case 'POINTS':
          progress = userReward.points;
          isEarned = userReward.points >= achievement.threshold;
          break;
        case 'STREAK':
          progress = userReward.streak;
          isEarned = userReward.streak >= achievement.threshold;
          break;
        case 'LEVEL':
          progress = userReward.level;
          isEarned = userReward.level >= achievement.threshold;
          break;
      }

      if (isEarned) {
        // Award achievement and bonus points
        await db.transaction(async (tx) => {
          await tx
            .insert(userAchievements)
            .values({
              userId,
              achievementId: achievement.id,
              progress: achievement.threshold
            });

          await tx
            .update(rewards)
            .set({
              points: sql`${rewards.points} + ${achievement.rewardPoints}`
            })
            .where(eq(rewards.userId, userId));
        });
      } else {
        // Update progress
        await db
          .insert(userAchievements)
          .values({
            userId,
            achievementId: achievement.id,
            progress
          })
          .onConflictDoUpdate({
            target: [userAchievements.userId, userAchievements.achievementId],
            set: { progress }
          });
      }
    }
  }

  async getUserRewards(userId: number): Promise<{
    reward: Reward;
    achievements: (Achievement & { progress: number; isEarned: boolean; })[];
  }> {
    const [reward] = await db
      .select()
      .from(rewards)
      .where(eq(rewards.userId, userId));

    if (!reward) {
      throw new Error('User rewards not found');
    }

    const userAchievs = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const allAchievements = await db
      .select()
      .from(achievements);

    const achievementsWithProgress = allAchievements.map(achievement => {
      const userAchiev = userAchievs.find(ua => ua.achievementId === achievement.id);
      return {
        ...achievement,
        progress: userAchiev?.progress || 0,
        isEarned: userAchiev?.progress >= achievement.threshold
      };
    });

    return {
      reward,
      achievements: achievementsWithProgress
    };
  }
}

export const rewardsService = new RewardsService();
