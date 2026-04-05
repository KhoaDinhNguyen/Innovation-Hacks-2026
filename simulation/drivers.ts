import type { LatLng, SimDriver, SimPackage } from "./types";
import { AI_SPEED_KMH, CO2_PER_KM, COOLDOWN_MAX_MS, COOLDOWN_MIN_MS, MAX_AI_DRIVERS, MAX_PACKAGES_PER_DRIVER } from "./types";
import { bearing, haversineDistance, moveAlongPolyline, moveToward } from "./geo";

const AI_NAMES = ["Driver Alpha", "Driver Beta", "Driver Gamma", "Driver Delta", "Driver Epsilon"];
const AI_COLORS = ["#8b5cf6", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];

const DELIVERY_STATION: LatLng = { latitude: 33.4484, longitude: -112.074 };
const PICKUP_THRESHOLD_KM = 0.05;
const DROPOFF_THRESHOLD_KM = 0.05;

function emptyDriverRouteFields(): Pick<SimDriver, "routeWaypoints" | "routeProgress" | "routeDistanceKm" | "routeDurationSec" | "etaRemainingSec" | "cooldownUntil"> {
  return { routeWaypoints: [], routeProgress: 0, routeDistanceKm: 0, routeDurationSec: 0, etaRemainingSec: 0, cooldownUntil: null };
}

export function createAIDrivers(count: number = MAX_AI_DRIVERS): SimDriver[] {
  return Array.from({ length: Math.min(count, AI_NAMES.length) }, (_, i) => ({
    id: `ai-driver-${i + 1}`,
    name: AI_NAMES[i],
    role: "ai" as const,
    coordinate: {
      latitude: DELIVERY_STATION.latitude + (Math.random() * 0.002 - 0.001),
      longitude: DELIVERY_STATION.longitude + (Math.random() * 0.002 - 0.001),
    },
    heading: 0,
    packages: [],
    targetPackageId: null,
    targetDropoffId: null,
    state: "idle" as const,
    speed: AI_SPEED_KMH,
    capacityWeightKg: 18,
    capacityVolumeUnits: 10,
    totalDistanceKm: 0,
    totalCO2Saved: 0,
    color: AI_COLORS[i],
    ...emptyDriverRouteFields(),
  }));
}

export function createUserDriver(): SimDriver {
  return {
    id: "user-driver",
    name: "You",
    role: "user",
    coordinate: { ...DELIVERY_STATION },
    heading: 0,
    packages: [],
    targetPackageId: null,
    targetDropoffId: null,
    state: "idle",
    speed: AI_SPEED_KMH,
    capacityWeightKg: 20,
    capacityVolumeUnits: 12,
    totalDistanceKm: 0,
    totalCO2Saved: 0,
    color: "#0f5c45",
    ...emptyDriverRouteFields(),
  };
}

function randomCooldownMs(): number {
  return COOLDOWN_MIN_MS + Math.random() * (COOLDOWN_MAX_MS - COOLDOWN_MIN_MS);
}

export type TickResult = {
  driver: SimDriver;
  packages: SimPackage[];
  delivered: string[];
  routeRequests: Array<{ driverId: string; from: LatLng; to: LatLng; purpose: "pickup" | "dropoff" }>;
};

