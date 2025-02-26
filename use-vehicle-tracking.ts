import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Vehicle } from "@shared/schema";

type VehicleUpdate = {
  vehicleId: number;
  location: { lat: number; lng: number };
  heading: number;
  speed: number;
  eta?: number;
  occupancy?: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  delay?: number;
};

export function useVehicleTracking(routeIds: number[]) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const routeIdsRef = useRef<number[]>(routeIds);

  useEffect(() => {
    routeIdsRef.current = routeIds;
  }, [routeIds]);

  useEffect(() => {
    // Initialize socket connection with better error handling
    if (!socketRef.current) {
      socketRef.current = io(window.location.origin, {
        path: "/socket.io",
        transports: ['websocket'],
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 5000,
        autoConnect: true,
        reconnection: true,
        forceNew: false,
        closeOnBeforeunload: true
      });

      socketRef.current.io.on("error", (error: Error) => {
        console.error("Socket connection error:", error);
        setTimeout(() => socketRef.current?.connect(), 5000);
      });
    }

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to vehicle tracking service after', attemptNumber, 'attempts');
    });

    const socket = socketRef.current;

    // Subscribe to vehicle updates for specified routes
    socket.emit("subscribe_vehicles", routeIds);

    // Handle initial vehicle positions
    socket.on("vehicle_positions", (initialVehicles: Vehicle[]) => {
      console.log("Received initial vehicles:", initialVehicles);
      setVehicles(initialVehicles);
    });

    // Handle real-time vehicle updates
    socket.on("vehicle_update", (update: VehicleUpdate) => {
      console.log("Received vehicle update:", update);
      setVehicles((prevVehicles) => {
        const vehicleIndex = prevVehicles.findIndex(v => v.id === update.vehicleId);

        if (vehicleIndex === -1) {
          // If it's a new vehicle, add it to the list
          return [...prevVehicles, {
            id: update.vehicleId,
            currentLocation: update.location,
            heading: update.heading,
            speed: update.speed.toString(),
            status: update.delay && update.delay > 2 ? 'DELAYED' : 'ON_TIME',
            transportTypeId: 1, // Default to bus for demo
            routeId: routeIds[0], // Assign to first route for demo
            registrationNumber: `VEH-${update.vehicleId}`,
            isActive: true,
            lastUpdated: new Date(),
            eta: update.eta
          }];
        }

        // Update existing vehicle
        const updatedVehicles = [...prevVehicles];
        updatedVehicles[vehicleIndex] = {
          ...updatedVehicles[vehicleIndex],
          currentLocation: update.location,
          heading: update.heading,
          speed: update.speed.toString(),
          lastUpdated: new Date(),
          eta: update.eta,
          status: update.delay && update.delay > 2 ? 'DELAYED' : 'ON_TIME'
        };
        return updatedVehicles;
      });
    });

    // Handle connection events
    socket.on("connect", () => {
      console.log("Connected to vehicle tracking service");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from vehicle tracking service");
    });

    socket.on("error", (error: Error) => {
      console.error("Socket error:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, [routeIdsRef.current.join(",")]);

  return vehicles;
}