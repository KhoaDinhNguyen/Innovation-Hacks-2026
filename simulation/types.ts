export type LatLng = {
  latitude: number;
  longitude: number;
};

export type MeetPoint = {
  id: string;
  label: string;
  coordinate: LatLng;
  timeWindowStartSec: number;
  timeWindowEndSec: number;
};

export type PackageStatus = "waiting" | "assigned" | "in_transit" | "delivered";

export type SimPackage = {
  id: string;
  label: string;
  pickupCoordinate: LatLng;
  dropoffCoordinate: LatLng;
  pickupAddress: string;
  dropoffAddress: string;
  status: PackageStatus;
  assignedDriverId: string | null;
  rewardPoints: number;
  weightKg: number;
  volumeUnits: number;
  transferable: boolean;
  latestArrivalTime: number;
  spawnedAt: number;
  estimatedPickupTime: number | null;
  estimatedDropoffTime: number | null;
  actualPickupTime: number | null;
  actualDropoffTime: number | null;
};

export type DriverRole = "user" | "ai";
export type DriverState = "idle" | "to_pickup" | "to_dropoff" | "cooldown";

export type SimDriver = {
  id: string;
  name: string;
  role: DriverRole;
  coordinate: LatLng;
  heading: number;
  packages: string[];
  targetPackageId: string | null;
  targetDropoffId: string | null;
  state: DriverState;
  speed: number;
  capacityWeightKg: number;
  capacityVolumeUnits: number;
  totalDistanceKm: number;
  totalCO2Saved: number;
  color: string;
  routeWaypoints: LatLng[];
  routeProgress: number;
  routeDistanceKm: number;
  routeDurationSec: number;
  cooldownUntil: number | null;
  etaRemainingSec: number;
};

export type ConflictStatus = "detected" | "accepted" | "dismissed";

export type Conflict = {
  id: string;
  driverAId: string;
  driverBId: string;
  sharedDestinationZone: LatLng;
  suggestedTransferPoint: LatLng;
  meetPointId: string;
  meetPointLabel: string;
  transferPackageIds: string[];
  directDistanceKm: number;
  optimizedDistanceKm: number;
  arrivalWindowSec: number;
  potentialSavingKm: number;
  potentialCO2Saving: number;
  status: ConflictStatus;
};

export type SimSpeed = 1 | 2 | 5;

export type SimulationState = {
  packages: SimPackage[];
  drivers: SimDriver[];
  conflicts: Conflict[];
  elapsedMs: number;
  isRunning: boolean;
  speed: SimSpeed;
  totalDeliveries: number;
  totalCO2Saved: number;
  totalDistanceKm: number;
};

export type PointsPopup = {
  id: string;
  coordinate: LatLng;
  points: number;
  createdAt: number;
  driverColor: string;
};

export const MAX_PACKAGES_PER_DRIVER = 5;
export const MAX_PACKAGES_ON_MAP = 15;
export const MAX_AI_DRIVERS = 3;
export const SPAWN_INTERVAL_MS = 4000;
export const CONFLICT_RADIUS_KM = 0.5;
export const AI_SPEED_KMH = 40;
export const CO2_PER_KM = 0.21;
export const COOLDOWN_MIN_MS = 2000;
export const COOLDOWN_MAX_MS = 5000;
export const POINTS_POPUP_DURATION_MS = 2500;
