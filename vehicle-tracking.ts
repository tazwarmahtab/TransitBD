import { Vehicle, Route } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

type VehicleLocation = {
  lat: number;
  lng: number;
};

type VehicleUpdate = {
  vehicleId: number;
  location: VehicleLocation;
  speed: number;
  heading: number;
  timestamp: number;
  occupancy?: 'LOW' | 'MEDIUM' | 'HIGH';
  delay?: number;
};

export class VehicleTrackingService {
  private activeVehicles: Map<number, VehicleUpdate> = new Map();
  private simulatedVehicles: Map<number, any> = new Map();

  constructor() {
    // Start simulation for demo purposes
    this.startSimulation();
  }

  private async startSimulation() {
    // Demo routes around Dhaka
    const demoRoutes = [
      {
        id: 1,
        path: [
          { lat: 23.8103, lng: 90.4125 }, // Dhaka
          { lat: 23.8223, lng: 90.4265 }, // Badda
          { lat: 23.8133, lng: 90.4342 }, // Rampura
          { lat: 23.8028, lng: 90.4255 }  // Malibagh
        ],
        transportTypeId: 1
      },
      {
        id: 2,
        path: [
          { lat: 23.7925, lng: 90.4078 }, // Motijheel
          { lat: 23.8012, lng: 90.4125 }, // Paltan
          { lat: 23.8103, lng: 90.4125 }, // Dhaka
          { lat: 23.8145, lng: 90.4023 }  // Farmgate
        ],
        transportTypeId: 2
      },
    ];

    // Create simulated vehicles for each route with more realistic movement
    demoRoutes.forEach((route, index) => {
      this.simulateVehicleOnRoute(route, index + 1);
      // Add more vehicles per route for better demo
      if (index === 0) {
        this.simulateVehicleOnRoute(route, index + 3);
        this.simulateVehicleOnRoute(route, index + 4);
      }
    });
  }

  private simulateVehicleOnRoute(route: any, vehicleId: number) {
    let pathIndex = 0;
    let progress = 0;

    const updateInterval = setInterval(() => {
      const start = route.path[pathIndex];
      const end = route.path[(pathIndex + 1) % route.path.length];

      // Calculate interpolated position
      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;

      // Calculate heading
      const heading = Math.atan2(end.lng - start.lng, end.lat - start.lat) * 180 / Math.PI;

      // Update vehicle position
      const update: VehicleUpdate = {
        vehicleId,
        location: { lat, lng },
        speed: 30 + Math.random() * 10, // Random speed between 30-40 km/h
        heading,
        timestamp: Date.now(),
        occupancy: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.3 ? 'MEDIUM' : 'LOW',
        delay: Math.floor(Math.random() * 5), // Random delay 0-5 minutes
      };

      this.activeVehicles.set(vehicleId, update);

      // Update progress
      progress += 0.02;
      if (progress >= 1) {
        progress = 0;
        pathIndex = (pathIndex + 1) % (route.path.length - 1);
      }
    }, 1000); // Update every second

    this.simulatedVehicles.set(vehicleId, updateInterval);
  }

  async updateVehicleLocation(update: VehicleUpdate): Promise<void> {
    try {
      // Update in-memory state
      this.activeVehicles.set(update.vehicleId, update);

      // Persist to database
      await db
        .update(vehicles)
        .set({
          currentLocation: update.location,
          speed: update.speed,
          heading: update.heading,
          lastUpdate: new Date(update.timestamp)
        })
        .where(eq(vehicles.id, update.vehicleId));
    } catch (error) {
      console.error('Failed to update vehicle location:', error);
      throw error;
    }
  }

  async calculateETA(vehicleId: number, destinationLocation: VehicleLocation): Promise<number> {
    const vehicle = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    if (!vehicle.length) {
      throw new Error('Vehicle not found');
    }

    const currentVehicle = vehicle[0];
    const currentLocation = currentVehicle.currentLocation as VehicleLocation;

    // Calculate distance using Haversine formula
    const distance = this.calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      destinationLocation.lat,
      destinationLocation.lng
    );

    // Get average speed from recent updates or use current speed
    const speed = currentVehicle.speed || 30; // Default to 30 km/h if no speed data

    // Calculate ETA in minutes
    const etaMinutes = (distance / speed) * 60;

    return Math.round(etaMinutes);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  getActiveVehicles(): VehicleUpdate[] {
    return Array.from(this.activeVehicles.values());
  }

  cleanup() {
    // Clean up simulation intervals
    this.simulatedVehicles.forEach((interval) => clearInterval(interval));
    this.simulatedVehicles.clear();
    this.activeVehicles.clear();
  }
}

export const vehicleTrackingService = new VehicleTrackingService();