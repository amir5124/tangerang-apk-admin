import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import API from "../src/utils/api";
import { storage } from "../src/utils/storage";

// ========== Type Definitions ==========
interface Bank {
  code: string;
  name: string;
}

interface BankOption {
  label: string;
  code: string;
}

interface BankAccount {
  id: number;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_active: boolean;
}

interface UserData {
  id: string;
  name?: string;
}

interface BankInfo {
  holder: string;
  inquiryReff: string;
}

type TransactionStatus = "success" | "failed" | null;

const PRIMARY_COLOR = "#633594";

// Fungsi untuk membersihkan nama bank
const cleanBankName = (name: string): string => {
  if (!name) return "";
  let cleaned = name.replace(/\s*0+\s*$/g, "");
  cleaned = cleaned.replace(/[^\w\s]/g, "");
  cleaned = cleaned.trim();
  return cleaned || name;
};

// Bank list fallback dengan format yang benar
const BANK_LIST_FALLBACK: Bank[] = [
  { code: "014", name: "Bank BCA" },
  { code: "008", name: "Bank Mandiri" },
  { code: "009", name: "Bank BNI" },
  { code: "002", name: "Bank BRI" },
  { code: "200", name: "Bank Tabungan Negara (BTN)" },
  { code: "451", name: "Bank Syariah Indonesia (BSI)" },
  { code: "022", name: "Bank CIMB Niaga" },
  { code: "013", name: "Bank Permata" },
  { code: "542", name: "Bank Jago" },
  { code: "535", name: "SeaBank Indonesia" },
  { code: "501", name: "Blu by BCA Digital" },
  { code: "213", name: "Jenius (Bank BTPN)" },
];

// Konversi ke format option untuk dropdown
const BANK_OPTIONS: BankOption[] = BANK_LIST_FALLBACK.map(bank => ({
  label: bank.name,
  code: bank.code
})).sort((a, b) => a.label.localeCompare(b.label));

