import type { Conflict, MeetPoint, SimDriver, SimPackage } from "./types";
import { CO2_PER_KM } from "./types";
import { haversineDistance, midpoint } from "./geo";
import { DELIVERY_STATIONS } from "./packages";
import { fetchRoute, computeOptimalOrder } from "./routing";

let conflictCounter = 0;

const MAX_TRANSFER = 1;
const DESTINATION_CLUSTER_RADIUS_KM = 1.2;
const MAX_MEET_ROUTE_KM = 2.8;
const MAX_MEET_ETA_GAP_SEC = 210;
const TRANSFER_PENALTY_KM = 0.35;
const MIN_SAVING_KM = 0.15;

const STATIC_MEET_POINTS: MeetPoint[] = [
  {
    id: "meet-campus",
    label: "Campus Exchange",
    coordinate: { latitude: 33.4492, longitude: -112.0734 },
    timeWindowStartSec: 0,
    timeWindowEndSec: 86_400,
  },
  {
    id: "meet-river",
    label: "River Transfer Lot",
    coordinate: { latitude: 33.4502, longitude: -112.0708 },
    timeWindowStartSec: 0,
    timeWindowEndSec: 86_400,
  },
];

type RouteMetric = {
  distanceKm: number;
  durationSec: number;
};

const metricCache = new Map<string, Promise<RouteMetric>>();

function buildMeetPoints(): MeetPoint[] {
  const stationMeetPoints = DELIVERY_STATIONS.map((station, index) => ({
    id: `meet-station-${index + 1}`,
    label: station.name,
    coordinate: station.coordinate,
    timeWindowStartSec: 0,
    timeWindowEndSec: 86_400,
  }));

  return [...stationMeetPoints, ...STATIC_MEET_POINTS];
}

function metricKey(from: SimDriver["coordinate"], to: SimDriver["coordinate"]): string {
  const f = `${from.latitude.toFixed(5)},${from.longitude.toFixed(5)}`;
  const t = `${to.latitude.toFixed(5)},${to.longitude.toFixed(5)}`;
  return `${f}->${t}`;
}

async function getMetric(from: SimDriver["coordinate"], to: SimDriver["coordinate"]): Promise<RouteMetric> {
  const key = metricKey(from, to);
  const cached = metricCache.get(key);
  if (cached) return cached;

  const pending = fetchRoute(from, to).then((route) => ({
    distanceKm: route.distanceKm,
    durationSec: route.durationSec,
  }));
  metricCache.set(key, pending);
  return pending;
}

function getCurrentLoad(driver: SimDriver, packages: SimPackage[]): { weightKg: number; volumeUnits: number } {
  return driver.packages.reduce(
    (load, packageId) => {
      const pkg = packages.find((candidate) => candidate.id === packageId && candidate.status !== "delivered");
      if (!pkg) return load;
      return {
        weightKg: load.weightKg + pkg.weightKg,
        volumeUnits: load.volumeUnits + pkg.volumeUnits,
      };
    },
    { weightKg: 0, volumeUnits: 0 },
  );
}

function canReceivePackage(driver: SimDriver, currentLoad: { weightKg: number; volumeUnits: number }, pkg: SimPackage): boolean {
  return currentLoad.weightKg + pkg.weightKg <= driver.capacityWeightKg
    && currentLoad.volumeUnits + pkg.volumeUnits <= driver.capacityVolumeUnits;
}

function isPlanAlreadyKnown(conflict: Conflict, existingConflicts: Conflict[]): boolean {
  return existingConflicts.some((candidate) =>
    candidate.driverAId === conflict.driverAId
    && candidate.driverBId === conflict.driverBId
    && candidate.meetPointId === conflict.meetPointId
    && candidate.transferPackageIds.join("|") === conflict.transferPackageIds.join("|"),
  );
}

