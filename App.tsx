import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

type TabKey = "dashboard" | "map" | "reward";

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
              <Text style={styles.mapSectionSubtitle}>Track how your travel choices create a more sustainable map over time.</Text>
            </View>

            <View style={styles.statsGrid}>
              {sustainabilityStats.map((stat) => (
                <View key={stat.id} style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: stat.iconBackground }]}>
                    <MaterialCommunityIcons
                      name={stat.icon}
                      size={30}
                      color={stat.iconColor}
                    />
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
              <Text style={styles.heroText}>Use the points you earned from greener trips to unlock campus-friendly perks.</Text>
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
          </ScrollView>
        ) : (
          <View style={styles.mapScreen}>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapTitle}>Map GUI</Text>
              <Text style={styles.mapSubtitle}>Empty screen reserved for the upcoming map experience.</Text>
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
      </View>
    </SafeAreaView>
  );
}

type TabButtonProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  isActive: boolean;
  onPress: () => void;
};

function TabButton({ icon, isActive, onPress }: TabButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        style={[styles.tabIcon, isActive ? styles.tabIconActive : null]}
      />
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
    marginBottom: 10,
  },
  mapSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5c786d",
    textAlign: "center",
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
