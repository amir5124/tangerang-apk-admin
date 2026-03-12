import { useFocusEffect, useRouter } from "expo-router";
import { AlertCircle, Search } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StatusBar, Text, TextInput, View } from "react-native";
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
      case "accepted":
        return { label: "DITERIMA", bg: "bg-blue-50", text: "text-blue-600" };
      case "on_the_way":
        return { label: "DI PERJALANAN", bg: "bg-purple-50", text: "text-purple-600" };
      case "working":
        return { label: "DIKERJAKAN", bg: "bg-yellow-50", text: "text-yellow-600" };
      case "completed":
        return { label: "SELESAI", bg: "bg-green-50", text: "text-green-600" };
      case "cancelled":
        return { label: "DIBATALKAN", bg: "bg-red-50", text: "text-red-600" };
      default:
        return { label: status.toUpperCase(), bg: "bg-gray-50", text: "text-gray-600" };
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch = o.customer_name.toLowerCase().includes(search.toLowerCase()) || o.id.toString().includes(search);
      const matchesFilter = filter === "all" ? true : o.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [orders, search, filter]);

  const renderItem = ({ item }: { item: Order }) => {
    const statusInfo = getStatusDetails(item.status);
    return (
      <Pressable className="bg-white p-4 mx-4 mb-3 rounded-2xl border border-gray-100 shadow-sm" onPress={() => router.push(`/order/${item.id}` as any)}>
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-gray-400 text-xs font-medium">INV: {item.id}</Text>
          <View className={`px-3 py-1 rounded-full ${statusInfo.bg}`}>
            <Text className={`text-[10px] font-bold ${statusInfo.text}`}>{statusInfo.label}</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <Image source={{ uri: "https://res.cloudinary.com/dgsdmgcc7/image/upload/v1770989052/Salinan_LOGO_TF_1-removebg-preview_ybdbz0.png" }} className="w-12 h-12 rounded-lg bg-gray-50" />
          <View className="flex-1 ml-3">
            <Text className="font-bold text-gray-800 text-sm">{item.mitra_name || "Layanan Teknisi"}</Text>
            <Text className="text-gray-400 text-[10px]">{item.scheduled_date}</Text>
            <Text className="text-gray-500 text-[11px] font-medium mt-0.5">Pelanggan: {item.customer_name}</Text>
          </View>
        </View>
        <View className="flex-row justify-between items-center pt-3 border-t border-gray-50 mt-3">
          <Text className="text-gray-400 text-xs">Total</Text>
          <Text className="font-bold text-[#633594]">Rp {parseInt(item.total_price || "0").toLocaleString("id-ID")}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-[#FFF]">
      <StatusBar barStyle="dark-content" />
      <View className="bg-white px-6 pt-12 pb-6">
        <Text className="text-2xl font-bold mb-5">Pesanan</Text>
        <View className="flex-row bg-[#F5F7FA] rounded-[10px] px-4 py-1 items-center mb-4">
          <Search size={20} color="#633594" />
          <TextInput className="ml-3 flex-1 text-sm text-gray-700" placeholder="Cari transaksi..." value={search} onChangeText={setSearch} />
        </View>
        <View className="flex-row gap-2">
          {["all", "unpaid", "completed"].map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} className={`px-4 py-2 rounded-xl border ${filter === f ? "border-[#633594] bg-[#633594]/5" : "border-gray-200"}`}>
              <Text className={`text-[11px] font-bold ${filter === f ? "text-[#633594]" : "text-gray-500"}`}>{f === "all" ? "Semua" : f === "unpaid" ? "Menunggu" : "Selesai"}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <FlatList
        data={filteredOrders}
        contentContainerStyle={{ paddingVertical: 10 }}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <AlertCircle color="#ccc" size={40} />
            <Text className="text-gray-400 mt-2">Data tidak ditemukan</Text>
          </View>
        }
      />
    </View>
  );
}
