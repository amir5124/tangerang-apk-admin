import { useFocusEffect, useRouter } from "expo-router";
import { Calendar, LogOut, User, Wrench } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { orderService } from "../../src/services/orderService";
import { Order } from "../../src/types/order";
import { storage } from "../../src/utils/storage"; // Import storage langsung

export default function HomeScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadAllOrders = async () => {
    setLoading(true);
    try {
      const res = await orderService.getAllOrdersAdmin();
      if (res && res.success) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error("Admin Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAllOrders();
    }, []),
  );

  const handleLogout = async () => {
    Alert.alert("Konfirmasi Logout", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          try {
            // Menghapus token dan data user menggunakan storage utilitas Anda
            await storage.delete("userToken");
            await storage.delete("userData");

            // Reset navigasi ke halaman login
            router.replace("/login" as any);
          } catch (error) {
            console.error("Logout Error:", error);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Order }) => {
    // Menghindari error jika status tidak ada di style
    const statusStyle = (styles as any)[item.status] || styles.defaultStatus;

    return (
      <Pressable style={styles.card} onPress={() => router.push(`/order/${item.id}` as any)}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Order #{item.id}</Text>
          <View style={[styles.statusBadge, statusStyle]}>
            <Text style={styles.statusText}>{item.status?.toUpperCase() || "PENDING"}</Text>
          </View>
        </View>

        <View style={styles.adminInfo}>
          <View style={styles.infoRow}>
            <User size={14} color="#95a5a6" />
            <Text style={styles.infoLabel}> Customer</Text>
            <Text style={styles.infoValue}>{item.customer_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Wrench size={14} color="#95a5a6" />
            <Text style={styles.infoLabel}> Mitra</Text>
            <Text style={styles.infoValue}>{item.mitra_name || "Mencari Teknisi..."}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Calendar size={12} color="#7f8c8d" />
            <Text style={styles.dateText}>
              {" "}
              Jadwal {item.scheduled_date} • {item.scheduled_time?.slice(0, 5) || "00:00"}
            </Text>
          </View>
          <Text style={styles.price}>Rp {parseInt(item.total_price || "0").toLocaleString("id-ID")}</Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#633594" />

      <View style={styles.headerBanner}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Dashboard Admin</Text>
            <Text style={styles.subtitle}>Sistem Manajemen Order</Text>
          </View>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <LogOut color="#fff" size={22} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onRefresh={loadAllOrders}
        refreshing={loading}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: "#7f8c8d" }}>Belum ada pesanan.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  headerBanner: {
    backgroundColor: "#633594",
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  subtitle: { fontSize: 12, color: "#E1D5E7" },
  logoutButton: { backgroundColor: "rgba(255,255,255,0.15)", padding: 8, borderRadius: 10 },
  listContent: { padding: 15 },
  card: { backgroundColor: "white", padding: 15, borderRadius: 12, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  orderId: { fontWeight: "bold", fontSize: 14, color: "#633594" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: "bold", color: "white" },
  // Status Colors
  pending: { backgroundColor: "#f39c12" },
  settlement: { backgroundColor: "#2ecc71" }, // Sesuai status DB Anda
  completed: { backgroundColor: "#27ae60" },
  defaultStatus: { backgroundColor: "#95a5a6" },
  adminInfo: { paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#eee", marginBottom: 10 },
  infoRow: { flexDirection: "row", marginBottom: 5, alignItems: "center" },
  infoLabel: { width: 70, fontSize: 11, color: "#95a5a6" },
  infoValue: { flex: 1, fontSize: 12, fontWeight: "bold", color: "#333" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateText: { fontSize: 11, color: "#7f8c8d" },
  price: { fontWeight: "bold", color: "#27ae60", fontSize: 15 },
});
