import NetInfo from "@react-native-community/netinfo";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { WifiOff } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import Toast, { BaseToast, ErrorToast, ToastConfig } from "react-native-toast-message";
import "../global.css";

// Import Firebase
import { getApps, initializeApp } from "firebase/app";

// 1. Konfigurasi Firebase Native
const firebaseConfig = {
  apiKey: "AIzaSyDlcY6gl30RNhKvTFUMYLB9W-booJLYVHs",
  authDomain: "mitra-tangerangfast.firebaseapp.com",
  projectId: "mitra-tangerangfast",
  storageBucket: "mitra-tangerangfast.firebasestorage.app",
  messagingSenderId: "206607018424",
  appId: "1:206607018424:web:4f0ddad4a1a6fc3aa7074d",
};

// 2. Inisialisasi Firebase
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

// Handler Notifikasi saat aplikasi terbuka
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Konfigurasi Toast
const toastConfig: ToastConfig = {
  success: (props) => <BaseToast {...props} style={styles.toastBase} contentContainerStyle={styles.toastContent} text1Style={styles.toastText1} text2Style={styles.toastText2} />,
  error: (props) => (
    <ErrorToast
      {...props}
      style={[styles.toastBase, { borderLeftColor: "#EF4444", borderLeftWidth: 4 }]}
      contentContainerStyle={styles.toastContent}
      text1Style={styles.toastText1}
      text2Style={[styles.toastText2, { color: "#FF9494" }]}
    />
  ),
};

/** 
 * FUNGSI REGISTER NOTIFIKASI
 * Pastikan file suara ada di: android/app/src/main/res/raw/notification.mp3
 */
export async function registerForPushNotificationsAsync() {
  let token;
  if (!Device.isDevice) {
    console.log("⚠️ Harus menggunakan perangkat fisik");
    return undefined;
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("❌ Izin ditolak");
    return undefined;
  }
  try {
    if (Platform.OS === "android") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await Notifications.setNotificationChannelAsync("orders", {
        name: "Pesanan & Transaksi",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#633594",
        showBadge: true,
        sound: "notification",
      });
    }
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    token = deviceToken.data;
  } catch (error: any) {
    console.error("🔥 FCM Token Error:", error.message);
  }
  return token;
}

const ConnectionBanner = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected !== false);
    });
    return () => unsubscribe();
  }, []);
  if (isConnected) return null;
  return (
    <View style={styles.offlineBanner}>
      <WifiOff size={14} color="#FFF" style={{ marginRight: 8 }} />
      <Text style={styles.offlineText}>Mode Offline: Periksa koneksi internet Anda</Text>
    </View>
  );
};

function RootLayoutContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Tipe data eksplisit dengan nilai awal undefined
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  const handleRedirect = (data: any) => {
    if (!data) return;

    console.log("🔔 Redirecting with data:", data);

    // Jika tujuan adalah Tab Profile
    if (data.type === "NEW_USER" || data.screen === "/(tabs)/profile") {
      // Gunakan replace untuk berpindah antar tab utama
      router.replace("/(tabs)/profile");
    }
    else if (data.orderId) {
      router.push(`/order/${data.orderId}`);
    }
    else if (data.screen) {
      // Pastikan path screen diawali dengan /
      const target = data.screen.startsWith('/') ? data.screen : `/${data.screen}`;
      router.push(target);
    }
  };

  useEffect(() => {
    // Hanya jalankan logika push notification jika BUKAN di web
    if (Platform.OS !== 'web') {
      registerForPushNotificationsAsync().then((token) => {
        if (token) console.log("✅ Native FCM Token:", token);
      });

      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          const data = response.notification.request.content.data;
          setTimeout(() => handleRedirect(data), 1000);
        }
      });

      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        const { title, body, data } = notification.request.content;
        Toast.show({
          type: "success",
          text1: title || "Informasi Baru",
          text2: body || "Ada pembaruan data",
          onPress: () => handleRedirect(data),
        });
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        handleRedirect(data);
      });
    }

    return () => {
      if (Platform.OS !== 'web') {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} />
      <View style={{ height: insets.top, backgroundColor: "#633594" }} />

      <ConnectionBanner />

      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fff" } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ animation: "fade_from_bottom" }} />
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          {/* Pastikan file ini ada: app/order/[id].tsx */}
          <Stack.Screen name="order/[id]" options={{ animation: "slide_from_right" }} />
        </Stack>
      </View>

      <View style={{ height: insets.bottom, backgroundColor: "#fff" }} />
      <Toast config={toastConfig} position="top" topOffset={insets.top + 10} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#633594" },
  offlineBanner: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  offlineText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  toastBase: {
    backgroundColor: "#1E1E1E",
    borderLeftWidth: 0,
    borderRadius: 12,
    height: 65,
    width: "90%",
    alignSelf: "center",
    elevation: 10,
  },
  toastContent: { paddingHorizontal: 20 },
  toastText1: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  toastText2: { fontSize: 12, color: "#A1A1AA", marginTop: 2 },
});