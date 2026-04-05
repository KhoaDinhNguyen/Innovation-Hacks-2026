import type { LatLng } from "./types";

const R_KM = 6371;

export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLng * sinLng;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

export function bearing(from: LatLng, to: LatLng): number {
  const dLng = toRad(to.longitude - from.longitude);
  const fromLat = toRad(from.latitude);
  const toLat = toRad(to.latitude);
  const y = Math.sin(dLng) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function interpolate(from: LatLng, to: LatLng, fraction: number): LatLng {
  const f = Math.max(0, Math.min(1, fraction));
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * f,
    longitude: from.longitude + (to.longitude - from.longitude) * f,
  };
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return interpolate(a, b, 0.5);
}

export function moveToward(from: LatLng, to: LatLng, distanceKm: number): LatLng {
  const total = haversineDistance(from, to);
  if (total < 0.001) return to;
  return interpolate(from, to, Math.min(1, distanceKm / total));
}

export function randomOffsetLatLng(center: LatLng, radiusKm: number): LatLng {
  const latOffset = (radiusKm / 111.32) * (Math.random() * 2 - 1);
  const lngOffset =
    (radiusKm / (111.32 * Math.cos(toRad(center.latitude)))) * (Math.random() * 2 - 1);
  return {
    latitude: center.latitude + latOffset,
    longitude: center.longitude + lngOffset,
  };
}

export function polylineDistance(waypoints: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += haversineDistance(waypoints[i - 1], waypoints[i]);
  }
  return total;
}

export function polylineMidpoint(waypoints: LatLng[]): LatLng {
  if (waypoints.length === 0) return { latitude: 0, longitude: 0 };
  if (waypoints.length === 1) return waypoints[0];
  return waypoints[Math.floor(waypoints.length / 2)];
}

/**
 * Move along a polyline by cumulative distance.
 * `traveledKm` is the total distance already traveled along this route.
 * `additionalKm` is the distance to add this tick.
 * Returns the new position, updated total traveled distance, and whether end was reached.
 */
export function moveAlongPolyline(
  waypoints: LatLng[],
  traveledKm: number,
  additionalKm: number,
): { coordinate: LatLng; newTraveledKm: number; arrived: boolean } {
  if (waypoints.length < 2) {
    return { coordinate: waypoints[0] ?? { latitude: 0, longitude: 0 }, newTraveledKm: 0, arrived: true };
  }

  const targetKm = traveledKm + additionalKm;
  let accumulated = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const segDist = haversineDistance(waypoints[i], waypoints[i + 1]);
    if (segDist <= 0.00001) continue;

    if (accumulated + segDist >= targetKm) {
      const remaining = targetKm - accumulated;
      const frac = remaining / segDist;
      const coord = interpolate(waypoints[i], waypoints[i + 1], frac);
      return { coordinate: coord, newTraveledKm: targetKm, arrived: false };
    }
    accumulated += segDist;
  }

  return { coordinate: waypoints[waypoints.length - 1], newTraveledKm: accumulated, arrived: true };
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
