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
  ActivityIndicator,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import { Dropdown } from "react-native-element-dropdown";
import { pick, types } from '@react-native-documents/picker';

const BASE_URL = "https://bt.weightify.vendtrails.com";

const WeightScreen = ({ route, navigation }) => {
  const { device } = route.params;
  const deviceAddress = device.address || device.id;
  const deviceName = device.name || deviceAddress;

  // ── Auth / Store ──
  const [authToken, setAuthToken] = useState("");
  const [storeId, setStoreId] = useState("");

  // ── BT ──
  const [grossWeight, setGrossWeight] = useState(0);
  const [tareWeight, setTareWeight] = useState(0);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [tareCaptured, setTareCaptured] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Items dropdown ──
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); // { id, item_name, item_code }
  const [loadingItems, setLoadingItems] = useState(false);

  // ── Add Item modal ──
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCode, setNewItemCode] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  // ── Scrap users dropdown ──
  const [scrapUsers, setScrapUsers] = useState([]);
  const [selectedScrapUser, setSelectedScrapUser] = useState(null); // { id, user_name, user_email }
  const [loadingScrapUsers, setLoadingScrapUsers] = useState(false);

  // ── Add Scrap User modal ──
  const [showAddScrapModal, setShowAddScrapModal] = useState(false);
  const [newScrapName, setNewScrapName] = useState("");
  const [newScrapEmail, setNewScrapEmail] = useState("");
  const [addingScrap, setAddingScrap] = useState(false);

  // ── Records ──
  const [records, setRecords] = useState([]);

  // ── Upload modal (vehicle) ──
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [uploading, setUploading] = useState(false);

  // ── Logout modal ──
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const connectedDeviceRef = useRef(null);
  const readIntervalRef = useRef(null);
  const dataBufferRef = useRef("");

  const netWeight = Math.max(0, grossWeight - tareWeight);

  // ─────────────────────────────────────────────
  useEffect(() => {
    loadUserData();
    loadRecords();
    connectClassic();
    return () => { cleanup(); };
  }, []);

  // Load token + store_id from AsyncStorage
  const loadUserData = async () => {
    try {
      const saved = await AsyncStorage.getItem("userDetails");
      if (saved) {
        const user = JSON.parse(saved);
        const token = user.access_token || "";
        const sid = String(user.store_id || "");
        setAuthToken(token);
        setStoreId(sid);
        fetchItems(token, sid);
        fetchScrapUsers(token, sid);
      }
    } catch (e) {
      console.log("loadUserData error:", e);
    }
  };

  const handleExcelBulkUpload = async () => {
    try {
      // Pick the document using the new library syntax
      const response = await pick({
        type: [types.xlsx],
      });

      // The new picker returns an array of selections
      if (!response || response.length === 0) return;
      const pickedFile = response[0];

      const formData = new FormData();
      formData.append("store_id", storeId);
      formData.append("file", {
        uri: pickedFile.uri,
        name: pickedFile.name || "Item_Report.xlsx",
        type: pickedFile.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      console.log("Uploading spreadsheet bulk data...");
      const fetchResponse = await fetch(`${BASE_URL}/item/excelBulkUpload`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "multipart/form-data",
          "Authorization": authToken,
        },
        body: formData,
      });

      const result = await fetchResponse.json();
      if (fetchResponse.ok && result.statusCode === 0) {
        Alert.alert("Success", "Excel inventory items updated successfully!");
        fetchItems(authToken, storeId);
      } else {
        Alert.alert("Upload Failure", result.msg || "Failed to process bulk sheets.");
      }
    } catch (err) {
      // Check cancellation using the new library's properties
      if (err.code === 'DOCUMENT_PICKER_CANCELED') {
        console.log("User cancelled document selector dialog.");
      } else {
        Alert.alert("System Error", "An issue occurred processing the requested file.");
      }
    }
  };

  // ── API: fetch items list ──
  const fetchItems = async (token, sid) => {
    setLoadingItems(true);
    try {
      const res = await fetch(`${BASE_URL}/item/listOfItems`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ is_active: "Y", store_id: sid }),
      }).then((r) => r.json());

      if (res.statusCode === 0) {
        setItems(res.op || []);
      }
    } catch (e) {
      console.log("fetchItems error:", e);
    } finally {
      setLoadingItems(false);
    }
  };

  // ── API: fetch scrap users list ──
  const fetchScrapUsers = async (token, sid) => {
    setLoadingScrapUsers(true);
    try {
      const res = await fetch(`${BASE_URL}/scrapUser/listOfScrapUser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ is_active: "Y", store_id: sid }),
      }).then((r) => r.json());

      if (res.statusCode === 0) {
        setScrapUsers(res.op || []);
      }
    } catch (e) {
      console.log("fetchScrapUsers error:", e);
    } finally {
      setLoadingScrapUsers(false);
    }
  };

  // ── API: add item ──
  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemCode.trim()) {
      Alert.alert("Missing Fields", "Please enter both item name and item code.");
      return;
    }
    setAddingItem(true);
    try {
      const res = await fetch(`${BASE_URL}/item/insertItems`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: authToken,
        },
        body: JSON.stringify({
          item_name: newItemName.trim(),
          item_code: newItemCode.trim(),
          store_id: storeId,
        }),
      }).then((r) => r.json());

      if (res.statusCode === 0) {
        setNewItemName("");
        setNewItemCode("");
        setShowAddItemModal(false);
        fetchItems(authToken, storeId);
      } else {
        Alert.alert("Error", res.msg || "Failed to add item.");
      }
    } catch (e) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setAddingItem(false);
    }
  };

  // ── API: add scrap user ──
  const handleAddScrapUser = async () => {
    if (!newScrapName.trim() || !newScrapEmail.trim()) {
      Alert.alert("Missing Fields", "Please enter both name and email.");
      return;
    }
    setAddingScrap(true);
    try {
      const res = await fetch(`${BASE_URL}/scrapUser/insertScrapUserDetails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: authToken,
        },
        body: JSON.stringify({
          store_id: storeId,
          user_name: newScrapName.trim(),
          user_email: newScrapEmail.trim(),
        }),
      }).then((r) => r.json());

      if (res.statusCode === 0) {
        setNewScrapName("");
        setNewScrapEmail("");
        setShowAddScrapModal(false);
        fetchScrapUsers(authToken, storeId);
      } else {
        Alert.alert("Error", res.msg || "Failed to add scrap department.");
      }
    } catch (e) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setAddingScrap(false);
    }
  };

  // ── API: upload bill ──
  const handleUpload = async () => {
    if (!vehicleNumber.trim()) {
      Alert.alert("Missing", "Please enter a vehicle number.");
      return;
    }
    if (!selectedScrapUser) {
      Alert.alert("Missing", "Please select a scrap department.");
      return;
    }
    if (records.length === 0) {
      Alert.alert("No Data", "No records to upload.");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`${BASE_URL}/bill/insertBills`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: authToken,
        },
        body: JSON.stringify({
          store_id: storeId,
          item_json: JSON.stringify(records),
          vehicle_number: vehicleNumber.trim(),
          scrap_user_id: String(selectedScrapUser.id),
        }),
      }).then((r) => r.json());

      if (res.statusCode === 0) {
        await AsyncStorage.removeItem("records");
        setRecords([]);
        setVehicleNumber("");
        setShowUploadModal(false);
        Alert.alert("Success", "Records uploaded successfully!");
      } else {
        Alert.alert("Upload Failed", res.msg || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── BT Helpers ──
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
    } catch (e) {}
  };

  const connectClassic = async () => {
    try {
      setConnecting(true);
      setConnected(false);
      try {
        const alreadyConnected = await RNBluetoothClassic.isDeviceConnected(deviceAddress);
        if (alreadyConnected) await RNBluetoothClassic.disconnectFromDevice(deviceAddress);
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
          setConnected(false);
          clearInterval(readIntervalRef.current);
        }
      }, 1);
    } catch (error) {
      setConnected(false);
      setConnecting(false);
      Alert.alert(
        "Connection Failed",
        `Could not connect to ${deviceName}.`,
        [{ text: "Retry", onPress: connectClassic }, { text: "Cancel", style: "cancel" }]
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
        if (!isNaN(parsed)) setGrossWeight(parsed);
      }
    });
  };

  const captureTare = () => {
    if (grossWeight === 0) { Alert.alert("No Weight", "Place the container on the scale first."); return; }
    setTareWeight(grossWeight);
    setTareCaptured(true);
  };

  const clearTare = () => { setTareWeight(0); setTareCaptured(false); };

  const loadRecords = async () => {
    const data = await AsyncStorage.getItem("records");
    if (data) setRecords(JSON.parse(data));
  };

  const saveWeight = async () => {
    if (!selectedItem) return;
    const record = {
      id: Date.now().toString(),
      item: selectedItem.item_name,
      item_id: selectedItem.id,
      item_code: selectedItem.item_code,
      grossWeight: grossWeight.toFixed(3),
      tareWeight: tareWeight.toFixed(3),
      netWeight: netWeight.toFixed(3),
      weight: netWeight.toFixed(3),
      device: deviceAddress,
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

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await cleanup();
    navigation.replace("Login");
  };

  const CumulativeWeight = (itemName) => {
    const total = records.reduce((acc, r) => {
      if (r.item === itemName) return acc + parseFloat(r.netWeight || r.weight || 0);
      return acc;
    }, 0);
    return total.toFixed(1);
  };

  const shortDeviceId = deviceAddress.length > 17 ? deviceAddress.substring(0, 17) + "…" : deviceAddress;

  // Dropdown data
  const itemDropdownData = items.map((i) => ({
    label: `${i.item_name} (${i.item_code})`,
    value: i.id,
    raw: i,
  }));

  const scrapDropdownData = scrapUsers.map((u) => ({
    label: u.user_name,
    value: u.id,
    raw: u,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4ff" />
      <View style={styles.decorCircleLarge} />
      <View style={styles.decorCircleSmall} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoShadow}>
            <LinearGradient colors={["#1d4ed8", "#2563eb"]} style={styles.logoGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Icon name="scale-balance" size={20} color="#fff" />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.headerTitle}>Emrald Meezan</Text>
            <Text style={styles.headerSub}>Bluetooth Weighing System</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={connectClassic} disabled={connecting} style={styles.iconBtn}>
            <Icon name={connecting ? "bluetooth-settings" : connected ? "bluetooth-connect" : "bluetooth-off"} size={19} color={connecting ? "#f59e0b" : connected ? "#22c55e" : "#94a3b8"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowLogoutModal(true)} style={[styles.iconBtn, styles.logoutIconBtn]}>
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

        {/* ── ITEM DROPDOWN ROW ── */}
        <View style={styles.dropRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dropLabel}>ITEM</Text>
            <View style={styles.dropWithBtn}>
              <Dropdown
                style={styles.dropdown}
                containerStyle={styles.dropdownContainer}
                itemTextStyle={styles.itemText}
                selectedTextStyle={styles.selectedText}
                placeholderStyle={styles.placeholder}
                data={itemDropdownData}
                labelField="label"
                valueField="value"
                placeholder={loadingItems ? "Loading…" : "Select Item"}
                value={selectedItem?.id ?? null}
                onChange={(item) => setSelectedItem(item.raw)}
                renderRightIcon={() =>
                  loadingItems ? <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 8 }} /> : undefined
                }
              />
              <TouchableOpacity onPress={() => setShowAddItemModal(true)} style={styles.addIconBtn}>
                <LinearGradient colors={["#16a34a", "#15803d"]} style={styles.addIconBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Icon name="plus" size={16} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {selectedItem && (
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>{selectedItem.item_name}</Text>
              <Text style={styles.totalValue}>{CumulativeWeight(selectedItem.item_name)} kg</Text>
            </View>
          )}
        </View>

        {/* ── SCRAP DEPARTMENT DROPDOWN ROW ── */}
        <View style={styles.dropRowSingle}>
          <Text style={styles.dropLabel}>SCRAP DEPARTMENT</Text>
          <View style={styles.dropWithBtn}>
            <Dropdown
              style={styles.dropdown}
              containerStyle={styles.dropdownContainer}
              itemTextStyle={styles.itemText}
              selectedTextStyle={styles.selectedText}
              placeholderStyle={styles.placeholder}
              data={scrapDropdownData}
              labelField="label"
              valueField="value"
              placeholder={loadingScrapUsers ? "Loading…" : "Select Department"}
              value={selectedScrapUser?.id ?? null}
              onChange={(item) => setSelectedScrapUser(item.raw)}
              renderRightIcon={() =>
                loadingScrapUsers ? <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 8 }} /> : undefined
              }
            />
            <TouchableOpacity onPress={() => setShowAddScrapModal(true)} style={styles.addIconBtn}>
              <LinearGradient colors={["#7c3aed", "#6d28d9"]} style={styles.addIconBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Icon name="plus" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── WEIGHT CARD ── */}
        <View style={styles.weightCard}>
          <View style={styles.weightCardTop}>
            <Text style={styles.weightLabel}>Weight Display</Text>
            <View style={styles.livePill}>
              <View style={[styles.liveDot, connected && styles.liveDotActive]} />
              <Text style={[styles.liveText, connected && styles.liveTextActive]}>
                {connecting ? "Connecting…" : connected ? "Live" : "Offline"}
              </Text>
            </View>
          </View>

          <View style={styles.weightStatsRow}>
            <View style={styles.weightStatBox}>
              <Text style={styles.weightStatBoxLabel}>GROSS</Text>
              <Text style={styles.weightStatBoxValue}>{grossWeight.toFixed(3)}</Text>
              <Text style={styles.weightStatBoxUnit}>kg</Text>
            </View>
            <View style={styles.weightStatDividerV} />
            <View style={styles.weightStatBox}>
              <Text style={styles.weightStatBoxLabel}>TARE</Text>
              <Text style={[styles.weightStatBoxValue, { color: "#f59e0b" }]}>{tareWeight.toFixed(3)}</Text>
              <Text style={styles.weightStatBoxUnit}>kg</Text>
            </View>
            <View style={styles.weightStatDividerV} />
            <View style={styles.weightStatBox}>
              <Text style={styles.weightStatBoxLabel}>NET</Text>
              <Text style={[styles.weightStatBoxValue, { color: "#16a34a" }]}>{netWeight.toFixed(3)}</Text>
              <Text style={styles.weightStatBoxUnit}>kg</Text>
            </View>
          </View>

          <Text style={styles.weightValue}>{netWeight.toFixed(3)}</Text>
          <Text style={styles.weightUnit}>net kilograms</Text>

          <View style={styles.tareRow}>
            <TouchableOpacity onPress={captureTare} activeOpacity={0.85} style={{ flex: 1 }}>
              <LinearGradient colors={tareCaptured ? ["#f59e0b", "#d97706"] : ["#1d4ed8", "#2563eb"]} style={styles.tareBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Icon name="scale" size={16} color="#fff" />
                <Text style={styles.tareBtnText}>{tareCaptured ? `Tare: ${tareWeight.toFixed(3)} kg` : "Set Tare"}</Text>
              </LinearGradient>
            </TouchableOpacity>
            {tareCaptured && (
              <TouchableOpacity onPress={clearTare} style={styles.clearTareBtn}>
                <Icon name="close-circle" size={16} color="#ef4444" />
                <Text style={styles.clearTareBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.weightCardBottom}>
            <View style={styles.weightStat}>
              <Icon name="clock-outline" size={13} color="#94a3b8" />
              <Text style={styles.weightStatText}>Real-time</Text>
            </View>
            <View style={styles.weightStatDivider} />
            <TouchableOpacity onPress={saveWeight} disabled={!selectedItem} activeOpacity={0.85}>
              <LinearGradient
                colors={saveSuccess ? ["#16a34a", "#15803d"] : selectedItem ? ["#1d4ed8", "#2563eb", "#3b82f6"] : ["#e2e8f0", "#e2e8f0"]}
                style={styles.saveBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name={saveSuccess ? "check-circle" : "content-save-outline"} size={20} color={selectedItem ? "#fff" : "#94a3b8"} />
                <Text style={[styles.saveBtnText, !selectedItem && styles.saveBtnTextDisabled]}>
                  {saveSuccess ? "Saved!" : "Save Weight"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {!selectedItem && <Text style={styles.saveHint}>Select an item above to enable saving</Text>}

        {/* RECORDS HEADER + UPLOAD */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>SAVED MEASUREMENTS</Text>
          <View style={styles.recordCountBadge}>
            <Text style={styles.recordCountText}>{records.length}</Text>
          </View>
        </View>


        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtnWrap} onPress={() => setShowUploadModal(true)}>
            <LinearGradient colors={["#2563eb", "#1e40af"]} style={styles.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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
                <View style={styles.recordWeightRow}>
                  <Text style={styles.recordWeightTag}>G <Text style={styles.recordWeightTagVal}>{record.grossWeight || record.weight} kg</Text></Text>
                  <Text style={styles.recordWeightTagDivider}>·</Text>
                  <Text style={[styles.recordWeightTag, { color: "#f59e0b" }]}>T <Text style={styles.recordWeightTagVal}>{record.tareWeight || "0.000"} kg</Text></Text>
                  <Text style={styles.recordWeightTagDivider}>·</Text>
                  <Text style={[styles.recordWeightTag, { color: "#16a34a" }]}>N <Text style={styles.recordWeightTagVal}>{record.netWeight || record.weight} kg</Text></Text>
                </View>
                {record.time && <Text style={styles.recordTime}><Icon name="clock-outline" size={10} color="#94a3b8" /> {record.time}</Text>}
              </View>
              <TouchableOpacity onPress={() => deleteRecord(record.id)} style={styles.deleteBtn}>
                <Icon name="trash-can-outline" size={15} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
        
        <TouchableOpacity style={styles.actionBtnWrap} onPress={handleExcelBulkUpload}>
          <LinearGradient colors={["#16a34a", "#15803d"]} style={styles.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Icon name="file-excel-outline" size={19} color="#fff" />
            <Text style={styles.actionBtnText}>Bulk Upload Excel</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── ADD ITEM MODAL ── */}
      <Modal visible={showAddItemModal} transparent animationType="slide" onRequestClose={() => setShowAddItemModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconCircle, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
              <Icon name="tag-plus-outline" size={28} color="#16a34a" />
            </View>
            <Text style={styles.modalTitle}>Add Item</Text>
            <Text style={styles.modalSubtitle}>Enter the item details to add it to the list.</Text>
            <View style={styles.modalDivider} />

            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>ITEM NAME</Text>
              <View style={styles.modalInputWrap}>
                <Icon name="package-variant-closed" size={16} color="#94a3b8" style={{ marginLeft: 10 }} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Apple"
                  placeholderTextColor="#cbd5e1"
                  value={newItemName}
                  onChangeText={setNewItemName}
                />
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>ITEM CODE</Text>
              <View style={styles.modalInputWrap}>
                <Icon name="barcode" size={16} color="#94a3b8" style={{ marginLeft: 10 }} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. I001"
                  placeholderTextColor="#cbd5e1"
                  value={newItemCode}
                  onChangeText={setNewItemCode}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setShowAddItemModal(false); setNewItemName(""); setNewItemCode(""); }} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddItem} disabled={addingItem} style={styles.confirmBtnWrap} activeOpacity={0.85}>
                <LinearGradient colors={["#16a34a", "#15803d"]} style={styles.confirmBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {addingItem ? <ActivityIndicator color="#fff" size="small" /> : <>
                    <Icon name="check" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>Add Item</Text>
                  </>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── ADD SCRAP USER MODAL ── */}
      <Modal visible={showAddScrapModal} transparent animationType="slide" onRequestClose={() => setShowAddScrapModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconCircle, { backgroundColor: "#f5f3ff", borderColor: "#ddd6fe" }]}>
              <Icon name="domain-plus" size={28} color="#7c3aed" />
            </View>
            <Text style={styles.modalTitle}>Add Scrap Department</Text>
            <Text style={styles.modalSubtitle}>Enter department name and email address.</Text>
            <View style={styles.modalDivider} />

            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>DEPARTMENT NAME</Text>
              <View style={styles.modalInputWrap}>
                <Icon name="office-building-outline" size={16} color="#94a3b8" style={{ marginLeft: 10 }} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Scrap Dept A"
                  placeholderTextColor="#cbd5e1"
                  value={newScrapName}
                  onChangeText={setNewScrapName}
                />
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>EMAIL</Text>
              <View style={styles.modalInputWrap}>
                <Icon name="email-outline" size={16} color="#94a3b8" style={{ marginLeft: 10 }} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. dept@example.com"
                  placeholderTextColor="#cbd5e1"
                  value={newScrapEmail}
                  onChangeText={setNewScrapEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setShowAddScrapModal(false); setNewScrapName(""); setNewScrapEmail(""); }} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddScrapUser} disabled={addingScrap} style={styles.confirmBtnWrap} activeOpacity={0.85}>
                <LinearGradient colors={["#7c3aed", "#6d28d9"]} style={styles.confirmBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {addingScrap ? <ActivityIndicator color="#fff" size="small" /> : <>
                    <Icon name="check" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>Add Dept</Text>
                  </>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── UPLOAD MODAL (vehicle number) ── */}
      <Modal visible={showUploadModal} transparent animationType="slide" onRequestClose={() => setShowUploadModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconCircle, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
              <Icon name="truck-outline" size={28} color="#2563eb" />
            </View>
            <Text style={styles.modalTitle}>Upload Records</Text>
            <Text style={styles.modalSubtitle}>Enter the vehicle number before submitting all records.</Text>
            <View style={styles.modalDivider} />

            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>VEHICLE NUMBER</Text>
              <View style={styles.modalInputWrap}>
                <Icon name="car-outline" size={16} color="#94a3b8" style={{ marginLeft: 10 }} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. MP40MQ2380"
                  placeholderTextColor="#cbd5e1"
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.uploadSummary}>
              <View style={styles.uploadSummaryRow}>
                <Icon name="database-outline" size={14} color="#64748b" />
                <Text style={styles.uploadSummaryText}>{records.length} records to upload</Text>
              </View>
              {selectedScrapUser && (
                <View style={styles.uploadSummaryRow}>
                  <Icon name="domain" size={14} color="#64748b" />
                  <Text style={styles.uploadSummaryText}>Dept: {selectedScrapUser.user_name}</Text>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setShowUploadModal(false); setVehicleNumber(""); }} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpload} disabled={uploading} style={styles.confirmBtnWrap} activeOpacity={0.85}>
                <LinearGradient colors={["#2563eb", "#1e40af"]} style={styles.confirmBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {uploading ? <ActivityIndicator color="#fff" size="small" /> : <>
                    <Icon name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>Submit</Text>
                  </>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LOGOUT MODAL */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Icon name="logout" size={28} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Sign Out?</Text>
            <Text style={styles.modalSubtitle}>You'll be disconnected from the weighing device and returned to the login screen.</Text>
            <View style={styles.modalDivider} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowLogoutModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.confirmBtnWrap} activeOpacity={0.85}>
                <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.confirmBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Icon name="logout" size={16} color="#fff" />
                  <Text style={styles.confirmBtnText}>Sign Out</Text>
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

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoShadow: { borderRadius: 14, shadowColor: "#2563eb", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  logoGradient: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", letterSpacing: -0.4 },
  headerSub: { fontSize: 11, color: "#64748b", fontWeight: "500", marginTop: 1 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#eff6ff", borderWidth: 1.5, borderColor: "#bfdbfe", justifyContent: "center", alignItems: "center" },
  logoutIconBtn: { backgroundColor: "#fff1f2", borderColor: "#fecaca" },

  // Device badge
  deviceBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0", gap: 6, shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  deviceBadgeText: { flex: 1, fontSize: 12, color: "#475569", fontWeight: "500" },
  connDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#cbd5e1" },
  connDotActive: { backgroundColor: "#22c55e" },
  connLabel: { fontSize: 11, fontWeight: "700", color: "#94a3b8" },
  connLabelActive: { color: "#16a34a" },

  // Dropdown rows
  dropRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 12 },
  dropRowSingle: { marginBottom: 14 },
  dropLabel: { fontSize: 11, fontWeight: "700", color: "#94a3b8", letterSpacing: 0.8, marginBottom: 5 },
  dropWithBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  dropdown: { flex: 1, height: 44, borderRadius: 12, backgroundColor: "#fff", paddingHorizontal: 10, borderWidth: 1.5, borderColor: "#e2e8f0" },
  dropdownContainer: { borderRadius: 12, backgroundColor: "#ffffff", elevation: 5 },
  itemText: { fontSize: 13, color: "#1e293b", paddingVertical: 0 },
  selectedText: { fontSize: 14, color: "#2563eb", fontWeight: "600" },
  placeholder: { color: "#94a3b8", fontSize: 14 },
  addIconBtn: { borderRadius: 10, overflow: "hidden" },
  addIconBtnGradient: { width: 44, height: 44, justifyContent: "center", alignItems: "center", borderRadius: 10 },

  totalCard: { backgroundColor: "#ffffff", padding: 10, borderRadius: 12, elevation: 3, alignItems: "center", minWidth: 110, borderWidth: 1, borderColor: "#e8f0fe" },
  totalLabel: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  totalValue: { fontSize: 15, fontWeight: "bold", color: "#2563eb", marginTop: 2 },

  // Weight card
  weightCard: { backgroundColor: "#fff", borderRadius: 22, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: "#e8f0fe", shadowColor: "#1e3a8a", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
  weightCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  weightLabel: { fontSize: 12, fontWeight: "700", color: "#94a3b8", letterSpacing: 0.8, textTransform: "uppercase" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#f1f5f9", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#e2e8f0" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#cbd5e1" },
  liveDotActive: { backgroundColor: "#22c55e" },
  liveText: { fontSize: 11, fontWeight: "700", color: "#94a3b8" },
  liveTextActive: { color: "#16a34a" },

  weightStatsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "#f8fafc", borderRadius: 14, paddingVertical: 12, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  weightStatBox: { flex: 1, alignItems: "center" },
  weightStatBoxLabel: { fontSize: 10, fontWeight: "700", color: "#94a3b8", letterSpacing: 0.8, marginBottom: 4 },
  weightStatBoxValue: { fontSize: 20, fontWeight: "800", color: "#1d4ed8", letterSpacing: -0.5 },
  weightStatBoxUnit: { fontSize: 10, color: "#94a3b8", fontWeight: "600", marginTop: 2 },
  weightStatDividerV: { width: 1, height: 40, backgroundColor: "#e2e8f0" },

  weightValue: { fontSize: 52, fontWeight: "800", color: "#16a34a", letterSpacing: -2, textAlign: "center", marginVertical: 4 },
  weightUnit: { fontSize: 12, color: "#94a3b8", fontWeight: "500", textAlign: "center", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 },

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

  actionRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  actionBtnWrap: { flex: 1, borderRadius: 14, overflow: "hidden" },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

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

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  modalCard: { backgroundColor: "#ffffff", borderRadius: 24, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 22, width: "100%", alignItems: "center", shadowColor: "#0f172a", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.18, shadowRadius: 32, elevation: 20 },
  modalIconCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#fff1f2", borderWidth: 1.5, borderColor: "#fecaca", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 8, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  modalDivider: { width: "100%", height: 1, backgroundColor: "#f1f5f9", marginBottom: 20 },

  modalField: { width: "100%", marginBottom: 14 },
  modalFieldLabel: { fontSize: 11, fontWeight: "700", color: "#94a3b8", letterSpacing: 0.8, marginBottom: 6 },
  modalInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1.5, borderColor: "#e2e8f0", height: 48 },
  modalInput: { flex: 1, fontSize: 15, color: "#0f172a", fontWeight: "500", paddingHorizontal: 10 },

  uploadSummary: { width: "100%", backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, marginBottom: 16, gap: 6, borderWidth: 1, borderColor: "#e2e8f0" },
  uploadSummaryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  uploadSummaryText: { fontSize: 13, color: "#475569", fontWeight: "500" },

  modalActions: { flexDirection: "row", gap: 12, width: "100%", marginTop: 4 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", justifyContent: "center", alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: "#475569" },
  confirmBtnWrap: { flex: 1, borderRadius: 14, shadowColor: "#2563eb", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  confirmBtn: { height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});