import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Calendar, CheckCircle, Clock, ShoppingBag, Star, Store, TrendingUp, XCircle } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import api from "../src/utils/api";

const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(number);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

export default function MitraPerformanceScreen() {
    const router = useRouter();
    const { mitraId, mitraName } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [performance, setPerformance] = useState<any>(null);

    const fetchPerformance = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/mitra/performance/${mitraId}`);
            if (response.data?.success) {
                setPerformance(response.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (mitraId) fetchPerformance();
        }, [mitraId])
    );

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#F5F7FA]">
                <ActivityIndicator size="large" color="#633594" />
            </View>
        );
    }

    if (!performance) {
        return (
            <View className="flex-1 justify-center items-center bg-[#F5F7FA]">
                <Text className="text-gray-500">Data tidak ditemukan</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-4 bg-[#633594] px-6 py-3 rounded-xl"
                >
                    <Text className="text-white font-bold">Kembali</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const successRate = performance.total_orders > 0
        ? ((performance.completed_orders / performance.total_orders) * 100).toFixed(1)
        : 0;

    return (
        <View className="flex-1 bg-[#F5F7FA]">
            {/* Header */}
            <View className="bg-[#633594] pt-12 pb-6 px-5 rounded-b-[30px]">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mb-4"
                >
                    <ArrowLeft size={22} color="white" />
                </TouchableOpacity>

                <View className="items-center">
                    <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center mb-3">
                        <Store size={40} color="white" />
                    </View>
                    <Text className="text-white text-2xl font-bold text-center">
                        {performance.mitra_name}
                    </Text>
                    <Text className="text-white/70 text-sm mt-1">
                        {performance.store_name || "Mitra TangerangFast"}
                    </Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-5 -mt-6" showsVerticalScrollIndicator={false}>
                {/* Rating & Info Card */}
                <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
                    <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-100">
                        <View className="items-center flex-1">
                            <Star size={24} color="#F59E0B" fill="#F59E0B" />
                            <Text className="text-2xl font-bold text-gray-800 mt-1">
                                {performance.rating || "4.8"}
                            </Text>
                            <Text className="text-xs text-gray-500">Rating</Text>
                        </View>
                        <View className="items-center flex-1">
                            <Calendar size={24} color="#633594" />
                            <Text className="text-2xl font-bold text-gray-800 mt-1">
                                {performance.active_months || 0}
                            </Text>
                            <Text className="text-xs text-gray-500">Bulan Aktif</Text>
                        </View>
                        <View className="items-center flex-1">
                            <CheckCircle size={24} color="#22C55E" />
                            <Text className="text-2xl font-bold text-gray-800 mt-1">
                                {successRate}%
                            </Text>
                            <Text className="text-xs text-gray-500">Sukses</Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View className="mt-2">
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-xs text-gray-500">Tingkat Keberhasilan</Text>
                            <Text className="text-xs font-bold text-[#633594]">{successRate}%</Text>
                        </View>
                        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">

                        </View>
                    </View>
                </View>

                {/* Statistik Utama */}
                <View className="flex-row flex-wrap justify-between">
                    <View className="bg-white p-5 rounded-2xl w-[48%] mb-4 shadow-sm">
                        <View className="bg-purple-50 self-start p-2 rounded-xl mb-3">
                            <ShoppingBag size={20} color="#633594" />
                        </View>
                        <Text className="text-gray-400 text-[10px] font-bold uppercase">Total Pesanan</Text>
                        <Text className="text-gray-900 text-xl font-black mt-1">
                            {performance.total_orders || 0}
                        </Text>
                    </View>

                    <View className="bg-white p-5 rounded-2xl w-[48%] mb-4 shadow-sm">
                        <View className="bg-green-50 self-start p-2 rounded-xl mb-3">
                            <CheckCircle size={20} color="#22C55E" />
                        </View>
                        <Text className="text-gray-400 text-[10px] font-bold uppercase">Selesai</Text>
                        <Text className="text-gray-900 text-xl font-black mt-1">
                            {performance.completed_orders || 0}
                        </Text>
                    </View>

                    <View className="bg-white p-5 rounded-2xl w-[48%] mb-4 shadow-sm">
                        <View className="bg-orange-50 self-start p-2 rounded-xl mb-3">
                            <Clock size={20} color="#F59E0B" />
                        </View>
                        <Text className="text-gray-400 text-[10px] font-bold uppercase">Diproses</Text>
                        <Text className="text-gray-900 text-xl font-black mt-1">
                            {performance.pending_orders || 0}
                        </Text>
                    </View>

                    <View className="bg-white p-5 rounded-2xl w-[48%] mb-4 shadow-sm">
                        <View className="bg-red-50 self-start p-2 rounded-xl mb-3">
                            <XCircle size={20} color="#EF4444" />
                        </View>
                        <Text className="text-gray-400 text-[10px] font-bold uppercase">Dibatalkan</Text>
                        <Text className="text-gray-900 text-xl font-black mt-1">
                            {performance.cancelled_orders || 0}
                        </Text>
                    </View>
                </View>

                {/* Keuangan */}
                <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
                    <Text className="text-gray-900 font-bold text-base mb-4">Rekapitulasi Keuangan</Text>

                    <View className="border-b border-gray-100 pb-3 mb-3">
                        <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">Total Omset</Text>
                        <Text className="text-[#633594] text-2xl font-black">
                            {formatRupiah(performance.total_omset || 0)}
                        </Text>
                    </View>

                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-gray-600 text-sm">Komisi Mitra ({performance.commission_rate || 70}%)</Text>
                        <Text className="text-gray-900 font-bold">
                            {formatRupiah(performance.total_commission || 0)}
                        </Text>
                    </View>

                    <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
                        <Text className="text-gray-600 text-sm">Platform Fee</Text>
                        <Text className="text-gray-900 font-bold">
                            {formatRupiah(performance.total_platform_fee || 0)}
                        </Text>
                    </View>

                    <View className="mt-4 p-3 bg-purple-50 rounded-xl flex-row justify-between items-center">
                        <Text className="text-[#633594] font-bold text-sm">Pendapatan Bersih Mitra</Text>
                        <Text className="text-[#633594] font-black text-lg">
                            {formatRupiah(performance.net_income || 0)}
                        </Text>
                    </View>
                </View>

                {/* Top Produk */}
                {performance.top_products && performance.top_products.length > 0 && (
                    <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
                        <Text className="text-gray-900 font-bold text-base mb-4">Produk Terlaris</Text>
                        {performance.top_products.map((product: any, index: number) => (
                            <View key={index} className="flex-row justify-between items-center py-2 border-b border-gray-50">
                                <Text className="text-gray-700 text-sm flex-1">{product.name}</Text>
                                <Text className="text-gray-900 font-bold">{product.total_sold} pcs</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Catatan Kinerja */}
                <View className="bg-white rounded-2xl p-5 mb-8 shadow-sm">
                    <Text className="text-gray-900 font-bold text-base mb-3">Catatan Kinerja</Text>
                    <View className="space-y-2">
                        <View className="flex-row items-start">
                            <CheckCircle size={14} color="#22C55E" className="mr-2 mt-0.5" />
                            <Text className="text-gray-600 text-sm flex-1">
                                Tingkat penyelesaian pesanan: {successRate}%
                            </Text>
                        </View>
                        <View className="flex-row items-start">
                            <TrendingUp size={14} color="#633594" className="mr-2 mt-0.5" />
                            <Text className="text-gray-600 text-sm flex-1">
                                Total pendapatan bersih: {formatRupiah(performance.net_income || 0)}
                            </Text>
                        </View>
                        <View className="flex-row items-start">
                            <Calendar size={14} color="#F59E0B" className="mr-2 mt-0.5" />
                            <Text className="text-gray-600 text-sm flex-1">
                                Terdaftar sejak: {formatDate(performance.created_at)}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}



