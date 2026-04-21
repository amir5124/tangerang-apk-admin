import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, View } from "react-native";
import API from "../utils/api";
import { registerForTopic } from "../utils/notificationHelper";
import { storage } from "../utils/storage";
import { registerForPushNotificationsAsync } from "../utils/usePushNotifications";

// Pastikan WebBrowser lengkap untuk handle redirect di web/mobile
WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fcmToken, setFcmToken] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const TARGET_ROLE = "admin";
  const isFormValid = form.email.length > 0 && form.password.length > 0;

  // --- KONFIGURASI GOOGLE AUTH ---
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: "206607018424-u9a7v54du628kt7mmnlcclsvq3og33ce.apps.googleusercontent.com",
    // iosClientId: 'ISI_JIKA_ADA',
    // androidClientId: 'ISI_JIKA_ADA',
  });

  useEffect(() => {
    getDeviceToken();
  }, []);

  // Handle Response Google
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const getDeviceToken = async () => {
    try {
      const result = await registerForPushNotificationsAsync();
      if (result) {
        let finalToken = typeof result === "object" ? result.token || result.endpoint || "" : result;
        if (finalToken.includes("/send/")) finalToken = finalToken.split("/send/")[1];
        setFcmToken(finalToken);
      } else {
        setFcmToken(Platform.OS === "web" ? "WEB_NO_TOKEN" : "NO_TOKEN");
      }
    } catch (error) {
      console.error("❌ Error Filter Token Login:", error);
      setFcmToken("ERROR_TOKEN");
    }
  };

  // --- FUNGSI LOGIN GOOGLE ---
  const handleGoogleLogin = async (idToken: string) => {
    setLoading(true);
    try {
      const payload = {
        idToken,
        fcm_token: fcmToken,
        targetRole: TARGET_ROLE, // Memastikan user login ke role yang benar
      };

      const res = await API.post("/auth/google", payload);

      if (res.data.success) {
        const { token, user } = res.data;
        await storage.save("userToken", token);
        await storage.save("userData", JSON.stringify(user));
        await registerForTopic(user.role);

        router.replace("/(tabs)");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Login Google Gagal";
      Platform.OS === "web" ? alert(errorMsg) : Alert.alert("Akses Ditolak", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const payload = { ...form, fcm_token: fcmToken, targetRole: TARGET_ROLE };
      const response = await API.post("/auth/login", payload);

      if (response.data.success || response.status === 200) {
        const { token, user } = response.data;
        await storage.save("userToken", token);
        await storage.save("userData", JSON.stringify(user));

        await registerForTopic(user.role);

        if (user.role === "mitra") {
          console.log("mitra");
        } else {
          router.replace("/(tabs)");
        }
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Login Gagal. Periksa kembali akun Anda.";
      Platform.OS === "web" ? alert(errorMsg) : Alert.alert("Akses Ditolak", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <Image source={{ uri: "https://res.cloudinary.com/dgsdmgcc7/image/upload/v1770989052/Salinan_LOGO_TF_1-removebg-preview_ybdbz0.png" }} style={styles.logoImage} resizeMode="contain" />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Masukkan email"
              placeholderTextColor="#A0A0A0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              selectionColor="#633594"
              cursorColor="#633594"
              onChangeText={(v) => setForm({ ...form, email: v.toLowerCase().trim() })}
            />
          </View>
          <Text style={styles.hint}>Contoh: nama@email.com</Text>

          <Text style={[styles.label, { marginTop: 20 }]}>Kata Sandi</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Masukkan kata sandi"
              placeholderTextColor="#A0A0A0"
              secureTextEntry={!showPassword}
              value={form.password}
              selectionColor="#633594"
              cursorColor="#633594"
              onChangeText={(v) => setForm({ ...form, password: v })}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#888" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotPassContainer}>
            <Text style={styles.forgotPassText}>Lupa Kata Sandi?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btnMain, !isFormValid ? styles.btnDisabled : styles.btnActive]} onPress={handleLogin} disabled={!isFormValid || loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnMainText}>Masuk</Text>}
          </TouchableOpacity>

          {/* --- TOMBOL GOOGLE --- */}
          <TouchableOpacity style={styles.googleBtn} onPress={() => promptAsync()} disabled={!request || loading}>
            <Ionicons name="logo-google" size={20} color="#333" style={{ marginRight: 10 }} />
            <Text style={styles.googleBtnText}>Masuk dengan Google</Text>
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Belum terdaftar? </Text>
            <TouchableOpacity onPress={() => router.push({ pathname: "/(auth)/register", params: { role: TARGET_ROLE } })}>
              <Text style={styles.registerText}>Daftar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 25 },
  logoContainer: { alignItems: "center", marginTop: 50, width: "100%" },
  logoImage: { width: 200, height: 200 },
  formSection: { flex: 1, marginTop: -20 },
  label: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 8 },
  inputWrapper: { height: 55, borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 8, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, backgroundColor: "#FFF" },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    paddingVertical: Platform.OS === "web" ? 0 : 8,
    ...Platform.select({ web: { outlineWidth: 0, outlineStyle: "none", boxShadow: "none" } as any, default: {} }),
  } as TextStyle,
  hint: { fontSize: 12, color: "#A0A0A0", marginTop: 6 },
  forgotPassContainer: { alignSelf: "flex-end", marginTop: 15 },
  forgotPassText: { color: "#633594", fontWeight: "700", fontSize: 14 },
  btnMain: { height: 55, borderRadius: 8, justifyContent: "center", alignItems: "center", marginTop: 30 },
  btnActive: { backgroundColor: "#633594" },
  btnDisabled: { backgroundColor: "#E0E0E0" },
  btnMainText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  googleBtn: {
    height: 55,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    backgroundColor: "#FFF",
  },
  googleBtnText: { color: "#333", fontSize: 16, fontWeight: "700" },
  footerContainer: { flexDirection: "row", justifyContent: "center", marginTop: 20, marginBottom: 40 },
  footerText: { color: "#333", fontSize: 15 },
  registerText: { color: "#00BFA5", fontSize: 15, fontWeight: "bold" },
});

export default LoginScreen;
