import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { orderService } from "../../../src/services/orderService";
import { Order, OrderItem } from "../../../src/types/order";

export default function DetailOrderScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      orderService
        .getDetailOrder(id as string)
        .then((res) => {
          setOrder(res.data);
        })
        .catch((err) => {
          console.error("Error fetching order detail:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text>Pesanan tidak ditemukan.</Text>
      </View>
    );
  }

  // Helper untuk menangani data items yang bisa berupa string (JSON) atau Array
  const getServices = (): OrderItem[] => {
    if (!order.items) return [];
    if (typeof order.items === "string") {
      try {
        return JSON.parse(order.items);
      } catch (e) {
        console.error("Gagal parse items:", e);
        return [];
      }
    }
    return order.items; // Jika sudah berupa array
  };

  const services = getServices();

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: `Detail Order #${id}`, headerBackTitle: "Kembali" }} />

      {/* Section Status */}
      <View style={styles.section}>
        <Text style={styles.label}>Status Pesanan</Text>
        <Text style={[styles.value, styles.statusBadge]}>{order.status.replace("_", " ").toUpperCase()}</Text>
      </View>

      {/* Section Info Mitra/Toko */}
      <View style={styles.section}>
        <Text style={styles.label}>Teknisi / Toko</Text>
        <Text style={styles.value}>{order.mitra_name || order.store_name || "Mencari Teknisi..."}</Text>
        {order.mitra_phone && <Text style={styles.subValue}>{order.mitra_phone}</Text>}
      </View>

      {/* Section Lokasi */}
      <View style={styles.section}>
        <Text style={styles.label}>Lokasi Pengerjaan ({order.building_type})</Text>
        <Text style={styles.value}>{order.address_customer}</Text>
        {order.customer_notes && <Text style={styles.notes}>Catatan: {order.customer_notes}</Text>}
      </View>

      {/* Section Rincian Layanan */}
      <View style={styles.section}>
        <Text style={styles.label}>Rincian Layanan</Text>
        {services.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemText}>
              {item.nama} <Text style={styles.itemQty}>x{item.qty}</Text>
            </Text>
            <Text style={styles.itemPrice}>Rp {item.hargaSatuan.toLocaleString("id-ID")}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Bayar</Text>
          <Text style={styles.totalValue}>Rp {parseInt(order.total_price).toLocaleString("id-ID")}</Text>
        </View>
      </View>

      {/* Section Bukti Foto (Hanya muncul jika ada) */}
      {order.proof_image_url && (
        <View style={styles.section}>
          <Text style={styles.label}>Bukti Pengerjaan</Text>
          <Image source={{ uri: order.proof_image_url }} style={styles.proofImage} resizeMode="cover" />
        </View>
      )}

      {/* Margin bawah agar tidak mentok saat di-scroll */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfdfd" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  section: {
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 8,
  },
  label: { fontSize: 12, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 16, fontWeight: "600", color: "#333" },
  subValue: { fontSize: 14, color: "#666", marginTop: 2 },
  statusBadge: { color: "#2ecc71" }, // Bisa disesuaikan warnanya berdasarkan status
  notes: { fontSize: 13, color: "#777", marginTop: 8, fontStyle: "italic", padding: 8, backgroundColor: "#f9f9f9", borderRadius: 4 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 6 },
  itemText: { fontSize: 15, color: "#444" },
  itemQty: { color: "#888", fontSize: 13 },
  itemPrice: { fontSize: 15, color: "#444" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  totalLabel: { fontWeight: "bold", fontSize: 16, color: "#333" },
  totalValue: { fontWeight: "bold", fontSize: 18, color: "#2ecc71" },
  proofImage: {
    width: "100%",
    height: 250,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: "#eee",
  },
});
