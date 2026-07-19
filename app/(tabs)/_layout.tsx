import { Redirect, Tabs } from "expo-router";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  SquareMenu,
  User,
  Users
} from "lucide-react-native";
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
          tabBarStyle: {
            paddingBottom: 5,
            height: 60,
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
        }}
      >
        {/* Tab 1: Dashboard */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, focused }) => (
              <LayoutDashboard
                size={24}
                color={focused ? "#633594" : color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        {/* Tab 2: Appku */}
        <Tabs.Screen
          name="myapps"
          options={{
            title: "Appku",
            tabBarIcon: ({ color, focused }) => (
              <Package
                size={24}
                color={focused ? "#633594" : color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        {/* Tab 3: ART Order - HANYA UNTUK ADMIN */}
        <Tabs.Screen
          name="art-order"
          options={{
            title: "ART Order",

            tabBarIcon: ({ color, focused }) => (
              <Users
                size={24}
                color={focused ? "#633594" : color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        {/* Tab 4: Laporan */}
        <Tabs.Screen
          name="reports"
          options={{
            title: "Laporan",
            href: can('reports') ? "/reports" : null,
            tabBarIcon: ({ color, focused }) => (
              <SquareMenu
                size={24}
                color={focused ? "#633594" : color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        {/* Tab 5: Pesanan */}
        <Tabs.Screen
          name="orders"
          options={{
            title: "Pesanan",
            href: can('orders') ? "/orders" : null,
            tabBarIcon: ({ color, focused }) => (
              <ShoppingCart
                size={24}
                color={focused ? "#633594" : color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        {/* Tab 6: Profil */}
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color, focused }) => (
              <User
                size={24}
                color={focused ? "#633594" : color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />


      </Tabs>
    </SessionContext.Provider>
  );
}