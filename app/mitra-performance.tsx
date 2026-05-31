import * as FileSystem from 'expo-file-system';
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
    ArrowLeft,
    Award,
    BarChart3,
    Crown,
    Download,
    Star,
    Trophy,
    Users
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import * as XLSX from "xlsx";
import { orderService } from "../src/services/orderService";
import { Order } from "../src/types/order";

const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(number);
};

// Interface untuk Performa Mitra
interface MitraPerformance {
    mitraId: string;
    mitraName: string;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalOmset: number;
    averageOrderValue: number;
    platformFeeTotal: number;
    vendorShareTotal: number;
    successRate: number;
}

function MitraPerforma() {
    const router = useRouter();
    // Ambil parameter dari URL
    const params = useLocalSearchParams();
    const { mitraId, mitraName, mitraEmail } = params;

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedMitraDetail, setSelectedMitraDetail] = useState<MitraPerformance | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // State untuk filter mitra spesifik dari parameter
    const [selectedMitraFilter, setSelectedMitraFilter] = useState<string | null>(
        mitraName ? decodeURIComponent(mitraName as string) : null
    );

    // Flag untuk pertama kali load - untuk auto open modal
    const [hasAutoOpened, setHasAutoOpened] = useState(false);

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
            // Reset auto open flag saat halaman difokuskan kembali
            setHasAutoOpened(false);
        }, []),
    );

    // Hitung performa semua mitra (GLOBAL - tanpa filter)
    const allMitraPerformanceData = useMemo(() => {
        const mitraMap = new Map<string, MitraPerformance>();

        orders.forEach((order) => {
            const mitraNameOrder = order.mitra_name;
            if (!mitraMap.has(mitraNameOrder)) {
                mitraMap.set(mitraNameOrder, {
                    mitraId: mitraNameOrder,
                    mitraName: mitraNameOrder,
                    totalOrders: 0,
                    completedOrders: 0,
                    cancelledOrders: 0,
                    totalOmset: 0,
                    averageOrderValue: 0,
                    platformFeeTotal: 0,
                    vendorShareTotal: 0,
                    successRate: 0,
                });
            }

            const mitra = mitraMap.get(mitraNameOrder)!;
            mitra.totalOrders++;

            const omset = parseFloat(order.total_price || "0");
            const platformFee = parseFloat(order.platform_fee || "0");
            const vendorShare = omset * 0.7;

            const isCompleted = (order.payment_status === "settlement" || order.status === "completed");
            const isCancelled = order.status === "cancelled" || order.payment_status === "cancel";

            if (isCompleted) {
                mitra.completedOrders++;
                mitra.totalOmset += omset;
                mitra.platformFeeTotal += platformFee;
                mitra.vendorShareTotal += vendorShare;
            }

            if (isCancelled) {
                mitra.cancelledOrders++;
            }
        });

        const performances: MitraPerformance[] = Array.from(mitraMap.values()).map((mitra) => ({
            ...mitra,
            averageOrderValue: mitra.completedOrders > 0 ? mitra.totalOmset / mitra.completedOrders : 0,
            successRate: mitra.totalOrders > 0 ? (mitra.completedOrders / mitra.totalOrders) * 100 : 0,
        }));

        return performances.sort((a, b) => b.totalOmset - a.totalOmset);
    }, [orders]);

    // Data untuk tampilan (bisa global atau filter berdasarkan selectedMitraFilter)
    const displayData = useMemo(() => {
        if (selectedMitraFilter) {
            const filtered = allMitraPerformanceData.filter(
                m => m.mitraName.toLowerCase() === selectedMitraFilter.toLowerCase()
            );
            return filtered;
        }
        return allMitraPerformanceData;
    }, [allMitraPerformanceData, selectedMitraFilter]);

    // Statistik keseluruhan (GLOBAL untuk Top Performers)
    const globalStats = useMemo(() => {
        const totalMitra = allMitraPerformanceData.length;
        const totalOrdersAll = allMitraPerformanceData.reduce((sum, m) => sum + m.totalOrders, 0);
        const totalCompletedAll = allMitraPerformanceData.reduce((sum, m) => sum + m.completedOrders, 0);
        const totalOmsetAll = allMitraPerformanceData.reduce((sum, m) => sum + m.totalOmset, 0);
        const avgSuccessRate = allMitraPerformanceData.length > 0
            ? allMitraPerformanceData.reduce((sum, m) => sum + m.successRate, 0) / allMitraPerformanceData.length
            : 0;

        const topMitra = allMitraPerformanceData.slice(0, 3);

        return {
            totalMitra,
            totalOrdersAll,
            totalCompletedAll,
            totalOmsetAll: formatRupiah(totalOmsetAll),
            avgSuccessRate: avgSuccessRate.toFixed(1),
            topMitra,
        };
    }, [allMitraPerformanceData]);

    // Statistik untuk tampilan (jika filter aktif, tampilkan stat dari filter)
    const displayStats = useMemo(() => {
        if (selectedMitraFilter && displayData.length === 1) {
            const mitra = displayData[0];
            return {
                totalMitra: 1,
                totalOrdersAll: mitra.totalOrders,
                totalCompletedAll: mitra.completedOrders,
                totalOmsetAll: formatRupiah(mitra.totalOmset),
                avgSuccessRate: mitra.successRate.toFixed(1),
                topMitra: [mitra],
            };
        }
        return globalStats;
    }, [selectedMitraFilter, displayData, globalStats]);

    // Data performa untuk mitra yang dipilih di modal
    const selectedMitraPerformance = useMemo(() => {
        if (!selectedMitraDetail) return null;
        return allMitraPerformanceData.find(m => m.mitraName === selectedMitraDetail.mitraName);
    }, [selectedMitraDetail, allMitraPerformanceData]);

    // Order details untuk mitra yang dipilih di modal
    const selectedMitraOrders = useMemo(() => {
        if (!selectedMitraDetail) return [];
        return orders.filter(o => o.mitra_name === selectedMitraDetail.mitraName);
    }, [selectedMitraDetail, orders]);

    // Auto open modal jika ada parameter mitraName dan data sudah loaded
    useFocusEffect(
        useCallback(() => {
            if (!hasAutoOpened && allMitraPerformanceData.length > 0 && selectedMitraFilter) {
                const targetMitra = allMitraPerformanceData.find(
                    m => m.mitraName.toLowerCase() === selectedMitraFilter.toLowerCase()
                );
                if (targetMitra) {
                    setSelectedMitraDetail(targetMitra);
                    setShowDetailModal(true);
                    setHasAutoOpened(true);
                }
            }
        }, [allMitraPerformanceData, selectedMitraFilter, hasAutoOpened])
    );

    // Reset filter ketika modal ditutup (opsional - bisa diaktifkan jika ingin)
    const handleCloseDetailModal = () => {
        setShowDetailModal(false);
        setSelectedMitraDetail(null);
        // Jika ingin mereset filter saat modal ditutup, uncomment baris di bawah
        // setSelectedMitraFilter(null);
    };

    // Clear filter
    const clearFilter = () => {
        setSelectedMitraFilter(null);
    };

    // Export performa mitra ke Excel
    const exportMitraPerformance = async () => {
        const exportData = displayData.map((m) => ({
            "Nama Mitra": m.mitraName,
            "Total Order": m.totalOrders,
            "Order Selesai": m.completedOrders,
            "Order Dibatalkan": m.cancelledOrders,
            "Total Omset": m.totalOmset,
            "Rata-rata per Order": m.averageOrderValue,
            "Share Vendor (70%)": m.vendorShareTotal,
            "Platform Fee": m.platformFeeTotal,
            "Success Rate": `${m.successRate.toFixed(1)}%`,
        }));

        if (exportData.length === 0) {
            return Alert.alert("Info", "Tidak ada data mitra untuk diekspor.");
        }

        setIsExporting(true);
        try {
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Performa Mitra");
            const filename = `Performa_Mitra_${Date.now()}.xlsx`;
            if (Platform.OS === 'web') {
                XLSX.writeFile(wb, filename);
            } else {
                const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
                const uri = (FileSystem as any).documentDirectory + filename;
                await FileSystem.writeAsStringAsync(uri, base64, {
                    encoding: (FileSystem as any).EncodingType.Base64,
                });
                await Sharing.shareAsync(uri);
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Gagal", "Terjadi kesalahan saat mengekspor data.");
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#F8F9FD]">
                <ActivityIndicator size="large" color="#633594" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#F8F9FD]">
            {/* MODAL DETAIL MITRA */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showDetailModal}
                onRequestClose={handleCloseDetailModal}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-[20px] p-6 pb-10 max-h-[90%]">
                        {/* Handle untuk drag ke bawah (opsional) */}
                        <View className="items-center mb-4">
                            <View className="w-12 h-1 bg-gray-300 rounded-full" />
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="items-center mb-6">
                                <View className="bg-gradient-to-r from-purple-500 to-purple-700 p-5 rounded-full mb-4">
                                    <Trophy size={40} color="white" />
                                </View>
                                <Text className="text-2xl font-black text-gray-900 text-center">
                                    {selectedMitraDetail?.mitraName}
                                </Text>
                                {mitraEmail && (
                                    <Text className="text-sm text-gray-500 mt-1">{mitraEmail}</Text>
                                )}
                                <View className="flex-row items-center mt-2">
                                    <View className={`px-3 py-1 rounded-full ${(selectedMitraPerformance?.successRate || 0) >= 80 ? 'bg-green-100' : (selectedMitraPerformance?.successRate || 0) >= 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                                        <Text className={`text-xs font-bold ${(selectedMitraPerformance?.successRate || 0) >= 80 ? 'text-green-600' : (selectedMitraPerformance?.successRate || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            Success Rate: {selectedMitraPerformance?.successRate.toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {selectedMitraPerformance && (
                                <>
                                    {/* Stat Cards */}
                                    <View className="flex-row flex-wrap justify-between mb-6">
                                        <View className="bg-green-50 p-4 rounded-2xl w-[48%] mb-3">
                                            <Text className="text-green-600 text-[10px] font-bold uppercase">Total Omset</Text>
                                            <Text className="text-green-700 font-bold text-lg mt-1">
                                                {formatRupiah(selectedMitraPerformance.totalOmset)}
                                            </Text>
                                        </View>
                                        <View className="bg-blue-50 p-4 rounded-2xl w-[48%] mb-3">
                                            <Text className="text-blue-600 text-[10px] font-bold uppercase">Rata-rata Order</Text>
                                            <Text className="text-blue-700 font-bold text-lg mt-1">
                                                {formatRupiah(selectedMitraPerformance.averageOrderValue)}
                                            </Text>
                                        </View>
                                        <View className="bg-purple-50 p-4 rounded-2xl w-[48%] mb-3">
                                            <Text className="text-purple-600 text-[10px] font-bold uppercase">Order Selesai</Text>
                                            <Text className="text-purple-700 font-bold text-2xl mt-1">
                                                {selectedMitraPerformance.completedOrders}
                                            </Text>
                                            <Text className="text-[10px] text-gray-400">dari {selectedMitraPerformance.totalOrders} total</Text>
                                        </View>
                                        <View className="bg-orange-50 p-4 rounded-2xl w-[48%] mb-3">
                                            <Text className="text-orange-600 text-[10px] font-bold uppercase">Order Dibatalkan</Text>
                                            <Text className="text-orange-700 font-bold text-2xl mt-1">
                                                {selectedMitraPerformance.cancelledOrders}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Financial Breakdown */}
                                    <View className="bg-gradient-to-r from-purple-50 to-purple-100 p-5 rounded-2xl mb-6">
                                        <Text className="font-bold text-gray-800 mb-4 text-base">💰 Rincian Keuangan</Text>
                                        <View className="flex-row justify-between py-3 border-b border-purple-200">
                                            <Text className="text-gray-600 text-sm">Share Vendor (70%)</Text>
                                            <Text className="font-bold text-purple-700 text-sm">
                                                {formatRupiah(selectedMitraPerformance.vendorShareTotal)}
                                            </Text>
                                        </View>
                                        <View className="flex-row justify-between py-3">
                                            <Text className="text-gray-600 text-sm">Platform Fee</Text>
                                            <Text className="font-bold text-purple-700 text-sm">
                                                {formatRupiah(selectedMitraPerformance.platformFeeTotal)}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Recent Orders */}
                                    <Text className="font-bold text-gray-800 mb-4 text-base">📋 Riwayat Order Terbaru</Text>
                                    {selectedMitraOrders.slice(0, 10).map((order) => (
                                        <View key={order.id} className="bg-gray-50 p-4 rounded-xl mb-3">
                                            <View className="flex-row justify-between items-center mb-2">
                                                <Text className="text-xs font-bold text-purple-600">#{order.id}</Text>
                                                <Text className="text-[10px] text-gray-400">{order.order_date}</Text>
                                            </View>
                                            <Text className="text-sm text-gray-700 mb-2">{order.customer_name}</Text>
                                            <View className="flex-row justify-between items-center">
                                                <Text className="text-base font-bold text-purple-600">
                                                    {formatRupiah(parseFloat(order.total_price || "0"))}
                                                </Text>
                                                <View className={`px-3 py-1 rounded-full ${order.status === "completed" ? "bg-green-100" : "bg-yellow-100"}`}>
                                                    <Text className={`text-[10px] font-bold ${order.status === "completed" ? "text-green-600" : "text-yellow-600"}`}>
                                                        {order.status === "completed" ? "SELESAI" : order.status?.toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </>
                            )}

                            <TouchableOpacity
                                onPress={handleCloseDetailModal}
                                className="mt-4 bg-gray-100 py-4 rounded-xl items-center"
                            >
                                <Text className="text-gray-600 font-bold">Tutup</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* MODAL KONFIRMASI EKSPOR */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showExportModal}
                onRequestClose={() => setShowExportModal(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-[40px] p-8 shadow-2xl">
                        <View className="items-center mb-6">
                            <View className="w-16 h-1.5 bg-gray-200 rounded-full mb-6" />
                            <View className="bg-purple-100 p-4 rounded-full mb-4">
                                <Download size={32} color="#633594" />
                            </View>
                            <Text className="text-xl font-black text-gray-900">Konfirmasi Ekspor</Text>
                            <Text className="text-gray-500 text-center mt-2 px-4">
                                {selectedMitraFilter
                                    ? `Anda akan mengekspor data performa ${selectedMitraFilter} ke format Excel (.xlsx)`
                                    : "Anda akan mengekspor semua data performa mitra ke format Excel (.xlsx)"}
                            </Text>
                        </View>
                        <View className="flex-row space-x-4">
                            <TouchableOpacity
                                onPress={() => setShowExportModal(false)}
                                className="flex-1 bg-gray-100 py-4 rounded-2xl items-center"
                            >
                                <Text className="text-gray-600 font-bold">Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={exportMitraPerformance}
                                className="flex-1 bg-[#633594] py-4 rounded-2xl items-center"
                            >
                                <Text className="text-white font-bold">Ya, Ekspor Sekarang</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* HEADER SECTION */}
            <View className="px-6 pt-14 pb-8 bg-gradient-to-r from-purple-700 to-purple-500">
                <View className="flex-row justify-between items-center mb-6">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="bg-white/20 p-2 rounded-xl"
                    >
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="bg-white/20 p-2 rounded-xl"
                        onPress={() => setShowExportModal(true)}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Download size={22} color="white" />
                        )}
                    </TouchableOpacity>
                </View>

                <View className="items-center">
                    <View className="bg-white/20 p-4 rounded-full mb-4">
                        <Trophy size={40} color="white" />
                    </View>
                    <Text className="text-white text-3xl font-black text-center">
                        Performa Mitra
                    </Text>
                    <Text className="text-white/70 text-sm text-center mt-2">
                        Pantau kinerja dan statistik lengkap semua mitra
                    </Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-5 -mt-6" showsVerticalScrollIndicator={false}>
                {/* Banner Filter Aktif */}
                {selectedMitraFilter && (
                    <View className="bg-purple-100 rounded-2xl p-3 mb-4 flex-row justify-between items-center">
                        <Text className="text-purple-700 text-sm">
                            Menampilkan data untuk: <Text className="font-bold">{selectedMitraFilter}</Text>
                        </Text>
                        <TouchableOpacity onPress={clearFilter} className="bg-purple-200 px-3 py-1 rounded-full">
                            <Text className="text-purple-700 text-xs font-bold">Tampilkan Semua</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* OVERVIEW CARDS */}
                <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm">
                    <View className="flex-row items-center mb-5">
                        <View className="bg-purple-100 p-2 rounded-xl">
                            <BarChart3 size={20} color="#633594" />
                        </View>
                        <Text className="ml-3 text-gray-900 font-bold text-base">
                            {selectedMitraFilter ? "Ringkasan Performa Mitra" : "Ringkasan Performa"}
                        </Text>
                    </View>

                    <View className="flex-row justify-between">
                        <View className="items-center flex-1">
                            <Text className="text-3xl font-black text-purple-600">{displayStats.totalMitra}</Text>
                            <Text className="text-[11px] text-gray-400 mt-1">
                                {selectedMitraFilter ? "Data Mitra" : "Total Mitra"}
                            </Text>
                        </View>
                        <View className="items-center flex-1">
                            <Text className="text-3xl font-black text-purple-600">{displayStats.totalCompletedAll}</Text>
                            <Text className="text-[11px] text-gray-400 mt-1">Order Selesai</Text>
                        </View>
                        <View className="items-center flex-1">
                            <Text className="text-3xl font-black text-purple-600">{displayStats.avgSuccessRate}%</Text>
                            <Text className="text-[11px] text-gray-400 mt-1">Rata-rata Sukses</Text>
                        </View>
                    </View>

                    <View className="mt-5 pt-4 border-t border-gray-100">
                        <Text className="text-[11px] text-gray-500 text-center">
                            Total Omset: {displayStats.totalOmsetAll}
                        </Text>
                    </View>
                </View>

                {/* TOP PERFORMERS SECTION - GLOBAL (hanya tampil jika tidak ada filter) */}
                {!selectedMitraFilter && globalStats.topMitra.length > 0 && (
                    <View className="mb-6">
                        <View className="flex-row items-center mb-4">
                            <Crown size={18} color="#F59E0B" />
                            <Text className="ml-2 text-gray-900 font-bold text-base">Top Performers</Text>
                            <Text className="ml-2 text-[10px] text-gray-400">(3 Mitra Terbaik Global)</Text>
                        </View>

                        {globalStats.topMitra.map((mitra, index) => (
                            <TouchableOpacity
                                key={mitra.mitraName}
                                onPress={() => {
                                    setSelectedMitraDetail(mitra);
                                    setShowDetailModal(true);
                                }}
                                className="bg-white rounded-2xl p-4 mb-3 flex-row items-center shadow-sm border border-gray-100"
                            >
                                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${index === 0 ? 'bg-yellow-100' : index === 1 ? 'bg-gray-100' : 'bg-orange-100'}`}>
                                    {index === 0 ? (
                                        <Crown size={24} color="#F59E0B" />
                                    ) : index === 1 ? (
                                        <Award size={24} color="#9CA3AF" />
                                    ) : (
                                        <Star size={24} color="#F97316" />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-center justify-between">
                                        <Text className="font-bold text-gray-800 text-base">{mitra.mitraName}</Text>
                                        <Text className="text-xs font-bold text-purple-600">
                                            #{index + 1}
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center mt-1">
                                        <Text className="text-[10px] text-gray-500">{mitra.completedOrders} order selesai</Text>
                                        <View className="w-1 h-1 bg-gray-300 rounded-full mx-2" />
                                        <Text className="text-[10px] font-bold text-green-600">{mitra.successRate.toFixed(0)}% sukses</Text>
                                    </View>
                                    <Text className="text-sm font-bold text-purple-600 mt-1">
                                        {formatRupiah(mitra.totalOmset)}
                                    </Text>
                                </View>
                                <View className="bg-purple-100 px-3 py-1 rounded-full">
                                    <Text className="text-[10px] font-bold text-purple-600">Detail</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* ALL MITRA LIST */}
                <View className="mb-10">
                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row items-center">
                            <Users size={18} color="#633594" />
                            <Text className="ml-2 text-gray-900 font-bold text-base">
                                {selectedMitraFilter ? "Detail Performa" : "Semua Mitra"}
                            </Text>
                            <Text className="ml-2 text-[10px] text-gray-400">({displayData.length})</Text>
                        </View>
                    </View>

                    {displayData.map((mitra, idx) => (
                        <TouchableOpacity
                            key={mitra.mitraName}
                            onPress={() => {
                                setSelectedMitraDetail(mitra);
                                setShowDetailModal(true);
                            }}
                            className="bg-white rounded-2xl p-4 mb-3 flex-row items-center shadow-sm border border-gray-100"
                        >
                            <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
                                <Text className="font-bold text-purple-600 text-sm">
                                    {mitra.mitraName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="font-bold text-gray-800 text-sm">{mitra.mitraName}</Text>
                                <View className="flex-row items-center mt-1">
                                    <View className="bg-green-100 px-2 py-0.5 rounded-full mr-2">
                                        <Text className="text-[9px] font-bold text-green-600">{mitra.successRate.toFixed(0)}%</Text>
                                    </View>
                                    <Text className="text-[10px] text-gray-400">{mitra.completedOrders} order</Text>
                                </View>
                            </View>
                            <View className="items-end">
                                <Text className="font-bold text-purple-600 text-sm">
                                    {formatRupiah(mitra.totalOmset)}
                                </Text>
                                <Text className="text-[9px] text-gray-400 mt-1">
                                    {mitra.totalOrders} total order
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {displayData.length === 0 && (
                        <View className="bg-white rounded-2xl p-10 items-center">
                            <Users size={50} color="#cbd5e1" />
                            <Text className="text-gray-400 mt-3 text-center">
                                {selectedMitraFilter
                                    ? `Tidak ada data performa untuk ${selectedMitraFilter}`
                                    : "Belum ada data mitra"}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

export default MitraPerforma;