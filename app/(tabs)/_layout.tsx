import { Redirect, Tabs } from "expo-router";
import { LayoutDashboard, Package, ShoppingCart, SquareMenu, User } from "lucide-react-native";
import { canAccessTab, getRoleByEmail } from "../../constants/rolesByEmail";
import { SessionContext } from "../../src/context/SessionContext";
import { useSession } from "../../src/hooks/useSession";

export default function TabLayout() {
  const { email, loading } = useSession();

  if (loading) return null;
  if (!email) return <Redirect href="/(auth)/login" />;

  const role = getRoleByEmail(email);
  if (!role) return <Redirect href="/(auth)/login" />;

  const can = (tab: string) => canAccessTab(email, tab);

  return (
    <SessionContext.Provider value={{ email, role, can }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#633594",
          tabBarInactiveTintColor: "#95a5a6",
          headerShown: false,
          tabBarStyle: { paddingBottom: 5, height: 60 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="myapps"
          options={{
            title: "Appku",
            tabBarIcon: ({ color }) => <Package size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: "Laporan",
            tabBarIcon: ({ color }) => <SquareMenu size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Pesanan",
            tabBarIcon: ({ color }) => <ShoppingCart size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color }) => <User size={24} color={color} />,
          }}
        />
      </Tabs>
    </SessionContext.Provider>
  );
}