import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

const BASE_URL = "https://bt.weightify.vendtrails.com";

// ─── API helpers ──────────────────────────────────────────────────────────────
const api = {
  addUser: (payload) =>
    fetch(`${BASE_URL}/user/addUser`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json()),

  login: (payload) =>
    fetch(`${BASE_URL}/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json()),

  insertStoreDetails: (payload) =>
    fetch(`${BASE_URL}/bill/insertStoreDetails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json()),
};

// ─── Shared input component ────────────────────────────────────────────────────
const InputField = ({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureText,
  onToggleSecure,
  showToggle,
  autoCapitalize,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, focused && styles.inputFocused]}>
        <View style={styles.iconWrap}>
          <Icon name={icon} size={18} color={focused ? "#2563eb" : "#94a3b8"} />
        </View>
        <TextInput
          importantForAutofill="no"
          autoComplete="off"
          placeholder={placeholder}
          placeholderTextColor="#cbd5e1"
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || "default"}
          secureTextEntry={secureText}
          onBlur={() => setFocused(false)}
          autoCapitalize={autoCapitalize || "none"}
          autoCorrect={false}
          blurOnSubmit={false}
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggleSecure} style={styles.eyeBtn}>
            <Icon
              name={secureText ? "eye-outline" : "eye-off-outline"}
              size={18}
              color="#94a3b8"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── OTP Screen ───────────────────────────────────────────────────────────────
