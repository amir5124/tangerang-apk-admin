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
  const [editNameModal, setEditNameModal] = useState(false);

  // States: Form Data
  const [newService, setNewService] = useState({ key: "", name: "" });
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [newNameValue, setNewNameValue] = useState("");
  
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

  // States: Broadcast
  const [target, setTarget] = useState<"user" | "mitra">("user");
  const [message, setMessage] = useState("");

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

  const pickVoucherImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });

    if (!result.canceled) {
      setIsUploadingVoucher(true);
      try {
        const base64 = await getBase64(result.assets[0].uri);
        const res = await api.post("/assets/upload-base64", {
          key_name: `vch_${Date.now()}`,
          image_data: base64,
          file_name: `voucher_${formCode || 'new'}.jpg`,
        });
        setFormImageUrl(res.data.url); 
        Toast.show({ type: 'success', text1: 'Gambar Voucher Terpilih' });
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Gagal upload gambar voucher' });
      } finally {
        setIsUploadingVoucher(false);
      }
    }
  };

  const handleCreateService = async () => {
    if (!newService.key || !newService.name) return;
    setLoading(true);
    try {
      const key = newService.key.startsWith('icon_') ? newService.key.toLowerCase() : `icon_${newService.key.toLowerCase().replace(/\s+/g, '_')}`;
      await api.post("/assets", { key_name: key, display_name: newService.name });
      Toast.show({ type: 'success', text1: 'Sukses', text2: 'Layanan ditambahkan' });
      setAddServiceModal(false);
      setNewService({ key: "", name: "" });
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

  const handleSendBroadcast = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      await api.post("/notifications/broadcast", {
        targetTopic: target === "user" ? "all_customer" : "all_mitra",
        title: "Pengumuman",
        body: message,
        data: { type: "BROADCAST" },
      });
      Toast.show({ type: 'success', text1: 'Berhasil', text2: 'Pesan terkirim' });
      setMessage("");
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
    const payload = {
      code: formCode,
      discount_percent: formPercent,
      min_purchase: formMin,
      max_discount_amount: formMax,
      usage_limit: formUsageLimit,
      description: formDescription,
      image_url: formImageUrl
    };

    try {
      if (selectedVoucher?.id) {
        await api.put(`/voucher/${selectedVoucher.id}`, payload);
        Toast.show({ type: 'success', text1: 'Voucher diperbarui' });
      } else {
        await api.post("/voucher/bulk", { vouchers: [payload] });
        Toast.show({ type: 'success', text1: 'Voucher baru ditambahkan' });
      }
      setModalVisible(false);
      fetchVouchers();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Gagal menyimpan voucher' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVoucher = async (id: number) => {
    setLoading(true);
    try {
      await api.delete("/voucher/bulk", { data: { ids: [id] } });
      Toast.show({ type: 'success', text1: 'Voucher dihapus' });
      fetchVouchers();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Gagal menghapus voucher' });
    } finally {
      setLoading(false);
    }
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

        {/* 2. JASA TERPOPULER */}
        <View className="px-4 mt-8">
          <View className="flex-row items-center mb-3">
            <Star size={18} color="#633594" />
            <Text className="text-lg font-bold ml-2">Jasa Terpopuler</Text>
          </View>
          <View className="flex-row gap-3">
            {[1, 2].map((id) => {
              const key = `popular_service_${id}`;
              const asset = assets?.find((a) => a.key_name === key);
              return (
                <View key={id} className="flex-1 bg-white p-4 rounded-2xl items-center  border border-gray-100">
                  <Pressable onPress={() => pickAndUpload(key)} className="w-16 h-16 bg-gray-50 rounded-2xl mb-3 justify-center items-center overflow-hidden border border-gray-100">
                    {uploadingKey === key ? <ActivityIndicator color="#633594" /> : 
                      asset?.image_url ? <Image source={{ uri: `https://backend.tangerangfast.online${asset.image_url}` }} className="w-full h-full" /> : <Star size={20} color="#cbd5e1" />}
                  </Pressable>
                  <Pressable onPress={() => { setSelectedAsset(asset); setNewNameValue(asset?.display_name || ""); setEditNameModal(true); }} className="bg-purple-100 px-3 py-1 rounded-full flex-row items-center">
                    <Text className="text-[10px] text-[#633594] font-bold mr-1">{asset?.display_name || 'Set Nama'}</Text>
                    <Pencil size={8} color="#633594" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* 3. MENU LAYANAN */}
        <View className="px-4 mt-8">
         <View className="flex-row justify-between items-center mb-3 px-1">
  {/* SISI KIRI: Icon & Judul */}
  <View className="flex-row items-center">
    <LayoutGrid size={18} color="#633594" />
    <Text className="text-lg font-bold ml-2 text-gray-800">Menu Layanan</Text>
  </View>

  {/* SISI KANAN: Tombol Tambah */}
  <Pressable 
    onPress={() => setAddServiceModal(true)} 
    className="bg-[#633594] px-4 py-1.5 rounded-full active:opacity-70"
  >
    <Text className="text-white text-[10px] font-bold">+ LAYANAN</Text>
  </Pressable>
</View>
          <View className="bg-white rounded-2xl p-4 flex-row flex-wrap justify-between  border border-gray-100">
            {assets?.filter(a => a.key_name.startsWith('icon_')).map((asset) => (
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
                  <Pencil size={6} color="#94a3b8" style={{marginLeft: 2}} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* 4. BANNER PROMO TENGAH */}
        <View className="px-4 mt-8">
          <View className="flex-row items-center mb-3">
            <ImageIcon size={18} color="#633594" />
            <Text className="text-lg font-bold ml-2">Banner Promo</Text>
          </View>
          <View className="bg-white p-4 rounded-2xl  border border-gray-100">
            {(() => {
              const key = "banner_promo";
              const asset = assets?.find(a => a.key_name === key);
              return (
                <>
                  <View className="h-32 bg-gray-50 rounded-xl mb-3 justify-center items-center overflow-hidden border border-dashed border-gray-200">
                    {uploadingKey === key ? <ActivityIndicator color="#633594" /> : 
                      asset?.image_url ? <Image source={{ uri: `https://backend.tangerangfast.online${asset.image_url}` }} className="w-full h-full" /> : <ImagePlus size={24} color="#cbd5e1" />}
                  </View>
                  <Pressable onPress={() => pickAndUpload(key)} className="bg-[#633594] py-3 rounded-xl flex-row justify-center items-center">
                    <Pencil size={14} color="white" />
                    <Text className="text-white font-bold ml-2">Update Banner Promo</Text>
                  </Pressable>
                </>
              );
            })()}
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
                setSelectedVoucher(null);
                setFormCode("");
                setFormPercent("");
                setFormMin("");
                setFormMax("");
                setFormUsageLimit("");
                setFormDescription("");
                setFormImageUrl("");
                setModalVisible(true);
              }} 
              className="bg-[#633594] px-4 py-1.5 rounded-full"
            >
              <Text className="text-white text-[10px] font-bold">+ VOUCHER</Text>
            </Pressable>
          </View>
          <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {vouchers.map((v) => (
              <View key={v.id} className="p-4 border-b border-gray-50 flex-row items-center">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="font-black text-[#633594] text-base">{v.code}</Text>
                    <Pressable 
                      onPress={() => {
                        setSelectedVoucher(v);
                        setFormCode(v.code);
                        setFormPercent(String(v.discount_percent));
                        setFormMin(String(v.min_purchase || "0"));
                        setFormMax(String(v.max_discount_amount));
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
                  </View>
                  <Text className="text-[11px] text-gray-500 mt-0.5">
                    Disc {v.discount_percent}% • Min. Rp{parseInt(v.min_purchase || 0).toLocaleString('id-ID')}
                  </Text>
                </View>
                <Switch 
                  value={v.is_active === 1} 
                  onValueChange={() => handleToggleVoucher(v.id, v.is_active)}
                  trackColor={{ true: '#633594', false: '#cbd5e1' }} 
                />
              </View>
            ))}
          </View>
        </View>

        {/* 6. BIAYA-BIAYA */}
        <View className="px-4 mt-8">
          <View className="flex-row items-center mb-3">
            <Settings size={18} color="#633594" />
            <Text className="text-lg font-bold ml-2">Konfigurasi Biaya</Text>
          </View>
          <View className="bg-white p-4 rounded-2xl  border border-gray-100 mb-4">
            <Text className="text-[10px] font-bold text-gray-400 mb-2">BIAYA LAYANAN APP (RP)</Text>
            <View className="flex-row gap-2">
              <TextInput className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100 font-bold" value={serviceFee} onChangeText={setServiceFee} keyboardType="numeric" />
              <Pressable onPress={() => handleUpdateFee("app_service_fee", serviceFee)} className="bg-[#633594] px-4 rounded-xl justify-center"><Text className="text-white font-bold text-xs">Simpan</Text></Pressable>
            </View>
          </View>
          <View className="bg-white p-4 rounded-2xl  border border-gray-100">
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
          <View className="bg-white p-4 rounded-2xl  border border-gray-100">
            <View className="flex-row gap-2 mb-3">
              {["user", "mitra"].map(t => (
                <Pressable key={t} onPress={() => setTarget(t as any)} className={`flex-1 py-2 rounded-xl items-center border ${target === t ? 'bg-[#633594] border-[#633594]' : 'bg-white border-gray-200'}`}>
                  <Text className={`font-bold ${target === t ? 'text-white' : 'text-gray-400'}`}>{t.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput multiline numberOfLines={3} placeholder="Tulis pesan..." className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-3" value={message} onChangeText={setMessage} />
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
                <Pressable onPress={() => setModalVisible(false)} className="p-2 bg-gray-100 rounded-full">
                  <X size={20} color="#633594" />
                </Pressable>
              </View>

              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Gambar Promo (Opsional)</Text>
              <Pressable 
                onPress={pickVoucherImage}
                className="h-32 bg-gray-50 rounded-xl mb-4 justify-center items-center overflow-hidden border border-dashed border-gray-200"
              >
                {isUploadingVoucher ? <ActivityIndicator color="#633594" /> : 
                  formImageUrl ? <Image source={{ uri: `https://backend.tangerangfast.online${formImageUrl}` }} className="w-full h-full" /> : 
                  <View className="items-center"><ImagePlus size={24} color="#cbd5e1" /><Text className="text-[10px] text-gray-400 mt-1">Upload Banner</Text></View>}
              </Pressable>

              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Kode Voucher</Text>
              <TextInput className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100 font-bold text-[#633594]" value={formCode} onChangeText={setFormCode} autoCapitalize="characters" />
              
              <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Deskripsi Promo</Text>
              <TextInput multiline className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100" placeholder="Jelaskan detail promo..." value={formDescription} onChangeText={setFormDescription} />

              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Diskon (%)</Text>
                  <TextInput className="bg-gray-50 p-4 rounded-xl border border-gray-100" keyboardType="numeric" value={formPercent} onChangeText={setFormPercent} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Min. Belanja (Rp)</Text>
                  <TextInput className="bg-gray-50 p-4 rounded-xl border border-gray-100" keyboardType="numeric" value={formMin} onChangeText={setFormMin} />
                </View>
              </View>

              <View className="flex-row gap-4 mb-6">
                <View className="flex-1">
                  <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Maks Potongan (Rp)</Text>
                  <TextInput className="bg-gray-50 p-4 rounded-xl border border-gray-100" keyboardType="numeric" value={formMax} onChangeText={setFormMax} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-500 text-[10px] mb-1 ml-1 font-bold uppercase">Limit / User</Text>
                  <TextInput className="bg-gray-50 p-4 rounded-xl border border-gray-100" keyboardType="numeric" value={formUsageLimit} onChangeText={setFormUsageLimit} />
                </View>
              </View>

              <Pressable className={`py-4 rounded-xl items-center ${loading ? "bg-gray-400" : "bg-[#633594]"}`} onPress={handleSaveVoucher} disabled={loading}>
                <Text className="text-white font-bold text-lg">{loading ? "Menyimpan..." : "Simpan Voucher"}</Text>
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

      {/* Modal Edit Nama Service */}
      <Modal visible={editNameModal} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50 px-8">
          <View className="bg-white w-full rounded-3xl p-6">
            <Text className="text-lg font-bold mb-4 text-center">Ubah Nama Tampilan</Text>
            <TextInput className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 font-bold" value={newNameValue} onChangeText={setNewNameValue} />
            <View className="flex-row gap-3">
              <Pressable onPress={() => setEditNameModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl items-center"><Text className="font-bold text-gray-600">Batal</Text></Pressable>
              <Pressable onPress={async () => {
                setLoading(true);
                try {
                  await api.put(`/assets/update-info/${selectedAsset.id}`, { display_name: newNameValue });
                  loadAssets();
                  setEditNameModal(false);
                } finally { setLoading(false); }
              }} className="flex-1 py-3 bg-[#633594] rounded-xl items-center"><Text className="font-bold text-white">Simpan</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Tambah Layanan */}
      <Modal visible={addServiceModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[30px] p-6 pb-10">
            <Text className="text-xl font-bold mb-6 text-gray-800">Tambah Layanan Baru</Text>
            <TextInput placeholder="Nama Layanan (e.g. Cuci AC)" className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4" value={newService.name} onChangeText={t => setNewService(p => ({...p, name: t}))} />
            <TextInput placeholder="Kode Unik (e.g. pijat)" autoCapitalize="none" className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6" value={newService.key} onChangeText={t => setNewService(p => ({...p, key: t}))} />
            <Pressable onPress={handleCreateService} className="bg-[#633594] py-4 rounded-xl items-center shadow-lg"><Text className="text-white font-bold">SIMPAN LAYANAN</Text></Pressable>
            <Pressable onPress={() => setAddServiceModal(false)} className="mt-4 items-center"><Text className="text-gray-400 font-bold">Batal</Text></Pressable>
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