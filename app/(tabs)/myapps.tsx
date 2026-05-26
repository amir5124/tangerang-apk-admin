import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import {
  Image as ImageIcon, ImagePlus, LayoutGrid, Megaphone,
  Pencil, Settings, Star, Ticket,
  Trash2, X
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image, Modal, Platform, Pressable, ScrollView,
  Switch, Text, TextInput, View
} from "react-native";
import Toast from "react-native-toast-message";
import api from "../../src/utils/api";

// --- HELPERS ---
const getBase64 = async (uri: string): Promise<string> => {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(blob);
    });
  } else {
    return await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  }
};

export default function MyAppsScreen() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // States: Modal Visibility
  const [modalDelete, setModalDelete] = useState<{ visible: boolean; id: number | null; name: string }>({ visible: false, id: null, name: "" });
  const [addServiceModal, setAddServiceModal] = useState(false);
  const [addOtherServiceModal, setAddOtherServiceModal] = useState(false);
  const [editNameModal, setEditNameModal] = useState(false);
  const [editOtherModal, setEditOtherModal] = useState(false);

  // States: Form Data
  const [newService, setNewService] = useState({ key: "", name: "" });
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [newNameValue, setNewNameValue] = useState("");
  const [selectedOtherAsset, setSelectedOtherAsset] = useState<any>(null);
  const [editOtherName, setEditOtherName] = useState("");

  const [vouchers, setVouchers] = useState<any[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [serviceFee, setServiceFee] = useState("");
  const [adminFee, setAdminFee] = useState("");
  const [isSavingFee, setIsSavingFee] = useState(false);

  // State Voucher
  const [modalVisible, setModalVisible] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formPercent, setFormPercent] = useState("");
  const [formMin, setFormMin] = useState("");
  const [formMax, setFormMax] = useState("");
  const [formUsageLimit, setFormUsageLimit] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [isUploadingVoucher, setIsUploadingVoucher] = useState(false);
  const [formImageFile, setFormImageFile] = useState<any>(null);

  // States: Broadcast
  const [target, setTarget] = useState<"user" | "mitra">("user");
  const [message, setMessage] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");

  // =============================================
  // NEW STATES: Gambar untuk modal Tambah Layanan
  // =============================================
  const [newServiceImageUri, setNewServiceImageUri] = useState<string | null>(null);
  const [newServiceImageBase64, setNewServiceImageBase64] = useState<string | null>(null);
  const [isUploadingNewService, setIsUploadingNewService] = useState(false);

  // NEW STATES: Gambar untuk modal Tambah Menu Lainnya
  const [newOtherImageUri, setNewOtherImageUri] = useState<string | null>(null);
  const [newOtherImageBase64, setNewOtherImageBase64] = useState<string | null>(null);
  const [isUploadingNewOther, setIsUploadingNewOther] = useState(false);

  // Definisikan urutan menu
  const menuOrder = [
    'icon_ac',
    'icon_cleaning',
    'icon_wc',
    'icon_rigid',
    'icon_kebun',
    'icon_korporasi',
    'icon_bangunan',
    'icon_ojek'
  ];

  // Definisikan urutan menu lainnya
  const otherMenuOrder = [
    'popular_service_1',
    'popular_service_2',
    'popular_service_paket',
    'popular_service_pulsa'
  ];

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAssets(), fetchVouchers(), fetchFees()]);
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async () => {
    const res = await api.get("/assets");
    setAssets(res.data || []);
  };

  const fetchVouchers = async () => {
    const res = await api.get("/voucher");
    setVouchers(res.data.data || []);
  };

  const fetchFees = async () => {
    try {
      const [sf, af] = await Promise.all([
        api.get("/settings/app_service_fee"),
        api.get("/disburse/withdraw_fee")
      ]);
      if (sf.data.success) setServiceFee(sf.data.value);
      if (af.data.success) setAdminFee(af.data.value);
    } catch (e) { console.error(e); }
  };

  // --- ACTIONS ---

  const pickAndUpload = async (key_name: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });

    if (!result.canceled) {
      setUploadingKey(key_name);
      try {
        const base64 = await getBase64(result.assets[0].uri);
        await api.post("/assets/upload-base64", {
          key_name,
          image_data: base64,
          file_name: `${key_name}.jpg`,
        });
        Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Gambar diperbarui' });
        loadAssets();
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Gagal', text2: 'Gagal mengunggah gambar' });
      } finally {
        setUploadingKey(null);
      }
    }
  };

  const uploadVoucherImageToServer = async (base64: string, fileName: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      const blob = await (await fetch(`data:image/jpeg;base64,${base64}`)).blob();
      formData.append('image', blob, fileName);

      const response = await api.post("/voucher/upload-image", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        return response.data.data.image_url;
      }
      return null;
    } catch (error) {
      console.error("Error upload gambar voucher:", error);
      return null;
    }
  };

  const pickVoucherImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });

    if (!result.canceled) {
      setIsUploadingVoucher(true);
      try {
        const base64 = await getBase64(result.assets[0].uri);
        const fileName = `voucher_${formCode || Date.now()}.jpg`;
        const imageUrl = await uploadVoucherImageToServer(base64, fileName);

        if (imageUrl) {
          setFormImageUrl(imageUrl);
          setFormImageFile(null);
          Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Gambar voucher berhasil diupload' });
        } else {
          Toast.show({ type: 'error', text1: 'Gagal', text2: 'Gagal upload gambar voucher' });
        }
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Gagal', text2: 'Gagal upload gambar voucher' });
      } finally {
        setIsUploadingVoucher(false);
      }
    }
  };

  const deleteVoucherImage = async (voucherId: number) => {
    Alert.alert(
      "Hapus Gambar",
      "Apakah Anda yakin ingin menghapus gambar voucher ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await api.delete(`/voucher/image/${voucherId}`);
              setFormImageUrl("");
              Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Gambar voucher dihapus' });
              fetchVouchers();
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Gagal', text2: 'Gagal menghapus gambar' });
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // =============================================
  // NEW: Pilih gambar untuk modal Tambah Layanan
  // =============================================
  const pickNewServiceImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });

    if (!result.canceled) {
      setIsUploadingNewService(true);
      try {
        const base64 = await getBase64(result.assets[0].uri);
        setNewServiceImageUri(result.assets[0].uri);
        setNewServiceImageBase64(base64);
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Gagal', text2: 'Gagal memuat gambar' });
      } finally {
        setIsUploadingNewService(false);
      }
    }
  };

  // NEW: Pilih gambar untuk modal Tambah Menu Lainnya
  const pickNewOtherImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });

    if (!result.canceled) {
      setIsUploadingNewOther(true);
      try {
        const base64 = await getBase64(result.assets[0].uri);
        setNewOtherImageUri(result.assets[0].uri);
        setNewOtherImageBase64(base64);
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Gagal', text2: 'Gagal memuat gambar' });
      } finally {
        setIsUploadingNewOther(false);
      }
    }
  };

  const handleCreateService = async () => {
    if (!newService.key || !newService.name) return;
    setLoading(true);
    try {
      const key = newService.key.startsWith('icon_') ? newService.key.toLowerCase() : `icon_${newService.key.toLowerCase().replace(/\s+/g, '_')}`;
      await api.post("/assets", { key_name: key, display_name: newService.name });

      // Upload gambar jika ada
      if (newServiceImageBase64) {
        try {
          await api.post("/assets/upload-base64", {
            key_name: key,
            image_data: newServiceImageBase64,
            file_name: `${key}.jpg`,
          });
        } catch (imgErr) {
          console.error("Gagal upload gambar layanan:", imgErr);
        }
      }

      Toast.show({ type: 'success', text1: 'Sukses', text2: 'Layanan ditambahkan' });
      setAddServiceModal(false);
      setNewService({ key: "", name: "" });
      setNewServiceImageUri(null);
      setNewServiceImageBase64(null);
      loadAssets();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOtherService = async () => {
    if (!newService.key || !newService.name) return;
    setLoading(true);
    try {
      const key = newService.key.startsWith('popular_service_')
        ? newService.key.toLowerCase()
        : `popular_service_${newService.key.toLowerCase().replace(/\s+/g, '_')}`;
      await api.post("/assets", { key_name: key, display_name: newService.name });

      // Upload gambar jika ada
      if (newOtherImageBase64) {
        try {
          await api.post("/assets/upload-base64", {
            key_name: key,
            image_data: newOtherImageBase64,
            file_name: `${key}.jpg`,
          });
        } catch (imgErr) {
          console.error("Gagal upload gambar menu lainnya:", imgErr);
        }
      }

      Toast.show({ type: 'success', text1: 'Sukses', text2: 'Menu lainnya ditambahkan' });
      setAddOtherServiceModal(false);
      setNewService({ key: "", name: "" });
      setNewOtherImageUri(null);
      setNewOtherImageBase64(null);
      loadAssets();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!modalDelete.id) return;
    setLoading(true);
    try {
      await api.delete(`/assets/${modalDelete.id}`);
      Toast.show({ type: 'success', text1: 'Dihapus', text2: 'Layanan berhasil dihapus' });
      setModalDelete({ visible: false, id: null, name: "" });
      loadAssets();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOtherMenu = async () => {
    if (!selectedOtherAsset) return;
    setLoading(true);
    try {
      await api.put(`/assets/update-info/${selectedOtherAsset.id}`, { display_name: editOtherName });
      loadAssets();
      setEditOtherModal(false);
      Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Menu diperbarui' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Gagal', text2: 'Gagal mengupdate menu' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!message.trim() || !broadcastTitle.trim()) {
      Toast.show({ type: 'error', text1: 'Gagal', text2: 'Judul dan pesan harus diisi' });
      return;
    }
    setLoading(true);
    try {
      await api.post("/notifications/broadcast", {
        targetTopic: target === "user" ? "all_customer" : "all_mitra",
        title: broadcastTitle,
        body: message,
        data: { type: "BROADCAST" },
      });
      Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Pesan terkirim' });
      setMessage("");
      setBroadcastTitle("");
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Gagal', text2: 'Broadcast gagal dikirim' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFee = async (key: string, val: string) => {
    setIsSavingFee(true);
    try {
      await api.put(key === "app_service_fee" ? "/settings/update" : "/disburse/update", {
        key_name: key === "app_service_fee" ? "app_service_fee" : "withdraw_fee",
        key_value: val,
      });
      Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Biaya diperbarui' });
    } finally {
      setIsSavingFee(false);
    }
  };

  const handleSaveVoucher = async () => {
    setLoading(true);

    const payload: any = {
      code: formCode,
      discount_percent: parseInt(formPercent) || 0,
      min_purchase: parseInt(formMin) || 0,
      max_discount_amount: parseInt(formMax) || 0,
      usage_limit: parseInt(formUsageLimit) || 1,
      description: formDescription,
    };

    if (formImageUrl) {
      payload.image_url = formImageUrl;
    }

    try {
      if (selectedVoucher?.id) {
        await api.put(`/voucher/${selectedVoucher.id}`, payload);
        Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Voucher diperbarui' });
      } else {
        await api.post("/voucher/bulk", { vouchers: [payload] });
        Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Voucher baru ditambahkan' });
      }

      setModalVisible(false);
      fetchVouchers();
      resetVoucherForm();
    } catch (error: any) {
      console.error("Error saving voucher:", error);
      Toast.show({
        type: 'error',
        text1: 'Gagal',
        text2: error.response?.data?.message || 'Gagal menyimpan voucher'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetVoucherForm = () => {
    setSelectedVoucher(null);
    setFormCode("");
    setFormPercent("");
    setFormMin("");
    setFormMax("");
    setFormUsageLimit("");
    setFormDescription("");
    setFormImageUrl("");
    setFormImageFile(null);
  };

  const handleDeleteVoucher = async (id: number) => {
    Alert.alert(
      "Hapus Voucher",
      "Apakah Anda yakin ingin menghapus voucher ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await api.delete("/voucher/bulk", { data: { ids: [id] } });
              Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Voucher dihapus' });
              fetchVouchers();
            } catch (e) {
              Toast.show({ type: 'error', text1: 'Gagal', text2: 'Gagal menghapus voucher' });
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleToggleVoucher = async (id: number, currentStatus: number) => {
    try {
      await api.put(`/voucher/${id}`, { is_active: currentStatus === 1 ? 0 : 1 });
      fetchVouchers();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Gagal', text2: 'Gagal mengubah status' });
    }
  };

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>

        {/* HEADER */}
        <View className="bg-white px-5 pt-14 pb-6 ">
          <Text className="text-2xl font-black text-gray-800">Kontrol Aplikasi</Text>
          <Text className="text-gray-400">Kelola Asset dan Promo</Text>
        </View>

        {/* 1. SLIDER UTAMA */}
        <View className="px-4 mt-6">
          <View className="flex-row items-center mb-3">
            <ImageIcon size={18} color="#633594" />
            <Text className="text-lg font-bold ml-2">Slider Utama</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {[1, 2, 3, 4, 5].map((id) => {
              const key = `banner_${id}`;
              const asset = assets?.find((a) => a.key_name === key);
              return (
                <View key={id} className="bg-white p-3 rounded-2xl mr-3 border border-gray-100 w-56 ">
                  <View className="h-28 bg-gray-50 rounded-xl justify-center items-center mb-2 overflow-hidden">
                    {uploadingKey === key ? <ActivityIndicator color="#633594" /> :
                      asset?.image_url ? <Image source={{ uri: `https://backend.tangerangfast.online${asset.image_url}` }} className="w-full h-full" /> : <ImagePlus size={20} color="#cbd5e1" />}
                  </View>
                  <Pressable onPress={() => pickAndUpload(key)} className="bg-purple-50 p-2 rounded-xl flex-row justify-center items-center">
                    <Pencil size={12} color="#633594" />
                    <Text className="text-[10px] text-[#633594] font-bold ml-1">GANTI SLIDER {id}</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. MENU LAYANAN */}
        <View className="px-4 mt-8">
          <View className="flex-row justify-between items-center mb-3 px-1">
            <View className="flex-row items-center">
              <LayoutGrid size={18} color="#633594" />
              <Text className="text-lg font-bold ml-2 text-gray-800">Menu Layanan</Text>
            </View>
            <Pressable
              onPress={() => setAddServiceModal(true)}
              className="bg-[#633594] px-4 py-1.5 rounded-full active:opacity-70"
            >
              <Text className="text-white text-[10px] font-bold">+ LAYANAN</Text>
            </Pressable>
          </View>
          <View className="bg-white rounded-2xl p-4 flex-row flex-wrap justify-between border border-gray-100">
            {menuOrder.map((keyName) => {
              const asset = assets?.find(a => a.key_name === keyName);
              if (!asset) return null;

              return (
                <View key={asset.id} className="w-[23%] items-center mb-5">
                  <View className="relative">
                    <Pressable onPress={() => pickAndUpload(asset.key_name)} className="w-12 h-12 bg-gray-50 rounded-xl justify-center items-center border border-gray-100 overflow-hidden">
                      {uploadingKey === asset.key_name ? <ActivityIndicator size="small" color="#633594" /> :
                        asset.image_url ? <Image source={{ uri: `https://backend.tangerangfast.online${asset.image_url}` }} className="w-full h-full" resizeMode="contain" /> : <ImagePlus size={16} color="#cbd5e1" />}
                    </Pressable>
                    <Pressable onPress={() => setModalDelete({ visible: true, id: asset.id, name: asset.display_name })} className="absolute -top-2 -left-2 bg-red-500 p-1 rounded-full border border-white">
                      <Trash2 size={10} color="white" />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => { setSelectedAsset(asset); setNewNameValue(asset.display_name); setEditNameModal(true); }} className="mt-1 flex-row items-center">
                    <Text numberOfLines={1} className="text-[9px] font-bold text-gray-500">{asset.display_name}</Text>
                    <Pencil size={6} color="#94a3b8" style={{ marginLeft: 2 }} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* MENU LAINNYA */}
        <View className="px-4 mt-8">
          <View className="flex-row justify-between items-center mb-3 px-1">
            <View className="flex-row items-center">
              <Star size={18} color="#633594" />
              <Text className="text-lg font-bold ml-2 text-gray-800">Menu Lainnya</Text>
            </View>
            <Pressable
              onPress={() => setAddOtherServiceModal(true)}
              className="bg-[#633594] px-4 py-1.5 rounded-full active:opacity-70"
            >
              <Text className="text-white text-[10px] font-bold">+ LAINNYA</Text>
            </Pressable>
          </View>
          <View className="bg-white rounded-2xl p-4 flex-row flex-wrap justify-between border border-gray-100">
            {otherMenuOrder.map((keyName) => {
              const asset = assets?.find(a => a.key_name === keyName);
              if (!asset) return null;

              return (
                <View key={asset.id} className="w-[23%] items-center mb-5">
                  <View className="relative">
                    <Pressable onPress={() => pickAndUpload(asset.key_name)} className="w-12 h-12 bg-gray-50 rounded-xl justify-center items-center border border-gray-100 overflow-hidden">
                      {uploadingKey === asset.key_name ? <ActivityIndicator size="small" color="#633594" /> :
                        asset.image_url ? <Image source={{ uri: `https://backend.tangerangfast.online${asset.image_url}` }} className="w-full h-full" resizeMode="contain" /> : <Star size={16} color="#cbd5e1" />}
                    </Pressable>
                    <Pressable onPress={() => setModalDelete({ visible: true, id: asset.id, name: asset.display_name })} className="absolute -top-2 -left-2 bg-red-500 p-1 rounded-full border border-white">
                      <Trash2 size={10} color="white" />
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => {
                      setSelectedOtherAsset(asset);
                      setEditOtherName(asset.display_name);
                      setEditOtherModal(true);
                    }}
                    className="mt-1 flex-row items-center"
                  >
                    <Text numberOfLines={1} className="text-[9px] font-bold text-gray-500">{asset.display_name}</Text>
                    <Pencil size={6} color="#94a3b8" style={{ marginLeft: 2 }} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>



        {/* 5. VOUCHER */}
        <View className="px-4 mt-8">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <Ticket size={18} color="#633594" />
              <Text className="text-lg font-bold ml-2">Manajemen Voucher</Text>
            </View>
            <Pressable
              onPress={() => {
                resetVoucherForm();
                setModalVisible(true);
              }}
              className="bg-[#633594] px-4 py-1.5 rounded-full"
            >
              <Text className="text-white text-[10px] font-bold">+ VOUCHER</Text>
            </Pressable>
          </View>
          <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {vouchers.map((v) => (
              <View key={v.id} className="p-4 border-b border-gray-50">
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <View className="flex-row items-center flex-wrap">
                      <Text className="font-black text-[#633594] text-base">{v.code}</Text>
                      <Pressable
                        onPress={() => {
                          setSelectedVoucher(v);
                          setFormCode(v.code);
                          setFormPercent(String(v.discount_percent));
                          setFormMin(String(v.min_purchase || "0"));
                          setFormMax(String(v.max_discount_amount || "0"));
                          setFormUsageLimit(String(v.usage_limit || "0"));
                          setFormDescription(v.description || "");
                          setFormImageUrl(v.image_url || "");
                          setModalVisible(true);
                        }}
                        className="ml-2 p-1.5 bg-purple-50 rounded-full"
                      >
                        <Pencil size={12} color="#633594" />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteVoucher(v.id)} className="ml-2 p-1.5 bg-red-50 rounded-full">
                        <Trash2 size={12} color="#ef4444" />
                      </Pressable>
                      {v.image_url && (
                        <Pressable onPress={() => deleteVoucherImage(v.id)} className="ml-2 p-1.5 bg-orange-50 rounded-full">
                          <X size={12} color="#f97316" />
                        </Pressable>
                      )}
                    </View>
                    <Text className="text-[11px] text-gray-500 mt-0.5">
                      Disc {v.discount_percent}% • Min. Rp{parseInt(v.min_purchase || 0).toLocaleString('id-ID')}
                    </Text>
                    {v.description && (
                      <Text className="text-[10px] text-gray-400 mt-1" numberOfLines={1}>
                        {v.description}
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={v.is_active === 1}
                    onValueChange={() => handleToggleVoucher(v.id, v.is_active)}
                    trackColor={{ true: '#633594', false: '#cbd5e1' }}
                  />
                </View>
                {v.image_url && (
                  <View className="mt-2">
                    <Image
                      source={{ uri: `https://backend.tangerangfast.online${v.image_url}` }}
                      className="w-full h-32 rounded-lg"
                      resizeMode="cover"
                    />
                  </View>
                )}
              </View>
            ))}
            {vouchers.length === 0 && (
              <View className="p-8 items-center">
                <Ticket size={40} color="#cbd5e1" />
                <Text className="text-gray-400 mt-2">Belum ada voucher</Text>
              </View>
            )}
          </View>
        </View>

        {/* 6. BIAYA-BIAYA */}
        <View className="px-4 mt-8">
          <View className="flex-row items-center mb-3">
            <Settings size={18} color="#633594" />
            <Text className="text-lg font-bold ml-2">Konfigurasi Biaya</Text>
          </View>
          <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-4">
            <Text className="text-[10px] font-bold text-gray-400 mb-2">BIAYA LAYANAN APP (RP)</Text>
            <View className="flex-row gap-2">
              <TextInput className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100 font-bold" value={serviceFee} onChangeText={setServiceFee} keyboardType="numeric" />
              <Pressable onPress={() => handleUpdateFee("app_service_fee", serviceFee)} className="bg-[#633594] px-4 rounded-xl justify-center"><Text className="text-white font-bold text-xs">Simpan</Text></Pressable>
            </View>
          </View>
          <View className="bg-white p-4 rounded-2xl border border-gray-100">
            <Text className="text-[10px] font-bold text-gray-400 mb-2">BIAYA WITHDRAW ADMIN (RP)</Text>
            <View className="flex-row gap-2">
              <TextInput className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100 font-bold" value={adminFee} onChangeText={setAdminFee} keyboardType="numeric" />
              <Pressable onPress={() => handleUpdateFee("withdraw_fee", adminFee)} className="bg-[#633594] px-4 rounded-xl justify-center"><Text className="text-white font-bold text-xs">Simpan</Text></Pressable>
            </View>
          </View>
        </View>

        {/* 7. BROADCAST */}
        <View className="px-4 mt-8">
          <View className="flex-row items-center mb-3">
            <Megaphone size={18} color="#633594" />
            <Text className="text-lg font-bold ml-2">Kirim Broadcast</Text>
          </View>
          <View className="bg-white p-4 rounded-2xl border border-gray-100">
            <View className="flex-row gap-2 mb-3">
              {["user", "mitra"].map(t => (
                <Pressable key={t} onPress={() => setTarget(t as any)} className={`flex-1 py-2 rounded-xl items-center border ${target === t ? 'bg-[#633594] border-[#633594]' : 'bg-white border-gray-200'}`}>
                  <Text className={`font-bold ${target === t ? 'text-white' : 'text-gray-400'}`}>{t.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            {/* Title Input Field */}
            <TextInput
              placeholder="Judul Pengumuman"
              className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-3"
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
            />

            <TextInput
              multiline
              numberOfLines={3}
              placeholder="Tulis pesan..."
              style={{ textAlignVertical: 'top' }}
              className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-3 min-h-[100px]"
              value={message}
              onChangeText={setMessage}
            />
            <Pressable onPress={handleSendBroadcast} disabled={loading} className={`py-4 rounded-xl items-center ${loading ? 'bg-gray-300' : 'bg-[#633594]'}`}>
              <Text className="text-white font-bold">KIRIM SEKARANG</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>

      {/* --- MODALS --- */}

      {/* Modal Voucher (Create & Edit) */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[30px] p-6 pb-10 max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-gray-800">{selectedVoucher ? "Edit" : "Tambah"} Voucher</Text>
                <Pressable onPress={() => {
                  setModalVisible(false);
                  resetVoucherForm();
                }} className="p-2 bg-gray-100 rounded-full">
                  <X size={20} color="#633594" />
                </Pressable>
              </View>

              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Gambar Promo (Opsional)</Text>
              <Pressable
                onPress={pickVoucherImage}
                className="h-32 bg-gray-50 rounded-xl mb-2 justify-center items-center overflow-hidden border border-dashed border-gray-200"
              >
                {isUploadingVoucher ? <ActivityIndicator color="#633594" /> :
                  formImageUrl ? (
                    <>
                      <Image source={{ uri: `https://backend.tangerangfast.online${formImageUrl}` }} className="w-full h-full" />
                      <View className="absolute inset-0 bg-black/50 justify-center items-center">
                        <Text className="text-white text-xs font-bold">Tap to change</Text>
                      </View>
                    </>
                  ) : (
                    <View className="items-center">
                      <ImagePlus size={24} color="#cbd5e1" />
                      <Text className="text-[10px] text-gray-400 mt-1">Upload Banner (Max 10MB)</Text>
                    </View>
                  )}
              </Pressable>

              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Kode Voucher *</Text>
              <TextInput
                className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100 font-bold text-[#633594]"
                value={formCode}
                onChangeText={setFormCode}
                autoCapitalize="characters"
                placeholder="CONTOH20"
              />

              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Deskripsi Promo</Text>
              <TextInput
                multiline
                className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100"
                placeholder="Jelaskan detail promo..."
                value={formDescription}
                onChangeText={setFormDescription}
              />

              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Diskon (%) *</Text>
                  <TextInput
                    className="bg-gray-50 p-4 rounded-xl border border-gray-100"
                    keyboardType="numeric"
                    value={formPercent}
                    onChangeText={setFormPercent}
                    placeholder="10"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Min. Belanja (Rp)</Text>
                  <TextInput
                    className="bg-gray-50 p-4 rounded-xl border border-gray-100"
                    keyboardType="numeric"
                    value={formMin}
                    onChangeText={setFormMin}
                    placeholder="0"
                  />
                </View>
              </View>

              <View className="flex-row gap-4 mb-6">
                <View className="flex-1">
                  <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Maks Potongan (Rp)</Text>
                  <TextInput
                    className="bg-gray-50 p-4 rounded-xl border border-gray-100"
                    keyboardType="numeric"
                    value={formMax}
                    onChangeText={setFormMax}
                    placeholder="0"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Limit / User</Text>
                  <TextInput
                    className="bg-gray-50 p-4 rounded-xl border border-gray-100"
                    keyboardType="numeric"
                    value={formUsageLimit}
                    onChangeText={setFormUsageLimit}
                    placeholder="1"
                  />
                </View>
              </View>

              <Pressable
                className={`py-4 rounded-xl items-center ${loading || !formCode || !formPercent ? "bg-gray-400" : "bg-[#633594]"}`}
                onPress={handleSaveVoucher}
                disabled={loading || !formCode || !formPercent}
              >
                <Text className="text-white font-bold text-lg">
                  {loading ? "Menyimpan..." : selectedVoucher ? "Update Voucher" : "Simpan Voucher"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Hapus Service */}
      <Modal visible={modalDelete.visible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-8">
          <View className="bg-white w-full rounded-3xl p-6 items-center">
            <Trash2 size={40} color="#ef4444" />
            <Text className="text-lg font-bold mt-4">Hapus Layanan?</Text>
            <Text className="text-gray-500 text-center mt-2 mb-6">Layanan <Text className="font-bold text-gray-800">{modalDelete.name}</Text> akan dihapus permanen.</Text>
            <View className="flex-row gap-3 w-full">
              <Pressable onPress={() => setModalDelete({ visible: false, id: null, name: "" })} className="flex-1 py-3 bg-gray-100 rounded-xl items-center"><Text className="font-bold text-gray-600">Batal</Text></Pressable>
              <Pressable onPress={handleDeleteAsset} className="flex-1 py-3 bg-red-500 rounded-xl items-center"><Text className="font-bold text-white">Ya, Hapus</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Nama Service - Dengan Upload Gambar */}
      <Modal visible={editNameModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-8">
          <View className="bg-white w-full rounded-3xl p-6 max-h-[80%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-lg font-bold mb-4 text-center">Edit Menu Layanan</Text>

              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Gambar Menu</Text>
              <Pressable
                onPress={() => {
                  if (selectedAsset) {
                    pickAndUpload(selectedAsset.key_name);
                  }
                }}
                className="h-28 bg-gray-50 rounded-xl mb-4 justify-center items-center overflow-hidden border border-dashed border-gray-200"
              >
                {uploadingKey === selectedAsset?.key_name ? (
                  <ActivityIndicator color="#633594" />
                ) : selectedAsset?.image_url ? (
                  <Image
                    source={{ uri: `https://backend.tangerangfast.online${selectedAsset.image_url}` }}
                    className="w-full h-full"
                    resizeMode="contain"
                  />
                ) : (
                  <View className="items-center">
                    <ImagePlus size={24} color="#cbd5e1" />
                    <Text className="text-[10px] text-gray-400 mt-1">Tap to upload gambar</Text>
                  </View>
                )}
              </Pressable>

              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Nama Tampilan</Text>
              <TextInput
                className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 font-bold"
                value={newNameValue}
                onChangeText={setNewNameValue}
              />

              <View className="flex-row gap-3">
                <Pressable onPress={() => setEditNameModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl items-center">
                  <Text className="font-bold text-gray-600">Batal</Text>
                </Pressable>
                <Pressable onPress={async () => {
                  setLoading(true);
                  try {
                    await api.put(`/assets/update-info/${selectedAsset.id}`, { display_name: newNameValue });
                    loadAssets();
                    setEditNameModal(false);
                    Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Nama menu diperbarui' });
                  } catch (error) {
                    Toast.show({ type: 'error', text1: 'Gagal', text2: 'Gagal mengubah nama' });
                  } finally {
                    setLoading(false);
                  }
                }} className="flex-1 py-3 bg-[#633594] rounded-xl items-center">
                  <Text className="font-bold text-white">Simpan</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================= */}
      {/* Modal Tambah Layanan — UPDATED dengan upload gambar            */}
      {/* ============================================================= */}
      <Modal visible={addServiceModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[30px] p-6 pb-10">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-gray-800">Tambah Layanan Baru</Text>
                <Pressable
                  onPress={() => {
                    setAddServiceModal(false);
                    setNewService({ key: "", name: "" });
                    setNewServiceImageUri(null);
                    setNewServiceImageBase64(null);
                  }}
                  className="p-2 bg-gray-100 rounded-full"
                >
                  <X size={18} color="#633594" />
                </Pressable>
              </View>

              {/* Upload Gambar */}
              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Gambar Icon Layanan</Text>
              <Pressable
                onPress={pickNewServiceImage}
                className="h-32 bg-gray-50 rounded-xl mb-4 justify-center items-center overflow-hidden border border-dashed border-gray-200"
              >
                {isUploadingNewService ? (
                  <ActivityIndicator color="#633594" />
                ) : newServiceImageUri ? (
                  <>
                    <Image source={{ uri: newServiceImageUri }} className="w-full h-full" resizeMode="contain" />
                    <View className="absolute inset-0 bg-black/40 justify-center items-center">
                      <Pencil size={18} color="white" />
                      <Text className="text-white text-[10px] font-bold mt-1">Tap untuk ganti</Text>
                    </View>
                  </>
                ) : (
                  <View className="items-center">
                    <ImagePlus size={28} color="#cbd5e1" />
                    <Text className="text-[11px] text-gray-400 mt-2 font-semibold">Tap untuk pilih gambar</Text>
                    <Text className="text-[9px] text-gray-300 mt-0.5">PNG, JPG • Maks 5MB</Text>
                  </View>
                )}
              </Pressable>
              {newServiceImageUri && (
                <Pressable
                  onPress={() => { setNewServiceImageUri(null); setNewServiceImageBase64(null); }}
                  className="flex-row items-center justify-center mb-4 -mt-2"
                >
                  <X size={12} color="#ef4444" />
                  <Text className="text-[10px] text-red-400 ml-1 font-bold">Hapus gambar</Text>
                </Pressable>
              )}

              {/* Nama Layanan */}
              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Nama Layanan *</Text>
              <TextInput
                placeholder="Contoh: Cuci AC"
                className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4"
                value={newService.name}
                onChangeText={t => setNewService(p => ({ ...p, name: t }))}
              />

              {/* Kode Unik */}
              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Kode Unik *</Text>
              <TextInput
                placeholder="Contoh: pijat"
                autoCapitalize="none"
                className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6"
                value={newService.key}
                onChangeText={t => setNewService(p => ({ ...p, key: t }))}
              />

              <Pressable
                onPress={handleCreateService}
                disabled={!newService.key || !newService.name || loading}
                className={`py-4 rounded-xl items-center shadow-lg ${!newService.key || !newService.name || loading ? 'bg-gray-300' : 'bg-[#633594]'}`}
              >
                <Text className="text-white font-bold">{loading ? "Menyimpan..." : "SIMPAN LAYANAN"}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setAddServiceModal(false);
                  setNewService({ key: "", name: "" });
                  setNewServiceImageUri(null);
                  setNewServiceImageBase64(null);
                }}
                className="mt-4 items-center"
              >
                <Text className="text-gray-400 font-bold">Batal</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================= */}
      {/* Modal Tambah Menu Lainnya — UPDATED dengan upload gambar       */}
      {/* ============================================================= */}
      <Modal visible={addOtherServiceModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[30px] p-6 pb-10">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-gray-800">Tambah Menu Lainnya</Text>
                <Pressable
                  onPress={() => {
                    setAddOtherServiceModal(false);
                    setNewService({ key: "", name: "" });
                    setNewOtherImageUri(null);
                    setNewOtherImageBase64(null);
                  }}
                  className="p-2 bg-gray-100 rounded-full"
                >
                  <X size={18} color="#633594" />
                </Pressable>
              </View>

              {/* Upload Gambar */}
              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Gambar Icon Menu</Text>
              <Pressable
                onPress={pickNewOtherImage}
                className="h-32 bg-gray-50 rounded-xl mb-4 justify-center items-center overflow-hidden border border-dashed border-gray-200"
              >
                {isUploadingNewOther ? (
                  <ActivityIndicator color="#633594" />
                ) : newOtherImageUri ? (
                  <>
                    <Image source={{ uri: newOtherImageUri }} className="w-full h-full" resizeMode="contain" />
                    <View className="absolute inset-0 bg-black/40 justify-center items-center">
                      <Pencil size={18} color="white" />
                      <Text className="text-white text-[10px] font-bold mt-1">Tap untuk ganti</Text>
                    </View>
                  </>
                ) : (
                  <View className="items-center">
                    <ImagePlus size={28} color="#cbd5e1" />
                    <Text className="text-[11px] text-gray-400 mt-2 font-semibold">Tap untuk pilih gambar</Text>
                    <Text className="text-[9px] text-gray-300 mt-0.5">PNG, JPG • Maks 5MB</Text>
                  </View>
                )}
              </Pressable>
              {newOtherImageUri && (
                <Pressable
                  onPress={() => { setNewOtherImageUri(null); setNewOtherImageBase64(null); }}
                  className="flex-row items-center justify-center mb-4 -mt-2"
                >
                  <X size={12} color="#ef4444" />
                  <Text className="text-[10px] text-red-400 ml-1 font-bold">Hapus gambar</Text>
                </Pressable>
              )}

              {/* Nama Menu */}
              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Nama Menu *</Text>
              <TextInput
                placeholder="Contoh: Laundry"
                className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4"
                value={newService.name}
                onChangeText={t => setNewService(p => ({ ...p, name: t }))}
              />

              {/* Kode Unik */}
              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Kode Unik *</Text>
              <TextInput
                placeholder="Contoh: laundry"
                autoCapitalize="none"
                className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6"
                value={newService.key}
                onChangeText={t => setNewService(p => ({ ...p, key: t }))}
              />

              <Pressable
                onPress={handleCreateOtherService}
                disabled={!newService.key || !newService.name || loading}
                className={`py-4 rounded-xl items-center shadow-lg ${!newService.key || !newService.name || loading ? 'bg-gray-300' : 'bg-[#633594]'}`}
              >
                <Text className="text-white font-bold">{loading ? "Menyimpan..." : "SIMPAN MENU"}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setAddOtherServiceModal(false);
                  setNewService({ key: "", name: "" });
                  setNewOtherImageUri(null);
                  setNewOtherImageBase64(null);
                }}
                className="mt-4 items-center"
              >
                <Text className="text-gray-400 font-bold">Batal</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Menu Lainnya - Dengan Upload Gambar */}
      <Modal visible={editOtherModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-8">
          <View className="bg-white w-full rounded-3xl p-6 max-h-[80%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-lg font-bold mb-4 text-center">Edit Menu Lainnya</Text>

              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Gambar Menu</Text>
              <Pressable
                onPress={() => {
                  if (selectedOtherAsset) {
                    pickAndUpload(selectedOtherAsset.key_name);
                  }
                }}
                className="h-28 bg-gray-50 rounded-xl mb-4 justify-center items-center overflow-hidden border border-dashed border-gray-200"
              >
                {uploadingKey === selectedOtherAsset?.key_name ? (
                  <ActivityIndicator color="#633594" />
                ) : selectedOtherAsset?.image_url ? (
                  <Image
                    source={{ uri: `https://backend.tangerangfast.online${selectedOtherAsset.image_url}` }}
                    className="w-full h-full"
                    resizeMode="contain"
                  />
                ) : (
                  <View className="items-center">
                    <ImagePlus size={24} color="#cbd5e1" />
                    <Text className="text-[10px] text-gray-400 mt-1">Tap to upload gambar</Text>
                  </View>
                )}
              </Pressable>

              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Nama Menu</Text>
              <TextInput
                className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 font-bold"
                value={editOtherName}
                onChangeText={setEditOtherName}
              />

              <View className="flex-row gap-3">
                <Pressable onPress={() => setEditOtherModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl items-center">
                  <Text className="font-bold text-gray-600">Batal</Text>
                </Pressable>
                <Pressable onPress={handleUpdateOtherMenu} className="flex-1 py-3 bg-[#633594] rounded-xl items-center">
                  <Text className="font-bold text-white">Simpan</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Global Loading Overlay */}
      {loading && (
        <View className="absolute inset-0 bg-white/40 justify-center items-center z-[99]">
          <ActivityIndicator size="large" color="#633594" />
        </View>
      )}

      <Toast />
    </View>
  );
}