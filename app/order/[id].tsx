import { router, useLocalSearchParams } from "expo-router";
import { AlertCircle, ArrowLeft, Building2, Calendar, Clock, FileText, Info, MapPin, User, Wrench } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
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
        return { label: "MENUNGGU PEMBAYARAN", bg: "bg-orange-50", text: "text-orange-600" };
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

  const formatOrderDate = (dateString: string): string => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    // Tambah 7 jam untuk konversi ke WIB
    date.setHours(date.getHours() + 7);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    // Ambil jam dan menit
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
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
    <View className="flex-1 bg-[#F5F7FA]">
      {/* HEADER: FIXED TOP */}
      <View className="absolute top-0 left-0 right-0 z-50 bg-white px-4  pb-4 flex-row items-center justify-between border-b border-gray-100">
        {/* Tombol Back */}
        <View className="z-10">
          <Pressable onPress={() => router.back()} className="p-0 ml-2 pt-4">
            <ArrowLeft size={24} color="#633594" />
          </Pressable>
        </View>

        {/* Judul Rata Tengah */}
        <View className="absolute inset-x-0 inset-y-0  flex-row justify-center items-center pointer-events-none">
          <Text className="text-xl font-bold text-gray-800">Detail Order</Text>
          <Text className="ml-2 text-xl font-bold text-gray-80">#{order.id}</Text>
        </View>

        {/* Spacer Kanan agar Flexbox tetap balance */}
        <View className="w-10" />
      </View>

      {/* AREA KONTEN SCROLLABLE */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 60, paddingBottom: 40 }}>
        <View className="p-4 space-y-4">
          {/* Card 1: Status & Info Layanan */}
          <View className="bg-white p-5 rounded-[20px] border border-gray-100">
            {/* Header Status */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Status Pesanan</Text>
              <View className={`px-4 py-1.5 rounded-full ${statusInfo.bg}`}>
                <Text className={`font-bold text-[10px] ${statusInfo.text}`}>{statusInfo.label}</Text>
              </View>
            </View>

            {/* Info Tanggal Pesan */}
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 rounded-full bg-purple-50 items-center justify-center">
                <Calendar size={14} color="#633594" />
              </View>
              <View className="ml-3">
                <Text className="text-gray-400 text-[10px]">Tanggal Pesan</Text>
                <Text className="text-gray-700 font-bold text-xs">{formatOrderDate(order.order_date)}</Text>
              </View>
            </View>

            {/* Info Pelanggan */}
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 rounded-full bg-purple-50 items-center justify-center">
                <User size={14} color="#633594" />
              </View>
              <View className="ml-3">
                <Text className="text-gray-400 text-[10px]">Pelanggan</Text>
                <Text className="text-gray-700 font-bold text-xs">{order.customer_name}</Text>
              </View>
            </View>

            {/* Info Jadwal Kerja */}
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-purple-50 items-center justify-center">
                <Clock size={14} color="#633594" />
              </View>
              <View className="ml-3">
                <Text className="text-gray-400 text-[10px]">Jadwal Layanan</Text>
                <Text className="text-gray-700 font-bold text-xs">
                  {order.scheduled_date} • {order.scheduled_time?.substring(0, 5)}
                </Text>
              </View>
            </View>

            {/* SEKSI PEMBATALAN: Hanya muncul jika status cancelled */}
            {order.status === "cancelled" && (
              <View className="mt-5 pt-4 border-t border-gray-50">
                <View className="bg-red-50 p-4 rounded-2xl border border-red-100">
                  <View className="flex-row items-center mb-2">
                    <AlertCircle size={16} color="#ef4444" />
                    <Text className="ml-2 text-red-700 font-black text-[10px] uppercase">
                      Dibatalkan Oleh: {order.cancelled_by === "system" ? "Sistem Otomatis" : order.cancelled_by === "mitra" ? "Mitra" : "Pelanggan"}
                    </Text>
                  </View>
                  <Text className="text-red-600 text-xs leading-4">"{order.cancel_reason || "-"}"</Text>
                  {order.cancelled_by === "system" && !order.cancel_reason && <Text className="text-red-400 text-[10px] mt-1">*Dibatalkan otomatis karena melewati batas waktu respon.</Text>}
                </View>
              </View>
            )}
          </View>

          {/* Card 2: Detail Pelanggan & Mitra */}
          <View className="bg-white p-5 rounded-[10px]">
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
                <Wrench size={20} color="#633594" className="opacity-70" />
                <View className="ml-4">
                  <Text className="text-[10px] text-gray-400">Mitra</Text>
                  <Text className="font-bold text-gray-800">{order.mitra_name || "Menunggu..."}</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Building2 size={20} color="#633594" className="opacity-70" />
                <View className="ml-4">
                  <Text className="text-[10px] text-gray-400">Jenis Gedung</Text>
                  <Text className="font-bold text-gray-800">{order.building_type}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Card 3: Lokasi */}
          <View className="bg-white p-5 rounded-[10px]">
            <View className="flex-row items-center mb-4">
              <MapPin size={18} color="#633594" />
              <Text className="ml-2 text-gray-400 text-xs font-bold uppercase tracking-wider">Lokasi & Catatan</Text>
            </View>
            <Text className="text-gray-700 leading-5">{order.address_customer}</Text>
            {order.customer_notes && (
              <View className="mt-4 p-3 bg-gray-50 rounded-xl flex-row items-start">
                <Info size={16} color="#633594" className="mt-0.5" />
                <Text className="ml-2 text-xs text-gray-600 flex-1">{order.customer_notes}</Text>
              </View>
            )}
          </View>

          {/* Card 4: Rincian Biaya & Layanan */}
          {(() => {
            const buildingFee = order.building_type === "Rumah" ? 0 : 5000;
            const totalPrice = parseInt(order.total_price) + parseInt(order.platform_fee) + parseInt(order.service_fee);

            return (
              <View className="bg-white p-5 rounded-[10px]">
                <View className="flex-row items-center mb-4">
                  <FileText size={18} color="#633594" />
                  <Text className="ml-2 text-gray-400 text-xs font-bold uppercase tracking-wider">Rincian Layanan</Text>
                </View>

                {services.map((item: OrderItem, index: number) => (
                  <View key={index} className="flex-row justify-between mb-3">
                    <Text className="text-gray-600 flex-1 mr-2">
                      {item.nama} <Text className="text-gray-400 text-xs">x{item.qty}</Text>
                    </Text>
                    <Text className="font-medium text-gray-800">Rp {item.hargaSatuan.toLocaleString("id-ID")}</Text>
                  </View>
                ))}

                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500">Biaya Gedung ({order.building_type})</Text>
                  <Text className="text-gray-800 font-medium">Rp {buildingFee.toLocaleString("id-ID")}</Text>
                </View>

                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500">Biaya Layanan</Text>
                  <Text className="text-gray-800 font-medium">Rp {parseInt(order.platform_fee).toLocaleString("id-ID")}</Text>
                </View>

                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500">Biaya Admin (PG)</Text>
                  <Text className="text-gray-800 font-medium">Rp {parseInt(order.service_fee).toLocaleString("id-ID")}</Text>
                </View>

                <View className="mt-4 pt-4 border-t border-dashed border-gray-200 flex-row justify-between items-center">
                  <Text className="font-bold text-gray-800 text-base">Total Pembayaran</Text>
                  <Text className="font-bold text-xl text-[#633594]">Rp {totalPrice.toLocaleString("id-ID")}</Text>
                </View>
              </View>
            );
          })()}

          {/* Card 5: Bukti Pengerjaan */}
          {order.proof_image_url && (
            <View className="bg-white p-5 rounded-[10px] overflow-hidden">
              <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Bukti Pengerjaan</Text>
              <Image source={{ uri: order.proof_image_url }} className="w-full h-60 rounded-2xl" />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
