import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import type { ComponentProps } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

type TabKey = "dashboard" | "map" | "reward" | "history";

const rewardProgress = {
  current: 360,
  goal: 500,
};

const vouchers = [
  {
    id: "1",
    title: "Free Coffee Voucher",
    description: "Redeem this voucher for one free handcrafted coffee or tea.",
    points: 150,
    partner: "Green Bean Cafe",
    accentColor: "#f59e0b",
    logoIcon: "coffee-outline",
    logoBackground: "#fff7ed",
    logoColor: "#c2410c",
  },
  {
    id: "2",
    title: "Bus Pass Discount",
    description: "Use this voucher to lower the cost of your next bus or metro pass.",
    points: 280,
    partner: "City Transit",
    accentColor: "#3b82f6",
    logoIcon: "bus-side",
    logoBackground: "#eff6ff",
    logoColor: "#1d4ed8",
  },
  {
    id: "3",
    title: "Eco Store Gift Card",
    description: "Exchange this for store credit on reusable and eco-friendly products.",
    points: 450,
    partner: "Eco Market",
    accentColor: "#14b8a6",
    logoIcon: "leaf-circle-outline",
    logoBackground: "#f0fdfa",
    logoColor: "#0f766e",
  },
] as const;

const pointHistory = [
  { id: "1", title: "Carpooled to campus", points: "+40", date: "Today" },
  { id: "2", title: "Used public transport", points: "+25", date: "Yesterday" },
  { id: "3", title: "Completed weekly eco goal", points: "+80", date: "Apr 2" },
  { id: "4", title: "Redeemed coffee voucher", points: "-150", date: "Apr 1" },
];
const tripHistory = [
  {
    id: "1",
    date: "Today",
    time: "2:30 PM",
    from: "Home",
    to: "Central Park",
    points: "+40",
    co2: "2.5 kg CO2",
    distance: "3.2 km",
    duration: "15 min",
    vehicleIcon: "walk",
  },
  {
    id: "2",
    date: "Yesterday",
    time: "8:10 AM",
    from: "Dorm A",
    to: "ASU Campus",
    points: "+25",
    co2: "1.8 kg CO2",
    distance: "4.1 km",
    duration: "18 min",
    vehicleIcon: "bike-fast",
  },
] as const;

const sustainabilityStats = [
  {
    id: "points",
    label: "Sustainable Points",
    value: "175",
    change: "+12%",
    period: "this week",
    icon: "leaf",
    iconColor: "#16a34a",
    iconBackground: "#dcfce7",
  },
  {
    id: "co2",
    label: "kg of CO2 Saved",
    value: "11.1",
    change: "+8%",
    period: "this week",
    icon: "cloud-check-outline",
    iconColor: "#2563eb",
    iconBackground: "#dbeafe",
  },
  {
    id: "trips",
    label: "Trips Completed",
    value: "5",
    change: "+25%",
    period: "vs last month",
    icon: "map-marker-path",
    iconColor: "#9333ea",
    iconBackground: "#f3e8ff",
  },
  {
    id: "achievements",
    label: "Achievements",
    value: "8",
    change: "+2",
    period: "new this month",
    icon: "trophy-outline",
    iconColor: "#d97706",
    iconBackground: "#fef3c7",
  },
] as const;

const mapRegion = {
  latitude: 33.4484,
  longitude: -112.074,
  latitudeDelta: 0.028,
  longitudeDelta: 0.028,
} as const;

const mapMarkers = [
  {
    id: "carpool-hub",
    title: "South Campus Carpool",
    description: "Shared rides depart from Campus Circle every 15 minutes.",
    coordinate: { latitude: 33.4476, longitude: -112.0739 },
  },
  {
    id: "bike-hub",
    title: "Rio Bike Hub",
    description: "Electric bike rentals and secure storage.",
    coordinate: { latitude: 33.4489, longitude: -112.0762 },
  },
  {
    id: "ev-charge",
    title: "EV Charging Plaza",
    description: "Solar canopy with Level 2 chargers.",
    coordinate: { latitude: 33.4493, longitude: -112.0724 },
  },
] as const;

