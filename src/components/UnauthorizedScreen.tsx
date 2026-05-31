import { useRouter } from "expo-router";
import { ShieldOff } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

interface Props {
    pageName?: string;
}

export default function UnauthorizedScreen({ pageName }: Props) {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <ShieldOff size={64} color="#E0E0E0" />
            <Text style={styles.title}>Akses Ditolak</Text>
            <Text style={styles.subtitle}>
                Anda tidak memiliki izin{"\n"}
                untuk mengakses halaman ini.
            </Text>
            {/* <Text style={styles.hint}>
                Hubungi Super Admin jika{"\n"}membutuhkan akses.
            </Text> */}
            {/* <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
                <Text style={styles.btnText}>Kembali</Text>
            </TouchableOpacity> */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
        gap: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#333",
        marginTop: 16,
    },
    subtitle: {
        fontSize: 15,
        color: "#666",
        textAlign: "center",
        lineHeight: 22,
    },
    hint: {
        fontSize: 13,
        color: "#A0A0A0",
        textAlign: "center",
        lineHeight: 20,
        marginTop: 4,
    },
    btn: {
        marginTop: 20,
        backgroundColor: "#633594",
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
    },
    btnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
    },
});