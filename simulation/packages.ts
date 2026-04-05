import type { LatLng, SimPackage } from "./types";
import { MAX_PACKAGES_ON_MAP, SPAWN_INTERVAL_MS } from "./types";
import { randomOffsetLatLng } from "./geo";

const DELIVERY_STATIONS: { coordinate: LatLng; name: string }[] = [
  { coordinate: { latitude: 33.4484, longitude: -112.074 }, name: "Central Delivery Station" },
  { coordinate: { latitude: 33.4510, longitude: -112.076 }, name: "North Hub" },
  { coordinate: { latitude: 33.4460, longitude: -112.071 }, name: "South Depot" },
];

const STREET_NAMES = [
  "Mill Ave", "University Dr", "Apache Blvd", "Rio Salado Pkwy", "Rural Rd",
  "College Ave", "Broadway Rd", "Baseline Rd", "Southern Ave", "Scottsdale Rd",
  "Curry Rd", "Lemon St", "Orange St", "Terrace Rd", "5th St",
];

const DESTINATION_TYPES = [
  "Residence", "Amazon Locker", "UPS Store", "Office Building", "Apartment Complex",
];

let packageCounter = 0;

function randomStreetAddress(): string {
  const num = Math.floor(Math.random() * 9000) + 100;
  const street = STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)];
  return `${num} ${street}`;
}

function randomDestinationLabel(): string {
  const type = DESTINATION_TYPES[Math.floor(Math.random() * DESTINATION_TYPES.length)];
  return `${randomStreetAddress()} (${type})`;
}

export function createPackage(mapCenter: LatLng, simTime: number): SimPackage {
  packageCounter += 1;
  const station = DELIVERY_STATIONS[Math.floor(Math.random() * DELIVERY_STATIONS.length)];
  const dropoff = randomOffsetLatLng(mapCenter, 1.2);
  const points = Math.floor(Math.random() * 20) + 15;

  return {
    id: `pkg-${packageCounter}`,
    label: `PKG-${String(packageCounter).padStart(4, "0")}`,
    pickupCoordinate: randomOffsetLatLng(station.coordinate, 0.15),
    dropoffCoordinate: dropoff,
    pickupAddress: `${station.name} — ${randomStreetAddress()}`,
    dropoffAddress: randomDestinationLabel(),
    status: "waiting",
    assignedDriverId: null,
    rewardPoints: points,
    spawnedAt: simTime,
    estimatedPickupTime: null,
    estimatedDropoffTime: null,
    actualPickupTime: null,
    actualDropoffTime: null,
  };
}

export function shouldSpawnPackage(
  elapsedMs: number,
  lastSpawnMs: number,
  currentCount: number,
): boolean {
  if (currentCount >= MAX_PACKAGES_ON_MAP) return false;
  return elapsedMs - lastSpawnMs >= SPAWN_INTERVAL_MS;
}

export function resetPackageCounter(): void {
  packageCounter = 0;
}
