import { Route, Vehicle, TransportType } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

type OptimizationFactors = {
  trafficLevel: number; // 0-1 scale
  timeOfDay: string;
  dayOfWeek: string;
  weatherCondition: string;
  preferredModes?: number[]; // transport type IDs
  maxTransfers?: number;
};

type RouteSegment = {
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  distance: number;
  estimatedTime: number;
  trafficLevel: number;
  transportTypeId: number;
  transferPoint?: { lat: number; lng: number };
};

type MultiModalRoute = {
  segments: RouteSegment[];
  totalTime: number;
  totalDistance: number;
  numberOfTransfers: number;
  transportTypes: number[];
};

export class RouteOptimizationService {
  private calculateSegmentScore(segment: RouteSegment, factors: OptimizationFactors): number {
    // Basic scoring algorithm
    const trafficImpact = 1 - (segment.trafficLevel * 0.7 + factors.trafficLevel * 0.3);
    const timeScore = this.getTimeOfDayScore(factors.timeOfDay);
    const weatherScore = this.getWeatherScore(factors.weatherCondition);

    // Mode preference scoring
    const modePreferenceScore = factors.preferredModes?.includes(segment.transportTypeId) ? 1.2 : 1;

    return (
      segment.distance * 0.3 +
      segment.estimatedTime * 0.3 +
      trafficImpact * 0.2 +
      timeScore * 0.1 +
      weatherScore * 0.1
    ) * modePreferenceScore;
  }

  private getTimeOfDayScore(timeOfDay: string): number {
    // Simplified time-based scoring
    const peakHours = ['08:00', '09:00', '17:00', '18:00'];
    return peakHours.includes(timeOfDay) ? 0.5 : 1;
  }

  private getWeatherScore(weather: string): number {
    // Weather impact scoring
    const weatherScores: Record<string, number> = {
      'clear': 1,
      'rain': 0.7,
      'heavy_rain': 0.4,
      'flood': 0.2
    };
    return weatherScores[weather] || 0.8;
  }