export function tickAIDriver(
  driver: SimDriver,
  packages: SimPackage[],
  deltaMs: number,
  totalMs: number,
): TickResult {
  if (driver.role !== "ai") return { driver, packages, delivered: [], routeRequests: [] };

  let d = { ...driver };
  let pkgs = [...packages];
  const delivered: string[] = [];
  const routeRequests: TickResult["routeRequests"] = [];

  if (d.state === "cooldown") {
    if (d.cooldownUntil !== null && totalMs >= d.cooldownUntil) {
      d.state = "idle";
      d.cooldownUntil = null;
    } else {
      return { driver: d, packages: pkgs, delivered, routeRequests };
    }
  }

  if (d.state === "idle") {
    if (d.packages.length > 0) {
      d.state = "to_dropoff";
      d.targetDropoffId = d.packages[0];
      const target = pkgs.find((p) => p.id === d.targetDropoffId);
      if (target) {
        routeRequests.push({ driverId: d.id, from: d.coordinate, to: target.dropoffCoordinate, purpose: "dropoff" });
      }
    } else {
      const closest = findClosestWaitingPackage(d, pkgs);
      if (closest) {
        d.state = "to_pickup";
        d.targetPackageId = closest.id;
        pkgs = pkgs.map((p) => (p.id === closest.id ? { ...p, status: "assigned" as const, assignedDriverId: d.id } : p));
        routeRequests.push({ driverId: d.id, from: d.coordinate, to: closest.pickupCoordinate, purpose: "pickup" });
      }
    }
  }

  const distKm = (d.speed * deltaMs) / 3_600_000;

  if (d.state === "to_pickup" && d.targetPackageId) {
    const target = pkgs.find((p) => p.id === d.targetPackageId);
    if (!target || target.status === "delivered") {
      d.state = "idle";
      d.targetPackageId = null;
      d.routeWaypoints = [];
      d.routeProgress = 0;
    } else {
      const dest = target.pickupCoordinate;

      if (d.routeWaypoints.length >= 2) {
        const result = moveAlongPolyline(d.routeWaypoints, d.routeProgress, distKm);
        d.coordinate = result.coordinate;
        d.routeProgress = result.newTraveledKm;
        d.totalDistanceKm += distKm;
        d.etaRemainingSec = Math.max(0, d.etaRemainingSec - deltaMs / 1000);
        d.heading = bearing(d.coordinate, dest);

        if (result.arrived || haversineDistance(d.coordinate, dest) <= PICKUP_THRESHOLD_KM) {
          d = handlePickupArrival(d, target, pkgs, routeRequests);
          pkgs = pkgs.map((p) => (p.id === target.id ? { ...p, status: "in_transit" as const, actualPickupTime: Date.now() } : p));
        }
      } else {
        const dist = haversineDistance(d.coordinate, dest);
        if (dist <= PICKUP_THRESHOLD_KM) {
          d = handlePickupArrival(d, target, pkgs, routeRequests);
          pkgs = pkgs.map((p) => (p.id === target.id ? { ...p, status: "in_transit" as const, actualPickupTime: Date.now() } : p));
        } else {
          d.coordinate = moveToward(d.coordinate, dest, distKm);
          d.heading = bearing(d.coordinate, dest);
          d.totalDistanceKm += distKm;
        }
      }
    }
  }

  if (d.state === "to_dropoff" && d.targetDropoffId) {
    const target = pkgs.find((p) => p.id === d.targetDropoffId);
    if (!target) {
      d.packages = d.packages.filter((pid) => pid !== d.targetDropoffId);
      d.targetDropoffId = d.packages[0] ?? null;
      d.routeWaypoints = [];
      d.routeProgress = 0;
      if (!d.targetDropoffId) {
        d.state = "cooldown";
        d.cooldownUntil = totalMs + randomCooldownMs();
      }
    } else {
      const dest = target.dropoffCoordinate;

      if (d.routeWaypoints.length >= 2) {
        const result = moveAlongPolyline(d.routeWaypoints, d.routeProgress, distKm);
        d.coordinate = result.coordinate;
        d.routeProgress = result.newTraveledKm;
        d.totalDistanceKm += distKm;
        d.etaRemainingSec = Math.max(0, d.etaRemainingSec - deltaMs / 1000);
        d.heading = bearing(d.coordinate, dest);

        if (result.arrived || haversineDistance(d.coordinate, dest) <= DROPOFF_THRESHOLD_KM) {
          d = handleDropoffArrival(d, target, pkgs, delivered, routeRequests, totalMs);
          pkgs = pkgs.map((p) => (p.id === target.id ? { ...p, status: "delivered" as const, actualDropoffTime: Date.now() } : p));
        }
      } else {
        const dist = haversineDistance(d.coordinate, dest);
        if (dist <= DROPOFF_THRESHOLD_KM) {
          d = handleDropoffArrival(d, target, pkgs, delivered, routeRequests, totalMs);
          pkgs = pkgs.map((p) => (p.id === target.id ? { ...p, status: "delivered" as const, actualDropoffTime: Date.now() } : p));
        } else {
          d.coordinate = moveToward(d.coordinate, dest, distKm);
          d.heading = bearing(d.coordinate, dest);
          d.totalDistanceKm += distKm;
        }
      }
    }
  }

  return { driver: d, packages: pkgs, delivered, routeRequests };
}

