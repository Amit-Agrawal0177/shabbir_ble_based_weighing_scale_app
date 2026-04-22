import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import { Dropdown } from "react-native-element-dropdown";

const WeightScreen = ({ route, navigation }) => {
  const { device } = route.params;

  const deviceAddress = device.address || device.id;
  const deviceName = device.name || deviceAddress;

  const [grossWeight, setGrossWeight] = useState(0);      // raw from scale
  const [tareWeight, setTareWeight] = useState(0);         // captured tare
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState("");
  const [records, setRecords] = useState([]);
  const [connected, setConnected] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [tareCaptured, setTareCaptured] = useState(false);

  const connectedDeviceRef = useRef(null);
  const readIntervalRef = useRef(null);
  const dataBufferRef = useRef("");

  // net = gross - tare
  const netWeight = Math.max(0, grossWeight - tareWeight);

  useEffect(() => {
    loadItems();
    loadRecords();
    connectClassic();
    return () => { cleanup(); };
  }, []);

  const cleanup = async () => {
    try {
      if (readIntervalRef.current) {
        clearInterval(readIntervalRef.current);
        readIntervalRef.current = null;
      }
      if (connectedDeviceRef.current) {
        await connectedDeviceRef.current.disconnect();
        connectedDeviceRef.current = null;
      }
    } catch (e) {
      console.log("Cleanup error:", e);
    }
  };

  const connectClassic = async () => {
    try {
      setConnecting(true);
      setConnected(false);

      try {
        const alreadyConnected = await RNBluetoothClassic.isDeviceConnected(deviceAddress);
        if (alreadyConnected) {
          await RNBluetoothClassic.disconnectFromDevice(deviceAddress);
        }
      } catch (e) {}

      const connectedDevice = await RNBluetoothClassic.connectToDevice(deviceAddress);
      connectedDeviceRef.current = connectedDevice;
      setConnected(true);
      setConnecting(false);

      readIntervalRef.current = setInterval(async () => {
        try {
          const available = await connectedDevice.available();
          if (available > 0) {
            const data = await connectedDevice.read();
            if (data) processIncomingData(data);
          }
        } catch (readErr) {
          console.log("Read error:", readErr);
          setConnected(false);
          clearInterval(readIntervalRef.current);
        }
      }, 1);

    } catch (error) {
      setConnected(false);
      setConnecting(false);
      Alert.alert(
        "Connection Failed",
        `Could not connect to ${deviceName}.\n\nMake sure the device is:\n• Powered on\n• Within range\n• Paired in Android Settings`,
        [
          { text: "Retry", onPress: connectClassic },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const processIncomingData = (rawData) => {
    dataBufferRef.current += rawData;
    const lines = dataBufferRef.current.split(/[\r\n]+/);
    dataBufferRef.current = lines.pop() || "";

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(/[+-]?(\d+\.?\d*)/);
      if (match) {
        const parsed = parseFloat(match[0]);
        if (!isNaN(parsed)) {
          setGrossWeight(parsed);
        }
      }
    });
  };

  // ── TARE ──
  const captureTare = () => {
    if (grossWeight === 0) {
      Alert.alert("No Weight", "Place the container on the scale first.");
      return;
    }
    setTareWeight(grossWeight);
    setTareCaptured(true);
  };

  const clearTare = () => {
    setTareWeight(0);
    setTareCaptured(false);
  };

  const loadItems = async () => {
    const data = await AsyncStorage.getItem("items");
    if (data) setItems(JSON.parse(data));
  };

  const loadRecords = async () => {
    const data = await AsyncStorage.getItem("records");
    if (data) setRecords(JSON.parse(data));
  };

  const saveItems = async (list) => {
    setItems(list);
    await AsyncStorage.setItem("items", JSON.stringify(list));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    const updated = [...items, newItem.trim()];
    saveItems(updated);
    setNewItem("");
  };

  const deleteItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    saveItems(updated);
    if (selectedItem === items[index]) setSelectedItem(null);
  };

  const saveWeight = async () => {
    if (!selectedItem) return;
    const record = {
      id: Date.now().toString(),
      item: selectedItem,
      grossWeight: grossWeight.toFixed(3),
      tareWeight: tareWeight.toFixed(3),
      netWeight: netWeight.toFixed(3),
      // keep weight field for backward compat with server
      weight: netWeight.toFixed(3),
      device: deviceAddress,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const updated = [record, ...records];
    setRecords(updated);
    await AsyncStorage.setItem("records", JSON.stringify(updated));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const deleteRecord = async (id) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    await AsyncStorage.setItem("records", JSON.stringify(updated));
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await cleanup();
    navigation.replace("Login");
  };

  const getCurrentDate = () => {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();

    return `${day}-${month}-${year}`;
  };

  const formatPrintData = (records) => {
    if (!records || records.length === 0) return "";

    const WIDTH = 32;

    // helper: fixed width text
    const fix = (text, len) => {
      return String(text || "")
        .substring(0, len)
        .padEnd(len, " ");
    };

    // helper: center text
    const center = (text) => {
      const space = Math.max(0, Math.floor((WIDTH - text.length) / 2));
      return " ".repeat(space) + text + "\n";
    };

    // Sort by time (important)
    const sorted = [...records].sort((a, b) => {
      return new Date(`1970/01/01 ${a.time}`) - new Date(`1970/01/01 ${b.time}`);
    });

    const endTime = sorted[0]?.time || "--";
    const startTime = sorted[sorted.length - 1]?.time || "--";
    const device = sorted[0]?.device || "NA";

    let output = "";

    // Header
    output += center("WEIGHT REPORT");
    output += "-".repeat(WIDTH) + "\n";

    output += `Date: ${getCurrentDate()}\n`;
    output += fix("Machine:", 12) + fix("1", 20) + "\n";
    // output += fix("Device:", 12) + fix(device, 20) + "\n";
    output += fix("Start:", 12) + fix(startTime, 20) + "\n";
    output += fix("End:", 12) + fix(endTime, 20) + "\n";

    output += "-".repeat(WIDTH) + "\n";

    // Column widths (total = 32)
    // Sr(3) + Item(7) + Net(6) + Tare(6) + Gross(10) = 32
    output +=
      fix("Sr", 3) +
      fix("Item", 7) +
      fix("Net", 7) +
      fix("Tare", 7) +
      fix("Gross", 8) +
      "\n";

    output += "-".repeat(WIDTH) + "\n";

    let totalWeight = 0;

    sorted.forEach((r, index) => {
      const sr = fix(index + 1, 3);
      const item = fix(r.item, 7);
      const netVal = parseFloat(r.netWeight || r.weight || 0);
      const tareVal = r.tareWeight || "0";
      const grossVal = r.grossWeight || r.weight || "0";

      totalWeight += netVal;

      const net = fix(netVal.toFixed(3), 7);
      const tare = fix(tareVal, 7);
      const gross = fix(grossVal, 8);

      output += sr + item + net + tare + gross + "\n";
    });

    output += "-".repeat(WIDTH) + "\n";

    output += fix("Items:", 12) + fix(records.length, 20) + "\n";
    output += fix("Total Net:", 12) + fix(totalWeight.toFixed(3) + "kg", 20) + "\n";

    output += "-".repeat(WIDTH) + "\n\n\n";

    return output;
  };

  const printRecords = async () => {
    try {
      if (records.length === 0) {
        Alert.alert("No Data", "No records to print.");
        return;
      }
      if (!connected || !connectedDeviceRef.current) {
        Alert.alert("Not Connected", "Please connect to BT-01 first.");
        return;
      }
      let x = formatPrintData(records);
      await connectedDeviceRef.current.write("\r\n" + x + "\r\n");
      Alert.alert("Sent!", "Records transmitted to BT-01 successfully.");
    } catch (error) {
      console.log("Print/send error:", error);
      Alert.alert("Error", "Failed to send data over Bluetooth.");
    }
  };

  const syncToServer = async () => {
    try {
      if (records.length === 0) return;
      const response = await fetch(
        "https://tmmapi.9930i.com/sendWeighingScaleDataOnEmail",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: 1, data: records }),
        }
      );
      if (response.ok) {
        await printRecords();
        await AsyncStorage.removeItem("records");
        setRecords([]);
      }
    } catch (error) {
      console.log("Sync error:", error);
    }
  };

  const CumulativeWeight = (product) => {
    const total = records.reduce((acc, item) => {
      if (item.item === product) return acc + parseFloat(item.netWeight || item.weight || 0);
      return acc;
    }, 0);
    return total.toFixed(1);
  };

  const shortDeviceId =
    deviceAddress.length > 17
      ? deviceAddress.substring(0, 17) + "…"
      : deviceAddress;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4ff" />
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
              <Icon name="scale-balance" size={20} color="#fff" />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.headerTitle}>Emrald Meezan</Text>
            <Text style={styles.headerSub}>Bluetooth Weighing System</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={connectClassic}
            disabled={connecting}
            style={styles.iconBtn}
          >
            <Icon
              name={connecting ? "bluetooth-settings" : connected ? "bluetooth-connect" : "bluetooth-off"}
              size={19}
              color={connecting ? "#f59e0b" : connected ? "#22c55e" : "#94a3b8"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowLogoutModal(true)}
            style={[styles.iconBtn, styles.logoutIconBtn]}
          >
            <Icon name="logout" size={19} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* DEVICE BADGE */}
      <View style={styles.deviceBadge}>
        <Icon name="bluetooth" size={13} color={connected ? "#22c55e" : "#94a3b8"} />
        <Text style={styles.deviceBadgeText}>{deviceName} · {shortDeviceId}</Text>
        <View style={[styles.connDot, connected && styles.connDotActive]} />
        <Text style={[styles.connLabel, connected && styles.connLabelActive]}>
          {connecting ? "Connecting…" : connected ? "Connected" : "Disconnected"}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* DROPDOWN + TOTAL */}
        <View style={{ marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ width: "48%" }}>
            <Dropdown
              style={{ height: 40, borderRadius: 10, backgroundColor: "#fff", paddingHorizontal: 10 }}
              containerStyle={styles.dropdownContainer}
              itemTextStyle={styles.itemText}
              selectedTextStyle={styles.selectedText}
              placeholderStyle={styles.placeholder}
              data={items.map((item) => ({ label: item, value: item }))}
              labelField="label"
              valueField="value"
              placeholder="Select Item"
              value={selectedItem}
              onChange={(item) => setSelectedItem(item.value)}
            />
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total {selectedItem || "Item"}</Text>
            <Text style={styles.totalValue}>
              {selectedItem ? `${CumulativeWeight(selectedItem)} kg` : "--"}
            </Text>
          </View>
        </View>

        {/* ── WEIGHT CARD ── */}
        <View style={styles.weightCard}>

          {/* TOP ROW */}
          <View style={styles.weightCardTop}>
            <Text style={styles.weightLabel}>Weight Display</Text>
            <View style={styles.livePill}>
              <View style={[styles.liveDot, connected && styles.liveDotActive]} />
              <Text style={[styles.liveText, connected && styles.liveTextActive]}>
                {connecting ? "Connecting…" : connected ? "Live" : "Offline"}
              </Text>
            </View>
          </View>

          {/* GROSS / TARE / NET ROW */}
          <View style={styles.weightStatsRow}>

            {/* GROSS */}
            <View style={styles.weightStatBox}>
              <Text style={styles.weightStatBoxLabel}>GROSS</Text>
              <Text style={styles.weightStatBoxValue}>{grossWeight.toFixed(3)}</Text>
              <Text style={styles.weightStatBoxUnit}>kg</Text>
            </View>

            <View style={styles.weightStatDividerV} />

            {/* TARE */}
            <View style={styles.weightStatBox}>
              <Text style={styles.weightStatBoxLabel}>TARE</Text>
              <Text style={[styles.weightStatBoxValue, { color: "#f59e0b" }]}>
                {tareWeight.toFixed(3)}
              </Text>
              <Text style={styles.weightStatBoxUnit}>kg</Text>
            </View>

            <View style={styles.weightStatDividerV} />

            {/* NET */}
            <View style={styles.weightStatBox}>
              <Text style={styles.weightStatBoxLabel}>NET</Text>
              <Text style={[styles.weightStatBoxValue, { color: "#16a34a" }]}>
                {netWeight.toFixed(3)}
              </Text>
              <Text style={styles.weightStatBoxUnit}>kg</Text>
            </View>

          </View>

          {/* BIG NET DISPLAY */}
          <Text style={styles.weightValue}>{netWeight.toFixed(3)}</Text>
          <Text style={styles.weightUnit}>net kilograms</Text>

          {/* TARE BUTTONS */}
          <View style={styles.tareRow}>
            <TouchableOpacity
              onPress={captureTare}
              activeOpacity={0.85}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={tareCaptured ? ["#f59e0b", "#d97706"] : ["#1d4ed8", "#2563eb"]}
                style={styles.tareBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="scale" size={16} color="#fff" />
                <Text style={styles.tareBtnText}>
                  {tareCaptured ? `Tare: ${tareWeight.toFixed(3)} kg` : "Set Tare"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {tareCaptured && (
              <TouchableOpacity onPress={clearTare} style={styles.clearTareBtn}>
                <Icon name="close-circle" size={16} color="#ef4444" />
                <Text style={styles.clearTareBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* SAVE BUTTON */}
          <View style={styles.weightCardBottom}>
            <View style={styles.weightStat}>
              <Icon name="clock-outline" size={13} color="#94a3b8" />
              <Text style={styles.weightStatText}>Real-time</Text>
            </View>
            <View style={styles.weightStatDivider} />
            <TouchableOpacity onPress={saveWeight} disabled={!selectedItem} activeOpacity={0.85}>
              <LinearGradient
                colors={
                  saveSuccess
                    ? ["#16a34a", "#15803d"]
                    : selectedItem
                    ? ["#1d4ed8", "#2563eb", "#3b82f6"]
                    : ["#e2e8f0", "#e2e8f0"]
                }
                style={styles.saveBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon
                  name={saveSuccess ? "check-circle" : "content-save-outline"}
                  size={20}
                  color={selectedItem ? "#fff" : "#94a3b8"}
                />
                <Text style={[styles.saveBtnText, !selectedItem && styles.saveBtnTextDisabled]}>
                  {saveSuccess ? "Saved!" : "Save Weight"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </View>

        {!selectedItem && (
          <Text style={styles.saveHint}>Select an item above to enable saving</Text>
        )}

        {/* ADD ITEM */}
        <View style={[styles.addRow, inputFocused && styles.addRowFocused]}>
          <Icon
            name="tag-plus-outline"
            size={18}
            color={inputFocused ? "#2563eb" : "#94a3b8"}
            style={{ marginLeft: 12 }}
          />
          <TextInput
            placeholder="Add item name…"
            placeholderTextColor="#cbd5e1"
            style={styles.addInput}
            value={newItem}
            onChangeText={setNewItem}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onSubmitEditing={addItem}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={addItem} style={styles.addBtn}>
            <LinearGradient
              colors={["#16a34a", "#15803d"]}
              style={styles.addBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* RECORDS HEADER */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>SAVED MEASUREMENTS</Text>
          <View style={styles.recordCountBadge}>
            <Text style={styles.recordCountText}>{records.length}</Text>
          </View>
        </View>

        {/* UPLOAD + PRINT */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtnWrap} onPress={syncToServer}>
            <LinearGradient
              colors={["#2563eb", "#1e40af"]}
              style={styles.actionBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="cloud-upload-outline" size={19} color="#fff" />
              <Text style={styles.actionBtnText}>Upload Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* RECORDS LIST */}
        {records.length === 0 ? (
          <View style={styles.emptyRecords}>
            <Icon name="scale-off" size={28} color="#cbd5e1" />
            <Text style={styles.emptyRecordsText}>No measurements saved yet</Text>
          </View>
        ) : (
          records.map((record) => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordIconWrap}>
                <LinearGradient colors={["#eff6ff", "#dbeafe"]} style={styles.recordIconBg}>
                  <Icon name="scale" size={18} color="#2563eb" />
                </LinearGradient>
              </View>

              <View style={styles.recordInfo}>
                <Text style={styles.recordItem}>{record.item}</Text>
                {/* Gross / Tare / Net mini row */}
                <View style={styles.recordWeightRow}>
                  <Text style={styles.recordWeightTag}>
                    G <Text style={styles.recordWeightTagVal}>{record.grossWeight || record.weight} kg</Text>
                  </Text>
                  <Text style={styles.recordWeightTagDivider}>·</Text>
                  <Text style={[styles.recordWeightTag, { color: "#f59e0b" }]}>
                    T <Text style={styles.recordWeightTagVal}>{record.tareWeight || "0.000"} kg</Text>
                  </Text>
                  <Text style={styles.recordWeightTagDivider}>·</Text>
                  <Text style={[styles.recordWeightTag, { color: "#16a34a" }]}>
                    N <Text style={styles.recordWeightTagVal}>{record.netWeight || record.weight} kg</Text>
                  </Text>
                </View>
                {record.time && (
                  <Text style={styles.recordTime}>
                    <Icon name="clock-outline" size={10} color="#94a3b8" /> {record.time}
                  </Text>
                )}
              </View>

              <TouchableOpacity onPress={() => deleteRecord(record.id)} style={styles.deleteBtn}>
                <Icon name="trash-can-outline" size={15} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* LOGOUT MODAL */}
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
              You'll be disconnected from the Weighing device and returned to the login screen.
            </Text>
            <View style={styles.modalDivider} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowLogoutModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtnWrap} activeOpacity={0.85}>
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

export default WeightScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4ff", paddingHorizontal: 20, paddingTop: 52 },
  decorCircleLarge: { position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "#dbeafe", opacity: 0.7 },
  decorCircleSmall: { position: "absolute", bottom: 80, left: -60, width: 160, height: 160, borderRadius: 80, backgroundColor: "#eff6ff", opacity: 0.9 },
  scroll: { paddingBottom: 30 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoShadow: { borderRadius: 14, shadowColor: "#2563eb", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  logoGradient: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", letterSpacing: -0.4 },
  headerSub: { fontSize: 11, color: "#64748b", fontWeight: "500", marginTop: 1 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#eff6ff", borderWidth: 1.5, borderColor: "#bfdbfe", justifyContent: "center", alignItems: "center" },
  logoutIconBtn: { backgroundColor: "#fff1f2", borderColor: "#fecaca" },

  deviceBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0", gap: 6, shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  deviceBadgeText: { flex: 1, fontSize: 12, color: "#475569", fontWeight: "500" },
  connDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#cbd5e1" },
  connDotActive: { backgroundColor: "#22c55e" },
  connLabel: { fontSize: 11, fontWeight: "700", color: "#94a3b8" },
  connLabelActive: { color: "#16a34a" },

  totalCard: { backgroundColor: "#ffffff", padding: 10, borderRadius: 12, elevation: 3, alignItems: "center", flexDirection: "row", maxWidth: 200 },
  totalLabel: { fontSize: 14, color: "#64748b" },
  totalValue: { fontSize: 14, fontWeight: "bold", color: "#2563eb", marginLeft: 5 },

  /* Weight card */
  weightCard: { backgroundColor: "#fff", borderRadius: 22, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: "#e8f0fe", shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
  weightCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  weightLabel: { fontSize: 12, fontWeight: "700", color: "#94a3b8", letterSpacing: 0.8, textTransform: "uppercase" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#f1f5f9", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#cbd5e1" },
  liveDotActive: { backgroundColor: "#22c55e" },
  liveText: { fontSize: 11, fontWeight: "700", color: "#94a3b8" },
  liveTextActive: { color: "#16a34a" },

  /* Gross/Tare/Net row */
  weightStatsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "#f8fafc", borderRadius: 14, paddingVertical: 12, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  weightStatBox: { flex: 1, alignItems: "center" },
  weightStatBoxLabel: { fontSize: 10, fontWeight: "700", color: "#94a3b8", letterSpacing: 0.8, marginBottom: 4 },
  weightStatBoxValue: { fontSize: 20, fontWeight: "800", color: "#1d4ed8", letterSpacing: -0.5 },
  weightStatBoxUnit: { fontSize: 10, color: "#94a3b8", fontWeight: "600", marginTop: 2 },
  weightStatDividerV: { width: 1, height: 40, backgroundColor: "#e2e8f0" },

  weightValue: { fontSize: 52, fontWeight: "800", color: "#16a34a", letterSpacing: -2, textAlign: "center", marginVertical: 4 },
  weightUnit: { fontSize: 12, color: "#94a3b8", fontWeight: "500", textAlign: "center", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 },

  /* Tare buttons */
  tareRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  tareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11, borderRadius: 12 },
  tareBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  clearTareBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#fff1f2", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1.5, borderColor: "#fecaca" },
  clearTareBtnText: { fontSize: 13, fontWeight: "700", color: "#ef4444" },

  weightCardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  weightStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  weightStatText: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  weightStatDivider: { width: 1, height: 14, backgroundColor: "#e2e8f0" },

  saveBtn: { width: 180, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: "#2563eb", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 7, padding: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },
  saveBtnTextDisabled: { color: "#94a3b8" },
  saveHint: { fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 16, marginTop: 2 },

  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" },
  recordCountBadge: { backgroundColor: "#eff6ff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: "#bfdbfe" },
  recordCountText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },

  addRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, borderWidth: 1.5, borderColor: "#e2e8f0", overflow: "hidden", shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, marginBottom: 16 },
  addRowFocused: { borderColor: "#2563eb", shadowColor: "#2563eb", shadowOpacity: 0.15, elevation: 4 },
  addInput: { flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 14, color: "#0f172a", fontWeight: "500" },
  addBtn: { borderRadius: 0, overflow: "hidden" },
  addBtnGradient: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingVertical: 13 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  /* Action row (Upload + Print) */
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  actionBtnWrap: { flex: 1, borderRadius: 14, overflow: "hidden" },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  /* Record card */
  recordCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, borderWidth: 1.5, borderColor: "#e8f0fe", shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, gap: 12 },
  recordIconWrap: { borderRadius: 12, overflow: "hidden" },
  recordIconBg: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  recordInfo: { flex: 1 },
  recordItem: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  recordWeightRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3, flexWrap: "wrap" },
  recordWeightTag: { fontSize: 11, fontWeight: "700", color: "#1d4ed8" },
  recordWeightTagVal: { fontWeight: "600", color: "#334155" },
  recordWeightTagDivider: { fontSize: 11, color: "#cbd5e1" },
  recordTime: { fontSize: 11, color: "#94a3b8", fontWeight: "500" },
  deleteBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecaca", justifyContent: "center", alignItems: "center" },

  emptyRecords: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyRecordsText: { fontSize: 13, color: "#94a3b8", fontWeight: "500" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  modalCard: { backgroundColor: "#ffffff", borderRadius: 24, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 22, width: "100%", alignItems: "center", shadowColor: "#0f172a", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.18, shadowRadius: 32, elevation: 20 },
  modalIconCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#fff1f2", borderWidth: 1.5, borderColor: "#fecaca", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 8, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  modalDivider: { width: "100%", height: 1, backgroundColor: "#f1f5f9", marginBottom: 20 },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  cancelBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", justifyContent: "center", alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: "#475569" },
  logoutBtnWrap: { flex: 1, borderRadius: 14, shadowColor: "#ef4444", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  logoutBtn: { height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  logoutBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  dropdownContainer: { borderRadius: 12, backgroundColor: "#ffffff", elevation: 5 },
  itemText: { fontSize: 13, color: "#1e293b", paddingVertical: 0 },
  selectedText: { fontSize: 15, color: "#2563eb", fontWeight: "600" },
  placeholder: { color: "#94a3b8", fontSize: 15 },
});