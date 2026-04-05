import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import type { ComponentProps } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";

type TabKey = "dashboard" | "map" | "reward" | "history" | "profile" | "tracking";

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
    partner: "Apple",
    status: "redeemed",
    accentColor: "#f59e0b",
    logoIcon: "apple",
    logoBackground: "#f3f4f6",
    logoColor: "#111827",
  },
  {
    id: "2",
    title: "Campus Smoothie Voucher",
    description: "Redeem this voucher for one free fruit smoothie.",
    points: 180,
    partner: "Google",
    status: "redeemed",
    accentColor: "#ec4899",
    logoIcon: "google",
    logoBackground: "#eff6ff",
    logoColor: "#2563eb",
  },
  {
    id: "3",
    title: "Bus Pass Discount",
    description: "Use this voucher to lower the cost of your next bus or metro pass.",
    points: 280,
    partner: "Microsoft",
    status: "unlock",
    accentColor: "#3b82f6",
    logoIcon: "microsoft-windows",
    logoBackground: "#eff6ff",
    logoColor: "#2563eb",
  },
  {
    id: "4",
    title: "Lunch Combo Discount",
    description: "Use this voucher to save on a sustainable lunch combo.",
    points: 320,
    partner: "Meta",
    status: "unlock",
    accentColor: "#8b5cf6",
    logoIcon: "facebook",
    logoBackground: "#eef2ff",
    logoColor: "#4338ca",
  },
  {
    id: "5",
    title: "Eco Store Gift Card",
    description: "Exchange this for store credit on reusable and eco-friendly products.",
    points: 450,
    partner: "Amazon",
    status: "lock",
    accentColor: "#14b8a6",
    logoIcon: "aws",
    logoBackground: "#fff7ed",
    logoColor: "#c2410c",
  },
  {
    id: "6",
    title: "Weekend Rail Pass",
    description: "Unlock a discounted rail pass for your weekend trips.",
    points: 520,
    partner: "NVIDIA",
    status: "lock",
    accentColor: "#ef4444",
    logoIcon: "expansion-card",
    logoBackground: "#ecfccb",
    logoColor: "#3f6212",
  },
] as const;

const pointHistory = [
  { id: "1", title: "Carpooled to campus", points: "+40", date: "Today" },
  { id: "2", title: "Used public transport", points: "+25", date: "Yesterday" },
  { id: "3", title: "Completed weekly eco goal", points: "+80", date: "Apr 2" },
  { id: "4", title: "Redeemed coffee voucher", points: "-150", date: "Apr 1" },
];

const mapRegion = {
  latitude: 33.4484,
  longitude: -112.074,
  latitudeDelta: 0.028,
  longitudeDelta: 0.028,
} as const;

const driverLocation = {
  latitude: 33.4484,
  longitude: -112.074,
} as const;

const packageLocation = {
  latitude: 33.4491,
  longitude: -112.0732,
} as const;

