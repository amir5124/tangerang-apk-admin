import { useFocusEffect } from "expo-router";
import { Filter, Search } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { orderService } from "../../src/services/orderService";
import { Order } from "../../src/types/order";

const formatRupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
};
export default function DashboardScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
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
      loadData();
    }, []),
  );

  const filteredData = useMemo(() => {
    return orders.filter((o) => o.customer_name.toLowerCase().includes(search.toLowerCase()) || o.id.toString().includes(search));
  }, [orders, search]);

  const stats = useMemo(() => {
    const completedOrders = filteredData.filter((o) => o.status === "completed");
    const totalRev = completedOrders.reduce((sum, o) => sum + parseInt(o.total_price || "0"), 0);

    return {
      revenue: formatRupiah(totalRev),
      completed: completedOrders.length,
      customers: new Set(filteredData.map((o) => o.customer_name)).size,
      total: filteredData.length,
    };
  }, [filteredData]);

  if (loading)
    return (
      <View className="flex-1 justify-center items-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <View className="px-4 pt-10 pb-6 bg-white ">
        <Text className="text-2xl font-bold text-gray-800 mb-4">Dashboard Admin</Text>
        <View className="flex-row bg-[#F5F7FA] rounded-2xl px-4 py-3 items-center">
          <Search size={20} color="#633594" />
          <TextInput className="ml-3 flex-1 text-gray-700" placeholder="Cari transaksi..." value={search} onChangeText={setSearch} />
          <Filter size={20} color="#633594" />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 mt-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap justify-between">
          {[
            { title: "Pendapatan", value: stats.revenue },
            { title: "Pesanan Sukses", value: stats.completed },
            { title: "Pelanggan", value: stats.customers },
            { title: "Total Pesanan", value: stats.total },
          ].map((item, i) => (
            <View key={i} className="bg-white p-5 rounded-[10px]  w-[47%] mb-4 ">
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{item.title}</Text>
              <Text className="text-md font-bold text-gray-800 mt-2">{item.value}</Text>
            </View>
          ))}
        </View>

        <Text className="text-lg font-bold text-gray-800 mt-2 mb-4">Pesanan Terbaru</Text>
        <View className="bg-white rounded-[10px] p-2  mb-10">
          {filteredData.slice(0, 8).map((item) => (
            <View key={item.id} className="flex-row items-center p-4 border-b border-gray-50 last:border-0">
              <View className="w-10 h-10 bg-purple-50 rounded-xl justify-center items-center">
                <Text className="text-purple-600 font-bold text-[10px]">#{item.id.toString().slice(-3)}</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-bold text-gray-800 text-sm">{item.customer_name}</Text>
                <Text className="text-[10px] text-gray-400">{item.scheduled_date}</Text>
              </View>
              <Text className="font-bold text-[#633594] text-xs">Rp {parseInt(item.total_price).toLocaleString("id-ID")}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
