import { useFocusEffect, useRouter } from "expo-router";
import { AlertCircle, ChevronRight, CreditCard, Info, Search } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import { orderService } from "../../src/services/orderService";
import { Order } from "../../src/types/order";

export default function HomeScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const router = useRouter();

  const loadAllOrders = async () => {
    setLoading(true);
    try {
      const res = await orderService.getAllOrdersAdmin();
      if (res && res.success) setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAllOrders();
    }, []),
  );

  const getStatusDetails = (status: string) => {
    switch (status.toLowerCase()) {
      case "unpaid":
        return { label: "MENUNGGU", bg: "bg-orange-50", text: "text-orange-600" };
      case "completed":
        return { label: "SELESAI", bg: "bg-green-50", text: "text-green-600" };
      case "cancelled":
        return { label: "DIBATALKAN", bg: "bg-red-50", text: "text-red-600" };
      default:
        return { label: status.toUpperCase(), bg: "bg-blue-50", text: "text-blue-600" };
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch = o.customer_name.toLowerCase().includes(search.toLowerCase()) || o.id.toString().includes(search);
      const matchesFilter = filter === "all" ? true : o.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [orders, search, filter]);

  if (loading)
    return (
      <View className="flex-1 justify-center items-center bg-[#F8F9FD]">
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );

  const renderItem = ({ item }: { item: Order }) => {
    const statusInfo = getStatusDetails(item.status);

    // LOGIKA TOTAL PEMBAYARAN: price + platform + service
    const rawPrice = parseFloat(item.total_price || "0");
    const pFee = parseFloat(item.platform_fee || "0");
    const sFee = parseFloat(item.service_fee || "0");
    const grandTotal = rawPrice + pFee + sFee;

    const cancelSource = item.cancelled_by === "customer" ? "Pelanggan" : item.cancelled_by === "mitra" ? "Mitra" : "Sistem";

    return (
      <View className="bg-white p-5 mx-4 rounded-[24px] mt-4 border border-gray-100">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <View className="bg-gray-100 px-2 py-1 rounded-md">
              <Text className="text-gray-500 text-[10px] font-bold">#ID-{item.id}</Text>
            </View>
          </View>
          <View className={`px-3 py-1 rounded-full ${statusInfo.bg}`}>
            <Text className={`text-[9px] font-black ${statusInfo.text}`}>{statusInfo.label}</Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-2xl bg-purple-50 items-center justify-center">
            <CreditCard size={20} color="#633594" />
          </View>
          <View className="flex-1 ml-3">
            <Text className="font-bold text-gray-900 text-sm" numberOfLines={1}>
              {item.mitra_name}
            </Text>
            <Text className="text-gray-400 text-[10px] font-medium">
              {item.scheduled_date} • {item.scheduled_time?.substring(0, 5)}
            </Text>
            <Text className="text-gray-600 text-[11px] mt-1">Cust: {item.customer_name}</Text>
          </View>
        </View>

        {item.status === "cancelled" && (
          <View className="mt-4 p-3 bg-red-50 rounded-2xl border border-red-100">
            <View className="flex-row items-center mb-1">
              <Info size={12} color="#ef4444" />
              <Text className="text-red-700 font-bold text-[10px] ml-1">BATAL OLEH {cancelSource.toUpperCase()}</Text>
            </View>
            <Text className="text-red-600 text-[11px] ">{item.cancel_reason || ""}</Text>
          </View>
        )}

        <View className="flex-row justify-between items-center pt-4 border-t border-gray-50 mt-4">
          <View>
            <Text className="text-gray-400 text-[9px] font-bold uppercase tracking-tighter">Total Pembayaran</Text>
            <Text className="font-black text-lg text-[#633594]">Rp {grandTotal.toLocaleString("id-ID")}</Text>
          </View>

          <TouchableOpacity onPress={() => router.push(`/order/${item.id}` as any)} className="bg-[#633594] px-5 py-2.5 rounded-[10px] flex-row items-center" activeOpacity={0.8}>
            <Text className="text-white font-bold text-xs">Lihat Detail</Text>
            <ChevronRight size={14} color="white" className="ml-1" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F8F9FD]">
      <StatusBar barStyle="dark-content" />
      <View className="bg-white px-6 pt-14 pb-6">
        <Text className="text-2xl font-black text-gray-900 mb-4">Kontrol Pesanan</Text>

        <View className="flex-row bg-[#F1F3F9] rounded-2xl px-4 py-3 items-center mb-5">
          <Search size={18} color="#94A3B8" />
          <TextInput className="ml-3 flex-1 text-sm text-gray-700" placeholder="Cari transaksi..." value={search} onChangeText={setSearch} />
        </View>

        <View className="flex-row">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["all", "unpaid", "completed", "cancelled"].map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} className={`px-5 py-2 rounded-full mr-2 ${filter === f ? "bg-[#633594]" : "bg-gray-100"}`}>
                <Text className={`text-[11px] font-bold ${filter === f ? "text-white" : "text-gray-500"}`}>
                  {f === "all" ? "Semua" : f === "unpaid" ? "Menunggu" : f === "completed" ? "Selesai" : "Batal"}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <View className="items-center mt-20 px-10">
            <AlertCircle color="#CBD5E1" size={50} />
            <Text className="text-gray-400 mt-4 text-center font-medium">Tidak ada transaksi yang sesuai dengan filter ini.</Text>
          </View>
        }
      />
    </View>
  );
}