export default function WithdrawAdminPage() {
  const router = useRouter();
  const THEME_COLOR = "#633594";

  // UI States
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [trxStatus, setTrxStatus] = useState<TransactionStatus>(null);
  const [showBankModal, setShowBankModal] = useState<boolean>(false);
  const [showSavedAccountsModal, setShowSavedAccountsModal] = useState<boolean>(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false);

  // Data States
  const [userData, setUserData] = useState<UserData | null>(null);
  const [adminFee, setAdminFee] = useState<number>(0);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [savedAccounts, setSavedAccounts] = useState<BankAccount[]>([]);
  const [meta, setMeta] = useState({ total_accounts: 0, max_accounts: 2, remaining_slots: 2 });
  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);

  // Form States
  const [amount, setAmount] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<BankOption | null>(null);
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [bankInfo, setBankInfo] = useState<BankInfo>({ holder: "", inquiryReff: "" });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSavedAccount, setSelectedSavedAccount] = useState<BankAccount | null>(null);
  const [useSavedAccount, setUseSavedAccount] = useState<boolean>(true);

  // Add Account Form States
  const [newAccountForm, setNewAccountForm] = useState({
    bank_code: "",
    account_number: "",
    account_name: "",
  });
  const [addingAccount, setAddingAccount] = useState<boolean>(false);

  // Load data
  const loadUserData = async () => {
    try {
      const raw = await storage.get("userData");
      if (raw) {
        const user = typeof raw === "string" ? JSON.parse(raw) : raw;
        setUserData(user);
      }
    } catch (e) {
      console.error("Load User Data Error:", e);
    }
  };

  const fetchAdminFee = async () => {
    try {
      const res = await API.get("/disburse/withdraw_fee");
      if (res.data.success && res.data.value) {
        setAdminFee(parseInt(res.data.value));
      }
    } catch (e: any) {
      setAdminFee(0);
    }
  };

  const fetchBankList = async () => {
    try {
      const response = await API.get("/bank/list");
      if (response.data.success && response.data.data) {
        setBanks(response.data.data);
      }
    } catch (error) {
      console.error("Fetch bank list error:", error);
    }
  };

  const fetchSavedAccounts = async () => {
    try {
      const response = await API.get("/bank/accounts");
      if (response.data.success) {
        const cleanedAccounts = (response.data.data || []).map((account: BankAccount) => ({
          ...account,
          bank_name: cleanBankName(account.bank_name)
        }));
        setSavedAccounts(cleanedAccounts);
        if (response.data.meta) {
          setMeta(response.data.meta);
        }
      }
    } catch (error) {
      console.error("Fetch accounts error:", error);
    }
  };

  // ========== FUNGSI HAPUS REKENING (Cross-Platform) ==========
  const showDeleteConfirmation = (accountId: number, bankName: string, accountNumber: string) => {
    const message = `Apakah Anda yakin ingin menghapus rekening ${bankName} - ${accountNumber}?\n\nTindakan ini tidak dapat dibatalkan.`;

    if (Platform.OS === 'web') {
      // Untuk Web: menggunakan window.confirm
      const confirmed = window.confirm(message);
      if (confirmed) {
        handleDeleteAccount(accountId);
      }
    } else {
      // Untuk Android/iOS: menggunakan React Native Alert
      Alert.alert(
        "Hapus Rekening",
        message,
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Hapus",
            style: "destructive",
            onPress: () => handleDeleteAccount(accountId)
          }
        ]
      );
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    setDeletingAccountId(accountId);
    try {
      const response = await API.delete(`/bank/accounts/${accountId}`);
      if (response.data.success) {
        Toast.show({ type: "success", text1: "Berhasil", text2: response.data.message || "Rekening berhasil dihapus" });

        // Jika rekening yang dihapus adalah rekening yang sedang dipilih
        if (selectedSavedAccount?.id === accountId) {
          setSelectedSavedAccount(null);
        }

        await fetchSavedAccounts();
      } else {
        Toast.show({ type: "error", text1: "Gagal", text2: response.data.message || "Gagal menghapus rekening" });
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Gagal", text2: error.response?.data?.message || "Terjadi kesalahan saat menghapus rekening" });
    } finally {
      setDeletingAccountId(null);
    }
  };

  const addBankAccount = async () => {
    if (!newAccountForm.bank_code) {
      Toast.show({ type: "error", text1: "Error", text2: "Pilih bank terlebih dahulu" });
      return;
    }
    if (!newAccountForm.account_number || newAccountForm.account_number.length < 6) {
      Toast.show({ type: "error", text1: "Error", text2: "Nomor rekening minimal 6 digit" });
      return;
    }
    if (!newAccountForm.account_name || newAccountForm.account_name.length < 3) {
      Toast.show({ type: "error", text1: "Error", text2: "Nama pemilik rekening minimal 3 karakter" });
      return;
    }

    setAddingAccount(true);
    try {
      const response = await API.post("/bank/accounts", newAccountForm);
      if (response.data.success) {
        Toast.show({ type: "success", text1: "Berhasil", text2: "Rekening berhasil ditambahkan" });
        await fetchSavedAccounts();
        setShowAddAccountModal(false);
        setNewAccountForm({ bank_code: "", account_number: "", account_name: "" });
      } else {
        Toast.show({ type: "error", text1: "Gagal", text2: response.data.message });
      }
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Gagal", text2: error.response?.data?.message || "Gagal menambahkan rekening" });
    } finally {
      setAddingAccount(false);
    }
  };

  const resetForm = useCallback(() => {
    setStep(1);
    setAmount("");
    setSelectedBank(null);
    setAccountNumber("");
    setAccountName("");
    setSelectedSavedAccount(null);
    setBankInfo({ holder: "", inquiryReff: "" });
    setTrxStatus(null);
    setLoading(false);
    setUseSavedAccount(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetForm();
      loadUserData();
      fetchAdminFee();
      fetchBankList();
      fetchSavedAccounts();
    }, [resetForm])
  );

  const formatIDR = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val || 0);

  const handleInquiry = async () => {
    const val = parseInt(amount);

    if (!val || val <= 0) {
      return Toast.show({ type: "error", text1: "Error", text2: "Masukkan nominal yang valid" });
    }

    let bankCode = "";
    let accountNo = "";

    if (useSavedAccount && selectedSavedAccount) {
      bankCode = selectedSavedAccount.bank_code;
      accountNo = selectedSavedAccount.account_number;
    } else {
      if (!selectedBank) {
        return Toast.show({ type: "error", text1: "Error", text2: "Pilih bank tujuan" });
      }
      if (!accountNumber) {
        return Toast.show({ type: "error", text1: "Error", text2: "Isi nomor rekening" });
      }
      bankCode = selectedBank.code;
      accountNo = accountNumber;
    }

    setLoading(true);
    try {
      const res = await API.post("/withdraw/admin-inquiry", {
        amount: val,
        bank_code: bankCode,
        account_number: accountNo,
        admin_id: 0,
      });

      if (res.data.success) {
        setBankInfo({
          holder: res.data.data.accountname,
          inquiryReff: res.data.data.inquiry_reff,
        });
        setStep(2);
      }
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Gagal",
        text2: e.response?.data?.message || "Rekening tidak ditemukan atau API Error.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await API.post("/withdraw/admin-execute", {
        admin_id: 0,
        inquiry_reff: bankInfo.inquiryReff,
      });

      if (res.data.success) {
        setTrxStatus("success");
        setShowStatusModal(true);
      }
    } catch (e: any) {
      console.error(e);
      setTrxStatus("failed");
      setShowStatusModal(true);
      Toast.show({
        type: "error",
        text1: "Gagal Eksekusi",
        text2: e.response?.data?.message || "Terjadi kesalahan sistem.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter bank options untuk modal bank
  const filteredBankOptions = BANK_OPTIONS.filter((bank) =>
    bank.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get display info for selected account
  const getSelectedAccountDisplay = () => {
    if (useSavedAccount && selectedSavedAccount) {
      return {
        bankName: selectedSavedAccount.bank_name,
        accountNumber: selectedSavedAccount.account_number,
        accountName: selectedSavedAccount.account_name,
      };
    }
    return {
      bankName: selectedBank?.label || "",
      accountNumber: accountNumber,
      accountName: "",
    };
  };

  const displayInfo = getSelectedAccountDisplay();

  // Bank list untuk Picker di modal tambah rekening
  const bankListForPicker = banks.length > 0 ? banks : BANK_LIST_FALLBACK;

  // Render item rekening dengan tombol hapus
  const renderSavedAccountItem = ({ item }: { item: BankAccount }) => (
    <View style={styles.savedAccountItemWrapper}>
      <TouchableOpacity
        style={[
          styles.savedAccountOption,
          selectedSavedAccount?.id === item.id && styles.selectedAccountOption,
        ]}
        onPress={() => {
          setSelectedSavedAccount(item);
          setUseSavedAccount(true);
          setShowSavedAccountsModal(false);
        }}
      >
        <View style={styles.savedAccountIcon}>
          <Ionicons name="business-outline" size={24} color={PRIMARY_COLOR} />
        </View>
        <View style={styles.savedAccountInfo}>
          <Text style={styles.savedAccountBank}>{item.bank_name}</Text>
          <Text style={styles.savedAccountNumber}>{item.account_number}</Text>
          <Text style={styles.savedAccountName}>{item.account_name}</Text>
        </View>
        {item.is_active && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Utama</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Tombol Hapus */}
      <TouchableOpacity
        style={styles.deleteAccountButton}
        onPress={() => showDeleteConfirmation(item.id, item.bank_name, item.account_number)}
        disabled={deletingAccountId === item.id}
      >
        {deletingAccountId === item.id ? (
          <ActivityIndicator size="small" color="#dc2626" />
        ) : (
          <Ionicons name="trash-outline" size={20} color="#dc2626" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFDFD" }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />

      {/* Modal Pilih Rekening Tersimpan */}
      <Modal visible={showSavedAccountsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Rekening Tersimpan</Text>
              <TouchableOpacity onPress={() => setShowSavedAccountsModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {savedAccounts.length === 0 ? (
              <View style={styles.emptyAccountsContainer}>
                <Ionicons name="card-outline" size={48} color="#adb5bd" />
                <Text style={styles.emptyText}>Belum ada rekening tersimpan</Text>
                <TouchableOpacity
                  style={styles.addAccountBtn}
                  onPress={() => {
                    setShowSavedAccountsModal(false);
                    setShowAddAccountModal(true);
                  }}
                >
                  <Text style={styles.addAccountBtnText}>+ Tambah Rekening Baru</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <FlatList
                  data={savedAccounts}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderSavedAccountItem}
                />
                <TouchableOpacity
                  style={styles.addNewAccountBtn}
                  onPress={() => {
                    setShowSavedAccountsModal(false);
                    setShowAddAccountModal(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color={PRIMARY_COLOR} />
                  <Text style={styles.addNewAccountBtnText}>Tambah Rekening Baru</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Tambah Rekening Baru */}
      <Modal visible={showAddAccountModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: "auto", maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Rekening Baru</Text>
              <TouchableOpacity onPress={() => setShowAddAccountModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Pilih Bank *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newAccountForm.bank_code}
                  onValueChange={(itemValue) => setNewAccountForm({ ...newAccountForm, bank_code: itemValue })}
                  style={styles.picker}
                >
                  <Picker.Item label="Pilih Bank" value="" />
                  {bankListForPicker.map((bank) => (
                    <Picker.Item
                      key={bank.code}
                      label={`${bank.name} (${bank.code})`}
                      value={bank.code}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Nomor Rekening *</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan nomor rekening"
                value={newAccountForm.account_number}
                onChangeText={(text) => {
                  const numericValue = text.replace(/\D/g, "");
                  setNewAccountForm({ ...newAccountForm, account_number: numericValue });
                }}
                keyboardType="numeric"
                maxLength={20}
              />

              <Text style={styles.inputLabel}>Nama Pemilik Rekening *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nama sesuai rekening bank"
                value={newAccountForm.account_name}
                onChangeText={(text) => setNewAccountForm({ ...newAccountForm, account_name: text.toUpperCase() })}
                autoCapitalize="characters"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => setShowAddAccountModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitModalButton]}
                  onPress={addBankAccount}
                  disabled={addingAccount}
                >
                  {addingAccount ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Simpan</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Bank Selection (untuk rekening baru) */}
      <Modal visible={showBankModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Bank Tujuan</Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchBar}
              placeholder="Cari bank..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              data={filteredBankOptions}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bankOption}
                  onPress={() => {
                    setSelectedBank(item);
                    setShowBankModal(false);
                    setSearchQuery("");
                  }}
                >
                  <Text style={styles.bankOptionText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#DDD" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.headerCard, { backgroundColor: THEME_COLOR }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Penarikan Dana (Admin)</Text>
          </View>

          {step === 1 ? (
            <View style={styles.formContainer}>
              <Text style={styles.label}>Nominal Tarik</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan nominal"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              {/* Pilihan Sumber Rekening */}
              <Text style={styles.label}>Sumber Rekening</Text>
              <View style={styles.sourceContainer}>
                <TouchableOpacity
                  style={[
                    styles.sourceOption,
                    useSavedAccount && styles.sourceOptionActive,
                  ]}
                  onPress={() => setUseSavedAccount(true)}
                >
                  <Ionicons
                    name={useSavedAccount ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={useSavedAccount ? PRIMARY_COLOR : "#999"}
                  />
                  <Text style={[styles.sourceText, useSavedAccount && styles.sourceTextActive]}>
                    Rekening Tersimpan
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sourceOption,
                    !useSavedAccount && styles.sourceOptionActive,
                  ]}
                  onPress={() => setUseSavedAccount(false)}
                >
                  <Ionicons
                    name={!useSavedAccount ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={!useSavedAccount ? PRIMARY_COLOR : "#999"}
                  />
                  <Text style={[styles.sourceText, !useSavedAccount && styles.sourceTextActive]}>
                    Rekening Baru
                  </Text>
                </TouchableOpacity>
              </View>

              {useSavedAccount ? (
                // Pilih dari rekening tersimpan
                <>
                  <Text style={styles.label}>Pilih Rekening Tujuan</Text>
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => setShowSavedAccountsModal(true)}
                  >
                    <Text style={{ color: selectedSavedAccount ? "#333" : "#999", flex: 1 }}>
                      {selectedSavedAccount
                        ? `${selectedSavedAccount.bank_name} - ${selectedSavedAccount.account_number}`
                        : "Pilih Rekening Tersimpan"}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={PRIMARY_COLOR} />
                  </TouchableOpacity>
                  {selectedSavedAccount && (
                    <View style={styles.selectedAccountPreview}>
                      <Text style={styles.previewText}>
                        {selectedSavedAccount.bank_name} - {selectedSavedAccount.account_number}
                      </Text>
                      <Text style={styles.previewSubtext}>
                        a.n. {selectedSavedAccount.account_name}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                // Input rekening baru
                <>
                  <Text style={styles.label}>Bank Tujuan</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowBankModal(true)}>
                    <Text style={{ color: selectedBank ? "#333" : "#999" }}>
                      {selectedBank ? selectedBank.label : "Pilih Bank"}
                    </Text>
                    <Ionicons name="caret-down" size={16} color={PRIMARY_COLOR} />
                  </TouchableOpacity>

                  <Text style={styles.label}>Nomor Rekening</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Isi nomor rekening"
                    keyboardType="numeric"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: THEME_COLOR }]}
                onPress={handleInquiry}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Cek Rekening</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={styles.confirmTitle}>Konfirmasi Penarikan</Text>
              <View style={styles.detailBox}>
                <DetailRow label="Nama Penerima" value={bankInfo.holder} bold />
                <DetailRow label="Bank" value={displayInfo.bankName} />
                <DetailRow label="Nomor Rekening" value={displayInfo.accountNumber} />
                <View style={styles.line} />
                <DetailRow label="Nominal Tarik" value={formatIDR(parseInt(amount))} />
                <DetailRow label="Biaya Admin" value={formatIDR(adminFee)} />
                <DetailRow
                  label="Total Dana"
                  value={formatIDR(parseInt(amount) + adminFee)}
                  color={THEME_COLOR}
                  bold
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: loading ? "#A5D6A7" : "#4CAF50" }]}
                onPress={handleWithdraw}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Proses Sekarang</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep(1)} style={styles.backLink}>
                <Text style={{ color: "#666" }}>Ubah Data</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Status Modal */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <View style={styles.statusOverlay}>
          <View style={styles.statusCard}>
            <Ionicons
              name={trxStatus === "success" ? "checkmark-circle" : "close-circle"}
              size={80}
              color={trxStatus === "success" ? "#4CAF50" : "#F44336"}
            />
            <Text style={styles.statusTitle}>{trxStatus === "success" ? "Sukses!" : "Gagal"}</Text>
            <Text style={styles.statusSub}>
              {trxStatus === "success"
                ? "Proses penarikan dana admin berhasil."
                : "Terjadi kesalahan saat memproses transaksi."}
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: THEME_COLOR, width: "100%" }]}
              onPress={() => {
                setShowStatusModal(false);
                router.replace("/(tabs)");
              }}
            >
              <Text style={styles.btnText}>Selesai</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}

// --- DetailRow Component ---
interface DetailRowProps {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, bold, color }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, bold && { fontWeight: "bold" }, color && { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  headerCard: { padding: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, paddingBottom: 40 },
  backBtn: { marginBottom: 15 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  formContainer: { padding: 20 },
  label: { fontSize: 13, fontWeight: "bold", color: "#633594", marginTop: 20, marginBottom: 8 },
  input: { backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#EEE", padding: 10, fontSize: 16 },
  dropdownTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#EEE",
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  primaryBtn: {
    padding: 16,
    borderRadius: 12,
    marginTop: 30,
    alignItems: "center",
    minHeight: 55,
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "80%",
    padding: 20,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  searchBar: { backgroundColor: "#F5F5F5", padding: 12, borderRadius: 10, marginBottom: 15 },
  bankOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bankOptionText: { fontSize: 15, color: "#333" },
  confirmTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20, color: "#333" },
  detailBox: {
    backgroundColor: "#F9F9F9",
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  detailLabel: { color: "#888", fontSize: 13 },
  detailValue: { fontSize: 14, color: "#333" },
  line: { height: 1, backgroundColor: "#EEE", marginVertical: 15 },
  backLink: { marginTop: 20, alignItems: "center", padding: 10 },
  statusOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  statusCard: { backgroundColor: "#fff", width: "100%", borderRadius: 25, padding: 30, alignItems: "center" },
  statusTitle: { fontSize: 22, fontWeight: "bold", marginTop: 15, color: "#333" },
  statusSub: { textAlign: "center", color: "#666", marginTop: 10, marginBottom: 25, lineHeight: 22 },

  // New styles for saved accounts
  sourceContainer: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    paddingBottom: 10,
  },
  sourceOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  sourceOptionActive: {
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY_COLOR,
  },
  sourceText: {
    fontSize: 14,
    color: "#999",
  },
  sourceTextActive: {
    color: PRIMARY_COLOR,
    fontWeight: "bold",
  },
  savedAccountItemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  savedAccountOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  selectedAccountOption: {
    backgroundColor: "#F0E6FF",
    borderRadius: 12,
  },
  savedAccountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0E6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  savedAccountInfo: {
    flex: 1,
  },
  savedAccountBank: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  savedAccountNumber: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  savedAccountName: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  deleteAccountButton: {
    padding: 12,
    marginLeft: 4,
  },
  addNewAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 15,
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  addNewAccountBtnText: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyAccountsContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
  addAccountBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  addAccountBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  selectedAccountPreview: {
    backgroundColor: "#F0E6FF",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  previewText: {
    fontSize: 14,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
  },
  previewSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#495057",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  cancelModalButton: {
    backgroundColor: "#E9ECEF",
  },
  submitModalButton: {
    backgroundColor: PRIMARY_COLOR,
  },
  cancelButtonText: {
    color: "#495057",
    fontSize: 14,
    fontWeight: "600",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});