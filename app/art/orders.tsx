import { router, useLocalSearchParams } from "expo-router";
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    Clock,
    Eye,
    Search,
    X
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { ArtOrder, orderService } from "../../src/services/orderService";

export default function ArtOrders() {
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orders, setOrders] = useState<ArtOrder[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>(params.status as string || 'all');

    const fetchOrders = async () => {
        try {
            // ✅ Admin - ambil SEMUA pesanan
            let response;
            if (filterStatus !== 'all') {
                response = await orderService.getOrdersArtByStatus(filterStatus);
            } else {
                response = await orderService.getAllOrdersArt();
            }

            if (response.success) {
                let data = response.data || [];

                // Filter by search query
                if (searchQuery) {
                    data = data.filter((o: ArtOrder) =>
                        o.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.cust_nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.worker_nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        o.cust_email?.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                }

                setOrders(data);
            }
        } catch (error) {
            console.error('Error fetch orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [filterStatus, searchQuery]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
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

    const statusOptions = [
        { value: 'all', label: 'Semua' },
        { value: 'pending', label: 'Menunggu' },
        { value: 'paid', label: 'Dibayar' },
        { value: 'matching', label: 'Mencari' },
        { value: 'approved', label: 'Disetujui' },
        { value: 'working', label: 'Bekerja' },
        { value: 'done', label: 'Selesai' },
        { value: 'cancelled', label: 'Dibatalkan' }
    ];

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#F5F7FA]">
                <ActivityIndicator size="large" color="#633594" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#F5F7FA]">
            {/* Header */}
            <View className="bg-[#633594] px-4 pt-12 pb-4 flex-row items-center">
                <Pressable onPress={() => router.back()} className="mr-3">
                    <ArrowLeft size={24} color="#fff" />
                </Pressable>
                <Text className="text-white text-xl font-bold flex-1">Pesanan ART</Text>
                <Text className="text-white/70 text-sm">{orders.length}</Text>
            </View>

            {/* Search & Filter */}
            <View className="px-4 pt-4">
                <View className="flex-row items-center bg-white rounded-xl px-3 border border-gray-200">
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 py-3 px-2 text-gray-700"
                        placeholder="Cari pesanan..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery && (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <X size={18} color="#9CA3AF" />
                        </Pressable>
                    )}
                </View>

                {/* Filter Chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mt-3"
                >
                    {statusOptions.map((opt) => (
                        <TouchableOpacity
                            key={opt.value}
                            onPress={() => setFilterStatus(opt.value)}
                            className={`mr-2 px-4 py-1.5 rounded-full ${filterStatus === opt.value ? 'bg-[#633594]' : 'bg-white border border-gray-200'
                                }`}
                        >
                            <Text className={filterStatus === opt.value ? 'text-white' : 'text-gray-600'}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Order List */}
            <ScrollView
                className="flex-1 px-4 pt-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                {orders.length === 0 ? (
                    <View className="bg-white rounded-xl p-12 items-center mt-4">
                        <AlertCircle size={48} color="#D1D5DB" />
                        <Text className="text-gray-400 mt-3 text-center">
                            {filterStatus !== 'all'
                                ? `Tidak ada pesanan dengan status ${getStatusLabel(filterStatus)}`
                                : 'Belum ada pesanan'}
                        </Text>
                    </View>
                ) : (
                    orders.map((order) => (
                        <Pressable
                            key={order.id}
                            onPress={() => router.push(`/art/order/${order.id}`)}
                            className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
                        >
                            <View className="flex-row justify-between items-start">
                                <View className="flex-1">
                                    <View className="flex-row items-center">
                                        <Text className="font-bold text-gray-800">
                                            #{order.order_id || order.id}
                                        </Text>
                                        <View className="ml-2 flex-row items-center">
                                            <Clock size={12} color="#9CA3AF" />
                                            <Text className="text-[10px] text-gray-400 ml-1">
                                                {new Date(order.created_at).toLocaleDateString('id-ID')}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="text-sm text-gray-600 mt-1">
                                        {order.cust_nama || order.kontak_nama}
                                    </Text>
                                    <Text className="text-xs text-gray-400 mt-1 flex-row items-center">
                                        <Calendar size={12} color="#9CA3AF" />
                                        <Text className="ml-1">{order.tgl} • {order.jam?.substring(0, 5)}</Text>
                                    </Text>
                                    {order.worker_nama && (
                                        <Text className="text-xs text-gray-500 mt-1">
                                            Pekerja: {order.worker_nama}
                                        </Text>
                                    )}
                                    <Text className="text-xs text-gray-400 mt-1">
                                        {order.cust_email}
                                    </Text>
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
                                    <Text className="text-sm font-bold text-[#633594] mt-2">
                                        Rp {order.total.toLocaleString('id-ID')}
                                    </Text>
                                    <View className="mt-2 flex-row items-center">
                                        <Eye size={14} color="#633594" />
                                        <Text className="text-xs text-[#633594] ml-1">Detail</Text>
                                    </View>
                                </View>
                            </View>
                        </Pressable>
                    ))
                )}
            </ScrollView>
        </View>
    );
}