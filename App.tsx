import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import {
  useSimulationClock,
  createPackage,
  shouldSpawnPackage,
  resetPackageCounter,
  createAIDrivers,
  createUserDriver,
  tickAIDriver,
  applyRouteToDriver,
  detectConflicts,
  resolveConflict,
  resetConflictCounter,
  haversineDistance,
  moveAlongPolyline,
  bearing,
  polylineMidpoint,
  remainingWaypoints,
  fetchRoute,
  computeOptimalOrder,
  clearRouteCache,
  MAX_PACKAGES_PER_DRIVER,
  CO2_PER_KM,
  POINTS_POPUP_DURATION_MS,
} from "./simulation";
import type { SimPackage, SimDriver, Conflict, SimSpeed, PointsPopup, LatLng } from "./simulation";

type TabKey = "dashboard" | "map" | "reward" | "history" | "profile" | "tracking";

const rewardProgress = { current: 360, goal: 500 };

const vouchers = [
  { id: "1", title: "Free Coffee Voucher", description: "Redeem this voucher for one free handcrafted coffee or tea.", points: 150, partner: "Apple", status: "redeemed", accentColor: "#f59e0b", logoIcon: "apple", logoBackground: "#f3f4f6", logoColor: "#111827" },
  { id: "2", title: "Campus Smoothie Voucher", description: "Redeem this voucher for one free fruit smoothie.", points: 180, partner: "Google", status: "redeemed", accentColor: "#ec4899", logoIcon: "google", logoBackground: "#eff6ff", logoColor: "#2563eb" },
  { id: "3", title: "Bus Pass Discount", description: "Use this voucher to lower the cost of your next bus or metro pass.", points: 280, partner: "Microsoft", status: "unlock", accentColor: "#3b82f6", logoIcon: "microsoft-windows", logoBackground: "#eff6ff", logoColor: "#2563eb" },
  { id: "4", title: "Lunch Combo Discount", description: "Use this voucher to save on a sustainable lunch combo.", points: 320, partner: "Meta", status: "unlock", accentColor: "#8b5cf6", logoIcon: "facebook", logoBackground: "#eef2ff", logoColor: "#4338ca" },
  { id: "5", title: "Eco Store Gift Card", description: "Exchange this for store credit on reusable and eco-friendly products.", points: 450, partner: "Amazon", status: "lock", accentColor: "#14b8a6", logoIcon: "aws", logoBackground: "#fff7ed", logoColor: "#c2410c" },
  { id: "6", title: "Weekend Rail Pass", description: "Unlock a discounted rail pass for your weekend trips.", points: 520, partner: "NVIDIA", status: "lock", accentColor: "#ef4444", logoIcon: "expansion-card", logoBackground: "#ecfccb", logoColor: "#3f6212" },
] as const;

const staticPointHistory = [
  { id: "s1", title: "Carpooled to campus", points: "+40", date: "Today" },
  { id: "s2", title: "Used public transport", points: "+25", date: "Yesterday" },
  { id: "s3", title: "Completed weekly eco goal", points: "+80", date: "Apr 2" },
  { id: "s4", title: "Redeemed coffee voucher", points: "-150", date: "Apr 1" },
];

const mapRegion = { latitude: 33.4484, longitude: -112.074, latitudeDelta: 0.014, longitudeDelta: 0.014 } as const;
const USER_ROUTE_ARRIVAL_THRESHOLD_KM = 0.05;

const tripHistory = [
  { id: "1", date: "Today", time: "2:30 PM", from: "Home", to: "Central Park", points: "+40", co2: "2.5 kg CO2", distance: "3.2 km", duration: "15 min", vehicleIcon: "walk" },
  { id: "2", date: "Yesterday", time: "8:10 AM", from: "Dorm A", to: "ASU Campus", points: "+25", co2: "1.8 kg CO2", distance: "4.1 km", duration: "18 min", vehicleIcon: "bike-fast" },
] as const;

const profileDetails = [
  { id: "name", label: "Name", value: "Alex Green" },
  { id: "email", label: "Email", value: "alex.green@asu.edu" },
  { id: "member", label: "Membership", value: "Eco Commuter" },
  { id: "joined", label: "Joined", value: "January 2026" },
] as const;

const honorTiers = [
  { id: "gaia-vanguard", title: 'The "Gaia Vanguard"', pointsRequired: 500, benefits: ["30% discount on eco-products", "VIP customer support 24/7", "Gold eco-badge on profile", "Exclusive event invitations", "Free yearly carbon offset", "Personal sustainability advisor", "Featured in hall of fame"], accentColor: "#a855f7", icon: "shield-outline" },
  { id: "kinetic-strategist", title: 'The "Kinetic Strategist"', pointsRequired: 300, benefits: ["15% discount on eco-products", "Priority customer support", "Silver eco-badge on profile", "Early access to new features", "Free carbon offset report"], accentColor: "#3b82f6", icon: "lightning-bolt-outline" },
  { id: "eco-explorer", title: 'The "Eco-Explorer"', pointsRequired: 150, benefits: ["5% discount on eco-products", "Monthly sustainability newsletter", "Basic eco-badge on profile", "Access to community forum"], accentColor: "#22c55e", icon: "compass-outline" },
] as const;

function formatSimTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [currentPoints, setCurrentPoints] = useState(rewardProgress.current);

  // Simulation state
  const [simPackages, setSimPackages] = useState<SimPackage[]>([]);
  const [simDrivers, setSimDrivers] = useState<SimDriver[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [totalCO2Saved, setTotalCO2Saved] = useState(0);
  const [deliveryLog, setDeliveryLog] = useState<{ id: string; title: string; points: string; date: string }[]>([]);
  const lastSpawnRef = useRef(0);
  const simInitializedRef = useRef(false);
  const pendingRouteRequests = useRef(new Set<string>());
  const markerJustPressed = useRef(false);
  const plannerBusyRef = useRef(false);
  const plannerLastRunRef = useRef(0);
  const conflictsRef = useRef<Conflict[]>([]);
  const activeConflictRef = useRef<Conflict | null>(null);

  // Map interaction state
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showDriverNotice, setShowDriverNotice] = useState(false);
  const [showPackageList, setShowPackageList] = useState(false);
  const [activeConflict, setActiveConflict] = useState<Conflict | null>(null);

  // Points popup animation state
  const [pointsPopups, setPointsPopups] = useState<PointsPopup[]>([]);
  const [showUserBanner, setShowUserBanner] = useState(false);
  const [userBannerText, setUserBannerText] = useState("");

  // Optimal order modal
  const [showOptimalOrderModal, setShowOptimalOrderModal] = useState(false);
  const [optimalOrder, setOptimalOrder] = useState<string[]>([]);

  // Delivery confirmation
  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false);
  const [deliveryConfirmPkgId, setDeliveryConfirmPkgId] = useState<string | null>(null);

  const userDriver = simDrivers.find((d) => d.role === "user") ?? null;
  const aiDrivers = simDrivers.filter((d) => d.role === "ai");
  const userPackageIds = simPackages
    .filter((p) => p.assignedDriverId === "user-driver" && p.status !== "delivered")
    .map((p) => p.id);
  const userPackageCount = userPackageIds.length;
  const canPickupMore = userPackageCount < MAX_PACKAGES_PER_DRIVER;
  const selectedPackage = simPackages.find((p) => p.id === selectedPackageId) ?? null;
  const waitingCount = simPackages.filter((p) => p.status === "waiting").length;
  const activeConflictReceiver = activeConflict ? simDrivers.find((d) => d.id === activeConflict.driverAId) ?? null : null;
  const activeConflictSender = activeConflict ? simDrivers.find((d) => d.id === activeConflict.driverBId) ?? null : null;
  const activeConflictTransferPkg = activeConflict ? simPackages.find((p) => p.id === activeConflict.transferPackageIds[0]) ?? null : null;
  const activeConflictReceiverPkg = activeConflict && activeConflictReceiver?.targetDropoffId
    ? simPackages.find((p) => p.id === activeConflictReceiver.targetDropoffId) ?? null
    : null;

  const progressPercentage = (currentPoints / rewardProgress.goal) * 100;
  const progressWidth = `${Math.min(progressPercentage, 100)}%` as const;
  const currentHonor = currentPoints >= 500 ? 'The "Gaia Vanguard"' : currentPoints >= 300 ? 'The "Kinetic Strategist"' : 'The "Eco-Explorer"';

  const allPointHistory = [...deliveryLog, ...staticPointHistory];

  useEffect(() => {
    conflictsRef.current = conflicts;
  }, [conflicts]);

  useEffect(() => {
    activeConflictRef.current = activeConflict;
  }, [activeConflict]);

  const requestDriverRoute = useCallback((driverId: string, from: LatLng, to: LatLng) => {
    const reqKey = `${driverId}-dropoff`;
    if (pendingRouteRequests.current.has(reqKey)) return;

    pendingRouteRequests.current.add(reqKey);
    fetchRoute(from, to)
      .then((route) => {
        setSimDrivers((cur) => applyRouteToDriver(cur, driverId, route.waypoints, route.distanceKm, route.durationSec));
      })
      .finally(() => {
        pendingRouteRequests.current.delete(reqKey);
      });
  }, []);

  const queueTransferPlanning = useCallback((drivers: SimDriver[], packages: SimPackage[], totalMs: number) => {
    if (plannerBusyRef.current || activeConflictRef.current) return;
    if (totalMs - plannerLastRunRef.current < 3000) return;

    plannerBusyRef.current = true;
    plannerLastRunRef.current = totalMs;

    detectConflicts(drivers, packages, conflictsRef.current)
      .then((newConflicts) => {
        if (newConflicts.length === 0 || activeConflictRef.current) return;

        setConflicts((prev) => [...prev, ...newConflicts]);
        setActiveConflict((current) => current ?? newConflicts[0]);
      })
      .finally(() => {
        plannerBusyRef.current = false;
      });
  }, []);

  const onSimTick = useCallback((deltaMs: number, totalMs: number) => {
    setSimPackages((prev) => {
      let pkgs = prev;
      if (shouldSpawnPackage(totalMs, lastSpawnRef.current, pkgs.filter((p) => p.status !== "delivered").length)) {
        pkgs = [...pkgs, createPackage(mapRegion, totalMs)];
        lastSpawnRef.current = totalMs;
      }
      return pkgs;
    });

    setSimDrivers((prevDrivers) => {
      setSimPackages((prevPkgs) => {
        let pkgs = prevPkgs;
        const updatedDrivers: SimDriver[] = [];
        let newDeliveries = 0;
        let newCO2 = 0;
        const allDelivered: Array<{ pkgId: string; driverColor: string; coordinate: LatLng; points: number }> = [];

        for (const driver of prevDrivers) {
          if (driver.role === "ai") {
            const result = tickAIDriver(driver, pkgs, deltaMs, totalMs);
            updatedDrivers.push(result.driver);
            pkgs = result.packages;
            newDeliveries += result.delivered.length;

            for (const did of result.delivered) {
              const p = pkgs.find((pk) => pk.id === did);
              if (p) {
                const co2 = haversineDistance(p.pickupCoordinate, p.dropoffCoordinate) * CO2_PER_KM;
                newCO2 += co2;
                allDelivered.push({ pkgId: did, driverColor: result.driver.color, coordinate: { ...result.driver.coordinate }, points: p.rewardPoints });
              }
            }

            for (const req of result.routeRequests) {
              const reqKey = `${req.driverId}-${req.purpose}`;
              if (!pendingRouteRequests.current.has(reqKey)) {
                pendingRouteRequests.current.add(reqKey);
                fetchRoute(req.from, req.to).then((route) => {
                  pendingRouteRequests.current.delete(reqKey);
                  setSimDrivers((cur) => applyRouteToDriver(cur, req.driverId, route.waypoints, route.distanceKm, route.durationSec));
                });
              }
            }
          } else {
            let ud = { ...driver };
            if ((ud.state === "to_pickup" || ud.state === "to_dropoff") && ud.routeWaypoints.length >= 2) {
              const uDistKm = (ud.speed * deltaMs) / 3_600_000;
              const moveResult = moveAlongPolyline(ud.routeWaypoints, ud.routeProgress, uDistKm);
              ud.coordinate = moveResult.coordinate;
              ud.routeProgress = moveResult.newTraveledKm;
              ud.totalDistanceKm += uDistKm;
              ud.etaRemainingSec = Math.max(0, ud.etaRemainingSec - deltaMs / 1000);

              const targetPkg = ud.state === "to_pickup"
                ? pkgs.find((p) => p.id === ud.targetPackageId)
                : pkgs.find((p) => p.id === ud.targetDropoffId);
              if (targetPkg) {
                const dest = ud.state === "to_pickup" ? targetPkg.pickupCoordinate : targetPkg.dropoffCoordinate;
                ud.heading = bearing(ud.coordinate, dest);

                const hasArrived = moveResult.arrived || haversineDistance(ud.coordinate, dest) <= USER_ROUTE_ARRIVAL_THRESHOLD_KM;
                if (hasArrived && ud.state === "to_pickup") {
                  const pickedUpAt = Date.now();
                  const nextPackages = [...ud.packages, targetPkg.id];
                  const nextTargetDropoffId = ud.targetDropoffId ?? targetPkg.id;

                  ud.coordinate = { ...targetPkg.pickupCoordinate };
                  ud.packages = nextPackages;
                  ud.state = "to_dropoff";
                  ud.targetPackageId = null;
                  ud.targetDropoffId = nextTargetDropoffId;
                  ud.routeWaypoints = [];
                  ud.routeProgress = 0;
                  ud.routeDistanceKm = 0;
                  ud.routeDurationSec = 0;
                  ud.etaRemainingSec = 0;

                  pkgs = pkgs.map((p) =>
                    p.id === targetPkg.id ? { ...p, status: "in_transit" as const, actualPickupTime: pickedUpAt } : p,
                  );

                  if (nextPackages.length >= 2) {
                    const dropoffCoords = new Map<string, LatLng>();
                    for (const pid of nextPackages) {
                      const pkg = pkgs.find((p) => p.id === pid);
                      if (pkg) dropoffCoords.set(pid, pkg.dropoffCoordinate);
                    }
                    const order = computeOptimalOrder(ud.coordinate, nextPackages, dropoffCoords);
                    setOptimalOrder(order);
                    setShowOptimalOrderModal(true);
                  } else {
                    fetchRoute(ud.coordinate, targetPkg.dropoffCoordinate).then((route) => {
                      setSimDrivers((cur) => applyRouteToDriver(cur, "user-driver", route.waypoints, route.distanceKm, route.durationSec));
                    });
                  }
                }
              }
            }
            updatedDrivers.push(ud);
          }
        }

        if (newDeliveries > 0) {
          setTotalDeliveries((d) => d + newDeliveries);
          setTotalCO2Saved((c) => c + newCO2);
        }

        if (allDelivered.length > 0) {
          setPointsPopups((prev) => [
            ...prev,
            ...allDelivered.map((d) => ({
              id: `popup-${d.pkgId}-${Date.now()}`,
              coordinate: d.coordinate,
              points: d.points,
              createdAt: Date.now(),
              driverColor: d.driverColor,
            })),
          ]);
        }

        setSimDrivers(updatedDrivers);
        queueTransferPlanning(updatedDrivers, pkgs, totalMs);
        return pkgs;
      });
      return prevDrivers;
    });

    setPointsPopups((prev) => prev.filter((p) => Date.now() - p.createdAt < POINTS_POPUP_DURATION_MS));
  }, [queueTransferPlanning]);

  const clock = useSimulationClock(onSimTick);

  const initSimulation = useCallback(() => {
    if (simInitializedRef.current) return;
    simInitializedRef.current = true;
    resetPackageCounter();
    resetConflictCounter();
    clearRouteCache();
    const user = createUserDriver();
    const ais = createAIDrivers(3);
    setSimDrivers([user, ...ais]);
    setSimPackages([]);
    setConflicts([]);
    setTotalDeliveries(0);
    setTotalCO2Saved(0);
    setDeliveryLog([]);
    setPointsPopups([]);
    lastSpawnRef.current = 0;
    plannerBusyRef.current = false;
    plannerLastRunRef.current = 0;
    conflictsRef.current = [];
    activeConflictRef.current = null;
  }, []);

  const resetSimulation = useCallback(() => {
    clock.reset();
    simInitializedRef.current = false;
    resetPackageCounter();
    resetConflictCounter();
    clearRouteCache();
    pendingRouteRequests.current.clear();
    const user = createUserDriver();
    const ais = createAIDrivers(3);
    setSimDrivers([user, ...ais]);
    setSimPackages([]);
    setConflicts([]);
    setTotalDeliveries(0);
    setTotalCO2Saved(0);
    setDeliveryLog([]);
    setSelectedPackageId(null);
    setSelectedDriverId(null);
    setActiveConflict(null);
    setPointsPopups([]);
    setShowOptimalOrderModal(false);
    setShowDeliveryConfirm(false);
    lastSpawnRef.current = 0;
    plannerBusyRef.current = false;
    plannerLastRunRef.current = 0;
    conflictsRef.current = [];
    activeConflictRef.current = null;
    simInitializedRef.current = true;
  }, [clock]);

  const handleLogin = () => {
    const email = loginEmail.trim();
    if (!email || !loginPassword) { setLoginError("Enter email and password."); return; }
    if (!email.includes("@")) { setLoginError("Enter a valid email address."); return; }
    if (loginPassword.length < 4) { setLoginError("Password must be at least 4 characters."); return; }
    setLoginError(null);
    setIsLoggedIn(true);
    initSimulation();
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginPassword("");
    setActiveTab("dashboard");
    clock.pause();
  };

  const handlePickupPackage = () => {
    if (!selectedPackage || !userDriver || !canPickupMore) return;
    if (selectedPackage.status !== "waiting") return;

    const pkgId = selectedPackage.id;

    setSimPackages((prev) => prev.map((p) =>
      p.id === pkgId ? { ...p, status: "assigned" as const, assignedDriverId: "user-driver" } : p,
    ));
    setSimDrivers((prev) => prev.map((d) => {
      if (d.id !== "user-driver") return d;
      return {
        ...d,
        state: "to_pickup" as const,
        targetPackageId: pkgId,
        routeWaypoints: [],
        routeProgress: 0,
        routeDistanceKm: 0,
        routeDurationSec: 0,
        etaRemainingSec: 0,
      };
    }));
    fetchRoute(userDriver.coordinate, selectedPackage.pickupCoordinate).then((route) => {
      setSimDrivers((cur) => applyRouteToDriver(cur, "user-driver", route.waypoints, route.distanceKm, route.durationSec));
    });

    setSelectedPackageId(null);
  };

  const handleAcceptOptimalOrder = () => {
    setShowOptimalOrderModal(false);
    const firstId = optimalOrder[0];
    if (!firstId) return;
    setSimDrivers((prev) => prev.map((d) => {
      if (d.id !== "user-driver") return d;
      return { ...d, packages: [...optimalOrder], targetDropoffId: firstId };
    }));
    const firstPkg = simPackages.find((p) => p.id === firstId);
    if (firstPkg && userDriver) {
      fetchRoute(userDriver.coordinate, firstPkg.dropoffCoordinate).then((route) => {
        setSimDrivers((cur) => applyRouteToDriver(cur, "user-driver", route.waypoints, route.distanceKm, route.durationSec));
      });
    }
  };

  const handleRejectOptimalOrder = () => {
    setShowOptimalOrderModal(false);
    if (userDriver && userDriver.targetDropoffId) {
      const targetPkg = simPackages.find((p) => p.id === userDriver.targetDropoffId);
      if (targetPkg) {
        fetchRoute(userDriver.coordinate, targetPkg.dropoffCoordinate).then((route) => {
          setSimDrivers((cur) => applyRouteToDriver(cur, "user-driver", route.waypoints, route.distanceKm, route.durationSec));
        });
      }
    }
  };

  const handleUserDropoffArrive = (pkgId: string) => {
    setDeliveryConfirmPkgId(pkgId);
    setShowDeliveryConfirm(true);
  };

  const handleConfirmDelivery = () => {
    if (!deliveryConfirmPkgId) return;
    const pkgId = deliveryConfirmPkgId;
    const pkg = simPackages.find((p) => p.id === pkgId);
    if (!pkg || !userDriver) return;

    setShowDeliveryConfirm(false);
    setDeliveryConfirmPkgId(null);

    setSimPackages((prev) => prev.map((p) =>
      p.id === pkgId ? { ...p, status: "delivered" as const, actualDropoffTime: Date.now() } : p,
    ));

    const co2 = haversineDistance(pkg.pickupCoordinate, pkg.dropoffCoordinate) * CO2_PER_KM;
    setTotalDeliveries((d) => d + 1);
    setTotalCO2Saved((c) => c + co2);
    setCurrentPoints((p) => p + pkg.rewardPoints);
    setDeliveryLog((prev) => [{ id: `del-${Date.now()}`, title: `Delivered ${pkg.label}`, points: `+${pkg.rewardPoints}`, date: "Just now" }, ...prev]);

    setPointsPopups((prev) => [...prev, {
      id: `popup-user-${Date.now()}`,
      coordinate: { ...pkg.dropoffCoordinate },
      points: pkg.rewardPoints,
      createdAt: Date.now(),
      driverColor: "#0f5c45",
    }]);
    setUserBannerText(`Package delivered! +${pkg.rewardPoints} pts`);
    setShowUserBanner(true);
    setTimeout(() => setShowUserBanner(false), 2500);

    setSimDrivers((prev) => prev.map((d) => {
      if (d.id !== "user-driver") return d;
      const remaining = d.packages.filter((pid) => pid !== pkgId);
      if (remaining.length > 0) {
        const nextId = remaining[0];
        const nextPkg = simPackages.find((p) => p.id === nextId);
        if (nextPkg) {
          fetchRoute(d.coordinate, nextPkg.dropoffCoordinate).then((route) => {
            setSimDrivers((cur) => applyRouteToDriver(cur, "user-driver", route.waypoints, route.distanceKm, route.durationSec));
          });
        }
        return { ...d, packages: remaining, state: "to_dropoff" as const, targetDropoffId: nextId, routeWaypoints: [], routeProgress: 0 };
      }
      return { ...d, packages: [], state: "idle" as const, targetDropoffId: null, routeWaypoints: [], routeProgress: 0, etaRemainingSec: 0 };
    }));
  };

  const handleDropoffPackage = (pkgId: string) => {
    handleUserDropoffArrive(pkgId);
  };

  const handleSwitchTarget = (pkgId: string) => {
    if (!userDriver) return;
    const pkg = simPackages.find((p) => p.id === pkgId);
    if (!pkg) return;
    setSimDrivers((prev) => prev.map((d) =>
      d.id === "user-driver" ? { ...d, targetDropoffId: pkgId, routeWaypoints: [], routeProgress: 0 } : d,
    ));
    fetchRoute(userDriver.coordinate, pkg.dropoffCoordinate).then((route) => {
      setSimDrivers((cur) => applyRouteToDriver(cur, "user-driver", route.waypoints, route.distanceKm, route.durationSec));
    });
  };

  const handleConflictAction = (accept: boolean) => {
    if (!activeConflict) return;
    const conflict = activeConflict;
    const result = resolveConflict(conflict, accept, simDrivers, simPackages);
    setSimDrivers(result.drivers);
    setSimPackages(result.packages);
    setConflicts((prev) => prev.map((c) => (c.id === conflict.id ? result.conflict : c)));

    if (accept) {
      setTotalCO2Saved((c) => c + conflict.potentialCO2Saving);

      for (const driverId of [conflict.driverAId, conflict.driverBId]) {
        const driver = result.drivers.find((candidate) => candidate.id === driverId);
        if (!driver?.targetDropoffId || driver.state !== "to_dropoff") continue;

        const targetPkg = result.packages.find((pkg) => pkg.id === driver.targetDropoffId);
        if (!targetPkg) continue;

        requestDriverRoute(driver.id, driver.coordinate, targetPkg.dropoffCoordinate);
      }
    }

    setActiveConflict(null);
  };

  // Login screen
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={styles.loginKeyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
          <ScrollView contentContainerStyle={styles.loginScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.loginBrandBlock}>
              <View style={styles.loginLogoCircle}>
                <MaterialCommunityIcons name="leaf-circle" size={42} color="#0f5c45" />
              </View>
              <Text style={styles.loginAppTitle}>Ecoride</Text>
              <Text style={styles.loginTagline}>Ride greener. Earn more rewards.</Text>
            </View>
            <View style={styles.loginCard}>
              <Text style={styles.loginCardTitle}>Sign in</Text>
              <View style={styles.loginInfoBlock}>
                <Text style={styles.loginDisclaimer}>Mock login for our hackathon MVP only. This is not a real or secure sign-in: there is no backend authentication, credentials are not stored, and nothing is encrypted like production auth.</Text>
                <Text style={styles.loginRules}><Text style={styles.loginRulesLabel}>Allowed: </Text>any email that contains @ and any password with 4 or more characters (example: you@demo.com / pass1234).</Text>
                <Text style={styles.loginRules}><Text style={styles.loginRulesLabel}>Not allowed: </Text>empty email or password, an email with no @, or a password shorter than 4 characters.</Text>
              </View>
              <Text style={styles.loginLabel}>Email</Text>
              <TextInput style={styles.loginInput} placeholder="you@example.com" placeholderTextColor="#94a3b8" value={loginEmail} onChangeText={(t) => { setLoginEmail(t); setLoginError(null); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
              <Text style={styles.loginLabel}>Password</Text>
              <TextInput style={styles.loginInput} placeholder="••••••••" placeholderTextColor="#94a3b8" value={loginPassword} onChangeText={(t) => { setLoginPassword(t); setLoginError(null); }} secureTextEntry autoCapitalize="none" autoComplete="password" />
              {loginError ? <Text style={styles.loginErrorText}>{loginError}</Text> : null}
              <Pressable style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>Sign in</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Build stat values from simulation
  const simStats = [
    { id: "points", label: "Sustainable Points", value: String(currentPoints), change: `+${totalDeliveries * 3}%`, period: "this session", icon: "leaf" as const, iconColor: "#16a34a", iconBackground: "#dcfce7" },
    { id: "co2", label: "kg CO2 Saved", value: totalCO2Saved.toFixed(1), change: `${totalCO2Saved > 0 ? "+" : ""}${(totalCO2Saved * 8).toFixed(0)}%`, period: "this session", icon: "cloud-check-outline" as const, iconColor: "#2563eb", iconBackground: "#dbeafe" },
    { id: "trips", label: "Deliveries", value: String(totalDeliveries), change: `+${totalDeliveries}`, period: "completed", icon: "map-marker-path" as const, iconColor: "#9333ea", iconBackground: "#f3e8ff" },
    { id: "drivers", label: "Active Drivers", value: String(simDrivers.filter((d) => d.state !== "idle" && d.state !== "cooldown").length), change: `${simDrivers.length}`, period: "total", icon: "truck-delivery-outline" as const, iconColor: "#d97706", iconBackground: "#fef3c7" },
  ];

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />

        {activeTab !== "map" && (
          <View style={styles.appHeader}>
            <View style={styles.appHeaderRow}>
              <View style={styles.appHeaderTitles}>
                <Text style={styles.appTitle}>Ecoride</Text>
                <Text style={styles.appSubtitle}>Ride greener. Earn more rewards.</Text>
              </View>
              <View style={styles.appHeaderActions}>
                <Pressable style={styles.notificationBell} onPress={() => setShowDriverNotice((prev) => !prev)} hitSlop={10}>
                  <MaterialCommunityIcons name="bell-outline" size={22} color="#0f5c45" />
                  {waitingCount > 0 ? <View style={styles.notificationDot} /> : null}
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Nearby packages modal */}
        <Modal visible={showDriverNotice} transparent animationType="fade" onRequestClose={() => setShowDriverNotice(false)}>
          <Pressable style={styles.driverNoticeOverlay} onPress={() => setShowDriverNotice(false)}>
            <Pressable style={styles.driverNoticeModal} onPress={() => { setShowDriverNotice(false); setActiveTab("map"); }}>
              <View style={styles.driverNoticeHeader}>
                <MaterialCommunityIcons name="package-variant-closed" size={18} color="#0f5c45" />
                <Text style={styles.driverNoticeTitle}>Available packages</Text>
              </View>
              <Text style={styles.driverNoticeCount}>{waitingCount}</Text>
              <Text style={styles.driverNoticeText}>packages waiting for pickup</Text>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Conflict alert modal */}
        <Modal visible={!!activeConflict} transparent animationType="slide" onRequestClose={() => handleConflictAction(false)}>
          <View style={styles.conflictOverlay}>
            <View style={styles.conflictModal}>
              <View style={styles.conflictHeader}>
                <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#d97706" />
                <Text style={styles.conflictTitle}>Route Overlap Detected</Text>
              </View>
              {activeConflict && (
                <>
                  <Text style={styles.conflictText}>
                    {simDrivers.find((d) => d.id === activeConflict.driverAId)?.name ?? "Driver A"} and{" "}
                    {simDrivers.find((d) => d.id === activeConflict.driverBId)?.name ?? "Driver B"} can consolidate nearby deliveries.
                  </Text>
                  <View style={styles.conflictSavingsRow}>
                    <View style={styles.conflictSavingBox}>
                      <Text style={styles.conflictSavingValue}>{activeConflict.potentialSavingKm.toFixed(1)} km</Text>
                      <Text style={styles.conflictSavingLabel}>distance saved</Text>
                    </View>
                    <View style={styles.conflictSavingBox}>
                      <Text style={styles.conflictSavingValue}>{activeConflict.potentialCO2Saving.toFixed(2)} kg</Text>
                      <Text style={styles.conflictSavingLabel}>CO2 saved</Text>
                    </View>
                  </View>
                  <Text style={styles.conflictSuggestion}>
                    Transfer {activeConflict.transferPackageIds.length} package at {activeConflict.meetPointLabel}. Baseline distance drops from{" "}
                    {activeConflict.directDistanceKm.toFixed(1)} km to {activeConflict.optimizedDistanceKm.toFixed(1)} km, and the meet ETAs are only{" "}
                    {Math.round(activeConflict.arrivalWindowSec / 60)} min apart.
                  </Text>
                  <View style={styles.conflictActions}>
                    <Pressable style={styles.conflictAcceptBtn} onPress={() => handleConflictAction(true)}>
                      <Text style={styles.conflictAcceptText}>Accept Transfer</Text>
                    </Pressable>
                    <Pressable style={styles.conflictDismissBtn} onPress={() => handleConflictAction(false)}>
                      <Text style={styles.conflictDismissText}>Dismiss</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Optimal order modal */}
        <Modal visible={showOptimalOrderModal} transparent animationType="slide" onRequestClose={handleRejectOptimalOrder}>
          <View style={styles.conflictOverlay}>
            <View style={styles.conflictModal}>
              <View style={styles.conflictHeader}>
                <MaterialCommunityIcons name="routes" size={24} color="#0f5c45" />
                <Text style={styles.conflictTitle}>Suggested Delivery Order</Text>
              </View>
              <Text style={styles.conflictText}>We found an optimal route that minimizes your total driving distance.</Text>
              {optimalOrder.map((pid, idx) => {
                const pkg = simPackages.find((p) => p.id === pid);
                return pkg ? (
                  <View key={pid} style={styles.optimalOrderRow}>
                    <View style={styles.optimalOrderBadge}><Text style={styles.optimalOrderBadgeText}>{idx + 1}</Text></View>
                    <View style={styles.optimalOrderInfo}>
                      <Text style={styles.optimalOrderLabel}>{pkg.label}</Text>
                      <Text style={styles.optimalOrderAddr}>{pkg.dropoffAddress}</Text>
                    </View>
                  </View>
                ) : null;
              })}
              <View style={[styles.conflictActions, { marginTop: 16 }]}>
                <Pressable style={styles.conflictAcceptBtn} onPress={handleAcceptOptimalOrder}>
                  <Text style={styles.conflictAcceptText}>Accept Route</Text>
                </Pressable>
                <Pressable style={styles.conflictDismissBtn} onPress={handleRejectOptimalOrder}>
                  <Text style={styles.conflictDismissText}>Keep Current</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delivery confirm modal */}
        <Modal visible={showDeliveryConfirm} transparent animationType="fade" onRequestClose={() => setShowDeliveryConfirm(false)}>
          <View style={styles.conflictOverlay}>
            <View style={styles.conflictModal}>
              <View style={styles.conflictHeader}>
                <MaterialCommunityIcons name="package-down" size={24} color="#22c55e" />
                <Text style={styles.conflictTitle}>Confirm Delivery</Text>
              </View>
              {deliveryConfirmPkgId && (() => {
                const pkg = simPackages.find((p) => p.id === deliveryConfirmPkgId);
                return pkg ? (
                  <>
                    <Text style={styles.conflictText}>You've arrived at <Text style={{ fontWeight: "800" }}>{pkg.dropoffAddress}</Text>.</Text>
                    <Text style={styles.conflictSuggestion}>Confirm to mark {pkg.label} as delivered and earn +{pkg.rewardPoints} pts.</Text>
                  </>
                ) : null;
              })()}
              <View style={styles.conflictActions}>
                <Pressable style={styles.conflictAcceptBtn} onPress={handleConfirmDelivery}>
                  <Text style={styles.conflictAcceptText}>Deliver Package</Text>
                </Pressable>
                <Pressable style={styles.conflictDismissBtn} onPress={() => setShowDeliveryConfirm(false)}>
                  <Text style={styles.conflictDismissText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Package list modal */}
        <Modal visible={showPackageList} transparent animationType="slide" onRequestClose={() => setShowPackageList(false)}>
          <View style={styles.packageListOverlay}>
            <View style={styles.packageListModal}>
              <View style={styles.packageListHeader}>
                <Text style={styles.packageListTitle}>Your Packages ({userPackageCount}/{MAX_PACKAGES_PER_DRIVER})</Text>
                <Pressable onPress={() => setShowPackageList(false)} hitSlop={10}>
                  <MaterialCommunityIcons name="close" size={22} color="#64748b" />
                </Pressable>
              </View>
              {userPackageIds.length === 0 ? (
                <Text style={styles.packageListEmpty}>No packages picked up yet. Tap a blue marker on the map to pick one up.</Text>
              ) : (
                <FlatList
                  data={userPackageIds.map((id) => simPackages.find((p) => p.id === id)).filter(Boolean) as SimPackage[]}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.packageListItem}>
                      <View style={styles.packageListItemHeader}>
                        <Text style={styles.packageListItemLabel}>{item.label}</Text>
                        <View style={[styles.packageListStatusBadge, item.status === "in_transit" ? styles.packageListStatusTransit : null]}>
                          <Text style={styles.packageListStatusText}>{item.status === "in_transit" ? "In Transit" : item.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.packageListAddr}>Pickup: {item.pickupAddress}</Text>
                      <Text style={styles.packageListAddr}>Dropoff: {item.dropoffAddress}</Text>
                      <View style={styles.packageListItemFooter}>
                        <Text style={styles.packageListPts}>+{item.rewardPoints} pts</Text>
                        {item.status === "in_transit" && (
                          <Pressable style={styles.packageListDropoffBtn} onPress={() => { handleDropoffPackage(item.id); setShowPackageList(false); }}>
                            <Text style={styles.packageListDropoffText}>Deliver</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>

        <View style={styles.content}>
          {activeTab === "dashboard" ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.heroCard}>
                <Text style={styles.heroEyebrow}>Dashboard</Text>
                <Text style={styles.heroTitle}>Your eco impact this week</Text>
                <Text style={styles.heroText}>Keep riding sustainably to unlock more rewards and grow your streak.</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>Points and rewards</Text>
                  <Pressable style={styles.rewardsLinkInline} onPress={() => setActiveTab("tracking")}>
                    <Text style={styles.rewardsLinkText}>Go to Milestone</Text>
                  </Pressable>
                </View>
                <View style={styles.trackingPointsRow}>
                  <Text style={styles.trackingPointsValue}>{currentPoints} pts</Text>
                  <Text style={styles.trackingPointsGoal}>Next milestone: {rewardProgress.goal} pts</Text>
                </View>
                <Text style={styles.trackingCurrentRank}>{currentHonor}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: progressWidth }]} />
                </View>
                <Text style={styles.cardHint}>{Math.max(0, rewardProgress.goal - currentPoints)} more points until your next reward.</Text>
              </View>

              <View style={styles.streakCard}>
                <View style={styles.streakGlowLarge} />
                <View style={styles.streakGlowSmall} />
                <View style={styles.streakHeaderRow}>
                  <View style={styles.streakCopy}>
                    <Text style={styles.streakLabel}>Current Streak</Text>
                    <View style={styles.streakValueRow}>
                      <MaterialCommunityIcons name="fire" size={36} color="#ffffff" />
                      <Text style={styles.streakValue}>12</Text>
                      <Text style={styles.streakUnit}>days</Text>
                    </View>
                    <Text style={styles.streakMessage}>Keep it going!</Text>
                  </View>
                  <View style={styles.streakIconBadge}>
                    <MaterialCommunityIcons name="fire" size={42} color="#ffffff" />
                  </View>
                </View>
              </View>

              <View style={styles.mapSectionHeader}>
                <Text style={styles.mapSectionTitle}>Statistics</Text>
                <Text style={styles.mapSectionSubtitle}>Track how your deliveries create a more sustainable map over time.</Text>
              </View>

              <View style={styles.statsGrid}>
                {simStats.map((stat) => (
                  <View key={stat.id} style={styles.statCard}>
                    <View style={[styles.statIconWrap, { backgroundColor: stat.iconBackground }]}>
                      <MaterialCommunityIcons name={stat.icon} size={30} color={stat.iconColor} />
                    </View>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <View style={styles.statTrendRow}>
                      <MaterialCommunityIcons name="trending-up" size={18} color={stat.iconColor} />
                      <Text style={[styles.statTrendValue, { color: stat.iconColor }]}>{stat.change}</Text>
                      <Text style={styles.statTrendPeriod}>{stat.period}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : activeTab === "tracking" ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.trackingHeroCard}>
                <Text style={styles.heroEyebrow}>Tracking</Text>
                <Text style={styles.heroTitle}>Honor progress</Text>
                <Text style={styles.heroText}>Track your current points and see what each honor tier unlocks next.</Text>
              </View>
              <View style={styles.trackingSectionHeader}>
                <Text style={styles.trackingSectionTitle}>Honor titles</Text>
              </View>
              {honorTiers.map((tier) => (
                <View key={tier.id} style={[styles.card, tier.title === currentHonor ? styles.activeHonorCard : null, currentPoints < tier.pointsRequired ? styles.lockedHonorCard : null]}>
                  <View style={styles.honorCard}>
                    <View style={styles.honorTopRow}>
                      <View style={[styles.honorIconWrap, { backgroundColor: `${tier.accentColor}20` }]}>
                        <MaterialCommunityIcons name={tier.icon} size={26} color={tier.accentColor} />
                      </View>
                      {tier.title === currentHonor ? <Text style={styles.honorCurrentLabel}>Current</Text> : currentPoints < tier.pointsRequired ? <Text style={styles.honorLockLabel}>Locked</Text> : <View />}
                    </View>
                    <Text style={styles.honorTitle}>{tier.title}</Text>
                    <Text style={styles.honorPoints}>{tier.pointsRequired} pts</Text>
                    <View style={styles.honorBenefitsBlock}>
                      {tier.benefits.map((benefit) => (
                        <View key={benefit} style={styles.honorBenefitRow}>
                          <MaterialCommunityIcons name="check" size={16} color="#0f5c45" />
                          <Text style={styles.honorBenefit}>{benefit}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : activeTab === "history" ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.historyScreenHeader}>
                <Text style={styles.historyScreenTitle}>Trip History</Text>
              </View>
              <View style={styles.historySummaryCard}>
                <View style={styles.historySummaryTitleRow}>
                  <MaterialCommunityIcons name="trending-up" size={24} color="#ffffff" />
                  <Text style={styles.historySummaryTitle}>Path Impact Summary</Text>
                </View>
                <View style={styles.historySummaryStats}>
                  <View style={styles.historySummaryStat}>
                    <View style={styles.historySummaryMetricRow}>
                      <MaterialCommunityIcons name="leaf" size={28} color="#ffffff" />
                      <Text style={styles.historySummaryValue}>{currentPoints}</Text>
                    </View>
                    <Text style={styles.historySummaryLabel}>Total points</Text>
                  </View>
                  <View style={styles.historySummaryStat}>
                    <View style={styles.historySummaryMetricRow}>
                      <MaterialCommunityIcons name="map-marker" size={28} color="#ffffff" />
                      <Text style={styles.historySummaryValue}>{totalCO2Saved.toFixed(1)}</Text>
                    </View>
                    <Text style={styles.historySummaryLabel}>kg CO2 saved</Text>
                  </View>
                </View>
              </View>
              {tripHistory.map((trip) => (
                <View key={trip.id} style={styles.historyTripCard}>
                  <View style={styles.historyRoutePreview}><View style={styles.historyPathLine} /><View style={styles.historyPathStart} /><View style={styles.historyPathEnd} /></View>
                  <View style={styles.historyTripBody}>
                    <View style={styles.historyMetaRow}>
                      <View style={styles.historyMetaLeft}>
                        <MaterialCommunityIcons name="calendar-blank-outline" size={22} color="#64748b" />
                        <Text style={styles.historyMetaText}>{trip.date} • {trip.time}</Text>
                      </View>
                      <View style={styles.historyVehicleBadge}><MaterialCommunityIcons name={trip.vehicleIcon} size={20} color="#ffffff" /></View>
                    </View>
                    <View style={styles.historyStops}>
                      <View style={styles.historyStopRow}><View style={[styles.historyStopIconWrap, styles.historyStartIconWrap]}><MaterialCommunityIcons name="map-marker-outline" size={18} color="#2563eb" /></View><Text style={styles.historyStopText}>{trip.from}</Text></View>
                      <View style={styles.historyConnector} />
                      <View style={styles.historyStopRow}><View style={[styles.historyStopIconWrap, styles.historyEndIconWrap]}><MaterialCommunityIcons name="map-marker-outline" size={18} color="#ef4444" /></View><Text style={styles.historyStopText}>{trip.to}</Text></View>
                    </View>
                    <View style={styles.historyFooter}>
                      <View style={styles.historyImpactRow}>
                        <MaterialCommunityIcons name="leaf" size={20} color="#16a34a" />
                        <Text style={styles.historyImpactPoints}>{trip.points}</Text>
                        <Text style={styles.historyImpactText}>{trip.co2}</Text>
                        <Text style={styles.historyImpactText}>{trip.distance}</Text>
                      </View>
                      <Text style={styles.historyDuration}>{trip.duration}</Text>
                    </View>
                  </View>
                </View>
              ))}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Points history</Text>
                {allPointHistory.map((entry) => (
                  <View key={entry.id} style={styles.listItem}>
                    <View><Text style={styles.listTitle}>{entry.title}</Text><Text style={styles.listSubtitle}>{entry.date}</Text></View>
                    <Text style={[styles.historyPoints, entry.points.startsWith("+") ? styles.positivePoints : styles.negativePoints]}>{entry.points}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : activeTab === "reward" ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Rewards</Text>
                <View style={styles.rewardPointsSummaryRow}>
                  <MaterialCommunityIcons name="gift-outline" size={18} color="#16a34a" />
                  <Text style={styles.rewardPointsSummary}>You have <Text style={styles.rewardPointsValue}>{currentPoints}</Text> points</Text>
                </View>
              </View>
              <View style={styles.rewardList}>
                {vouchers.map((voucher) => (
                  <View key={voucher.id} style={[styles.voucherCard, voucher.status === "lock" ? styles.voucherCardLocked : null, voucher.status === "redeemed" ? styles.voucherCardRedeemed : null]}>
                    <View style={[styles.voucherTopGlow, { backgroundColor: voucher.accentColor }]} />
                    <View style={styles.voucherHeader}>
                      <View style={styles.voucherBrandRow}>
                        <View style={[styles.voucherLogoWrap, { backgroundColor: voucher.logoBackground }]}><MaterialCommunityIcons name={voucher.logoIcon} size={24} color={voucher.logoColor} /></View>
                        <View style={styles.voucherTitleBlock}><Text style={styles.voucherTitle}>{voucher.title}</Text><Text style={styles.voucherPartner}>{voucher.partner}</Text></View>
                      </View>
                      {voucher.status === "redeemed" ? <View style={styles.voucherStatusRedeemed}><MaterialCommunityIcons name="check-decagram" size={24} color="#0f7f4f" /></View> : voucher.status === "unlock" ? <View style={styles.voucherStatusAvailable}><MaterialCommunityIcons name="check-circle-outline" size={28} color="#22c55e" /></View> : <View style={styles.voucherStatusLocked}><MaterialCommunityIcons name="lock-outline" size={18} color="#64748b" /></View>}
                    </View>
                    <Text style={styles.voucherDescription}>{voucher.description}</Text>
                    <View style={styles.voucherFooter}>
                      <View style={styles.voucherPointsRow}><Text style={styles.voucherPointsLabel}>Required points:</Text><Text style={styles.voucherPointsValue}>{voucher.points} pts</Text></View>
                      {voucher.status === "redeemed" ? <Text style={styles.voucherRedeemedLabel}>Redeemed</Text> : voucher.status === "unlock" ? <Pressable style={styles.redeemButton}><Text style={styles.redeemButtonText}>Redeem</Text></Pressable> : <View style={styles.voucherMissingWrap}><Text style={styles.voucherMissingText}>Need {voucher.points - currentPoints} more pts</Text></View>}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : activeTab === "profile" ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.profileHeroCard}>
                <View style={styles.profileAvatar}><MaterialCommunityIcons name="account-outline" size={34} color="#ffffff" /></View>
                <Text style={styles.profileHeroTitle}>Profile</Text>
                <Text style={styles.profileHeroSubtitle}>Manage your account and review your sustainable activity.</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Account Detail</Text>
                {profileDetails.map((detail, index) => (
                  <View key={detail.id} style={[styles.profileDetailRow, index === 0 ? styles.profileDetailRowFirst : null]}>
                    <Text style={styles.profileDetailLabel}>{detail.label}</Text>
                    <Text style={styles.profileDetailValue}>{detail.value}</Text>
                  </View>
                ))}
              </View>
              <Pressable style={[styles.card, styles.profileHistoryCard]} onPress={() => setActiveTab("history")}><Text style={styles.cardTitle}>Trip History</Text></Pressable>
              <Pressable style={styles.profileLogoutButton} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={20} color="#ffffff" />
                <Text style={styles.profileLogoutButtonText}>Log out</Text>
              </Pressable>
            </ScrollView>
          ) : (
            /* ===== MAP SCREEN ===== */
            <View style={styles.mapWrapper}>
              <MapView
                initialRegion={mapRegion}
                style={StyleSheet.absoluteFillObject}
                showsCompass
                loadingEnabled
                onPress={() => { if (markerJustPressed.current) { markerJustPressed.current = false; return; } setSelectedPackageId(null); setSelectedDriverId(null); }}
              >
                {/* User driver marker */}
                {userDriver && (
                  <Marker coordinate={userDriver.coordinate} onPress={() => { markerJustPressed.current = true; setSelectedDriverId("user-driver"); setSelectedPackageId(null); }}>
                    <View style={styles.driverMarkerWrap}>
                      <View style={[styles.driverMarker, { backgroundColor: userDriver.color }]}>
                        <MaterialCommunityIcons name="car" size={18} color="#ffffff" />
                      </View>
                      <View style={[styles.driverMarkerTail, { backgroundColor: userDriver.color }]} />
                    </View>
                  </Marker>
                )}

                {/* AI driver markers */}
                {aiDrivers.map((d) => (
                  <Marker key={d.id} coordinate={d.coordinate} onPress={() => { markerJustPressed.current = true; setSelectedDriverId(d.id); setSelectedPackageId(null); }}>
                    <View style={styles.driverMarkerWrap}>
                      <View style={[styles.driverMarker, { backgroundColor: d.color }]}>
                        <MaterialCommunityIcons name="truck-delivery" size={16} color="#ffffff" />
                      </View>
                      <View style={[styles.driverMarkerTail, { backgroundColor: d.color }]} />
                    </View>
                  </Marker>
                ))}

                {activeConflict && (
                  <>
                    {activeConflictReceiver && activeConflictReceiverPkg && (
                      <Polyline
                        coordinates={[activeConflictReceiver.coordinate, activeConflictReceiverPkg.dropoffCoordinate]}
                        strokeColor="rgba(100, 116, 139, 0.65)"
                        strokeWidth={7}
                        lineDashPattern={[1, 10]}
                      />
                    )}
                    {activeConflictSender && activeConflictTransferPkg && (
                      <Polyline
                        coordinates={[activeConflictSender.coordinate, activeConflictTransferPkg.dropoffCoordinate]}
                        strokeColor="rgba(148, 163, 184, 0.65)"
                        strokeWidth={7}
                        lineDashPattern={[1, 10]}
                      />
                    )}
                    <Polyline
                      coordinates={[
                        simDrivers.find((driver) => driver.id === activeConflict.driverAId)?.coordinate ?? activeConflict.suggestedTransferPoint,
                        activeConflict.suggestedTransferPoint,
                      ]}
                      strokeColor="#1d4ed8"
                      strokeWidth={5}
                      lineDashPattern={[10, 6]}
                    />
                    <Polyline
                      coordinates={[
                        simDrivers.find((driver) => driver.id === activeConflict.driverBId)?.coordinate ?? activeConflict.suggestedTransferPoint,
                        activeConflict.suggestedTransferPoint,
                      ]}
                      strokeColor="#ea580c"
                      strokeWidth={5}
                      lineDashPattern={[10, 6]}
                    />
                    {activeConflictTransferPkg && (
                      <Polyline
                        coordinates={[activeConflict.suggestedTransferPoint, activeConflictTransferPkg.dropoffCoordinate]}
                        strokeColor="#16a34a"
                        strokeWidth={5}
                      />
                    )}
                    {activeConflictReceiverPkg && (
                      <Polyline
                        coordinates={[activeConflict.suggestedTransferPoint, activeConflictReceiverPkg.dropoffCoordinate]}
                        strokeColor="#22c55e"
                        strokeWidth={5}
                      />
                    )}
                    <Marker coordinate={activeConflict.suggestedTransferPoint} anchor={{ x: 0.5, y: 0.5 }}>
                      <View style={styles.meetPointMarkerWrap}>
                        <View style={styles.meetPointHaloOuter} />
                        <View style={styles.meetPointHaloInner} />
                        <View style={styles.meetPointMarker}>
                          <MaterialCommunityIcons name="swap-horizontal-bold" size={18} color="#ffffff" />
                        </View>
                        <Text style={styles.meetPointLabel}>{activeConflict.meetPointLabel}</Text>
                      </View>
                    </Marker>
                    {activeConflictTransferPkg && (
                      <Marker coordinate={activeConflictTransferPkg.dropoffCoordinate} anchor={{ x: 0.5, y: 1 }}>
                        <View style={styles.planDestinationWrap}>
                          <View style={[styles.planDestinationBadge, styles.planDestinationBadgeTransfer]}>
                            <MaterialCommunityIcons name="package-variant" size={15} color="#ffffff" />
                          </View>
                          <Text style={styles.planDestinationLabel}>Transfer cargo</Text>
                        </View>
                      </Marker>
                    )}
                    {activeConflictReceiverPkg && (
                      <Marker coordinate={activeConflictReceiverPkg.dropoffCoordinate} anchor={{ x: 0.5, y: 1 }}>
                        <View style={styles.planDestinationWrap}>
                          <View style={[styles.planDestinationBadge, styles.planDestinationBadgeKeep]}>
                            <MaterialCommunityIcons name="flag-checkered" size={15} color="#ffffff" />
                          </View>
                          <Text style={styles.planDestinationLabel}>Keep route</Text>
                        </View>
                      </Marker>
                    )}
                  </>
                )}

                {/* Package markers (only non-delivered) */}
                {simPackages.filter((p) => p.status !== "delivered").map((pkg) => (
                  <Marker key={pkg.id} coordinate={pkg.status === "in_transit" ? pkg.dropoffCoordinate : pkg.pickupCoordinate} onPress={() => { markerJustPressed.current = true; setSelectedPackageId(pkg.id); setSelectedDriverId(null); }}>
                    <View style={styles.packageMarkerWrap}>
                      <View style={[styles.packageMarker, pkg.status === "in_transit" ? styles.packageMarkerDelivery : null, pkg.status === "assigned" ? styles.packageMarkerAssigned : null]}>
                        <MaterialCommunityIcons name={pkg.status === "in_transit" ? "package-down" : "package-variant-closed"} size={18} color="#ffffff" />
                      </View>
                      <View style={[styles.packageMarkerTail, pkg.status === "in_transit" ? styles.packageMarkerTailDelivery : null, pkg.status === "assigned" ? styles.packageMarkerTailAssigned : null]} />
                    </View>
                  </Marker>
                ))}

                {/* Road-following polylines: user driver (remaining route only) */}
                {userDriver && userDriver.routeWaypoints.length >= 2 && (userDriver.state === "to_dropoff" || userDriver.state === "to_pickup") && (() => {
                  const ahead = remainingWaypoints(userDriver.routeWaypoints, userDriver.routeProgress);
                  return ahead.length >= 2 ? <Polyline coordinates={ahead} strokeColor="#0f5c45" strokeWidth={3} lineDashPattern={[8, 6]} /> : null;
                })()}

                {/* Road-following polylines: AI drivers (remaining route only) */}
                {aiDrivers.map((d) => {
                  if (d.routeWaypoints.length >= 2 && (d.state === "to_pickup" || d.state === "to_dropoff")) {
                    const ahead = remainingWaypoints(d.routeWaypoints, d.routeProgress);
                    return ahead.length >= 2 ? <Polyline key={`line-${d.id}`} coordinates={ahead} strokeColor={d.color} strokeWidth={2} lineDashPattern={[6, 4]} /> : null;
                  }
                  return null;
                })}

                {/* ETA labels at midpoint of remaining route */}
                {[...(userDriver && userDriver.routeWaypoints.length >= 2 && (userDriver.state === "to_pickup" || userDriver.state === "to_dropoff") ? [userDriver] : []), ...aiDrivers.filter((d) => d.routeWaypoints.length >= 2 && (d.state === "to_pickup" || d.state === "to_dropoff"))].map((d) => {
                  const ahead = remainingWaypoints(d.routeWaypoints, d.routeProgress);
                  if (ahead.length < 2) return null;
                  const mid = polylineMidpoint(ahead);
                  const etaMin = Math.floor(d.etaRemainingSec / 60);
                  const etaSec = Math.floor(d.etaRemainingSec % 60);
                  return (
                    <Marker key={`eta-${d.id}`} coordinate={mid} anchor={{ x: 0.5, y: 0.5 }}>
                      <View style={styles.etaPill}>
                        <Text style={styles.etaText}>ETA: {etaMin}:{String(etaSec).padStart(2, "0")}</Text>
                      </View>
                    </Marker>
                  );
                })}

                {/* Dropoff destination markers for user's packages */}
                {userPackageIds.map((pid) => {
                  const pkg = simPackages.find((p) => p.id === pid && p.status === "in_transit");
                  if (!pkg) return null;
                  const isTarget = userDriver?.targetDropoffId === pid;
                  return (
                    <Marker key={`drop-${pid}`} coordinate={pkg.dropoffCoordinate} onPress={() => { markerJustPressed.current = true; handleSwitchTarget(pid); }}>
                      <View style={styles.dropoffMarkerWrap}>
                        <View style={[styles.dropoffMarker, isTarget ? styles.dropoffMarkerActive : null]}>
                          <MaterialCommunityIcons name="flag-checkered" size={16} color="#ffffff" />
                        </View>
                        <View style={[styles.dropoffMarkerTail, isTarget ? styles.dropoffMarkerTailActive : null]} />
                      </View>
                    </Marker>
                  );
                })}

                {/* Points popups */}
                {pointsPopups.map((popup) => (
                  <Marker key={popup.id} coordinate={popup.coordinate} anchor={{ x: 0.5, y: 1 }}>
                    <View style={styles.pointsPopupWrap}>
                      <Text style={[styles.pointsPopupText, { color: popup.driverColor }]}>+{popup.points} pts</Text>
                    </View>
                  </Marker>
                ))}
              </MapView>

              {/* Green banner for user deliveries */}
              {showUserBanner && (
                <View style={styles.userBanner}>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#ffffff" />
                  <Text style={styles.userBannerText}>{userBannerText}</Text>
                </View>
              )}

              {/* Active pickups card */}
              <View style={styles.activePickupCard}>
                <Text style={styles.activePickupTitle}>Active pickups</Text>
                <Text style={styles.activePickupValue}>{userPackageCount}/{MAX_PACKAGES_PER_DRIVER}</Text>
              </View>

              {/* Package list button */}
              <Pressable style={styles.packageListBtn} onPress={() => setShowPackageList(true)}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={20} color="#0f5c45" />
                <Text style={styles.packageListBtnText}>My Packages</Text>
              </Pressable>

              {activeConflict && (
                <View style={styles.transferStoryCard}>
                  <View style={styles.transferStoryHeader}>
                    <View style={styles.transferStoryBadge}>
                      <MaterialCommunityIcons name="swap-horizontal-bold" size={16} color="#ffffff" />
                    </View>
                    <View style={styles.transferStoryCopy}>
                      <Text style={styles.transferStoryEyebrow}>Live transfer plan</Text>
                      <Text style={styles.transferStoryTitle}>
                        {activeConflictTransferPkg?.label ?? "Cargo"} handoff at {activeConflict.meetPointLabel}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transferStoryMetrics}>
                    <View style={styles.transferStoryMetric}>
                      <Text style={styles.transferStoryMetricLabel}>Before</Text>
                      <Text style={styles.transferStoryMetricValue}>{activeConflict.directDistanceKm.toFixed(1)} km</Text>
                    </View>
                    <View style={styles.transferStoryMetric}>
                      <Text style={styles.transferStoryMetricLabel}>After</Text>
                      <Text style={styles.transferStoryMetricValue}>{activeConflict.optimizedDistanceKm.toFixed(1)} km</Text>
                    </View>
                    <View style={styles.transferStoryMetric}>
                      <Text style={styles.transferStoryMetricLabel}>Saved</Text>
                      <Text style={[styles.transferStoryMetricValue, styles.transferStoryMetricValuePositive]}>
                        {activeConflict.potentialSavingKm.toFixed(1)} km
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transferLegendRow}>
                    <View style={styles.transferLegendItem}>
                      <View style={styles.transferLegendLineBefore} />
                      <Text style={styles.transferLegendText}>Before</Text>
                    </View>
                    <View style={styles.transferLegendItem}>
                      <View style={styles.transferLegendLineToMeet} />
                      <Text style={styles.transferLegendText}>To meet point</Text>
                    </View>
                    <View style={styles.transferLegendItem}>
                      <View style={styles.transferLegendLineAfter} />
                      <Text style={styles.transferLegendText}>Optimized</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Simulation controls */}
              <View style={styles.simControlBar}>
                <Pressable style={styles.simBtn} onPress={clock.toggle}>
                  <MaterialCommunityIcons name={clock.isRunning ? "pause" : "play"} size={22} color="#ffffff" />
                </Pressable>
                {([1, 2, 5] as SimSpeed[]).map((s) => (
                  <Pressable key={s} style={[styles.simSpeedBtn, clock.speed === s ? styles.simSpeedBtnActive : null]} onPress={() => clock.setSpeed(s)}>
                    <Text style={[styles.simSpeedText, clock.speed === s ? styles.simSpeedTextActive : null]}>{s}x</Text>
                  </Pressable>
                ))}
                <Text style={styles.simClock}>{formatSimTime(clock.elapsedMs)}</Text>
                <Pressable style={styles.simResetBtn} onPress={resetSimulation}>
                  <MaterialCommunityIcons name="refresh" size={18} color="#64748b" />
                </Pressable>
              </View>

              {/* Driver detail card */}
              {selectedDriverId && (() => {
                const driver = simDrivers.find((d) => d.id === selectedDriverId);
                if (!driver) return null;
                const driverPkgs = driver.packages.map((pid) => simPackages.find((p) => p.id === pid)).filter(Boolean) as SimPackage[];
                const pickupCount = driverPkgs.filter((p) => p.status === "assigned").length;
                const deliveryCount = driverPkgs.filter((p) => p.status === "in_transit").length;
                const stateLabel = driver.state === "idle" ? "Idle" : driver.state === "cooldown" ? "Resting..." : driver.state === "to_pickup" ? `Heading to pickup${driver.targetPackageId ? ` (${simPackages.find((p) => p.id === driver.targetPackageId)?.label ?? ""})` : ""}` : `Delivering${driver.targetDropoffId ? ` ${simPackages.find((p) => p.id === driver.targetDropoffId)?.label ?? ""}` : ""}`;
                return (
                  <View style={styles.driverDetailCard}>
                    <View style={styles.driverDetailHeader}>
                      <View style={[styles.driverDetailDot, { backgroundColor: driver.color }]} />
                      <Text style={styles.driverDetailName}>{driver.name}</Text>
                      <Pressable onPress={() => setSelectedDriverId(null)} hitSlop={10}>
                        <MaterialCommunityIcons name="close" size={20} color="#64748b" />
                      </Pressable>
                    </View>
                    <View style={styles.driverDetailStateBadge}>
                      <Text style={styles.driverDetailStateText}>{stateLabel}</Text>
                    </View>
                    <View style={styles.driverDetailStatsRow}>
                      <View style={styles.driverDetailStat}>
                        <Text style={styles.driverDetailStatValue}>{pickupCount}</Text>
                        <Text style={styles.driverDetailStatLabel}>To pick up</Text>
                      </View>
                      <View style={styles.driverDetailStat}>
                        <Text style={styles.driverDetailStatValue}>{deliveryCount}</Text>
                        <Text style={styles.driverDetailStatLabel}>To deliver</Text>
                      </View>
                      <View style={styles.driverDetailStat}>
                        <Text style={styles.driverDetailStatValue}>{driver.totalDistanceKm.toFixed(1)}</Text>
                        <Text style={styles.driverDetailStatLabel}>km driven</Text>
                      </View>
                    </View>
                    {driverPkgs.length > 0 && (
                      <View style={styles.driverDetailPkgList}>
                        {driverPkgs.map((p) => (
                          <View key={p.id} style={styles.driverDetailPkgRow}>
                            <Text style={styles.driverDetailPkgLabel}>{p.label}</Text>
                            <Text style={styles.driverDetailPkgAddr}>{p.dropoffAddress}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Selected package detail card */}
              {!selectedDriverId && selectedPackage && selectedPackage.status !== "delivered" ? (
                <View style={styles.packageDetailCard}>
                  <View style={styles.packageDetailHeader}>
                    <Text style={styles.packageDetailTitle}>{selectedPackage.label}</Text>
                    <Pressable onPress={() => setSelectedPackageId(null)} hitSlop={10}>
                      <MaterialCommunityIcons name="close" size={20} color="#64748b" />
                    </Pressable>
                  </View>
                  <Text style={styles.packageDetailText}>Pickup: {selectedPackage.pickupAddress}</Text>
                  <Text style={styles.packageDetailText}>Dropoff: {selectedPackage.dropoffAddress}</Text>
                  <Text style={styles.packageDetailPoints}>Reward: +{selectedPackage.rewardPoints} pts</Text>
                  {selectedPackage.status === "waiting" && canPickupMore ? (
                    <Pressable style={styles.packagePickupButton} onPress={handlePickupPackage}>
                      <Text style={styles.packagePickupButtonText}>Pick Up</Text>
                    </Pressable>
                  ) : selectedPackage.status === "waiting" && !canPickupMore ? (
                    <View style={styles.packageLimitBadge}><Text style={styles.packageLimitBadgeText}>Pickup limit reached ({MAX_PACKAGES_PER_DRIVER})</Text></View>
                  ) : selectedPackage.status === "in_transit" && selectedPackage.assignedDriverId === "user-driver" ? (
                    <Pressable style={[styles.packagePickupButton, { backgroundColor: "#2563eb" }]} onPress={() => handleDropoffPackage(selectedPackage.id)}>
                      <Text style={styles.packagePickupButtonText}>Confirm Delivery</Text>
                    </Pressable>
                  ) : selectedPackage.status === "in_transit" ? (
                    <View style={styles.packageDeliveryBadge}><Text style={styles.packageDeliveryBadgeText}>In transit — {simDrivers.find((d) => d.id === selectedPackage.assignedDriverId)?.name ?? "another driver"}</Text></View>
                  ) : selectedPackage.status === "assigned" && selectedPackage.assignedDriverId === "user-driver" ? (
                    <View style={styles.packageTakenBadge}><Text style={styles.packageTakenBadgeText}>Heading to pickup</Text></View>
                  ) : selectedPackage.status === "assigned" ? (
                    <View style={styles.packageTakenBadge}><Text style={styles.packageTakenBadgeText}>Assigned to {simDrivers.find((d) => d.id === selectedPackage.assignedDriverId)?.name ?? "a driver"}</Text></View>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.tabBar}>
          <TabButton icon="view-dashboard-outline" isActive={activeTab === "dashboard"} onPress={() => setActiveTab("dashboard")} />
          <TabButton icon="map-marker-outline" isActive={activeTab === "map"} onPress={() => setActiveTab("map")} />
          <TabButton icon="gift-outline" isActive={activeTab === "reward"} onPress={() => setActiveTab("reward")} />
          <TabButton icon="account-outline" isActive={activeTab === "profile"} onPress={() => setActiveTab("profile")} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

type TabButtonProps = { icon: ComponentProps<typeof MaterialCommunityIcons>["name"]; isActive: boolean; onPress: () => void };

function TabButton({ icon, isActive, onPress }: TabButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}>
      <MaterialCommunityIcons name={icon} size={24} style={[styles.tabIcon, isActive ? styles.tabIconActive : null]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#eef6f1" },
  appHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  appHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  appHeaderTitles: { flex: 1 },
  appHeaderActions: { alignItems: "flex-end" },
  notificationBell: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#e8f7ef", alignItems: "center", justifyContent: "center", position: "relative" },
  notificationDot: { position: "absolute", top: 7, right: 7, width: 10, height: 10, borderRadius: 5, backgroundColor: "#ef4444" },
  driverNoticeOverlay: { flex: 1, backgroundColor: "transparent", justifyContent: "flex-start", alignItems: "flex-end", paddingTop: 60, paddingRight: 20, paddingLeft: 20 },
  driverNoticeModal: { width: 240, backgroundColor: "#ffffff", borderRadius: 18, borderWidth: 2, borderColor: "#e2e8f0", paddingHorizontal: 14, paddingVertical: 14, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  driverNoticeHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  driverNoticeTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  driverNoticeCount: { fontSize: 40, fontWeight: "800", color: "#0f5c45", marginBottom: 4 },
  driverNoticeText: { fontSize: 14, lineHeight: 20, color: "#475569" },
  loginKeyboardView: { flex: 1 },
  loginScrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 },
  loginBrandBlock: { alignItems: "center", marginBottom: 28 },
  loginLogoCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
  loginAppTitle: { fontSize: 36, fontWeight: "800", color: "#0b3d2e" },
  loginTagline: { marginTop: 8, fontSize: 16, color: "#4d6b61", textAlign: "center" },
  loginCard: { backgroundColor: "#ffffff", borderRadius: 24, padding: 24, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
  loginCardTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  loginInfoBlock: { marginBottom: 20, gap: 10 },
  loginDisclaimer: { fontSize: 13, lineHeight: 19, color: "#64748b" },
  loginRules: { fontSize: 14, lineHeight: 20, color: "#475569" },
  loginRulesLabel: { fontWeight: "800", color: "#334155" },
  loginLabel: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 8 },
  loginInput: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 14 : 12, fontSize: 16, color: "#0f172a", marginBottom: 16, backgroundColor: "#f8fafc" },
  loginErrorText: { fontSize: 14, fontWeight: "600", color: "#b91c1c", marginBottom: 12 },
  loginButton: { backgroundColor: "#0f5c45", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  loginButtonText: { fontSize: 16, fontWeight: "800", color: "#ffffff" },
  appTitle: { fontSize: 32, fontWeight: "800", color: "#0b3d2e" },
  appSubtitle: { marginTop: 4, fontSize: 15, color: "#4d6b61" },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 28, gap: 16 },
  heroCard: { backgroundColor: "#0f5c45", borderRadius: 24, padding: 20 },
  trackingHeroCard: { backgroundColor: "#0f5c45", borderRadius: 24, padding: 20 },
  profileHeroCard: { backgroundColor: "#0f5c45", borderRadius: 24, padding: 24, alignItems: "flex-start" },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  profileHeroTitle: { fontSize: 28, fontWeight: "800", color: "#ffffff", marginBottom: 8 },
  profileHeroSubtitle: { fontSize: 15, lineHeight: 22, color: "#dff8ea" },
  historyScreenHeader: { paddingTop: 4 },
  historyScreenTitle: { fontSize: 30, fontWeight: "800", color: "#0f172a" },
  historySummaryCard: { backgroundColor: "#20b455", borderRadius: 30, padding: 18, shadowColor: "#15803d", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 20, elevation: 5 },
  historySummaryTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  historySummaryTitle: { fontSize: 18, fontWeight: "800", color: "#ffffff" },
  historySummaryStats: { flexDirection: "row", gap: 14 },
  historySummaryStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 24, padding: 18 },
  historySummaryMetricRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  historySummaryValue: { fontSize: 38, fontWeight: "800", color: "#ffffff" },
  historySummaryLabel: { fontSize: 16, color: "#f0fff4" },
  historyTripCard: { backgroundColor: "#ffffff", borderRadius: 28, overflow: "hidden", shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
  historyRoutePreview: { height: 150, backgroundColor: "#eef7ff", position: "relative" },
  historyPathLine: { position: "absolute", left: 72, right: 70, top: 66, borderTopWidth: 4, borderStyle: "dashed", borderColor: "#3fbf58", transform: [{ rotate: "-4deg" }] },
  historyPathStart: { position: "absolute", left: 58, top: 61, width: 26, height: 12, borderRadius: 999, backgroundColor: "#3b82f6" },
  historyPathEnd: { position: "absolute", right: 54, top: 58, width: 26, height: 12, borderRadius: 999, backgroundColor: "#ef4444" },
  historyTripBody: { padding: 20 },
  historyMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  historyMetaLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  historyMetaText: { fontSize: 15, color: "#475569" },
  historyVehicleBadge: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#22c55e", alignItems: "center", justifyContent: "center", shadowColor: "#16a34a", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 },
  historyStops: { marginBottom: 20 },
  historyStopRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  historyStopIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  historyStartIconWrap: { backgroundColor: "#dbeafe" },
  historyEndIconWrap: { backgroundColor: "#fee2e2" },
  historyConnector: { width: 2, height: 28, backgroundColor: "#cbd5e1", marginLeft: 17, marginVertical: 4 },
  historyStopText: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  historyFooter: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  historyImpactRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  historyImpactPoints: { fontSize: 15, fontWeight: "800", color: "#16a34a" },
  historyImpactText: { fontSize: 15, color: "#334155" },
  historyDuration: { fontSize: 15, color: "#64748b" },
  heroEyebrow: { fontSize: 13, fontWeight: "700", color: "#b8f2d6", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#ffffff", marginBottom: 8 },
  heroText: { fontSize: 15, lineHeight: 22, color: "#e6fff3" },
  card: { backgroundColor: "#ffffff", borderRadius: 22, padding: 18, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#173127" },
  cardTitleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  trackingPointsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  trackingPointsValue: { fontSize: 30, fontWeight: "800", color: "#0f5c45" },
  trackingPointsGoal: { fontSize: 14, color: "#64748b" },
  trackingCurrentRank: { fontSize: 16, fontWeight: "800", color: "#15803d", marginBottom: 12 },
  rewardsLinkInline: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  rewardsLinkText: { fontSize: 14, fontWeight: "700", color: "#0f5c45", textDecorationLine: "underline" },
  progressTrack: { height: 14, backgroundColor: "#dceee6", borderRadius: 999, overflow: "hidden", marginBottom: 10 },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#20b26b" },
  cardHint: { fontSize: 14, lineHeight: 20, color: "#587166" },
  streakCard: { position: "relative", overflow: "hidden", borderRadius: 28, paddingHorizontal: 22, paddingVertical: 26, backgroundColor: "#ff5f12", shadowColor: "#bc3b15", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 5 },
  streakGlowLarge: { position: "absolute", right: -40, top: -20, width: 220, height: 220, borderRadius: 999, backgroundColor: "#ff3d34", opacity: 0.75 },
  streakGlowSmall: { position: "absolute", right: 90, bottom: -70, width: 180, height: 180, borderRadius: 999, backgroundColor: "#ff7b1a", opacity: 0.35 },
  streakHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 20 },
  streakCopy: { flex: 1 },
  streakLabel: { fontSize: 16, fontWeight: "500", color: "#fff5ef", marginBottom: 14 },
  streakValueRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  streakValue: { fontSize: 52, fontWeight: "800", color: "#ffffff", lineHeight: 56 },
  streakUnit: { fontSize: 24, fontWeight: "500", color: "#ffffff", marginTop: 8 },
  streakMessage: { fontSize: 16, fontWeight: "500", color: "#fff5ef" },
  streakIconBadge: { width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(255, 214, 204, 0.28)", alignItems: "center", justifyContent: "center" },
  listItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#edf4ef" },
  listTitle: { fontSize: 15, fontWeight: "700", color: "#173127" },
  listSubtitle: { marginTop: 4, fontSize: 13, color: "#6c857b" },
  profileDetailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: "#edf4ef" },
  profileDetailRowFirst: { paddingTop: 0, borderTopWidth: 0 },
  profileDetailLabel: { fontSize: 14, color: "#6c857b" },
  profileDetailValue: { fontSize: 15, fontWeight: "700", color: "#173127" },
  profileHistoryCard: { gap: 14 },
  voucherCard: { position: "relative", overflow: "hidden", backgroundColor: "#ffffff", borderRadius: 28, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, marginTop: 12, borderWidth: 1, borderColor: "#e7edf2", shadowColor: "#0f172a", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  voucherCardLocked: { backgroundColor: "#f7f8fa", opacity: 0.88 },
  voucherCardRedeemed: { backgroundColor: "#ffffff" },
  voucherTopGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 10 },
  voucherHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  voucherBrandRow: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  voucherLogoWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  voucherTitleBlock: { flex: 1 },
  voucherTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  voucherPartner: { fontSize: 14, color: "#64748b" },
  voucherStatusAvailable: { flexDirection: "row", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 999, backgroundColor: "#ffffff" },
  voucherStatusRedeemed: { flexDirection: "row", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 999, backgroundColor: "#ffffff" },
  voucherStatusLocked: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff", width: 34, height: 34, borderRadius: 999 },
  voucherDescription: { fontSize: 14, lineHeight: 22, color: "#334155", marginBottom: 14, marginLeft: 50 },
  voucherFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  voucherPointsRow: { flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap" },
  voucherPointsLabel: { fontSize: 14, fontWeight: "500", color: "#334155" },
  voucherPointsValue: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  redeemButton: { backgroundColor: "#198754", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 11, minWidth: 108, alignItems: "center" },
  redeemButtonText: { fontSize: 14, fontWeight: "800", color: "#ffffff" },
  voucherMissingWrap: { backgroundColor: "#eef2f6", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  voucherMissingText: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  voucherRedeemedLabel: { fontSize: 14, fontWeight: "700", color: "#16a34a" },
  rewardPointsSummaryRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: -2, marginBottom: 2 },
  rewardPointsSummary: { fontSize: 15, fontWeight: "600", color: "#587166" },
  rewardPointsValue: { fontWeight: "800", color: "#16a34a" },
  rewardList: { gap: 0 },
  trackingSectionHeader: { paddingTop: 4 },
  trackingSectionTitle: { fontSize: 28, fontWeight: "800", color: "#0f172a" },
  activeHonorCard: { borderWidth: 2, borderColor: "#0f5c45", backgroundColor: "#fffbea" },
  lockedHonorCard: { backgroundColor: "#f8fafc", opacity: 0.58 },
  honorCard: { gap: 14 },
  honorTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  honorIconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  honorCurrentLabel: { fontSize: 13, fontWeight: "800", color: "#fff", backgroundColor: "#2b9348", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginTop: -4, marginRight: -4 },
  honorLockLabel: { fontSize: 13, fontWeight: "800", color: "#64748b", backgroundColor: "#e5e7eb", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginTop: -4, marginRight: -4 },
  honorTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  honorPoints: { fontSize: 14, fontWeight: "700", color: "#475569" },
  honorBenefitsBlock: { gap: 4 },
  honorBenefit: { fontSize: 14, lineHeight: 21, color: "#475569" },
  honorBenefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 4 },
  historyPoints: { fontSize: 15, fontWeight: "800" },
  positivePoints: { color: "#17985e" },
  negativePoints: { color: "#b75555" },
  mapSectionHeader: { paddingTop: 4 },
  mapSectionTitle: { fontSize: 30, fontWeight: "800", color: "#0b3d2e", marginBottom: 6 },
  mapSectionSubtitle: { fontSize: 15, lineHeight: 22, color: "#5c786d" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 16 },
  statCard: { width: "47%", minHeight: 190, backgroundColor: "#ffffff", borderRadius: 24, padding: 18, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
  statIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  statValue: { fontSize: 36, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  statLabel: { fontSize: 16, lineHeight: 23, color: "#334e68", marginBottom: 16 },
  statTrendRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: "auto" },
  statTrendValue: { fontSize: 16, fontWeight: "700" },
  statTrendPeriod: { fontSize: 15, color: "#64748b" },
  mapWrapper: { flex: 1, backgroundColor: "#f4f7f2", position: "relative" },
  driverMarkerWrap: { alignItems: "center" },
  driverMarker: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#0f5c45", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#ffffff" },
  driverMarkerTail: { width: 12, height: 12, backgroundColor: "#0f5c45", borderBottomWidth: 3, borderRightWidth: 3, borderColor: "#ffffff", transform: [{ rotate: "45deg" }], marginTop: -7 },
  packageMarkerWrap: { alignItems: "center" },
  packageMarker: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#60a5fa", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#ffffff" },
  packageMarkerDelivery: { backgroundColor: "#f59e0b" },
  packageMarkerAssigned: { backgroundColor: "#a78bfa" },
  packageMarkerTail: { width: 12, height: 12, backgroundColor: "#60a5fa", borderBottomWidth: 3, borderRightWidth: 3, borderColor: "#ffffff", transform: [{ rotate: "45deg" }], marginTop: -7 },
  packageMarkerTailDelivery: { backgroundColor: "#f59e0b" },
  packageMarkerTailAssigned: { backgroundColor: "#a78bfa" },
  dropoffMarkerWrap: { alignItems: "center" },
  dropoffMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#22c55e", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#ffffff" },
  dropoffMarkerTail: { width: 10, height: 10, backgroundColor: "#22c55e", borderBottomWidth: 3, borderRightWidth: 3, borderColor: "#ffffff", transform: [{ rotate: "45deg" }], marginTop: -6 },
  meetPointMarkerWrap: { alignItems: "center", gap: 6 },
  meetPointHaloOuter: { position: "absolute", width: 78, height: 78, borderRadius: 39, backgroundColor: "rgba(34, 197, 94, 0.18)" },
  meetPointHaloInner: { position: "absolute", width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(59, 130, 246, 0.24)" },
  meetPointMarker: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#ffffff" },
  meetPointLabel: { backgroundColor: "rgba(15, 23, 42, 0.86)", color: "#ffffff", fontSize: 11, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  planDestinationWrap: { alignItems: "center", gap: 6 },
  planDestinationBadge: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#ffffff" },
  planDestinationBadgeTransfer: { backgroundColor: "#ea580c" },
  planDestinationBadgeKeep: { backgroundColor: "#16a34a" },
  planDestinationLabel: { backgroundColor: "rgba(255,255,255,0.96)", color: "#0f172a", fontSize: 11, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  activePickupCard: { position: "absolute", top: 20, left: 20, backgroundColor: "rgba(255, 255, 255, 0.96)", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  activePickupTitle: { fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  activePickupValue: { fontSize: 22, fontWeight: "800", color: "#0f5c45" },
  packageListBtn: { position: "absolute", top: 20, right: 20, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  packageListBtnText: { fontSize: 13, fontWeight: "700", color: "#0f5c45" },
  transferStoryCard: { position: "absolute", top: 96, left: 20, right: 20, backgroundColor: "rgba(255,255,255,0.98)", borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "#dbeafe", shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 6 },
  transferStoryHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  transferStoryBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" },
  transferStoryCopy: { flex: 1 },
  transferStoryEyebrow: { fontSize: 12, fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  transferStoryTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", lineHeight: 22 },
  transferStoryMetrics: { flexDirection: "row", gap: 10, marginBottom: 12 },
  transferStoryMetric: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  transferStoryMetricLabel: { fontSize: 12, fontWeight: "700", color: "#64748b", marginBottom: 4 },
  transferStoryMetricValue: { fontSize: 19, fontWeight: "800", color: "#0f172a" },
  transferStoryMetricValuePositive: { color: "#16a34a" },
  transferLegendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  transferLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  transferLegendLineBefore: { width: 24, height: 0, borderTopWidth: 4, borderColor: "rgba(148, 163, 184, 0.9)", borderStyle: "dashed" },
  transferLegendLineToMeet: { width: 24, height: 0, borderTopWidth: 4, borderColor: "#1d4ed8", borderStyle: "dashed" },
  transferLegendLineAfter: { width: 24, height: 0, borderTopWidth: 4, borderColor: "#16a34a" },
  transferLegendText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  packageDetailCard: { position: "absolute", left: 20, right: 20, bottom: 80, backgroundColor: "rgba(255, 255, 255, 0.97)", borderRadius: 24, paddingHorizontal: 18, paddingVertical: 18, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 },
  packageDetailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 },
  packageDetailTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#0f172a" },
  packageDetailText: { fontSize: 14, lineHeight: 21, color: "#475569", marginBottom: 6 },
  packageDetailPoints: { fontSize: 14, fontWeight: "800", color: "#0f5c45" },
  packagePickupButton: { marginTop: 14, backgroundColor: "#0f5c45", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  packagePickupButtonText: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
  packageDeliveryBadge: { marginTop: 14, alignSelf: "flex-start", backgroundColor: "#dcfce7", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  packageDeliveryBadgeText: { fontSize: 13, fontWeight: "800", color: "#0f5c45" },
  packageTakenBadge: { marginTop: 14, alignSelf: "flex-start", backgroundColor: "#f3e8ff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  packageTakenBadgeText: { fontSize: 13, fontWeight: "800", color: "#7c3aed" },
  packageLimitBadge: { marginTop: 14, alignSelf: "flex-start", backgroundColor: "#fee2e2", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  packageLimitBadgeText: { fontSize: 13, fontWeight: "800", color: "#b91c1c" },
  profileLogoutButton: { backgroundColor: "#c2410c", borderRadius: 18, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 },
  profileLogoutButtonText: { fontSize: 16, fontWeight: "800", color: "#ffffff" },

  // Sim controls
  simControlBar: { position: "absolute", bottom: 14, left: 20, right: 20, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 5 },
  simBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#0f5c45", alignItems: "center", justifyContent: "center" },
  simSpeedBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: "#edf5f0" },
  simSpeedBtnActive: { backgroundColor: "#0f5c45" },
  simSpeedText: { fontSize: 13, fontWeight: "800", color: "#0f5c45" },
  simSpeedTextActive: { color: "#ffffff" },
  simClock: { flex: 1, textAlign: "right", fontSize: 16, fontWeight: "800", color: "#0f172a", fontVariant: ["tabular-nums"] },
  simResetBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#edf5f0", alignItems: "center", justifyContent: "center" },

  // Conflict modal
  conflictOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 24 },
  conflictModal: { width: "100%", backgroundColor: "#ffffff", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  conflictHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  conflictTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  conflictText: { fontSize: 15, lineHeight: 22, color: "#475569", marginBottom: 16 },
  conflictSavingsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  conflictSavingBox: { flex: 1, backgroundColor: "#f0fdf4", borderRadius: 16, padding: 14, alignItems: "center" },
  conflictSavingValue: { fontSize: 20, fontWeight: "800", color: "#0f5c45", marginBottom: 4 },
  conflictSavingLabel: { fontSize: 12, color: "#475569" },
  conflictSuggestion: { fontSize: 14, lineHeight: 21, color: "#334155", marginBottom: 20 },
  conflictActions: { flexDirection: "row", gap: 12 },
  conflictAcceptBtn: { flex: 1, backgroundColor: "#0f5c45", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  conflictAcceptText: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
  conflictDismissBtn: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  conflictDismissText: { fontSize: 15, fontWeight: "800", color: "#64748b" },

  // Package list modal
  packageListOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)" },
  packageListModal: { backgroundColor: "#ffffff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "70%", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  packageListHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  packageListTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  packageListEmpty: { fontSize: 15, lineHeight: 22, color: "#64748b", paddingVertical: 24, textAlign: "center" },
  packageListItem: { backgroundColor: "#f8fafc", borderRadius: 18, padding: 16, marginBottom: 12 },
  packageListItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  packageListItemLabel: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  packageListStatusBadge: { backgroundColor: "#edf5f0", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  packageListStatusTransit: { backgroundColor: "#fef3c7" },
  packageListStatusText: { fontSize: 12, fontWeight: "700", color: "#0f5c45" },
  packageListAddr: { fontSize: 13, lineHeight: 19, color: "#475569", marginBottom: 4 },
  packageListItemFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  packageListPts: { fontSize: 14, fontWeight: "800", color: "#16a34a" },
  packageListDropoffBtn: { backgroundColor: "#2563eb", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  packageListDropoffText: { fontSize: 13, fontWeight: "800", color: "#ffffff" },

  // ETA pill on polyline midpoint
  etaPill: { backgroundColor: "rgba(0,0,0,0.78)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  etaText: { color: "#ffffff", fontSize: 11, fontWeight: "800", fontVariant: ["tabular-nums"] },

  // Points popup floating marker
  pointsPopupWrap: { alignItems: "center", paddingBottom: 8 },
  pointsPopupText: { fontSize: 16, fontWeight: "900", textShadowColor: "rgba(255,255,255,0.9)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  // User delivery success banner
  userBanner: { position: "absolute", top: 60, left: 20, right: 20, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#16a34a", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6, zIndex: 100 },
  userBannerText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },

  // Driver detail card
  driverDetailCard: { position: "absolute", left: 20, right: 20, bottom: 80, backgroundColor: "rgba(255, 255, 255, 0.97)", borderRadius: 24, paddingHorizontal: 18, paddingVertical: 18, shadowColor: "#0b3d2e", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 },
  driverDetailHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  driverDetailDot: { width: 14, height: 14, borderRadius: 7 },
  driverDetailName: { flex: 1, fontSize: 18, fontWeight: "800", color: "#0f172a" },
  driverDetailStateBadge: { backgroundColor: "#edf5f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start", marginBottom: 12 },
  driverDetailStateText: { fontSize: 13, fontWeight: "700", color: "#0f5c45" },
  driverDetailStatsRow: { flexDirection: "row", gap: 14, marginBottom: 12 },
  driverDetailStat: { flex: 1, alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 14, paddingVertical: 10 },
  driverDetailStatValue: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  driverDetailStatLabel: { fontSize: 11, fontWeight: "600", color: "#64748b", marginTop: 2 },
  driverDetailPkgList: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10, gap: 8 },
  driverDetailPkgRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  driverDetailPkgLabel: { fontSize: 13, fontWeight: "800", color: "#0f172a", width: 80 },
  driverDetailPkgAddr: { flex: 1, fontSize: 12, color: "#475569" },

  // Optimal order modal rows
  optimalOrderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  optimalOrderBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#0f5c45", alignItems: "center", justifyContent: "center" },
  optimalOrderBadgeText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  optimalOrderInfo: { flex: 1 },
  optimalOrderLabel: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  optimalOrderAddr: { fontSize: 12, color: "#475569", marginTop: 2 },

  // Active dropoff marker highlight
  dropoffMarkerActive: { backgroundColor: "#15803d", borderColor: "#dcfce7" },
  dropoffMarkerTailActive: { backgroundColor: "#15803d", borderColor: "#dcfce7" },

  tabBar: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, backgroundColor: "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  tabButton: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#edf5f0" },
  tabButtonActive: { backgroundColor: "#0f5c45" },
  tabIcon: { color: "#527166", marginBottom: 0 },
  tabIconActive: { color: "#ffffff" },
});
