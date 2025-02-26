import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { db } from "./db";
import { vehicles, vehicleUpdates, type Vehicle } from "@shared/schema";
import { eq } from "drizzle-orm";
import { vehicleTrackingService } from "./services/vehicle-tracking";

export function setupWebSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  // Store active vehicle subscriptions
  const vehicleSubscriptions = new Map<string, Set<string>>();

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Handle vehicle tracking subscription
    socket.on("subscribe_vehicles", async (routeIds: number[]) => {
      console.log("Client subscribed to routes:", routeIds);

      // Subscribe to each route's vehicles
      for (const routeId of routeIds) {
        const routeKey = `route:${routeId}`;
        if (!vehicleSubscriptions.has(routeKey)) {
          vehicleSubscriptions.set(routeKey, new Set());
        }
        vehicleSubscriptions.get(routeKey)?.add(socket.id);

        // Send initial vehicle positions
        const routeVehicles = await db
          .select()
          .from(vehicles)
          .where(eq(vehicles.routeId, routeId));

        socket.emit("vehicle_positions", routeVehicles);
      }
    });

    // Handle vehicle position updates
    socket.on("update_position", async (data: {
      vehicleId: number;
      location: { lat: number; lng: number };
      heading: number;
      speed: number;
    }) => {
      try {
        await vehicleTrackingService.updateVehicleLocation({
          ...data,
          timestamp: Date.now()
        });

        // Get updated vehicle data
        const [vehicle] = await db
          .select()
          .from(vehicles)
          .where(eq(vehicles.id, data.vehicleId));

        if (!vehicle) {
          console.error("Vehicle not found:", data.vehicleId);
          return;
        }

        // Calculate ETA for all subscribers
        const eta = await vehicleTrackingService.calculateETA(
          data.vehicleId,
          vehicle.destinationLocation as { lat: number; lng: number }
        );

        // Broadcast to subscribed clients
        const routeKey = `route:${vehicle.routeId}`;
        const subscribers = vehicleSubscriptions.get(routeKey);
        if (subscribers) {
          const subscriberArray = Array.from(subscribers);
          io.to(subscriberArray).emit("vehicle_update", {
            vehicleId: vehicle.id,
            location: data.location,
            heading: data.heading,
            speed: data.speed,
            eta,
            occupancy: vehicle.occupancy || 'UNKNOWN',
            delay: vehicle.delay || 0
          });
        }
      } catch (error) {
        console.error("Error updating vehicle position:", error);
      }
    });

    // Broadcast simulated vehicle updates from tracking service
    const broadcastInterval = setInterval(() => {
      const activeVehicles = vehicleTrackingService.getActiveVehicles();
      activeVehicles.forEach(vehicle => {
        const routeKey = `route:${vehicle.routeId}`; // Simplified for demo
        const subscribers = vehicleSubscriptions.get(routeKey);
        if (subscribers) {
          const subscriberArray = Array.from(subscribers);
          io.to(subscriberArray).emit("vehicle_update", vehicle);
        }
      });
    }, 1000);

    // Handle client disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      clearInterval(broadcastInterval);
      // Remove socket from all subscriptions
      vehicleSubscriptions.forEach(subscribers => {
        subscribers.delete(socket.id);
      });
    });
  });

  return io;
}