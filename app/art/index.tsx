import { router } from "expo-router";
import {
    AlertCircle,
    ClipboardList,
    Clock,
    DollarSign
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View
} from "react-native";
import { ArtOrder, orderService } from "../../src/services/orderService";

export default function ArtDashboard() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orders, setOrders] = useState<ArtOrder[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        paid: 0,
        matching: 0,
        approved: 0,
        working: 0,
        done: 0,
        cancelled: 0,
        totalRevenue: 0
    });

    const fetchData = async () => {
        try {
            // ✅ Admin - ambil SEMUA pesanan
            const response = await orderService.getAllOrdersArt();
            if (response.success) {
                const data = response.data || [];
                setOrders(data);

                // Hitung statistik
                const paidOrders = data.filter((o: ArtOrder) => o.status === 'paid' || o.status === 'approved' || o.status === 'done');
                const totalRevenue = paidOrders.reduce((sum: number, o: ArtOrder) => sum + o.total, 0);

                const newStats = {
                    total: data.length,
                    pending: data.filter((o: ArtOrder) => o.status === 'pending').length,
                    paid: data.filter((o: ArtOrder) => o.status === 'paid').length,
                    matching: data.filter((o: ArtOrder) => o.status === 'matching').length,
                    approved: data.filter((o: ArtOrder) => o.status === 'approved').length,
                    working: data.filter((o: ArtOrder) => o.status === 'working').length,
                    done: data.filter((o: ArtOrder) => o.status === 'done').length,
                    cancelled: data.filter((o: ArtOrder) => o.status === 'cancelled').length,
                    totalRevenue: totalRevenue
                };
                setStats(newStats);
            }
        } catch (error) {
            console.error('Error fetch ART orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'pending': '#F59E0B',
            'paid': '#3B82F6',
            'matching': '#8B5CF6',
            'approved': '#10B981',
            'calling': '#F59E0B',
            'working': '#3B82F6',
            'done': '#10B981',
            'completed': '#10B981',
            'rejected': '#EF4444',
            'cancelled': '#EF4444'
        };
        return colors[status] || '#6B7280';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'pending': 'Menunggu',
            'paid': 'Dibayar',
            'matching': 'Mencari Pekerja',
            'approved': 'Disetujui',
            'calling': 'Menghubungi',
            'working': 'Bekerja',
            'done': 'Selesai',
            'completed': 'Selesai',
            'rejected': 'Ditolak',
            'cancelled': 'Dibatalkan'
        };
        return labels[status] || status;
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#F5F7FA]">
                <ActivityIndicator size="large" color="#633594" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#F5F7FA]">
            <View className="bg-[#633594] px-4 pt-12 pb-4">
                <Text className="text-white text-2xl font-bold">Dashboard ART</Text>
                <Text className="text-white/70 text-sm mt-1">Kelola semua pesanan babysitter / ART</Text>
            </View>

            <ScrollView
                className="flex-1"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                {/* Revenue Card */}
                <View className="px-4 pt-4">
                    <View className="bg-[#633594]/10 rounded-xl p-4 border border-[#633594]/20">
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-gray-600 text-sm">Total Pendapatan</Text>
                                <Text className="text-2xl font-bold text-[#633594]">
                                    Rp {stats.totalRevenue.toLocaleString('id-ID')}
                                </Text>
                            </View>
                            <View className="bg-[#633594] p-3 rounded-full">
                                <DollarSign size={24} color="#fff" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Stat Cards */}
                <View className="px-4 pt-4">
                    <View className="flex-row flex-wrap -mx-1">
                        {[
                            { key: 'total', label: 'Total', value: stats.total, color: '#633594' },
                            { key: 'pending', label: 'Menunggu', value: stats.pending, color: '#F59E0B' },
                            { key: 'paid', label: 'Dibayar', value: stats.paid, color: '#3B82F6' },
                            { key: 'matching', label: 'Mencari', value: stats.matching, color: '#8B5CF6' },
                            { key: 'approved', label: 'Disetujui', value: stats.approved, color: '#10B981' },
                            { key: 'working', label: 'Bekerja', value: stats.working, color: '#3B82F6' },
                            { key: 'done', label: 'Selesai', value: stats.done, color: '#10B981' },
                            { key: 'cancelled', label: 'Batal', value: stats.cancelled, color: '#EF4444' },
                        ].map((stat) => (
                            <View key={stat.key} className="w-1/4 px-1 mb-2">
                                <View className="bg-white rounded-xl p-3 items-center shadow-sm border border-gray-100">
                                    <Text className="text-2xl font-bold" style={{ color: stat.color }}>
                                        {stat.value}
                                    </Text>
                                    <Text className="text-[10px] text-gray-500 mt-1 text-center">
                                        {stat.label}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Recent Orders */}
                <View className="px-4 mt-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold text-gray-800">Pesanan Terbaru</Text>
                        <Pressable onPress={() => router.push('/art/orders')}>
                            <Text className="text-[#633594] font-semibold text-sm">Lihat Semua</Text>
                        </Pressable>
                    </View>

                    {orders.length === 0 ? (
                        <View className="bg-white rounded-xl p-8 items-center">
                            <AlertCircle size={48} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-3">Belum ada pesanan</Text>
                        </View>
                    ) : (
                        orders.slice(0, 5).map((order) => (
                            <Pressable
                                key={order.id}
                                onPress={() => router.push(`/art/order/${order.id}`)}
                                className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
                            >
                                <View className="flex-row justify-between items-start">
                                    <View className="flex-1">
                                        <Text className="font-bold text-gray-800">
                                            #{order.order_id || order.id}
                                        </Text>
                                        <Text className="text-sm text-gray-600 mt-1">
                                            {order.cust_nama || order.kontak_nama}
                                        </Text>
                                        <Text className="text-xs text-gray-400 mt-1">
                                            {order.tgl} • {order.jam?.substring(0, 5)}
                                        </Text>
                                        {order.worker_nama && (
                                            <Text className="text-xs text-gray-500 mt-1">
                                                Pekerja: {order.worker_nama}
                                            </Text>
                                        )}
                                    </View>
                                    <View className="items-end">
                                        <View
                                            className="px-3 py-1 rounded-full"
                                            style={{ backgroundColor: `${getStatusColor(order.status)}20` }}
                                        >
                                            <Text
                                                className="text-[10px] font-bold"
                                                style={{ color: getStatusColor(order.status) }}
                                            >
                                                {getStatusLabel(order.status)}
                                            </Text>
                                        </View>
                                        <Text className="text-xs font-bold text-[#633594] mt-2">
                                            Rp {order.total.toLocaleString('id-ID')}
                                        </Text>
                                    </View>
                                </View>
                            </Pressable>
                        ))
                    )}
                </View>

                {/* Quick Actions */}
                <View className="px-4 mt-4 pb-4">
                    <Text className="text-lg font-bold text-gray-800 mb-4">Aksi Cepat</Text>
                    <View className="flex-row flex-wrap -mx-1">
                        <Pressable
                            onPress={() => router.push('/art/orders')}
                            className="w-1/3 px-1 mb-2"
                        >
                            <View className="bg-white rounded-xl p-4 items-center border border-gray-100">
                                <ClipboardList size={24} color="#633594" />
                                <Text className="text-xs font-semibold text-gray-700 mt-2 text-center">Semua Pesanan</Text>
                            </View>
                        </Pressable>
                        <Pressable
                            onPress={() => router.push('/art/orders?status=pending')}
                            className="w-1/3 px-1 mb-2"
                        >
                            <View className="bg-white rounded-xl p-4 items-center border border-gray-100">
                                <Clock size={24} color="#F59E0B" />
                                <Text className="text-xs font-semibold text-gray-700 mt-2 text-center">Menunggu</Text>
                            </View>
                        </Pressable>

                    </View>
                </View>
            </ScrollView>
        </View>
    );
}