import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from "react-native";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";

const { width } = Dimensions.get("window");

const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (phone === "" && password === "") {
      navigation.replace("Home");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Decorative top accent */}
      <View style={styles.topAccent} />
      <View style={styles.topAccentInner} />

      {/* Decorative circles */}
      <View style={styles.decorCircleLarge} />
      <View style={styles.decorCircleSmall} />

      {/* HEADER */}
      <View style={styles.header}>
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
      </View>

      {/* CARD */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome back</Text>
        <Text style={styles.cardSubtitle}>Sign in to continue</Text>

        {/* PHONE */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={[styles.inputContainer, phoneFocused && styles.inputFocused]}>
            <View style={styles.iconWrap}>
              <Icon name="phone-outline" size={18} color={phoneFocused ? "#2563eb" : "#94a3b8"} />
            </View>
            <TextInput
              placeholder="Enter your phone"
              placeholderTextColor="#cbd5e1"
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              // onFocus={() => setPhoneFocused(true)}
              // onBlur={() => setPhoneFocused(false)}
            />
          </View>
        </View>

        {/* PASSWORD */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputContainer, passwordFocused && styles.inputFocused]}>
            <View style={styles.iconWrap}>
              <Icon name="lock-outline" size={18} color={passwordFocused ? "#2563eb" : "#94a3b8"} />
            </View>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#cbd5e1"
              secureTextEntry={!showPassword}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              // onFocus={() => setPasswordFocused(true)}
              // onBlur={() => setPasswordFocused(false)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <Icon
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#94a3b8"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* FORGOT */}
        <TouchableOpacity style={styles.forgotWrap}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* LOGIN BUTTON */}
        <TouchableOpacity onPress={handleLogin} activeOpacity={0.85}>
          <LinearGradient
            colors={["#1d4ed8", "#2563eb", "#3b82f6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Sign In</Text>
            <View style={styles.btnIconWrap}>
              <Icon name="arrow-right" size={18} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>secure login</Text>
          <View style={styles.dividerLine} />
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

      {/* FOOTER */}
      <Text style={styles.footer}>Powered by Smart Weighing System v2.0</Text>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4ff",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },

  /* Decorative elements */
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
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoWrap: {
    position: "relative",
    marginBottom: 14,
  },
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
  },

  /* Fields */
  fieldWrap: {
    marginBottom: 16,
  },
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

  /* Forgot */
  forgotWrap: {
    alignSelf: "flex-end",
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
  },

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

  /* Divider */
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
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
  badgeText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },

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