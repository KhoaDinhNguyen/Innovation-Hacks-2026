import type { Conflict, SimDriver, SimPackage } from "./types";
import { CO2_PER_KM, CONFLICT_RADIUS_KM } from "./types";
import { haversineDistance, midpoint } from "./geo";

let conflictCounter = 0;

export function detectConflicts(
  drivers: SimDriver[],
  packages: SimPackage[],
  existingConflicts: Conflict[],
): Conflict[] {
  const newConflicts: Conflict[] = [];
  const activeConflictPairs = new Set(
    existingConflicts
      .filter((c) => c.status === "detected")
      .map((c) => pairKey(c.driverAId, c.driverBId)),
  );

  const driversInTransit = drivers.filter(
    (d) => d.state === "to_dropoff" && d.targetDropoffId,
  );

  for (let i = 0; i < driversInTransit.length; i++) {
    for (let j = i + 1; j < driversInTransit.length; j++) {
      const a = driversInTransit[i];
      const b = driversInTransit[j];

      if (activeConflictPairs.has(pairKey(a.id, b.id))) continue;

      const pkgA = packages.find((p) => p.id === a.targetDropoffId);
      const pkgB = packages.find((p) => p.id === b.targetDropoffId);
      if (!pkgA || !pkgB) continue;

      const destDist = haversineDistance(pkgA.dropoffCoordinate, pkgB.dropoffCoordinate);
      if (destDist > CONFLICT_RADIUS_KM) continue;

      const transferPoint = midpoint(a.coordinate, b.coordinate);
      const directDistA = haversineDistance(a.coordinate, pkgA.dropoffCoordinate);
      const directDistB = haversineDistance(b.coordinate, pkgB.dropoffCoordinate);
      const transferDist =
        haversineDistance(a.coordinate, transferPoint) +
        haversineDistance(transferPoint, pkgA.dropoffCoordinate) +
        haversineDistance(transferPoint, pkgB.dropoffCoordinate);
      const saving = Math.max(0, directDistA + directDistB - transferDist);

      if (saving < 0.05) continue;

      conflictCounter += 1;
      newConflicts.push({
        id: `conflict-${conflictCounter}`,
        driverAId: a.id,
        driverBId: b.id,
        sharedDestinationZone: midpoint(pkgA.dropoffCoordinate, pkgB.dropoffCoordinate),
        suggestedTransferPoint: transferPoint,
        potentialSavingKm: Math.round(saving * 100) / 100,
        potentialCO2Saving: Math.round(saving * CO2_PER_KM * 100) / 100,
        status: "detected",
      });
    }
  }

  return newConflicts;
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

  const dA = drivers.find((d) => d.id === conflict.driverAId);
  const dB = drivers.find((d) => d.id === conflict.driverBId);
  if (!dA || !dB) return { drivers, packages, conflict: resolved };

  const pkgsB = dB.packages.filter((pid) => {
    const p = packages.find((pk) => pk.id === pid);
    return p && p.status === "in_transit";
  });
  const transferIds = pkgsB.slice(0, MAX_TRANSFER);

  if (transferIds.length === 0) return { drivers, packages, conflict: resolved };

  const updatedDrivers = drivers.map((d) => {
    if (d.id === dA.id) {
      return { ...d, packages: [...d.packages, ...transferIds] };
    }
    if (d.id === dB.id) {
      return {
        ...d,
        packages: d.packages.filter((pid) => !transferIds.includes(pid)),
        targetDropoffId: d.packages.filter((pid) => !transferIds.includes(pid))[0] ?? null,
        state: d.packages.filter((pid) => !transferIds.includes(pid)).length > 0 ? d.state : ("idle" as const),
      };
    }
    return d;
  });

  const updatedPackages = packages.map((p) =>
    transferIds.includes(p.id) ? { ...p, assignedDriverId: dA.id } : p,
  );

  return { drivers: updatedDrivers, packages: updatedPackages, conflict: resolved };
}

export function resetConflictCounter(): void {
  conflictCounter = 0;
}

const MAX_TRANSFER = 2;

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}
