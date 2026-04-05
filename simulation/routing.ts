import type { LatLng } from "./types";
import { haversineDistance } from "./geo";

export type RouteData = {
  waypoints: LatLng[];
  distanceKm: number;
  durationSec: number;
};

const routeCache = new Map<string, RouteData>();

function cacheKey(from: LatLng, to: LatLng): string {
  const f = `${from.latitude.toFixed(4)},${from.longitude.toFixed(4)}`;
  const t = `${to.latitude.toFixed(4)},${to.longitude.toFixed(4)}`;
  return `${f}->${t}`;
}

function decodePolyline6(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e6, longitude: lng / 1e6 });
  }

  return points;
}

function straightLineFallback(from: LatLng, to: LatLng): RouteData {
  const dist = haversineDistance(from, to);
  const steps = Math.max(2, Math.ceil(dist * 80));
  const waypoints: LatLng[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    waypoints.push({
      latitude: from.latitude + (to.latitude - from.latitude) * t,
      longitude: from.longitude + (to.longitude - from.longitude) * t,
    });
  }
  return { waypoints, distanceKm: dist * 1.3, durationSec: (dist * 1.3 / 40) * 3600 };
}

export async function fetchRoute(from: LatLng, to: LatLng): Promise<RouteData> {
  const key = cacheKey(from, to);
  const cached = routeCache.get(key);
  if (cached) return cached;

  try {
    const body = JSON.stringify({
      locations: [
        { lat: from.latitude, lon: from.longitude },
        { lat: to.latitude, lon: to.longitude },
      ],
      costing: "auto",
      directions_options: { units: "km" },
    });

    const resp = await fetch(`https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(body)}`);
    if (!resp.ok) throw new Error(`Valhalla ${resp.status}`);
    const json = await resp.json();

    if (!json.trip?.legs?.[0]) throw new Error("No legs");

    const leg = json.trip.legs[0];
    const waypoints = decodePolyline6(leg.shape);
    const result: RouteData = {
      waypoints,
      distanceKm: leg.summary.length,
      durationSec: leg.summary.time,
    };

    routeCache.set(key, result);
    return result;
  } catch {
    const fallback = straightLineFallback(from, to);
    routeCache.set(key, fallback);
    return fallback;
  }
}

export function computeOptimalOrder(
  currentPos: LatLng,
  packageIds: string[],
  dropoffCoords: Map<string, LatLng>,
): string[] {
  const remaining = [...packageIds];
  const ordered: string[] = [];
  let pos = currentPos;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const coord = dropoffCoords.get(remaining[i]);
      if (!coord) continue;
      const d = haversineDistance(pos, coord);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const picked = remaining.splice(bestIdx, 1)[0];
    ordered.push(picked);
    pos = dropoffCoords.get(picked) ?? pos;
  }

  return ordered;
}

export function clearRouteCache(): void {
  routeCache.clear();
}
