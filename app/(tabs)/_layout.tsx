import { Tabs } from "expo-router";
import { CircleUser, LayoutDashboard } from "lucide-react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // --- SEMBUNYIKAN HEADER UNTUK SEMUA TAB ---
        headerShown: false,

        tabBarActiveTintColor: "#633594",
        tabBarInactiveTintColor: "#8c8c8c",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginBottom: Platform.OS === "android" ? 8 : 0,
        },
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#f2f2f2",
          elevation: 8,
          height: Platform.OS === "ios" ? 60 + insets.bottom : 70,
          paddingBottom: Platform.OS === "ios" ? insets.bottom : 0,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => <LayoutDashboard size={24} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Pengguna",
          tabBarIcon: ({ color, focused }) => <CircleUser size={24} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="order/[id]" // Pastikan sesuai dengan nama file/struktur router Anda
        options={{
          title: "Detail Order",
          href: null, // Ini akan menyembunyikan tab dari bar navigasi bawah
        }}
      />
    </Tabs>
  );
}
