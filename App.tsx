import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

type TabKey = "dashboard" | "map";

const rewardProgress = {
  current: 360,
  goal: 500,
};

const vouchers = [
  { id: "1", title: "Free Coffee Voucher", points: 150, partner: "Green Bean Cafe" },
  { id: "2", title: "Bus Pass Discount", points: 280, partner: "City Transit" },
  { id: "3", title: "Eco Store Gift Card", points: 450, partner: "Eco Market" },
];

const pointHistory = [
  { id: "1", title: "Carpooled to campus", points: "+40", date: "Today" },
  { id: "2", title: "Used public transport", points: "+25", date: "Yesterday" },
  { id: "3", title: "Completed weekly eco goal", points: "+80", date: "Apr 2" },
  { id: "4", title: "Redeemed coffee voucher", points: "-150", date: "Apr 1" },
];

const mapRegion = {
  latitude: 33.4484,
  longitude: -112.074,
  latitudeDelta: 0.055,
  longitudeDelta: 0.055,
};

const mapMarkers = [
  {
    id: "hub-1",
    title: "Greenway Hub",
    description: "Bike and e-scooter pickup point",
    coordinate: { latitude: 33.4524, longitude: -112.0758 },
  },
  {
    id: "hub-2",
    title: "Eco Transit Station",
    description: "Next bus departure: 4 min",
    coordinate: { latitude: 33.4416, longitude: -112.0712 },
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const progressPercentage = (rewardProgress.current / rewardProgress.goal) * 100;
  const progressWidth = `${progressPercentage}%` as const;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>Ecoride</Text>
        <Text style={styles.appSubtitle}>Ride greener. Earn more rewards.</Text>
      </View>

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

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Environment streak</Text>
              <Text style={styles.streakValue}>12 days</Text>
              <Text style={styles.cardHint}>You have saved the environment for 12 consecutive days.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Redeemable vouchers</Text>
              {vouchers.map((voucher) => (
                <View key={voucher.id} style={styles.listItem}>
                  <View>
                    <Text style={styles.listTitle}>{voucher.title}</Text>
                    <Text style={styles.listSubtitle}>{voucher.partner}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{voucher.points} pts</Text>
                  </View>
                </View>
              ))}
            </View>

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
        ) : (
          <View style={styles.mapScreen}>
            <View style={styles.mapPlaceholder}>
              <MapView
                initialRegion={mapRegion}
                style={styles.mapView}
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
                  strokeColor="#000" // Black
                  strokeWidth={3}
                />
              </MapView>
              <View style={styles.mapOverlay}>
                <Text style={styles.mapTitle}>Local mobility map</Text>
                <Text style={styles.mapSubtitle}>
                  Tap and hold to highlight carpool lanes, chargers, and safe bike corridors.
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={styles.tabBar}>
        <TabButton
          label="Dashboard"
          icon="view-dashboard-outline"
          isActive={activeTab === "dashboard"}
          onPress={() => setActiveTab("dashboard")}
        />
        <TabButton label="Map" icon="map-marker-outline" isActive={activeTab === "map"} onPress={() => setActiveTab("map")} />
      </View>
    </SafeAreaView>
  );
}

type TabButtonProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  isActive: boolean;
  label: string;
  onPress: () => void;
};

function TabButton({ icon, isActive, label, onPress }: TabButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}>
      <MaterialCommunityIcons
        name={icon}
        size={22}
        style={[styles.tabIcon, isActive ? styles.tabIconActive : null]}
      />
      <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>{label}</Text>
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
  streakValue: {
    fontSize: 34,
    fontWeight: "800",
    color: "#0f5c45",
    marginBottom: 8,
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
  mapScreen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  mapPlaceholder: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#b8d8c7",
    borderStyle: "dashed",
    backgroundColor: "#f8fcf9",
    overflow: "hidden",
    marginHorizontal: 4,
    marginBottom: 12,
  },
  mapView: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 20,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0b3d2e",
    marginBottom: 6,
  },
  mapSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5c786d",
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
    paddingVertical: 8,
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
    marginBottom: 2,
  },
  tabIconActive: {
    color: "#ffffff",
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#527166",
  },
  tabLabelActive: {
    color: "#ffffff",
  },
});