async function evaluateTransferPlan(
  receiver: SimDriver,
  sender: SimDriver,
  meetPoint: MeetPoint,
  packages: SimPackage[],
): Promise<Conflict | null> {
  if (!receiver.targetDropoffId || !sender.targetDropoffId) return null;

  const receiverTarget = packages.find((pkg) => pkg.id === receiver.targetDropoffId && pkg.status === "in_transit");
  if (!receiverTarget) return null;

  const senderPackages = sender.packages
    .map((packageId) => packages.find((pkg) => pkg.id === packageId))
    .filter((pkg): pkg is SimPackage => Boolean(pkg && pkg.status === "in_transit" && pkg.transferable));
  if (senderPackages.length === 0) return null;

  const receiverLoad = getCurrentLoad(receiver, packages);
  const receiverToMeet = await getMetric(receiver.coordinate, meetPoint.coordinate);
  const senderToMeet = await getMetric(sender.coordinate, meetPoint.coordinate);

  if (receiverToMeet.distanceKm > MAX_MEET_ROUTE_KM || senderToMeet.distanceKm > MAX_MEET_ROUTE_KM) {
    return null;
  }

  const arrivalWindowSec = Math.abs(receiverToMeet.durationSec - senderToMeet.durationSec);
  if (arrivalWindowSec > MAX_MEET_ETA_GAP_SEC) return null;

  const receiverDirect = await getMetric(receiver.coordinate, receiverTarget.dropoffCoordinate);
  const meetToReceiverTarget = await getMetric(meetPoint.coordinate, receiverTarget.dropoffCoordinate);

  let bestPackage: SimPackage | null = null;
  let bestSavingKm = 0;
  let bestDirectKm = 0;
  let bestOptimizedKm = 0;

  for (const pkg of senderPackages) {
    if (!canReceivePackage(receiver, receiverLoad, pkg)) continue;

    const destinationOverlapKm = haversineDistance(pkg.dropoffCoordinate, receiverTarget.dropoffCoordinate);
    if (destinationOverlapKm > DESTINATION_CLUSTER_RADIUS_KM) continue;

    const senderDirect = await getMetric(sender.coordinate, pkg.dropoffCoordinate);
    const meetToPkg = await getMetric(meetPoint.coordinate, pkg.dropoffCoordinate);
    const pkgToReceiverTarget = await getMetric(pkg.dropoffCoordinate, receiverTarget.dropoffCoordinate);
    const receiverTargetToPkg = await getMetric(receiverTarget.dropoffCoordinate, pkg.dropoffCoordinate);

    const receiverTwoStopKm = Math.min(
      meetToPkg.distanceKm + pkgToReceiverTarget.distanceKm,
      meetToReceiverTarget.distanceKm + receiverTargetToPkg.distanceKm,
    );
    const baselineKm = senderDirect.distanceKm + receiverDirect.distanceKm;
    const optimizedKm = senderToMeet.distanceKm + receiverToMeet.distanceKm + receiverTwoStopKm + TRANSFER_PENALTY_KM;
    const projectedTransferSec = Math.max(senderToMeet.durationSec, receiverToMeet.durationSec) + receiverTwoStopKm * 90;
    const remainingWindowSec = Math.max(0, (pkg.latestArrivalTime - pkg.spawnedAt) / 1000);
    const latenessPenaltyKm = projectedTransferSec > remainingWindowSec ? 0.5 : 0;
    const savingsKm = baselineKm - optimizedKm - latenessPenaltyKm;

    if (savingsKm > bestSavingKm) {
      bestSavingKm = savingsKm;
      bestPackage = pkg;
      bestDirectKm = baselineKm;
      bestOptimizedKm = optimizedKm;
    }
  }

  if (!bestPackage || bestSavingKm < MIN_SAVING_KM) return null;

  conflictCounter += 1;
  return {
    id: `conflict-${conflictCounter}`,
    driverAId: receiver.id,
    driverBId: sender.id,
    sharedDestinationZone: midpoint(bestPackage.dropoffCoordinate, receiverTarget.dropoffCoordinate),
    suggestedTransferPoint: meetPoint.coordinate,
    meetPointId: meetPoint.id,
    meetPointLabel: meetPoint.label,
    transferPackageIds: [bestPackage.id].slice(0, MAX_TRANSFER),
    directDistanceKm: round2(bestDirectKm),
    optimizedDistanceKm: round2(bestOptimizedKm),
    arrivalWindowSec: Math.round(arrivalWindowSec),
    potentialSavingKm: round2(bestSavingKm),
    potentialCO2Saving: round2(bestSavingKm * CO2_PER_KM),
    status: "detected",
  };
}

