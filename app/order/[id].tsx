import { Stack, useLocalSearchParams } from "expo-router";
import { Calendar, FileText, Info, MapPin, User, Wrench } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { orderService } from "../../src/services/orderService";
import { Order, OrderItem } from "../../src/types/order";

export default function DetailOrderScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      orderService
        .getDetailOrder(id as string)
        .then((res) => setOrder(res.data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const getStatusDetails = (status: string) => {
    switch (status.toLowerCase()) {
      case "unpaid":
        return { label: "MENUNGGU", bg: "bg-orange-50", text: "text-orange-600" };
      case "accepted":
        return { label: "DITERIMA", bg: "bg-blue-50", text: "text-blue-600" };
      case "on_the_way":
        return { label: "DI PERJALANAN", bg: "bg-purple-50", text: "text-purple-600" };
      case "working":
        return { label: "SEDANG DIKERJAKAN", bg: "bg-yellow-50", text: "text-yellow-600" };
      case "completed":
        return { label: "SELESAI", bg: "bg-green-50", text: "text-green-600" };
      case "cancelled":
        return { label: "DIBATALKAN", bg: "bg-red-50", text: "text-red-600" };
      default:
        return { label: status.toUpperCase(), bg: "bg-gray-50", text: "text-gray-600" };
    }
  };

  if (loading)
    return (
      <View className="flex-1 justify-center items-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );

  if (!order)
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-500">Pesanan tidak ditemukan.</Text>
      </View>
    );

  const statusInfo = getStatusDetails(order.status);
  const services = typeof order.items === "string" ? JSON.parse(order.items || "[]") : order.items || [];

  return (
    <ScrollView className="flex-1 bg-[#F5F7FA]" showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: `Order #${id}`, headerTintColor: "#633594", headerShadowVisible: false }} />

      <View className="p-4 space-y-4">
        <View className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider">Status Pesanan</Text>
            <View className={`px-4 py-1.5 rounded-full ${statusInfo.bg}`}>
              <Text className={`font-bold text-xs ${statusInfo.text}`}>{statusInfo.label}</Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <Calendar size={18} color="#633594" />
            <Text className="ml-3 text-gray-700 font-medium">
              {order.scheduled_date} • {order.scheduled_time}
            </Text>
          </View>
        </View>

        <View className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Detail Pelanggan & Mitra</Text>
          <View className="space-y-4">
            <View className="flex-row items-center">
              <User size={20} color="#633594" className="opacity-70" />
              <View className="ml-4">
                <Text className="text-[10px] text-gray-400">Customer</Text>
                <Text className="font-bold text-gray-800">{order.customer_name}</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Wrench size={20} color="#2596be" className="opacity-70" />
              <View className="ml-4">
                <Text className="text-[10px] text-gray-400">Mitra</Text>
                <Text className="font-bold text-gray-800">{order.mitra_name || "Menunggu..."}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-4">
            <MapPin size={18} color="#633594" />
            <Text className="ml-2 text-gray-400 text-xs font-bold uppercase tracking-wider">Lokasi & Catatan</Text>
          </View>
          <Text className="text-gray-700 leading-5">{order.address_customer}</Text>
          {order.customer_notes && (
            <View className="mt-4 p-3 bg-gray-50 rounded-xl flex-row items-start">
              <Info size={16} color="#633594" className="mt-0.5" />
              <Text className="ml-2 text-xs text-gray-600 italic flex-1">{order.customer_notes}</Text>
            </View>
          )}
        </View>

        <View className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-4">
            <FileText size={18} color="#633594" />
            <Text className="ml-2 text-gray-400 text-xs font-bold uppercase tracking-wider">Rincian Layanan</Text>
          </View>
          {services.map((item: OrderItem, index: number) => (
            <View key={index} className="flex-row justify-between mb-2">
              <Text className="text-gray-600">
                {item.nama} <Text className="text-gray-400 text-xs">x{item.qty}</Text>
              </Text>
              <Text className="font-medium text-gray-800">Rp {item.hargaSatuan.toLocaleString("id-ID")}</Text>
            </View>
          ))}
          <View className="mt-4 pt-4 border-t border-gray-100 flex-row justify-between items-center">
            <Text className="font-bold text-gray-800">Total Bayar</Text>
            <Text className="font-bold text-lg text-[#633594]">Rp {parseInt(order.total_price || "0").toLocaleString("id-ID")}</Text>
          </View>
        </View>

        {order.proof_image_url && (
          <View className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Bukti Pengerjaan</Text>
            <Image source={{ uri: order.proof_image_url }} className="w-full h-60 rounded-2xl" />
          </View>
        )}
      </View>
      <View className="h-10" />
    </ScrollView>
  );
}
