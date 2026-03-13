import { useFocusEffect } from "expo-router";
import { BarChart3, Calendar, Clock, DollarSign, TrendingUp } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { orderService } from "../../src/services/orderService";
import { Order } from "../../src/types/order";

const formatRupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
};

export default function ReportsScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await orderService.getAllOrdersAdmin();
      if (res?.success) setOrders(res.data);
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

  // Kalkulasi data nyata berdasarkan data orders
  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === "completed");
    const totalRev = completed.reduce((sum, o) => sum + parseInt(o.total_price || "0"), 0);
    const successRate = orders.length > 0 ? (completed.length / orders.length) * 100 : 0;

    return {
      revenue: formatRupiah(totalRev),
      successRate: Math.round(successRate),
      totalOrders: orders.length,
      activeMitra: new Set(orders.map((o) => o.mitra_name)).size,
    };
  }, [orders]);

  if (loading)
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );

  return (
    <ScrollView className="flex-1 bg-[#F5F7FA]">
      <View className="bg-white px-4 pt-12 pb-6 mb-4">
        <Text className="text-2xl font-bold text-gray-800">Kontrol Aplikasi</Text>
        <Text className="text-gray-400 text-sm">Kelola aset dan promosi</Text>
      </View>
      <View className="px-4">
        <View className="flex-row bg-white p-1 rounded-[10px] mb-6 border border-gray-100 mt-2">
          {(["weekly", "monthly"] as const).map((p) => (
            <Pressable key={p} onPress={() => setPeriod(p)} className={`flex-1 py-3 rounded-xl items-center ${period === p ? "bg-[#633594]" : ""}`}>
              <Text className={period === p ? "text-white font-bold" : "text-gray-500 font-medium"}>{p === "weekly" ? "Mingguan" : "Bulanan"}</Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row flex-wrap justify-between mb-4 rounded-[10px]">
          <StatCard title="Pendapatan Bersih" value={stats.revenue} icon={DollarSign} color="#2ecc71" />
          <StatCard title="Tingkat Selesai" value={`${stats.successRate}%`} icon={Calendar} color="#3498db" />
          <StatCard title="Total Pesanan" value={stats.totalOrders} icon={Clock} color="#e67e22" />
          <StatCard title="Mitra Aktif" value={stats.activeMitra} icon={TrendingUp} color="#9b59b6" />
        </View>

        {/* Visualisasi Performa */}
        <View className="bg-white p-6 rounded-[10px] mb-6 ">
          <Text className="font-bold text-gray-800 mb-6 flex-row items-center">
            <BarChart3 size={18} color="#633594" /> Status Pesanan
          </Text>
          <View className="mb-5">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600 font-medium">Tingkat Penyelesaian</Text>
              <Text className="text-gray-800 font-bold">{stats.successRate}%</Text>
            </View>
            <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <View className="h-full bg-[#633594]" style={{ width: `${stats.successRate}%` }} />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <View className="bg-white p-5 rounded-3xl w-[47%] mb-4 border border-gray-100">
      <Icon size={24} color={color} />
      <Text className="text-gray-400 text-[10px] uppercase font-bold mt-3">{title}</Text>
      <Text className="text-lg font-bold text-gray-800 mt-1">{value}</Text>
    </View>
  );
}
