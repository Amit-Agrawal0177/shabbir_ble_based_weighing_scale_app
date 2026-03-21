

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Modal,
} from "react-native";
import { BleManager } from "react-native-ble-plx";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";

const manager = new BleManager();

const Home = ({ navigation }) => {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    startScan();
    const interval = setInterval(() => {
      startScan();
    }, 10000);
    return () => {
      clearInterval(interval);
      manager.stopDeviceScan();
    };
  }, []);

  const startScan = () => {
    setDevices([]);
    setScanning(true);
    setCountdown(30);
    manager.stopDeviceScan();

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
        return;
      }
      if (device && device.name) {
        setDevices((prev) => {
          const exists = prev.find((d) => d.id === device.id);
          if (!exists) return [...prev, device];
          return prev;
        });
      }
    });

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      manager.stopDeviceScan();
      setScanning(false);
    }, 30000);
  };

  const connectDevice = async (device) => {
    try {
      manager.stopDeviceScan();
      setScanning(false);
      navigation.navigate("WeightScreen", { device });
    } catch (error) {
      console.log("Connection error", error);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    manager.stopDeviceScan();
    navigation.replace("Login");
  };

  const requestBluetoothPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      if (
        granted["android.permission.ACCESS_FINE_LOCATION"] === "granted" &&
        granted["android.permission.BLUETOOTH_SCAN"] === "granted" &&
        granted["android.permission.BLUETOOTH_CONNECT"] === "granted"
      ) {
        startScan();
      }
    }
  };

  useEffect(() => {
    requestBluetoothPermission();
  }, []);

  const getSignalIcon = (rssi) => {
    if (!rssi) return "bluetooth";
    if (rssi > -60) return "signal-cellular-3";
    if (rssi > -75) return "signal-cellular-2";
    return "signal-cellular-1";
  };

  const getSignalColor = (rssi) => {
    if (!rssi) return "#94a3b8";
    if (rssi > -60) return "#22c55e";
    if (rssi > -75) return "#f59e0b";
    return "#ef4444";
  };

  const getSignalLabel = (rssi) => {
    if (!rssi) return "–";
    if (rssi > -60) return "Strong";
    if (rssi > -75) return "Fair";
    return "Weak";
  };

  const DeviceCard = ({ item }) => (
    <TouchableOpacity
      style={styles.deviceCard}
      onPress={() => connectDevice(item)}
      activeOpacity={0.75}
    >
      <LinearGradient
        colors={["#eff6ff", "#dbeafe"]}
        style={styles.deviceIconBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Icon name="bluetooth" size={22} color="#2563eb" />
      </LinearGradient>

      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || "Unnamed Device"}</Text>
        <Text style={styles.deviceId} numberOfLines={1}>
          {item.id}
        </Text>
      </View>

      <View style={styles.deviceRight}>
        <View style={[styles.signalBadge, { borderColor: getSignalColor(item.rssi) + "40" }]}>
          <Icon name={getSignalIcon(item.rssi)} size={12} color={getSignalColor(item.rssi)} />
          <Text style={[styles.signalLabel, { color: getSignalColor(item.rssi) }]}>
            {getSignalLabel(item.rssi)}
          </Text>
        </View>
        <View style={styles.connectBtn}>
          <Icon name="chevron-right" size={18} color="#2563eb" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconCircle}>
        <Icon name="bluetooth-off" size={36} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyTitle}>No devices found</Text>
      <Text style={styles.emptySubtitle}>
        Make sure your BLE device is powered on and nearby
      </Text>
      <TouchableOpacity onPress={startScan} style={styles.retryBtn}>
        <Icon name="refresh" size={15} color="#2563eb" />
        <Text style={styles.retryText}>Scan Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4ff" />

      {/* Decorative blobs */}
      <View style={styles.decorCircleLarge} />
      <View style={styles.decorCircleSmall} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoShadow}>
            <LinearGradient
              colors={["#1d4ed8", "#2563eb"]}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="bluetooth-connect" size={20} color="#fff" />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.headerTitle}>Emrald Meezan</Text>
            <Text style={styles.headerSub}>Bluetooth Weighing System</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={startScan}
            disabled={scanning}
            style={styles.iconBtn}
          >
            {scanning ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Icon name="refresh" size={19} color="#2563eb" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowLogoutModal(true)}
            style={[styles.iconBtn, styles.logoutIconBtn]}
          >
            <Icon name="logout" size={19} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SCAN STATUS BAR */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, scanning && styles.statusDotActive]} />
        <Text style={styles.statusText}>
          {scanning ? `Scanning for devices… ${countdown}s` : "Scan complete"}
        </Text>
        <View style={styles.deviceCountBadge}>
          <Icon name="bluetooth" size={11} color="#2563eb" />
          <Text style={styles.deviceCountText}>{devices.length}</Text>
        </View>
      </View>

      {/* SECTION HEADER */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>NEARBY DEVICES</Text>
        {scanning && (
          <View style={styles.scanningPill}>
            <View style={styles.scanningDot} />
            <Text style={styles.scanningPillText}>Live</Text>
          </View>
        )}
      </View>

      {/* LIST */}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DeviceCard item={item} />}
        ListEmptyComponent={!scanning ? <EmptyState /> : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      {/* FOOTER */}
      <Text style={styles.footer}>Tap a device to connect · Auto-scans every 10s</Text>

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Icon name="logout" size={28} color="#ef4444" />
            </View>

            <Text style={styles.modalTitle}>Sign Out?</Text>
            <Text style={styles.modalSubtitle}>
              You'll be disconnected from all BLE devices and returned to the login screen.
            </Text>

            <View style={styles.modalDivider} />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowLogoutModal(false)}
                style={styles.cancelBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogout}
                activeOpacity={0.85}
                style={styles.logoutBtnWrap}
              >
                <LinearGradient
                  colors={["#ef4444", "#dc2626"]}
                  style={styles.logoutBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Icon name="logout" size={16} color="#fff" />
                  <Text style={styles.logoutBtnText}>Sign Out</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4ff",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },

  decorCircleLarge: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#dbeafe",
    opacity: 0.7,
  },
  decorCircleSmall: {
    position: "absolute",
    bottom: 60,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#eff6ff",
    opacity: 0.9,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoShadow: {
    borderRadius: 14,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  logoGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutIconBtn: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecaca",
  },

  /* Status bar */
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#cbd5e1",
  },
  statusDotActive: {
    backgroundColor: "#22c55e",
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  deviceCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  deviceCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },

  /* Section row */
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  scanningPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  scanningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  scanningPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16a34a",
  },

  /* List */
  listContent: {
    paddingBottom: 10,
    flexGrow: 1,
  },

  /* Device card */
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#e8f0fe",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
    gap: 12,
  },
  deviceIconBg: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 3,
  },
  deviceId: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },
  deviceRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  signalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    backgroundColor: "#f8fafc",
  },
  signalLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  connectBtn: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  /* Empty state */
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },

  /* Footer */
  footer: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 14,
    letterSpacing: 0.2,
  },

  /* Logout Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    width: "100%",
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 20,
  },
  modalIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#fff1f2",
    borderWidth: 1.5,
    borderColor: "#fecaca",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#f1f5f9",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },
  logoutBtnWrap: {
    flex: 1,
    borderRadius: 14,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  logoutBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});