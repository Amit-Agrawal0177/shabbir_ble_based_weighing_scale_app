import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  StatusBar,
  Modal,
  ScrollView,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { BleManager } from "react-native-ble-plx";
import base64 from "react-native-base64";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";

import { Dropdown } from "react-native-element-dropdown";

const manager = new BleManager();

const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

const WeightScreen = ({ route, navigation }) => {
  const { device } = route.params;
  const [deviceId] = useState(device.id);

  const [weight, setWeight] = useState("0.000");
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState("");
  const [records, setRecords] = useState([]);
  const [connected, setConnected] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadItems();
    loadRecords();
    connectBLE();
  }, []);

  const connectBLE = async () => {
    try {
      const dev = await manager.connectToDevice(deviceId);
      await dev.discoverAllServicesAndCharacteristics();
      setConnected(true);

      const services = await dev.services();
      console.log("📋 Available services:", services.map(s => s.uuid));

      const SYSTEM_SERVICES = [
        "00001800-0000-1000-8000-00805f9b34fb",
        "00001801-0000-1000-8000-00805f9b34fb",
      ];

      let notifyChar = null;
      let notifyServiceUUID = null;

      for (const service of services) {
        if (SYSTEM_SERVICES.includes(service.uuid.toLowerCase())) {
          console.log(`⏭️ Skipping system service: ${service.uuid}`);
          continue;
        }

        const chars = await dev.characteristicsForService(service.uuid);
        console.log(`Service ${service.uuid} characteristics:`);
        chars.forEach(c =>
          console.log(`  CHAR: ${c.uuid} | notify:${c.isNotifiable} | indicate:${c.isIndicatable} | read:${c.isReadable}`)
        );

        const found = chars.find(c => c.isNotifiable || c.isIndicatable);
        if (found) {
          notifyChar = found;
          notifyServiceUUID = service.uuid;
          console.log(`✅ Using service: ${service.uuid}`);
          console.log(`✅ Using char:    ${found.uuid}`);
          break;
        }
      }

      if (!notifyChar) {
        console.log("❌ No notifiable characteristic found in app services");
        setConnected(false);
        return;
      }

      dev.monitorCharacteristicForService(
        notifyServiceUUID,
        notifyChar.uuid,
        (error, characteristic) => {
          if (error) {
            console.log("BLE Error:", error);
            setConnected(false);
            return;
          }
          if (characteristic?.value) {
            const decoded = base64.decode(characteristic.value);
            console.log("📦 Data received:", decoded);
            setWeight(decoded.trim());
          }
        }
      );

    } catch (error) {
      console.log("Connection Error:", error);
      setConnected(false);
    }
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
      weight: weight,
      device: deviceId,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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

  const handleLogout = () => {
    setShowLogoutModal(false);
    manager.stopDeviceScan();
    navigation.replace("Login");
  };

  const syncToServer = async () => {
    try {
      if (records.length === 0) return;

      const response = await fetch("https://tmmapi.9930i.com/sendWeighingScaleDataOnEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId : 1,
          data: records,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        await AsyncStorage.removeItem("records");
        setRecords([]);
      }

    } catch (error) {
      console.log(error);
    }
  };

  const CumulativeWeight = (product) => {

    const totalWeight = records.reduce((acc, item) => {

      if (item.item === product) {
        return acc + parseFloat(item.weight);
      }

      return acc;

    }, 0);

    return totalWeight.toFixed(1);

  };

  const shortDeviceId = deviceId.length > 17 ? deviceId.substring(0, 17) + "…" : deviceId;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4ff" />

      {/* Decorative blobs */}
      <View style={styles.decorCircleLarge} />
      <View style={styles.decorCircleSmall} />

      {/* ── HEADER ── */}
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
            onPress={connectBLE}
            style={styles.iconBtn}
          >
            <Icon
              name={connected ? "bluetooth-connect" : "bluetooth-off"}
              size={19}
              color={connected ? "#22c55e" : "#94a3b8"}
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

      {/* ── DEVICE BADGE ── */}
      <View style={styles.deviceBadge}>
        <Icon name="bluetooth" size={13} color={connected ? "#22c55e" : "#94a3b8"} />
        <Text style={styles.deviceBadgeText}>{shortDeviceId}</Text>
        <View style={[styles.connDot, connected && styles.connDotActive]} />
        <Text style={[styles.connLabel, connected && styles.connLabelActive]}>
          {connected ? "Connected" : "Disconnected"}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={{ marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ width: "48%" }}>
            <Dropdown
              style={{
                height: 40,
                borderRadius: 10,
                backgroundColor: "#fff",
                paddingHorizontal: 10
              }}
              containerStyle={styles.dropdownContainer}
              itemTextStyle={styles.itemText}
              selectedTextStyle={styles.selectedText}
              placeholderStyle={styles.placeholder}
              data={items.map(item => ({
                label: item,
                value: item
              }))}
              labelField="label"
              valueField="value"
              placeholder="Select Item"
              value={selectedItem}
              onChange={item => setSelectedItem(item.value)}
            />
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>
              Total {selectedItem || "Item"}
            </Text>

            <Text style={styles.totalValue}>
              {selectedItem ? `${CumulativeWeight(selectedItem)} kg` : "--"}
            </Text>
          </View>

        </View>

        {/* ── WEIGHT CARD ── */}
        <View style={styles.weightCard}>
          <View style={styles.weightCardTop}>
            <Text style={styles.weightLabel}>Live Weight</Text>
            <View style={styles.livePill}>
              <View style={[styles.liveDot, connected && styles.liveDotActive]} />
              <Text style={[styles.liveText, connected && styles.liveTextActive]}>
                {connected ? "Live" : "Offline"}
              </Text>
            </View>
          </View>

          <Text style={styles.weightValue}>{weight}</Text>
          <Text style={styles.weightUnit}>kilograms</Text>

          <View style={styles.weightCardBottom}>
            <View style={styles.weightStat}>
              <Icon name="clock-outline" size={13} color="#94a3b8" />
              <Text style={styles.weightStatText}>Real-time</Text>
            </View>
            {/* <View style={styles.weightStatDivider} />
            <View style={styles.weightStat}>
              <Icon name="database-outline" size={13} color="#94a3b8" />
              <Text style={styles.weightStatText}>{records.length} saved</Text>
            </View> */}

            <View style={styles.weightStatDivider} />

            <TouchableOpacity onPress={saveWeight} disabled={!selectedItem} activeOpacity={0.85}>
              <LinearGradient
                colors={saveSuccess ? ["#16a34a", "#15803d"] : selectedItem ? ["#1d4ed8", "#2563eb", "#3b82f6"] : ["#e2e8f0", "#e2e8f0"]}
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

        {/* ── SELECT ITEM ── */}
        {/* <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>SELECT ITEM</Text>
          {selectedItem && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>{selectedItem}</Text>
            </View>
          )}
        </View> */}

        {/* <FlatList
          horizontal
          data={items}
          keyExtractor={(item, index) => index.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[styles.itemChip, selectedItem === item && styles.itemChipSelected]}
              onPress={() => setSelectedItem(item)}
              onLongPress={() => deleteItem(index)}
              activeOpacity={0.75}
            >
              {selectedItem === item && (
                <Icon name="check-circle" size={14} color="#fff" />
              )}
              <Text style={[styles.itemChipText, selectedItem === item && styles.itemChipTextSelected]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.noItemsWrap}>
              <Icon name="tag-outline" size={16} color="#cbd5e1" />
              <Text style={styles.noItemsText}>No items yet — add one below</Text>
            </View>
          }
        /> */}
        {!selectedItem && (
          <Text style={styles.saveHint}>Select an item above to enable saving</Text>
        )}

        {/* ── ADD ITEM ── */}
        <View style={[styles.addRow, inputFocused && styles.addRowFocused]}>
          <Icon name="tag-plus-outline" size={18} color={inputFocused ? "#2563eb" : "#94a3b8"} style={{ marginLeft: 12 }} />
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
        {/* <Text style={styles.hintText}>Long-press an item to remove it</Text> */}

        {/* ── SAVE WEIGHT ── */}




        {/* ── RECORDS ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>SAVED MEASUREMENTS</Text>
          <View style={styles.recordCountBadge}>
            <Text style={styles.recordCountText}>{records.length}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.uploadWrapper}>

          <LinearGradient
            colors={["#2563eb", "#1e40af"]}
            style={styles.uploadCard}
          >
            <TouchableOpacity style={styles.button} onPress={syncToServer}>
              <Text style={styles.buttonText}>Upload Now</Text>
            </TouchableOpacity>

          </LinearGradient>

        </TouchableOpacity>

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
                {record.time && (
                  <Text style={styles.recordTime}>
                    <Icon name="clock-outline" size={10} color="#94a3b8" /> {record.time}
                  </Text>
                )}
              </View>
              <View style={styles.recordRight}>
                <Text style={styles.recordWeight}>{record.weight} kg</Text>
                <TouchableOpacity onPress={() => deleteRecord(record.id)} style={styles.deleteBtn}>
                  <Icon name="trash-can-outline" size={15} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── LOGOUT MODAL ── */}
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
              <TouchableOpacity
                onPress={() => setShowLogoutModal(false)}
                style={styles.cancelBtn}
              >
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
  container: {
    flex: 1,
    backgroundColor: "#f0f4ff",
    paddingHorizontal: 20,
    paddingTop: 52,
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
    bottom: 80,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#eff6ff",
    opacity: 0.9,
  },

  scroll: {
    paddingBottom: 30,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
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

  /* Device badge */
  deviceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  deviceBadgeText: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  connDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#cbd5e1",
  },
  connDotActive: {
    backgroundColor: "#22c55e",
  },
  connLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },
  connLabelActive: {
    color: "#16a34a",
  },

  totalCard: {
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 12,
    // marginTop: 10,
    elevation: 3,
    alignItems: "center",
    flexDirection: 'row',
    alignItems: "center",
    maxWidth: 200
  },

  totalLabel: {
    fontSize: 14,
    color: "#64748b"
  },

  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2563eb",
    marginLeft: 5
  },
  /* Weight card */
  weightCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 14,
    marginBottom: 22,
    borderWidth: 1.5,
    borderColor: "#e8f0fe",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  weightCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  weightLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#cbd5e1",
  },
  liveDotActive: {
    backgroundColor: "#22c55e",
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },
  liveTextActive: {
    color: "#16a34a",
  },
  weightValue: {
    fontSize: 58,
    fontWeight: "800",
    color: "#1d4ed8",
    letterSpacing: -2,
    textAlign: "center",
    marginVertical: 4,
  },
  weightUnit: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  weightCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  weightStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  weightStatText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  weightStatDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#e2e8f0",
  },

  /* Section row */
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  selectedBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
  },
  recordCountBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  recordCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },

  /* Item chips */
  itemChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemChipSelected: {
    backgroundColor: "#2563eb",
    borderColor: "#1d4ed8",
    shadowColor: "#2563eb",
    shadowOpacity: 0.3,
    elevation: 5,
  },
  itemChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  itemChipTextSelected: {
    color: "#fff",
  },
  noItemsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 10,
  },
  noItemsText: {
    fontSize: 13,
    color: "#cbd5e1",
    fontWeight: "500",
  },

  /* Add row */
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    // marginTop: 4,
    overflow: "hidden",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  addRowFocused: {
    borderColor: "#2563eb",
    shadowColor: "#2563eb",
    shadowOpacity: 0.15,
    elevation: 4,
  },
  addInput: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 10,
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },
  addBtn: {
    borderRadius: 0,
    overflow: "hidden",
  },
  addBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  hintText: {
    fontSize: 11,
    color: "#cbd5e1",
    marginTop: 5,
    marginBottom: 16,
    marginLeft: 2,
  },

  /* Save button */
  saveBtn: {
    // height: 52,
    width: 180,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    // marginBottom: 6,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 7,
    padding: 8
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  saveBtnTextDisabled: {
    color: "#94a3b8",
  },
  saveHint: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 2,
  },

  /* Record card */
  recordCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 5,
    borderWidth: 1.5,
    borderColor: "#e8f0fe",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  recordIconWrap: {
    borderRadius: 12,
    overflow: "hidden",
  },
  recordIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  recordInfo: {
    flex: 1,
  },
  recordItem: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  recordTime: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },
  recordRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  recordWeight: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyRecords: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 8,
  },
  emptyRecordsText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
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

  dropdownContainer: {
    borderRadius: 12,
    backgroundColor: "#ffffff",
    elevation: 5,
    // marginTop: 5
  },

  itemText: {
    fontSize: 13,
    color: "#1e293b",
    paddingVertical: 0,
  },

  selectedText: {
    fontSize: 15,
    color: "#2563eb",
    fontWeight: "600"
  },

  placeholder: {
    color: "#94a3b8",
    fontSize: 15
  },
  uploadWrapper: {
    marginTop: 5,
    marginBottom: 10
  },

  uploadCard: {
    borderRadius: 18,
    padding: 12,
    // elevation: 6
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    // marginBottom: 15
  },

  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 50,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },

  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold"
  },

  subtitle: {
    color: "#dbeafe",
    fontSize: 13,
    marginTop: 3
  },

  button: {
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center"
  },

  buttonText: {
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: 15
  }
});