const nearbyPackages = [
  {
    id: "pkg-1",
    title: "Mock package pickup",
    description: "Package ready for pickup near your current location.",
    coordinate: packageLocation,
  },
  {
    id: "pkg-2",
    title: "Mock package pickup",
    description: "Small parcel waiting outside a nearby building.",
    coordinate: { latitude: 33.4479, longitude: -112.0728 },
  },
  {
    id: "pkg-3",
    title: "Mock package pickup",
    description: "Delivery bag available for collection across the street.",
    coordinate: { latitude: 33.4488, longitude: -112.0751 },
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

const profileDetails = [
  { id: "name", label: "Name", value: "Alex Green" },
  { id: "email", label: "Email", value: "alex.green@asu.edu" },
  { id: "member", label: "Membership", value: "Eco Commuter" },
  { id: "joined", label: "Joined", value: "January 2026" },
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

const honorTiers = [
  {
    id: "gaia-vanguard",
    title: 'The "Gaia Vanguard"',
    pointsRequired: 500,
    benefits: [
      "30% discount on eco-products",
      "VIP customer support 24/7",
      "Gold eco-badge on profile",
      "Exclusive event invitations",
      "Free yearly carbon offset",
      "Personal sustainability advisor",
      "Featured in hall of fame",
    ],
    accentColor: "#a855f7",
    icon: "shield-outline",
  },
  {
    id: "kinetic-strategist",
    title: 'The "Kinetic Strategist"',
    pointsRequired: 300,
    benefits: [
      "15% discount on eco-products",
      "Priority customer support",
      "Silver eco-badge on profile",
      "Early access to new features",
      "Free carbon offset report",
    ],
    accentColor: "#3b82f6",
    icon: "lightning-bolt-outline",
  },
  {
    id: "eco-explorer",
    title: 'The "Eco-Explorer"',
    pointsRequired: 150,
    benefits: [
      "5% discount on eco-products",
      "Monthly sustainability newsletter",
      "Basic eco-badge on profile",
      "Access to community forum",
    ],
    accentColor: "#22c55e",
    icon: "compass-outline",
  },
] as const;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const progressPercentage = (rewardProgress.current / rewardProgress.goal) * 100;
  const progressWidth = `${progressPercentage}%` as const;
  const currentHonor =
    rewardProgress.current >= 500
      ? 'The "Gaia Vanguard"'
      : rewardProgress.current >= 300
        ? 'The "Kinetic Strategist"'
        : 'The "Eco-Explorer"';

  const handleLogin = () => {
    const email = loginEmail.trim();
    if (!email || !loginPassword) {
      setLoginError("Enter email and password.");
      return;
    }
    if (!email.includes("@")) {
      setLoginError("Enter a valid email address.");
      return;
    }
    if (loginPassword.length < 4) {
      setLoginError("Password must be at least 4 characters.");
      return;
    }
    setLoginError(null);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginPassword("");
    setActiveTab("dashboard");
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={styles.loginKeyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
          <ScrollView
            contentContainerStyle={styles.loginScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.loginBrandBlock}>
              <View style={styles.loginLogoCircle}>
                <MaterialCommunityIcons name="leaf-circle" size={42} color="#0f5c45" />
              </View>
              <Text style={styles.loginAppTitle}>Ecoride</Text>
              <Text style={styles.loginTagline}>Ride greener. Earn more rewards.</Text>
            </View>

            <View style={styles.loginCard}>
              <Text style={styles.loginCardTitle}>Sign in</Text>
              <Text style={styles.loginCardHint}>Use any email and a password of 4+ characters for this demo.</Text>

              <Text style={styles.loginLabel}>Email</Text>
              <TextInput
                style={styles.loginInput}
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                value={loginEmail}
                onChangeText={(t) => {
                  setLoginEmail(t);
                  setLoginError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />

              <Text style={styles.loginLabel}>Password</Text>
              <TextInput
                style={styles.loginInput}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                value={loginPassword}
                onChangeText={(t) => {
                  setLoginPassword(t);
                  setLoginError(null);
                }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />

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
              {/* <Pressable onPress={handleLogout} style={styles.logoutButton} hitSlop={12}>
                <Text style={styles.logoutButtonText}>Log out</Text>
              </Pressable> */}
            </View>
          </View>
        )}

        <View style={styles.content}>
          {activeTab === "dashboard" ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.heroCard}>
                <Text style={styles.heroEyebrow}>Dashboard</Text>
                <Text style={styles.heroTitle}>Your eco impact this week</Text>
                <Text style={styles.heroText}>
                  Keep riding sustainably to unlock more rewards and grow your streak.
                </Text>
              </View>

              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>Points and rewards</Text>
                  <Pressable style={styles.rewardsLinkInline} onPress={() => setActiveTab("tracking")}>
                    <Text style={styles.rewardsLinkText}>Go to Milestone</Text>
                  </Pressable>
                </View>
                <View style={styles.trackingPointsRow}>
                  <Text style={styles.trackingPointsValue}>{rewardProgress.current} pts</Text>
                  <Text style={styles.trackingPointsGoal}>Next milestone: {rewardProgress.goal} pts</Text>
                </View>
                <Text style={styles.trackingCurrentRank}>{currentHonor}</Text>
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
          ) : activeTab === "tracking" ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.trackingHeroCard}>
                <Text style={styles.heroEyebrow}>Tracking</Text>
                <Text style={styles.heroTitle}>Honor progress</Text>
                <Text style={styles.heroText}>
                  Track your current points and see what each honor tier unlocks next.
                </Text>
              </View>

              <View style={styles.trackingSectionHeader}>
                <Text style={styles.trackingSectionTitle}>Honor titles</Text>
              </View>

              {honorTiers.map((tier) => (
                <View
                  key={tier.id}
                  style={[
                    styles.card,
                    tier.title === currentHonor ? styles.activeHonorCard : null,
                    rewardProgress.current < tier.pointsRequired ? styles.lockedHonorCard : null,
                  ]}>
                  <View style={styles.honorCard}>
                    <View style={styles.honorTopRow}>
                      <View style={[styles.honorIconWrap, { backgroundColor: `${tier.accentColor}20` }]}>
                        <MaterialCommunityIcons name={tier.icon} size={26} color={tier.accentColor} />
                      </View>
                      {tier.title === currentHonor ? (
                        <Text style={styles.honorCurrentLabel}>Current</Text>
                      ) : rewardProgress.current < tier.pointsRequired ? (
                        <Text style={styles.honorLockLabel}>Locked</Text>
                      ) : (
                        <View />
                      )}
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
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Rewards</Text>
                <View style={styles.rewardPointsSummaryRow}>
                  <MaterialCommunityIcons name="gift-outline" size={18} color="#16a34a" />
                  <Text style={styles.rewardPointsSummary}>
                    You have <Text style={styles.rewardPointsValue}>{rewardProgress.current}</Text> points
                  </Text>
                </View>
              </View>

              <View style={styles.rewardList}>
                {vouchers.map((voucher) => (
                  <View
                    key={voucher.id}
                    style={[
                      styles.voucherCard,
                      voucher.status === "lock" ? styles.voucherCardLocked : null,
                      voucher.status === "redeemed" ? styles.voucherCardRedeemed : null,
                    ]}>
                    <View style={[styles.voucherTopGlow, { backgroundColor: voucher.accentColor }]} />

                    <View style={styles.voucherHeader}>
                      <View style={styles.voucherBrandRow}>
                        <View style={[styles.voucherLogoWrap, { backgroundColor: voucher.logoBackground }]}>
                          <MaterialCommunityIcons name={voucher.logoIcon} size={24} color={voucher.logoColor} />
                        </View>

                        <View style={styles.voucherTitleBlock}>
                          <Text style={styles.voucherTitle}>{voucher.title}</Text>
                          <Text style={styles.voucherPartner}>{voucher.partner}</Text>
                        </View>
                      </View>

                      {voucher.status === "redeemed" ? (
                        <View style={styles.voucherStatusRedeemed}>
                          <MaterialCommunityIcons name="check-decagram" size={24} color="#0f7f4f" />
                        </View>
                      ) : voucher.status === "unlock" ? (
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

                      {voucher.status === "redeemed" ? (
                        <Text style={styles.voucherRedeemedLabel}>Redeemed</Text>
                      ) : voucher.status === "unlock" ? (
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
          ) : activeTab === "profile" ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.profileHeroCard}>
                <View style={styles.profileAvatar}>
                  <MaterialCommunityIcons name="account-outline" size={34} color="#ffffff" />
                </View>
                <Text style={styles.profileHeroTitle}>Profile</Text>
                <Text style={styles.profileHeroSubtitle}>
                  Manage your account and review your sustainable activity.
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Account Detail</Text>
                {profileDetails.map((detail, index) => (
                  <View
                    key={detail.id}
                    style={[styles.profileDetailRow, index === 0 ? styles.profileDetailRowFirst : null]}>
                    <Text style={styles.profileDetailLabel}>{detail.label}</Text>
                    <Text style={styles.profileDetailValue}>{detail.value}</Text>
                  </View>
                ))}
              </View>

              <Pressable style={[styles.card, styles.profileHistoryCard]} onPress={() => setActiveTab("history")}>
                <Text style={styles.cardTitle}>Trip History</Text>
              </Pressable>

              <Pressable style={styles.profileLogoutButton} onPress={() => handleLogout()}>
                <MaterialCommunityIcons name="logout" size={20} color="#ffffff" />
                <Text style={styles.profileLogoutButtonText}>Log out</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <View style={styles.mapWrapper}>
              <MapView
                initialRegion={mapRegion}
                style={StyleSheet.absoluteFillObject}
                showsCompass
                loadingEnabled
                onRegionChangeComplete={(region) => console.log("Region changed:", region)}>
                <Marker
                  coordinate={driverLocation}
                  title="Your vehicle"
                  description="You are online and ready to pick up deliveries.">
                  <View style={styles.driverMarker}>
                    <MaterialCommunityIcons name="car" size={18} color="#ffffff" />
                  </View>
                </Marker>
                {nearbyPackages.map((pkg) => (
                  <Marker key={pkg.id} coordinate={pkg.coordinate} title={pkg.title} description={pkg.description}>
                    <View style={styles.packageMarker}>
                      <MaterialCommunityIcons name="package-variant-closed" size={18} color="#ffffff" />
                    </View>
                  </Marker>
                ))}
                <Polyline
                  coordinates={[
                    driverLocation,
                    nearbyPackages[0].coordinate,
                    nearbyPackages[1].coordinate,
                    nearbyPackages[2].coordinate,
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

              <View style={styles.driverStatusCard}>
                <Text style={styles.driverStatusTitle}>Driver mode</Text>
                <Text style={styles.driverStatusText}>
                  A mock package is waiting just north-east of your current location.
                </Text>
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
          <TabButton
            icon="account-outline"
            isActive={activeTab === "profile"}
            onPress={() => setActiveTab("profile")}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
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
  appHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  appHeaderTitles: {
    flex: 1,
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f5c45",
  },
  mapLogoutFab: {
    position: "absolute",
    top: 78,
    right: 20,
    zIndex: 2,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#0b3d2e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mapLogoutText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f5c45",
  },
  loginKeyboardView: {
    flex: 1,
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  loginBrandBlock: {
    alignItems: "center",
    marginBottom: 28,
  },
  loginLogoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#0b3d2e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  loginAppTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#0b3d2e",
  },
  loginTagline: {
    marginTop: 8,
    fontSize: 16,
    color: "#4d6b61",
    textAlign: "center",
  },
  loginCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#0b3d2e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  loginCardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  loginCardHint: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748b",
    marginBottom: 20,
  },
  loginLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
  },
  loginInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
    color: "#0f172a",
    marginBottom: 16,
    backgroundColor: "#f8fafc",
  },
  loginErrorText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#b91c1c",
    marginBottom: 12,
  },
  loginButton: {
    backgroundColor: "#0f5c45",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
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
  trackingHeroCard: {
    backgroundColor: "#0f5c45",
    borderRadius: 24,
    padding: 20,
  },
  profileHeroCard: {
    backgroundColor: "#0f5c45",
    borderRadius: 24,
    padding: 24,
    alignItems: "flex-start",
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  profileHeroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  profileHeroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#dff8ea",
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
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
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
  trackingPointsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  trackingPointsValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0f5c45",
  },
  trackingPointsGoal: {
    fontSize: 14,
    color: "#64748b",
  },
  trackingPointsCard: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  trackingCurrentRank: {
    fontSize: 16,
    fontWeight: "800",
    color: "#15803d",
    marginBottom: 12,
  },
  rewardsLinkInline: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  rewardsLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f5c45",
    textDecorationLine: "underline",
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
  profileDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#edf4ef",
  },
  profileDetailRowFirst: {
    paddingTop: 0,
    borderTopWidth: 0,
  },
  profileDetailLabel: {
    fontSize: 14,
    color: "#6c857b",
  },
  profileDetailValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#173127",
  },
  profileHistoryCard: {
    gap: 14,
  },
  profileHistoryButtonTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f5c45",
  },
  profileTripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#edf4ef",
  },
  profileTripRowFirst: {
    paddingTop: 0,
    borderTopWidth: 0,
  },
  profileTripText: {
    flex: 1,
  },
  profileTripRoute: {
    fontSize: 15,
    fontWeight: "700",
    color: "#173127",
  },
  profileTripMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#6c857b",
  },
  profileTripPoints: {
    fontSize: 15,
    fontWeight: "800",
    color: "#17985e",
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
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e7edf2",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  voucherCardLocked: {
    backgroundColor: "#f7f8fa",
    opacity: 0.88,
  },
  voucherCardRedeemed: {
    backgroundColor: "#ffffff",
  },
  voucherTopGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 10,
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
    alignItems: "flex-start",
    gap: 12,
  },
  voucherLogoWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  voucherTitleBlock: {
    flex: 1,
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  voucherPartner: {
    fontSize: 14,
    color: "#64748b",
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
  voucherStatusRedeemed: {
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
    lineHeight: 22,
    color: "#334155",
    marginBottom: 14,
    marginLeft: 50,
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
    gap: 6,
    flexWrap: "wrap",
  },
  voucherPointsLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
  },
  voucherPointsValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  redeemButton: {
    backgroundColor: "#198754",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
    minWidth: 108,
    alignItems: "center",
  },
  redeemButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  voucherMissingWrap: {
    backgroundColor: "#eef2f6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  voucherMissingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  voucherRedeemedLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16a34a",
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
  rewardList: {
    gap: 0,
  },
  trackingSectionHeader: {
    paddingTop: 4,
  },
  trackingSectionTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  activeHonorCard: {
    borderWidth: 2,
    borderColor: "#0f5c45",
    backgroundColor: "#fffbea",
  },
  lockedHonorCard: {
    backgroundColor: "#f8fafc",
    opacity: 0.58,
  },
  honorCard: {
    gap: 14,
  },
  honorTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  honorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  honorCurrentLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
    backgroundColor: "#2b9348",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: -4,
    marginRight: -4,
  },
  honorLockLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: -4,
    marginRight: -4,
  },
  honorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  honorPoints: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  honorBenefitsBlock: {
    gap: 4,
  },
  honorBenefit: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },
  honorBenefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 4,
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
  driverMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0f5c45",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  packageMarker: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  driverStatusCard: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: "#0b3d2e",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  driverStatusTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  driverStatusText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },
  profileLogoutButton: {
    backgroundColor: "#c2410c",
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  profileLogoutButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
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
