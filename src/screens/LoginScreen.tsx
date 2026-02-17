import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    TouchableOpacity,
    View
} from 'react-native';
import API from '../utils/api';
import { storage } from '../utils/storage';
import { registerForPushNotificationsAsync } from '../utils/usePushNotifications';

const LoginScreen = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [fcmToken, setFcmToken] = useState('');
    const [form, setForm] = useState({ email: '', password: '' });

    const TARGET_ROLE = 'admin';

    // Logika tombol aktif
    const isFormValid = form.email.length > 0 && form.password.length > 0;

    useEffect(() => {
        // Jalankan pengambilan token baik di Mobile maupun Web agar konsisten
        getDeviceToken();
    }, []);

    const getDeviceToken = async () => {
        try {
            // 1. Ambil token mentah (Gunakan fungsi yang sama dengan Register)
            // Jika registerForPushNotificationsAsync adalah fungsi eksternal, pastikan sudah di-import
            const result = await registerForPushNotificationsAsync();

            if (result) {
                let finalToken = "";

                // 2. Logika Pembersihan (Sama persis dengan Register)
                if (typeof result === 'object') {
                    const rawToken = result.token || result.endpoint || "";

                    if (rawToken.includes('/send/')) {
                        finalToken = rawToken.split('/send/')[1];
                    } else {
                        finalToken = typeof result === 'object' ? JSON.stringify(result) : result;
                    }
                } else {
                    if (result.includes('/send/')) {
                        finalToken = result.split('/send/')[1];
                    } else {
                        finalToken = result;
                    }
                }

                // console.log("✅ Token Login Bersih:", finalToken);
                setFcmToken(finalToken);
            } else {
                // Jika gagal ambil token, berikan fallback
                setFcmToken(Platform.OS === 'web' ? "WEB_NO_TOKEN" : "NO_TOKEN");
            }
        } catch (error) {
            console.error("❌ Error Filter Token Login:", error);
            setFcmToken("ERROR_TOKEN");
        }
    };

    const handleLogin = async () => {
        if (!isFormValid) return;

        setLoading(true);
        try {
            const payload = {
                ...form,
                fcm_token: fcmToken,
                targetRole: TARGET_ROLE
            };
            const response = await API.post('/auth/login', payload);

            if (response.data.success || response.status === 200) {
                const { token, user } = response.data;
                await storage.save('userToken', token);
                await storage.save('userData', JSON.stringify(user));

                if (user.role === 'mitra') {
                    console.log("mitra")
                } else {
                    router.replace('/(tabs)');
                }
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || "Login Gagal. Periksa kembali akun Anda.";
            Platform.OS === 'web' ? alert(errorMsg) : Alert.alert("Akses Ditolak", errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Logo Section */}
                <View style={styles.logoContainer}>
                    <Image
                        source={{ uri: 'https://res.cloudinary.com/dgsdmgcc7/image/upload/v1770989052/Salinan_LOGO_TF_1-removebg-preview_ybdbz0.png' }}
                        style={styles.logoImage}
                        resizeMode="contain" // Menjaga gambar tidak gepeng/terpotong
                    />

                </View>

                <View style={styles.formSection}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Masukkan email"
                            placeholderTextColor="#A0A0A0"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={form.email}
                            // Menambahkan warna kursor agar selaras dengan tema ungu
                            selectionColor="#633594"
                            cursorColor="#633594"
                            onChangeText={(v) => setForm({ ...form, email: v.toLowerCase().trim() })}
                        />
                    </View>
                    <Text style={styles.hint}>Contoh: nama@email.com</Text>

                    <Text style={[styles.label, { marginTop: 20 }]}>Kata Sandi</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Masukkan kata sandi"
                            placeholderTextColor="#A0A0A0"
                            secureTextEntry={!showPassword}
                            value={form.password}
                            // Menambahkan warna kursor di password
                            selectionColor="#633594"
                            cursorColor="#633594"
                            onChangeText={(v) => setForm({ ...form, password: v })}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#888" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.forgotPassContainer}>
                        <Text style={styles.forgotPassText}>Lupa Kata Sandi?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.btnMain, !isFormValid ? styles.btnDisabled : styles.btnActive]}
                        onPress={handleLogin}
                        disabled={!isFormValid || loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnMainText}>Masuk</Text>}
                    </TouchableOpacity>

                    {/* Divider */}
                    {/* <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>atau masuk dengan</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity style={styles.socialBtn}>
                        <AntDesign name="google" size={20} color="#EA4335" />
                        <Text style={styles.socialBtnText}>Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.socialBtn}>
                        <FontAwesome5 name="facebook" size={20} color="#1877F2" />
                        <Text style={styles.socialBtnText}>Facebook</Text>
                    </TouchableOpacity> */}


                    <View style={styles.footerContainer}>
                        <Text style={styles.footerText}>Belum terdaftar? </Text>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/(auth)/register', params: { role: TARGET_ROLE } })}>
                            <Text style={styles.registerText}>Daftar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 25 },
    logoSection: { marginTop: 20, alignItems: 'center', marginBottom: 50 },
    logoText: { fontSize: 36, fontWeight: 'bold', color: '#444', letterSpacing: -1 },
    formSection: { flex: 1, marginTop: -20 },
    label: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
    inputWrapper: {
        height: 55,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        backgroundColor: '#FFF'
    },
    input: {
        flex: 1, fontSize: 14, color: '#333',
        paddingVertical: Platform.OS === 'web' ? 0 : 8,
        ...Platform.select({ web: { outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none' } as any, default: {} }),
    } as TextStyle,
    hint: { fontSize: 12, color: '#A0A0A0', marginTop: 6 },
    forgotPassContainer: { alignSelf: 'flex-end', marginTop: 15 },
    forgotPassText: { color: '#633594', fontWeight: '700', fontSize: 14 },
    btnMain: {
        height: 55,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
    },
    btnActive: { backgroundColor: '#633594' },
    btnDisabled: { backgroundColor: '#E0E0E0' },
    btnMainText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 30,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#EEEEEE' },
    dividerText: { marginHorizontal: 10, color: '#888', fontSize: 13 },
    socialBtn: {
        height: 55,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        gap: 12
    },
    socialBtnText: { color: '#333', fontSize: 15, fontWeight: '600' },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 40
    },
    footerText: { color: '#333', fontSize: 15 },
    registerText: { color: '#00BFA5', fontSize: 15, fontWeight: 'bold' },
    logoContainer: {
        alignItems: 'center',     // KUNCI: Membuat logo ke tengah secara horizontal
        marginTop: 50,
        width: '100%',            // Pastikan container selebar layar
    },
    logoImage: {
        width: 200,               // Ukuran lebih proporsional untuk landing
        height: 200,               // Beri ruang tinggi yang cukup agar contain bekerja maksimal
    },
});

export default LoginScreen;