  async findMultiModalRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    factors: OptimizationFactors
  ): Promise<MultiModalRoute> {
    // Get all available transport types
    const transportTypes = await db.select().from(transportTypes);

    // Get all routes that could be part of the journey
    const potentialRoutes = await db.select().from(routes).where(eq(routes.isActive, true));

    // Find potential transfer points (simplified version)
    const transferPoints = this.findTransferPoints(potentialRoutes);

    // Generate possible route combinations
    const possibleRoutes = this.generateRouteCombinations(
      start,
      end,
      potentialRoutes,
      transferPoints,
      factors.maxTransfers || 2
    );

    // Score and select the best route
    const scoredRoutes = possibleRoutes.map(route => ({
      ...route,
      score: route.segments.reduce(
        (score, segment) => score + this.calculateSegmentScore(segment, factors),
        0
      )
    }));

    // Sort by score (lower is better) and return the best route
    const bestRoute = scoredRoutes.sort((a, b) => a.score - b.score)[0];

    return {
      segments: bestRoute.segments,
      totalTime: bestRoute.segments.reduce((sum, segment) => sum + segment.estimatedTime, 0),
      totalDistance: bestRoute.segments.reduce((sum, segment) => sum + segment.distance, 0),
      numberOfTransfers: bestRoute.segments.length - 1,
      transportTypes: [...new Set(bestRoute.segments.map(s => s.transportTypeId))]
    };
  }

  private findTransferPoints(routes: Route[]): { lat: number; lng: number }[] {
    // Find points where different transport types intersect
    const transferPoints: { lat: number; lng: number }[] = [];

    for (let i = 0; i < routes.length; i++) {
      for (let j = i + 1; j < routes.length; j++) {
        if (routes[i].transportTypeId !== routes[j].transportTypeId) {
          // Find intersection points between routes
          const intersections = this.findRouteIntersections(
            routes[i].waypoints as { lat: number; lng: number }[],
            routes[j].waypoints as { lat: number; lng: number }[]
          );
          transferPoints.push(...intersections);
        }
      }
    }

    return transferPoints;
  }

  private findRouteIntersections(
    waypoints1: { lat: number; lng: number }[],
    waypoints2: { lat: number; lng: number }[]
  ): { lat: number; lng: number }[] {
    // Simplified intersection detection
    // In a real implementation, this would use proper geometric intersection detection
    const intersections: { lat: number; lng: number }[] = [];
    const threshold = 0.001; // Roughly 100 meters

    for (const point1 of waypoints1) {
      for (const point2 of waypoints2) {
        if (
          Math.abs(point1.lat - point2.lat) < threshold &&
          Math.abs(point1.lng - point2.lng) < threshold
        ) {
          intersections.push(point1);
        }
      }
    }

    return intersections;
  }

  private generateRouteCombinations(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    routes: Route[],
    transferPoints: { lat: number; lng: number }[],
    maxTransfers: number
  ): { segments: RouteSegment[] }[] {
    // Simplified route combination generation
    // In a real implementation, this would use a proper routing algorithm (e.g., A*)
    const combinations: { segments: RouteSegment[] }[] = [];

    // For demo, generate a simple two-segment route
    const segment1: RouteSegment = {
      startLocation: start,
      endLocation: transferPoints[0] || end,
      distance: this.calculateDistance(start, transferPoints[0] || end),
      estimatedTime: 20, // minutes
      trafficLevel: Math.random(),
      transportTypeId: 1, // Bus
    };

    if (transferPoints.length > 0) {
      const segment2: RouteSegment = {
        startLocation: transferPoints[0],
        endLocation: end,
        distance: this.calculateDistance(transferPoints[0], end),
        estimatedTime: 15, // minutes
        trafficLevel: Math.random(),
        transportTypeId: 2, // Metro
      };
      combinations.push({ segments: [segment1, segment2] });
    } else {
      combinations.push({ segments: [segment1] });
    }

    return combinations;
  }

  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    // Haversine formula implementation (same as before)
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lng - point1.lng);
    const lat1 = this.toRad(point1.lat);
    const lat2 = this.toRad(point2.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  async optimizeRoute(routeId: number, factors: OptimizationFactors): Promise<Route> {
    // Get the current route
    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, routeId));

    if (!route) {
      throw new Error('Route not found');
    }

    // Get historical vehicle data for this route
    const routeVehicles = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.routeId, routeId));

    // Create route segments from waypoints
    const waypoints = route.waypoints as { lat: number; lng: number }[];
    const segments: RouteSegment[] = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const segment: RouteSegment = {
        startLocation: waypoints[i],
        endLocation: waypoints[i + 1],
        distance: this.calculateDistance(waypoints[i], waypoints[i + 1]),
        estimatedTime: this.estimateTime(waypoints[i], waypoints[i + 1], factors),
        trafficLevel: this.getHistoricalTrafficLevel(routeVehicles, waypoints[i], waypoints[i + 1]),
        transportTypeId: route.transportTypeId // Assuming route has transportTypeId
      };
      segments.push(segment);
    }

    // Score and optimize segments
    const optimizedWaypoints = this.optimizeSegments(segments, factors);

    // Update route with optimized waypoints
    return {
      ...route,
      waypoints: optimizedWaypoints,
    };
  }

  private estimateTime(start: { lat: number; lng: number }, end: { lat: number; lng: number }, factors: OptimizationFactors): number {
    const distance = this.calculateDistance(start, end);
    const baseSpeed = 30; // km/h
    const trafficMultiplier = 1 - (factors.trafficLevel * 0.5);
    return distance / (baseSpeed * trafficMultiplier);
  }

  private getHistoricalTrafficLevel(vehicles: Vehicle[], start: { lat: number; lng: number }, end: { lat: number; lng: number }): number {
    // Simplified historical traffic analysis
    // In a real implementation, this would use machine learning on historical data
    return Math.random(); // Placeholder for demo
  }

  private optimizeSegments(segments: RouteSegment[], factors: OptimizationFactors): { lat: number; lng: number }[] {
    // Score each segment
    const scoredSegments = segments.map(segment => ({
      ...segment,
      score: this.calculateSegmentScore(segment, factors)
    }));

    // Sort segments by score (lower is better)
    scoredSegments.sort((a, b) => a.score - b.score);

    // Return optimized waypoints
    return [
      scoredSegments[0].startLocation,
      ...scoredSegments.map(segment => segment.endLocation)
    ];
  }
}

export const routeOptimizationService = new RouteOptimizationService();