export async function detectConflicts(
  drivers: SimDriver[],
  packages: SimPackage[],
  existingConflicts: Conflict[],
): Promise<Conflict[]> {
  const driversInTransit = drivers.filter((driver) => driver.state === "to_dropoff" && driver.targetDropoffId);
  const meetPoints = buildMeetPoints();
  const newConflicts: Conflict[] = [];

  for (let i = 0; i < driversInTransit.length; i++) {
    for (let j = i + 1; j < driversInTransit.length; j++) {
      const a = driversInTransit[i];
      const b = driversInTransit[j];
      const candidates = await Promise.all(
        meetPoints.flatMap((meetPoint) => [
          evaluateTransferPlan(a, b, meetPoint, packages),
          evaluateTransferPlan(b, a, meetPoint, packages),
        ]),
      );

      const best = candidates
        .filter((candidate): candidate is Conflict => Boolean(candidate))
        .sort((left, right) => right.potentialSavingKm - left.potentialSavingKm)[0];

      if (best && !isPlanAlreadyKnown(best, existingConflicts) && !isPlanAlreadyKnown(best, newConflicts)) {
        newConflicts.push(best);
      }
    }
  }

  return newConflicts.sort((left, right) => right.potentialSavingKm - left.potentialSavingKm);
}

export function resolveConflict(
  conflict: Conflict,
  accept: boolean,
  drivers: SimDriver[],
  packages: SimPackage[],
): { drivers: SimDriver[]; packages: SimPackage[]; conflict: Conflict } {
  const resolved: Conflict = {
    ...conflict,
    status: accept ? "accepted" : "dismissed",
  };

  if (!accept) return { drivers, packages, conflict: resolved };

  const receiver = drivers.find((driver) => driver.id === conflict.driverAId);
  const sender = drivers.find((driver) => driver.id === conflict.driverBId);
  if (!receiver || !sender) return { drivers, packages, conflict: resolved };

  const transferIds = conflict.transferPackageIds.slice(0, MAX_TRANSFER);
  if (transferIds.length === 0) return { drivers, packages, conflict: resolved };

  const updatedPackages = packages.map((pkg) =>
    transferIds.includes(pkg.id) ? { ...pkg, assignedDriverId: receiver.id } : pkg,
  );

  const transferredToReceiver = [...receiver.packages, ...transferIds];
  const remainingWithSender = sender.packages.filter((packageId) => !transferIds.includes(packageId));

  const updatedDrivers = drivers.map((driver) => {
    if (driver.id === receiver.id) {
      return reorderDriverPackages({ ...driver, packages: transferredToReceiver }, updatedPackages);
    }
    if (driver.id === sender.id) {
      return reorderDriverPackages({ ...driver, packages: remainingWithSender }, updatedPackages);
    }
    return driver;
  });

  return { drivers: updatedDrivers, packages: updatedPackages, conflict: resolved };
}

export function resetConflictCounter(): void {
  conflictCounter = 0;
  metricCache.clear();
}

function reorderDriverPackages(driver: SimDriver, packages: SimPackage[]): SimDriver {
  const activePackageIds = driver.packages.filter((packageId) => packages.some((pkg) => pkg.id === packageId && pkg.status !== "delivered"));
  if (activePackageIds.length === 0) {
    return {
      ...driver,
      packages: [],
      targetPackageId: null,
      targetDropoffId: null,
      state: "idle",
      routeWaypoints: [],
      routeProgress: 0,
      routeDistanceKm: 0,
      routeDurationSec: 0,
      etaRemainingSec: 0,
    };
  }

  const dropoffCoords = new Map<string, SimPackage["dropoffCoordinate"]>();
  for (const packageId of activePackageIds) {
    const pkg = packages.find((candidate) => candidate.id === packageId);
    if (pkg) dropoffCoords.set(packageId, pkg.dropoffCoordinate);
  }

  const ordered = computeOptimalOrder(driver.coordinate, activePackageIds, dropoffCoords);
  return {
    ...driver,
    packages: ordered,
    targetPackageId: null,
    targetDropoffId: ordered[0] ?? null,
    state: "to_dropoff",
    routeWaypoints: [],
    routeProgress: 0,
    routeDistanceKm: 0,
    routeDurationSec: 0,
    etaRemainingSec: 0,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