function handlePickupArrival(
  d: SimDriver,
  target: SimPackage,
  pkgs: SimPackage[],
  routeRequests: TickResult["routeRequests"],
): SimDriver {
  d.coordinate = { ...target.pickupCoordinate };
  d.packages = [...d.packages, target.id];
  d.targetPackageId = null;
  d.routeWaypoints = [];
  d.routeProgress = 0;
  d.etaRemainingSec = 0;

  const canPickMore = d.packages.length < MAX_PACKAGES_PER_DRIVER;
  if (canPickMore) {
    const nearby = findClosestWaitingPackage(d, pkgs);
    if (nearby && haversineDistance(d.coordinate, nearby.pickupCoordinate) < 0.3) {
      d.state = "to_pickup";
      d.targetPackageId = nearby.id;
      routeRequests.push({ driverId: d.id, from: d.coordinate, to: nearby.pickupCoordinate, purpose: "pickup" });
    } else {
      d.state = "to_dropoff";
      d.targetDropoffId = d.packages[0];
      const dropTarget = pkgs.find((p) => p.id === d.targetDropoffId);
      if (dropTarget) {
        routeRequests.push({ driverId: d.id, from: d.coordinate, to: dropTarget.dropoffCoordinate, purpose: "dropoff" });
      }
    }
  } else {
    d.state = "to_dropoff";
    d.targetDropoffId = d.packages[0];
    const dropTarget = pkgs.find((p) => p.id === d.targetDropoffId);
    if (dropTarget) {
      routeRequests.push({ driverId: d.id, from: d.coordinate, to: dropTarget.dropoffCoordinate, purpose: "dropoff" });
    }
  }

  return d;
}

function handleDropoffArrival(
  d: SimDriver,
  target: SimPackage,
  pkgs: SimPackage[],
  delivered: string[],
  routeRequests: TickResult["routeRequests"],
  totalMs: number,
): SimDriver {
  d.coordinate = { ...target.dropoffCoordinate };
  d.packages = d.packages.filter((pid) => pid !== target.id);
  d.totalCO2Saved += haversineDistance(target.pickupCoordinate, target.dropoffCoordinate) * CO2_PER_KM;
  delivered.push(target.id);
  d.routeWaypoints = [];
  d.routeProgress = 0;
  d.etaRemainingSec = 0;

  if (d.packages.length > 0) {
    d.targetDropoffId = d.packages[0];
    const nextTarget = pkgs.find((p) => p.id === d.targetDropoffId);
    if (nextTarget) {
      routeRequests.push({ driverId: d.id, from: d.coordinate, to: nextTarget.dropoffCoordinate, purpose: "dropoff" });
    }
  } else {
    d.state = "cooldown";
    d.cooldownUntil = totalMs + randomCooldownMs();
    d.targetDropoffId = null;
  }

  return d;
}

function findClosestWaitingPackage(driver: SimDriver, packages: SimPackage[]): SimPackage | null {
  let closest: SimPackage | null = null;
  let minDist = Infinity;

  for (const pkg of packages) {
    if (pkg.status !== "waiting") continue;
    const dist = haversineDistance(driver.coordinate, pkg.pickupCoordinate);
    if (dist < minDist) {
      minDist = dist;
      closest = pkg;
    }
  }

  return closest;
}

export function applyRouteToDriver(
  drivers: SimDriver[],
  driverId: string,
  waypoints: LatLng[],
  distanceKm: number,
  durationSec: number,
): SimDriver[] {
  return drivers.map((d) => {
    if (d.id !== driverId) return d;
    return { ...d, routeWaypoints: waypoints, routeProgress: 0, routeDistanceKm: distanceKm, routeDurationSec: durationSec, etaRemainingSec: durationSec };
  });
}
