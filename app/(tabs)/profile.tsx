import { Search } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
// Menggunakan instance api dari utils Anda
import api from "../../src/utils/api";

// 1. Definisi struktur data User
interface User {
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
  role: "admin" | "mitra" | "customer";
  fcm_token: string | null;
  created_at: string;
  store_name: string | null;
  store_status: "pending" | "approved" | "rejected" | null;
  store_category: string | null;
}

const AdminUserList = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = async () => {
    try {
      // Menggunakan instance 'api' yang sudah Anda buat di utils
      const response = await api.get("/users/admin/all-users");
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error: any) {
      console.error("❌ Gagal mengambil data user:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const filteredUsers = users.filter((user) => user.full_name.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase()));

  // 2. SOLUSI ITEM MERAH: Tambahkan tipe data { item: User } di sini
  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.full_name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userPhone}>{item.phone_number}</Text>
        </View>
        <View
          style={[
            styles.roleBadge,
            {
              backgroundColor: item.role === "admin" ? "#e74c3c" : item.role === "mitra" ? "#3498db" : "#2ecc71",
            },
          ]}
        >
          <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
        </View>
      </View>

      {item.role === "mitra" && (
        <View style={styles.mitraInfo}>
          <Text style={styles.storeName}>🏪 Toko: {item.store_name || "-"}</Text>
          <Text style={[styles.statusText, { color: item.store_status === "approved" ? "green" : "orange" }]}>Status: {item.store_status || "pending"}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#888" />
        <TextInput style={styles.searchInput} placeholder="Cari nama atau email..." value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserItem} // TypeScript sekarang tahu ini adalah { item: User }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>Tidak ada pengguna ditemukan.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", padding: 10, paddingHorizontal: 15 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchInput: { flex: 1, marginLeft: 10 },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  userEmail: { fontSize: 14, color: "#666" },
  userPhone: { fontSize: 14, color: "#888" },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    alignSelf: "flex-start",
  },
  roleText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  mitraInfo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  storeName: { fontSize: 13, fontWeight: "600", color: "#444" },
  statusText: { fontSize: 12, fontWeight: "bold", marginTop: 2 },
  empty: { textAlign: "center", marginTop: 20, color: "#888" },
});

export default AdminUserList;
