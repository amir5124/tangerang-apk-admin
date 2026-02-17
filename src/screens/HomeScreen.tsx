import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Definisikan tipe props jika Anda menggunakan React Navigation
interface Props {
    navigation?: any;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {

    // Data dummy admin, nanti bisa diambil dari Global State/Context
    const adminName: string = "Super Admin";

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header Section */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.adminName}>{adminName} 👋</Text>
                </View>

            </View>

            {/* Stats/Dashboard Card */}
            <View style={styles.mainCard}>
                <Text style={styles.cardTitle}>Admin Dashboard</Text>
                <Text style={styles.cardSubtitle}>Monitoring sistem dan manajemen user</Text>

                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>128</Text>
                        <Text style={styles.statLabel}>Users</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>45</Text>
                        <Text style={styles.statLabel}>Mitra</Text>
                    </View>
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.menuContainer}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <View style={styles.grid}>
                    <TouchableOpacity style={styles.menuItem}>
                        <MaterialCommunityIcons name="format-list-bulleted" size={28} color="#4F46E5" />
                        <Text style={styles.menuLabel}>Manage Role</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <MaterialCommunityIcons name="bell-ring-outline" size={28} color="#4F46E5" />
                        <Text style={styles.menuLabel}>Send Notif</Text>
                    </TouchableOpacity>
                </View>
            </View>

        </SafeAreaView>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#FFFFFF',
    },
    welcomeText: {
        fontSize: 14,
        color: '#6B7280',
    },
    adminName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    profileButton: {
        padding: 8,
        backgroundColor: '#EEF2FF',
        borderRadius: 12,
    },
    mainCard: {
        margin: 20,
        padding: 20,
        backgroundColor: '#4F46E5',
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cardSubtitle: {
        color: '#E0E7FF',
        fontSize: 12,
        marginTop: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        marginTop: 20,
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#C7D2FE',
        fontSize: 12,
    },
    divider: {
        width: 1,
        backgroundColor: '#6366F1',
        height: '100%',
    },
    menuContainer: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 15,
    },
    grid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    menuItem: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    menuLabel: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
    },
});