const tripHistory = [
  {
    id: "1",
    date: "Today",
    time: "2:30 PM",
    from: "Home",
    to: "Central Park",
    points: "+40",
    co2: "2.5 kg CO2",
    distance: "3.2 km",
    duration: "15 min",
    vehicleIcon: "walk",
  },
  {
    id: "2",
    date: "Yesterday",
    time: "8:10 AM",
    from: "Dorm A",
    to: "ASU Campus",
    points: "+25",
    co2: "1.8 kg CO2",
    distance: "4.1 km",
    duration: "18 min",
    vehicleIcon: "bike-fast",
  },
] as const;

const sustainabilityStats = [
  {
    id: "points",
    label: "Sustainable Points",
    value: "175",
    change: "+12%",
    period: "this week",
    icon: "leaf",
    iconColor: "#16a34a",
    iconBackground: "#dcfce7",
  },
  {
    id: "co2",
    label: "kg of CO2 Saved",
    value: "11.1",
    change: "+8%",
    period: "this week",
    icon: "cloud-check-outline",
    iconColor: "#2563eb",
    iconBackground: "#dbeafe",
  },
  {
    id: "trips",
    label: "Trips Completed",
    value: "5",
    change: "+25%",
    period: "vs last month",
    icon: "map-marker-path",
    iconColor: "#9333ea",
    iconBackground: "#f3e8ff",
  },
  {
    id: "achievements",
    label: "Achievements",
    value: "8",
    change: "+2",
    period: "new this month",
    icon: "trophy-outline",
    iconColor: "#d97706",
    iconBackground: "#fef3c7",
  },
] as const;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const progressPercentage = (rewardProgress.current / rewardProgress.goal) * 100;
  const progressWidth = `${progressPercentage}%` as const;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {activeTab !== "map" && (
        <View style={styles.appHeader}>
          <Text style={styles.appTitle}>Ecoride</Text>
          <Text style={styles.appSubtitle}>Ride greener. Earn more rewards.</Text>
        </View>
      )}

      <View style={styles.content}>
        {activeTab === "dashboard" ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Dashboard</Text>
              <Text style={styles.heroTitle}>Your eco impact this week</Text>
              <Text style={styles.heroText}>Keep riding sustainably to unlock more rewards and grow your streak.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Points and rewards</Text>
              <View style={styles.pointsRow}>
                <Text style={styles.pointsValue}>{rewardProgress.current} pts</Text>
                <Text style={styles.pointsGoal}>Goal: {rewardProgress.goal} pts</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
              <Text style={styles.cardHint}>
                {rewardProgress.goal - rewardProgress.current} more points until your next reward.
              </Text>
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
              <Text style={styles.mapSectionSubtitle}>
                Track how your travel choices create a more sustainable map over time.
              </Text>
            </View>

            <View style={styles.statsGrid}>
              {sustainabilityStats.map((stat) => (
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
                    <Text style={styles.historySummaryValue}>175</Text>
                  </View>
                  <Text style={styles.historySummaryLabel}>Points this week</Text>
                </View>

                <View style={styles.historySummaryStat}>
                  <View style={styles.historySummaryMetricRow}>
                    <MaterialCommunityIcons name="map-marker" size={28} color="#ffffff" />
                    <Text style={styles.historySummaryValue}>11.1</Text>
                  </View>
                  <Text style={styles.historySummaryLabel}>kg CO2 saved</Text>
                </View>
              </View>
            </View>

            {tripHistory.map((trip) => (
              <View key={trip.id} style={styles.historyTripCard}>
                <View style={styles.historyRoutePreview}>
                  <View style={styles.historyPathLine} />
                  <View style={styles.historyPathStart} />
                  <View style={styles.historyPathEnd} />
                </View>

                <View style={styles.historyTripBody}>
                  <View style={styles.historyMetaRow}>
                    <View style={styles.historyMetaLeft}>
                      <MaterialCommunityIcons name="calendar-blank-outline" size={22} color="#64748b" />
                      <Text style={styles.historyMetaText}>
                        {trip.date} • {trip.time}
                      </Text>
                    </View>

                    <View style={styles.historyVehicleBadge}>
                      <MaterialCommunityIcons name={trip.vehicleIcon} size={20} color="#ffffff" />
                    </View>
                  </View>

                  <View style={styles.historyStops}>
                    <View style={styles.historyStopRow}>
                      <View style={[styles.historyStopIconWrap, styles.historyStartIconWrap]}>
                        <MaterialCommunityIcons name="map-marker-outline" size={18} color="#2563eb" />
                      </View>
                      <Text style={styles.historyStopText}>{trip.from}</Text>
                    </View>

                    <View style={styles.historyConnector} />

                    <View style={styles.historyStopRow}>
                      <View style={[styles.historyStopIconWrap, styles.historyEndIconWrap]}>
                        <MaterialCommunityIcons name="map-marker-outline" size={18} color="#ef4444" />
                      </View>
                      <Text style={styles.historyStopText}>{trip.to}</Text>
                    </View>
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
              {pointHistory.map((entry) => (
                <View key={entry.id} style={styles.listItem}>
                  <View>
                    <Text style={styles.listTitle}>{entry.title}</Text>
                    <Text style={styles.listSubtitle}>{entry.date}</Text>
                  </View>
                  <Text
                    style={[
                      styles.historyPoints,
                      entry.points.startsWith("+") ? styles.positivePoints : styles.negativePoints,
                    ]}>
                    {entry.points}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : activeTab === "reward" ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.rewardHeroCard}>
              <Text style={styles.heroEyebrow}>Rewards</Text>
              <Text style={styles.heroTitle}>Redeem your sustainable progress</Text>
              <Text style={styles.heroText}>
                Use the points you earned from greener trips to unlock campus-friendly perks.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rewards</Text>
              <View style={styles.rewardPointsSummaryRow}>
                <MaterialCommunityIcons name="gift-outline" size={18} color="#16a34a" />
                <Text style={styles.rewardPointsSummary}>
                  You have <Text style={styles.rewardPointsValue}>{rewardProgress.current}</Text> points
                </Text>
              </View>
              {vouchers.map((voucher) => (
                <View
                  key={voucher.id}
                  style={[
                    styles.voucherCard,
                    rewardProgress.current < voucher.points ? styles.voucherCardLocked : null,
                  ]}>
                  <View style={[styles.voucherTopGlow, { backgroundColor: voucher.accentColor }]} />

                  <View style={styles.voucherHeader}>
                    <View style={styles.voucherBrandRow}>
                      <View style={[styles.voucherLogoWrap, { backgroundColor: voucher.logoBackground }]}>
                        <MaterialCommunityIcons name={voucher.logoIcon} size={18} color={voucher.logoColor} />
                      </View>

                      <View style={styles.voucherTitleBlock}>
                        <Text style={styles.voucherTitle}>{voucher.title}</Text>
                        <Text style={styles.voucherPartner}>{voucher.partner}</Text>
                      </View>
                    </View>

                    {rewardProgress.current >= voucher.points ? (
                      <View style={styles.voucherStatusAvailable}>
                        <MaterialCommunityIcons name="check-circle-outline" size={28} color="#22c55e" />
                      </View>
                    ) : (
                      <View style={styles.voucherStatusLocked}>
                        <MaterialCommunityIcons name="lock-outline" size={18} color="#64748b" />
                      </View>
                    )}
                  </View>

                  <Text style={styles.voucherDescription}>{voucher.description}</Text>

                  <View style={styles.voucherFooter}>
                    <View style={styles.voucherPointsRow}>
                      <Text style={styles.voucherPointsLabel}>Required points:</Text>
                      <Text style={styles.voucherPointsValue}>{voucher.points} pts</Text>
                    </View>

                    {rewardProgress.current >= voucher.points ? (
                      <Pressable style={styles.redeemButton}>
                        <Text style={styles.redeemButtonText}>Redeem</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.voucherMissingWrap}>
                        <Text style={styles.voucherMissingText}>
                          Need {voucher.points - rewardProgress.current} more pts
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.mapWrapper}>
            <MapView
              initialRegion={mapRegion}
              style={StyleSheet.absoluteFillObject}
              showsCompass
              loadingEnabled
              onRegionChangeComplete={(region) => console.log("Region changed:", region)}
            >
              {mapMarkers.map((marker) => (
                <Marker
                  key={marker.id}
                  coordinate={marker.coordinate}
                  title={marker.title}
                  description={marker.description}
                  onPress={() => console.log(`Marker pressed: ${marker.title}`)}
                />
              ))}
              <Polyline
                coordinates={[
                  { latitude: 33.4484, longitude: -112.074 },
                  { latitude: 33.4524, longitude: -112.0758 },
                ]}
                strokeColor="#000"
                strokeWidth={3}
              />
            </MapView>

            <View style={styles.mapSearchBar}>
              <MaterialCommunityIcons name="magnify" size={20} color="#475569" />
              <Text style={styles.mapSearchInput}>Search destinations, streets, transit stops</Text>
              <MaterialCommunityIcons name="microphone" size={20} color="#475569" />
            </View>
          </View>
        )}
      </View>

      <View style={styles.tabBar}>
        <TabButton
          icon="view-dashboard-outline"
          isActive={activeTab === "dashboard"}
          onPress={() => setActiveTab("dashboard")}
        />
        <TabButton icon="map-marker-outline" isActive={activeTab === "map"} onPress={() => setActiveTab("map")} />
        <TabButton icon="gift-outline" isActive={activeTab === "reward"} onPress={() => setActiveTab("reward")} />
        <TabButton icon="history" isActive={activeTab === "history"} onPress={() => setActiveTab("history")} />
      </View>
    </SafeAreaView>
  );
}

type TabButtonProps = {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  isActive: boolean;
  onPress: () => void;
};

function TabButton({ icon, isActive, onPress }: TabButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}>
      <MaterialCommunityIcons name={icon} size={24} style={[styles.tabIcon, isActive ? styles.tabIconActive : null]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef6f1",
  },
  appHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0b3d2e",
  },
  appSubtitle: {
    marginTop: 4,
    fontSize: 15,
    color: "#4d6b61",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 16,
  },
  heroCard: {
    backgroundColor: "#0f5c45",
    borderRadius: 24,
    padding: 20,
  },
  rewardHeroCard: {
    backgroundColor: "#14532d",
    borderRadius: 24,
    padding: 20,
  },
  historyScreenHeader: {
    paddingTop: 4,
  },
  historyScreenTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
  },
  historySummaryCard: {
    backgroundColor: "#20b455",
    borderRadius: 30,
    padding: 18,
    shadowColor: "#15803d",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 5,
  },
  historySummaryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  historySummaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  historySummaryStats: {
    flexDirection: "row",
    gap: 14,
  },
  historySummaryStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 24,
    padding: 18,
  },
  historySummaryMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  historySummaryValue: {
    fontSize: 38,
    fontWeight: "800",
    color: "#ffffff",
  },
  historySummaryLabel: {
    fontSize: 16,
    color: "#f0fff4",
  },
  historyTripCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#0b3d2e",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  historyRoutePreview: {
    height: 150,
    backgroundColor: "#eef7ff",
    position: "relative",
  },
  historyPathLine: {
    position: "absolute",
    left: 72,
    right: 70,
    top: 66,
    borderTopWidth: 4,
    borderStyle: "dashed",
    borderColor: "#3fbf58",
    transform: [{ rotate: "-4deg" }],
  },
  historyPathStart: {
    position: "absolute",
    left: 58,
    top: 61,
    width: 26,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#3b82f6",
  },
  historyPathEnd: {
    position: "absolute",
    right: 54,
    top: 58,
    width: 26,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#ef4444",
  },
  historyTripBody: {
    padding: 20,
  },
  historyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  historyMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyMetaText: {
    fontSize: 15,
    color: "#475569",
  },
  historyVehicleBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  historyStops: {
    marginBottom: 20,
  },
  historyStopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  historyStopIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  historyStartIconWrap: {
    backgroundColor: "#dbeafe",
  },
  historyEndIconWrap: {
    backgroundColor: "#fee2e2",
  },
  historyConnector: {
    width: 2,
    height: 28,
    backgroundColor: "#cbd5e1",
    marginLeft: 17,
    marginVertical: 4,
  },
  historyStopText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  historyFooter: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  historyImpactRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  historyImpactPoints: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16a34a",
  },
  historyImpactText: {
    fontSize: 15,
    color: "#334155",
  },
  historyDuration: {
    fontSize: 15,
    color: "#64748b",
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b8f2d6",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  heroText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#e6fff3",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#0b3d2e",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#173127",
    marginBottom: 14,
  },
  pointsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f5c45",
  },
  pointsGoal: {
    fontSize: 14,
    color: "#658277",
  },
  progressTrack: {
    height: 14,
    backgroundColor: "#dceee6",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#20b26b",
  },
  cardHint: {
    fontSize: 14,
    lineHeight: 20,
    color: "#587166",
  },
  streakCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 26,
    backgroundColor: "#ff5f12",
    shadowColor: "#bc3b15",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  streakGlowLarge: {
    position: "absolute",
    right: -40,
    top: -20,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "#ff3d34",
    opacity: 0.75,
  },
  streakGlowSmall: {
    position: "absolute",
    right: 90,
    bottom: -70,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "#ff7b1a",
    opacity: 0.35,
  },
  streakHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  streakCopy: {
    flex: 1,
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff5ef",
    marginBottom: 14,
  },
  streakValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  streakValue: {
    fontSize: 52,
    fontWeight: "800",
    color: "#ffffff",
    lineHeight: 56,
  },
  streakUnit: {
    fontSize: 24,
    fontWeight: "500",
    color: "#ffffff",
    marginTop: 8,
  },
  streakMessage: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff5ef",
  },
  streakIconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255, 214, 204, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#edf4ef",
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#173127",
  },
  listSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6c857b",
  },
  badge: {
    backgroundColor: "#e8f7ef",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f7f4f",
  },
  voucherCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderRadius: 26,
    padding: 18,
    marginTop: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  voucherCardLocked: {
    backgroundColor: "#f5f6f8",
    opacity: 0.86,
  },
  voucherTopGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 12,
  },
  voucherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  voucherBrandRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  voucherLogoWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  voucherTitleBlock: {
    flex: 1,
  },
  voucherTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#173127",
    marginBottom: 4,
  },
  voucherPartner: {
    fontSize: 13,
    color: "#648176",
  },
  voucherStatusAvailable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  voucherStatusLocked: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    width: 34,
    height: 34,
    borderRadius: 999,
  },
  voucherDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4f6b61",
    marginBottom: 18,
  },
  voucherFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  voucherPointsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexWrap: "wrap",
  },
  voucherPointsLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7f76",
  },
  voucherPointsValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f5c45",
  },
  redeemButton: {
    backgroundColor: "#0f5c45",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  redeemButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  voucherMissingWrap: {
    backgroundColor: "#eef2f6",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  voucherMissingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  rewardPointsSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -2,
    marginBottom: 2,
  },
  rewardPointsSummary: {
    fontSize: 15,
    fontWeight: "600",
    color: "#587166",
  },
  rewardPointsValue: {
    fontWeight: "800",
    color: "#16a34a",
  },
  historyPoints: {
    fontSize: 15,
    fontWeight: "800",
  },
  positivePoints: {
    color: "#17985e",
  },
  negativePoints: {
    color: "#b75555",
  },
  mapSectionHeader: {
    paddingTop: 4,
  },
  mapScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 18,
  },
  mapSectionHeader: {
    paddingTop: 4,
  },
  mapSectionTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0b3d2e",
    marginBottom: 6,
  },
  mapSectionSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5c786d",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  statCard: {
    width: "47%",
    minHeight: 190,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#0b3d2e",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  statIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  statValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    lineHeight: 23,
    color: "#334e68",
    marginBottom: 16,
  },
  statTrendRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: "auto",
  },
  statTrendValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statTrendPeriod: {
    fontSize: 15,
    color: "#64748b",
  },
  mapPlaceholder: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#b8d8c7",
    borderStyle: "dashed",
    backgroundColor: "#f8fcf9",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  mapTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0b3d2e",
    marginBottom: 6,
  },
  mapSectionSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5c786d",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  statCard: {
    width: "47%",
    minHeight: 190,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#0b3d2e",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  statIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  statValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    lineHeight: 23,
    color: "#334e68",
    marginBottom: 16,
  },
  statTrendRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: "auto",
  },
  statTrendValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statTrendPeriod: {
    fontSize: 15,
    color: "#64748b",
  },
  mapWrapper: {
    flex: 1,
    backgroundColor: "#f4f7f2",
    position: "relative",
  },
  mapSearchBar: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0b3d2e",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
    marginLeft: 12,
  },
  tabBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#edf5f0",
  },
  tabButtonActive: {
    backgroundColor: "#0f5c45",
  },
  tabIcon: {
    color: "#527166",
    marginBottom: 0,
  },
  tabIconActive: {
    color: "#ffffff",
  },
});
