import { Tabs } from "expo-router";
import { LayoutDashboard, Package, ShoppingCart, SquareMenu, User } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#633594",
        tabBarInactiveTintColor: "#95a5a6",
        headerShown: false,
        tabBarStyle: { paddingBottom: 5, height: 60 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} /> }} />
      <Tabs.Screen name="myapps" options={{ title: "Appku", tabBarIcon: ({ color }) => <Package size={24} color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: "Laporan", tabBarIcon: ({ color }) => <SquareMenu size={24} color={color} /> }} />
      <Tabs.Screen name="orders" options={{ title: "Pesanan", tabBarIcon: ({ color }) => <ShoppingCart size={24} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profil", tabBarIcon: ({ color }) => <User size={24} color={color} /> }} />
    </Tabs>
  );
}