const OTPScreen = ({ contact, password, onSuccess, onBack, isSignupOtp }) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length < 4) {
      Alert.alert("Error", "Please enter the OTP sent to your number.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.login({ contact, password, otp: parseInt(otp, 10) });
      if (res.statusCode === 0) {
        onSuccess(res.op?.[0] || {});
      } else {
        Alert.alert("Invalid OTP", res.msg || "Verification failed. Try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Icon name="arrow-left" size={18} color="#2563eb" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.otpHeader}>
        <View style={styles.otpIconCircle}>
          <Icon name="message-text-outline" size={26} color="#2563eb" />
        </View>
        <Text style={styles.cardTitle}>OTP Verification</Text>
        <Text style={styles.cardSubtitle}>
          {isSignupOtp
            ? "We sent an OTP to verify your account"
            : "OTP sent to verify your identity"}
          {"\n"}
          <Text style={{ color: "#2563eb", fontWeight: "700" }}>{contact}</Text>
        </Text>
      </View>

      <InputField
        label="Enter OTP"
        icon="numeric"
        value={otp}
        onChangeText={setOtp}
        placeholder="Enter OTP"
        keyboardType="numeric"
      />

      <TouchableOpacity onPress={handleVerify} activeOpacity={0.85} disabled={loading}>
        <LinearGradient
          colors={["#1d4ed8", "#2563eb", "#3b82f6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Verify OTP</Text>
              <View style={styles.btnIconWrap}>
                <Icon name="check" size={18} color="#fff" />
              </View>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ─── Sign Up Screen ────────────────────────────────────────────────────────────
const SignUpScreen = ({ onSignUpSuccess, onBack }) => {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [locationCode, setLocationCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !contact || !password || !locationCode) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.addUser({
        name,
        contact,
        password,
        Location_code: locationCode,
      });
      if (res.statusCode === 0) {
        Alert.alert("Registered!", res.msg || "OTP sent to your contact number.", [
          { text: "OK", onPress: () => onSignUpSuccess({ contact, password }) },
        ]);
      } else {
        Alert.alert("Registration Failed", res.msg || "Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Icon name="arrow-left" size={18} color="#2563eb" />
        <Text style={styles.backText}>Back to Sign In</Text>
      </TouchableOpacity>

      <Text style={styles.cardTitle}>Create Account</Text>
      <Text style={styles.cardSubtitle}>Fill in details to register</Text>

      <InputField
        label="Full Name"
        icon="account-outline"
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
        autoCapitalize="words"
      />
      <InputField
        label="Phone Number"
        icon="phone-outline"
        value={contact}
        onChangeText={setContact}
        placeholder="Enter phone number"
        keyboardType="phone-pad"
      />
      <InputField
        label="Password"
        icon="lock-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Create a password"
        secureText={!showPassword}
        onToggleSecure={() => setShowPassword(!showPassword)}
        showToggle
      />
      <InputField
        label="Location Code"
        icon="map-marker-outline"
        value={locationCode}
        onChangeText={setLocationCode}
        placeholder="Enter your location code (e.g. Lat003)"
        autoCapitalize="characters"
      />

      <TouchableOpacity
        onPress={handleSignUp}
        activeOpacity={0.85}
        disabled={loading}
        style={{ marginTop: 4 }}
      >
        <LinearGradient
          colors={["#1d4ed8", "#2563eb", "#3b82f6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Create Account</Text>
              <View style={styles.btnIconWrap}>
                <Icon name="account-plus-outline" size={18} color="#fff" />
              </View>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ─── Create Company Screen ─────────────────────────────────────────────────────
const CreateCompanyScreen = ({ onBack, onSuccess }) => {
  const [contactNumber, setContactNumber] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [address, setAddress] = useState("");
  const [masterEmail, setMasterEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!contactNumber || !locationCode || !address || !masterEmail) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(masterEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.insertStoreDetails({
        contact_number: contactNumber,
        Location_code: locationCode,
        Address: address,
        master_email: masterEmail,
      });
      if (res.statusCode === 0) {
        Alert.alert(
          "Company Created!",
          res.msg || "Your company has been registered successfully.",
          [{ text: "OK", onPress: onSuccess }]
        );
      } else {
        Alert.alert("Failed", res.msg || "Could not create company. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Icon name="arrow-left" size={18} color="#2563eb" />
        <Text style={styles.backText}>Back to Sign In</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.companyHeader}>
        <View style={styles.companyIconCircle}>
          <Icon name="office-building-plus-outline" size={26} color="#2563eb" />
        </View>
        <Text style={styles.cardTitle}>Create Company</Text>
        <Text style={styles.cardSubtitle}>Register your business to get started</Text>
      </View>

      <InputField
        label="Contact Number"
        icon="phone-outline"
        value={contactNumber}
        onChangeText={setContactNumber}
        placeholder="Enter contact number"
        keyboardType="phone-pad"
      />
      <InputField
        label="Location Code"
        icon="map-marker-outline"
        value={locationCode}
        onChangeText={setLocationCode}
        placeholder="e.g. Lat003"
        autoCapitalize="characters"
      />
      <InputField
        label="Address"
        icon="map-outline"
        value={address}
        onChangeText={setAddress}
        placeholder="Enter company address"
        autoCapitalize="words"
      />
      <InputField
        label="Master Email"
        icon="email-outline"
        value={masterEmail}
        onChangeText={setMasterEmail}
        placeholder="Enter master email"
        keyboardType="email-address"
      />

      <TouchableOpacity
        onPress={handleCreate}
        activeOpacity={0.85}
        disabled={loading}
        style={{ marginTop: 4 }}
      >
        <LinearGradient
          colors={["#059669", "#10b981", "#34d399"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Create Company</Text>
              <View style={styles.btnIconWrap}>
                <Icon name="office-building-check-outline" size={18} color="#fff" />
              </View>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ─── MAIN LoginScreen ──────────────────────────────────────────────────────────
const LoginScreen = ({ navigation }) => {
  // Screens: 'login' | 'signup' | 'otp' | 'create_company'
  const [screen, setScreen] = useState("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStorage, setCheckingStorage] = useState(true);

  // OTP context
  const [otpContact, setOtpContact] = useState("");
  const [otpPassword, setOtpPassword] = useState("");
  const [isSignupOtp, setIsSignupOtp] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    checkAutoLogin();
  }, []);

  // ── Auto-login from AsyncStorage ──
  const checkAutoLogin = async () => {
    try {
      const saved = await AsyncStorage.getItem("userDetails");
      if (saved) {
        const user = JSON.parse(saved);
        if (user?.access_token && user?.contact && user?.password) {
          const res = await api.login({ contact: user.contact, password: user.password });
          if (res.statusCode === 0 && res.op?.[0]) {
            await AsyncStorage.setItem(
              "userDetails",
              JSON.stringify({ ...res.op[0], password: user.password })
            );
            navigation.replace("Home");
            return;
          }
          if (res.statusCode === 2) {
            setOtpContact(user.contact);
            setOtpPassword(user.password);
            setIsSignupOtp(false);
            setScreen("otp");
          }
        }
      }
    } catch (_) {}
    finally {
      setCheckingStorage(false);
    }
  };

  // ── Login handler ──
  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert("Missing Fields", "Please enter phone number and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.login({ contact: phone, password });
      if (res.statusCode === 0) {
        const userData = res.op?.[0];
        await AsyncStorage.setItem(
          "userDetails",
          JSON.stringify({ ...userData, password })
        );
        navigation.replace("Home");
      } else if (res.statusCode === 2) {
        setOtpContact(phone);
        setOtpPassword(password);
        setIsSignupOtp(false);
        setScreen("otp");
      } else {
        Alert.alert("Login Failed", res.msg || "Invalid credentials.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── After OTP verified ──
  const handleOtpSuccess = async (userData) => {
    try {
      await AsyncStorage.setItem(
        "userDetails",
        JSON.stringify({ ...userData, password: otpPassword })
      );
    } catch (_) {}
    navigation.replace("Home");
  };

  // ── After sign-up: show OTP ──
  const handleSignUpSuccess = ({ contact, password }) => {
    setOtpContact(contact);
    setOtpPassword(password);
    setIsSignupOtp(true);
    setScreen("otp");
  };

  if (checkingStorage) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 12, color: "#64748b", fontSize: 14 }}>
          Checking login…
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#f0f4ff" />

        {/* Decorative elements */}
        <View style={styles.topAccent} />
        <View style={styles.topAccentInner} />
        <View style={styles.decorCircleLarge} />
        <View style={styles.decorCircleSmall} />

        {/* HEADER */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.logoWrap}>
            <LinearGradient
              colors={["#1d4ed8", "#2563eb"]}
              style={styles.logoCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="scale-balance" size={28} color="#fff" />
            </LinearGradient>
            <View style={styles.logoPing} />
          </View>
          <Text style={styles.title}>Emrald Meezan</Text>
          <View style={styles.titleUnderline} />
          <Text style={styles.subtitle}>Bluetooth Weight Management</Text>
        </Animated.View>

        {/* ── LOGIN SCREEN ── */}
        {screen === "login" && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSubtitle}>Sign in to continue</Text>

              <InputField
                label="Phone Number"
                icon="phone-outline"
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone"
                keyboardType="phone-pad"
              />
              <InputField
                label="Password"
                icon="lock-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureText={!showPassword}
                onToggleSecure={() => setShowPassword(!showPassword)}
                showToggle
              />

              <TouchableOpacity style={styles.forgotWrap}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#1d4ed8", "#2563eb", "#3b82f6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Sign In</Text>
                      <View style={styles.btnIconWrap}>
                        <Icon name="arrow-right" size={18} color="#fff" />
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ── Action buttons row ── */}
              <View style={styles.actionRow}>
                {/* Sign Up CTA */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.signupBtn]}
                  onPress={() => setScreen("signup")}
                  activeOpacity={0.8}
                >
                  <Icon name="account-plus-outline" size={18} color="#2563eb" />
                  <Text style={[styles.actionBtnText, { color: "#2563eb" }]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>

                {/* Create Company CTA */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.companyBtn]}
                  onPress={() => setScreen("create_company")}
                  activeOpacity={0.8}
                >
                  <Icon name="office-building-plus-outline" size={18} color="#059669" />
                  <Text style={[styles.actionBtnText, { color: "#059669" }]}>
                    New Company
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Trust badges */}
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Icon name="shield-check-outline" size={14} color="#22c55e" />
                  <Text style={styles.badgeText}>Encrypted</Text>
                </View>
                <View style={styles.badge}>
                  <Icon name="lock-check-outline" size={14} color="#2563eb" />
                  <Text style={styles.badgeText}>Secure</Text>
                </View>
                <View style={styles.badge}>
                  <Icon name="check-decagram-outline" size={14} color="#f59e0b" />
                  <Text style={styles.badgeText}>Verified</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── SIGN UP SCREEN ── */}
        {screen === "signup" && (
          <SignUpScreen
            onSignUpSuccess={handleSignUpSuccess}
            onBack={() => setScreen("login")}
          />
        )}

        {/* ── OTP SCREEN ── */}
        {screen === "otp" && (
          <OTPScreen
            contact={otpContact}
            password={otpPassword}
            onSuccess={handleOtpSuccess}
            onBack={() => setScreen(isSignupOtp ? "signup" : "login")}
            isSignupOtp={isSignupOtp}
          />
        )}

        {/* ── CREATE COMPANY SCREEN ── */}
        {screen === "create_company" && (
          <CreateCompanyScreen
            onBack={() => setScreen("login")}
            onSuccess={() => setScreen("login")}
          />
        )}

        <Text style={styles.footer}>Powered by Smart Weighing System v2.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#f0f4ff",
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: "center",
  },

  /* Decorative */
  topAccent: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#dbeafe",
    opacity: 0.8,
  },
  topAccentInner: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#bfdbfe",
    opacity: 0.6,
  },
  decorCircleLarge: {
    position: "absolute",
    bottom: 60,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#eff6ff",
    opacity: 0.9,
  },
  decorCircleSmall: {
    position: "absolute",
    bottom: 30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#dbeafe",
    opacity: 0.5,
  },

  /* Header */
  header: { alignItems: "center", marginBottom: 28 },
  logoWrap: { position: "relative", marginBottom: 14 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  logoPing: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#f0f4ff",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: "#2563eb",
    borderRadius: 2,
    marginTop: 5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    letterSpacing: 0.3,
    fontWeight: "500",
  },

  /* Card */
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#e8f0fe",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 22,
    fontWeight: "400",
    lineHeight: 20,
  },

  /* Fields */
  fieldWrap: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 4,
    height: 52,
  },
  inputFocused: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  iconWrap: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "500",
    paddingVertical: 0,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Back button */
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
  },
  backText: { fontSize: 14, color: "#2563eb", fontWeight: "600" },

  /* OTP header */
  otpHeader: { alignItems: "center", marginBottom: 20 },
  otpIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  /* Company header */
  companyHeader: { alignItems: "center", marginBottom: 20 },
  companyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#ecfdf5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#6ee7b7",
  },

  /* Forgot */
  forgotWrap: { alignSelf: "flex-end", marginBottom: 20, marginTop: -4 },
  forgotText: { fontSize: 12, color: "#2563eb", fontWeight: "600" },

  /* Button */
  button: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  btnIconWrap: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Action buttons row */
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  signupBtn: {
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
  },
  companyBtn: {
    borderColor: "#6ee7b7",
    backgroundColor: "#ecfdf5",
  },

  /* Divider */
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dividerText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  /* Badges */
  badgeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  badgeText: { fontSize: 11, color: "#64748b", fontWeight: "600" },

  /* Footer */
  footer: {
    textAlign: "center",
    marginTop: 22,
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});