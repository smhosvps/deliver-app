import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Feather,
  MaterialCommunityIcons,
  FontAwesome5,
  AntDesign,
  Ionicons
} from "@expo/vector-icons";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAddBankMutation,
  useDeleteBankMutation,
} from "@/redux/features/user/userApi";
import { useGetUserQuery } from "@/redux/api/apiSlice";
import DropDownPicker from "react-native-dropdown-picker";

interface Bank {
  _id?: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  isActive: boolean;
}

interface BankFormData {
  bank_name: string;
  account_number: string;
  account_name: string;
  isActive: boolean;
}

// ✅ Full list of Nigerian banks (including Opay, Moniepoint, PalmPay)
const NIGERIAN_BANKS = [
  "Access Bank",
  "Access Bank (Diamond)",
  "ALAT by Wema",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank (FCMB)",
  "Globus Bank",
  "Guaranty Trust Bank (GTBank)",
  "Heritage Bank",
  "Jaiz Bank",
  "Key Stone Bank",
  "Kuda Bank",
  "Moniepoint Microfinance Bank",
  "Opay (Opay Digital Services)",
  "PalmPay (PalmPay Limited)",
  "Parallex Bank",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "Suntrust Bank",
  "TAJ Bank",
  "Titan Trust Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Unity Bank",
  "VFD Microfinance Bank",
  "Wema Bank",
  "Zenith Bank",
];

export default function SavedBankScreen() {
  const router = useRouter();

  const { data: userData, isLoading: userLoading, refetch }: any = useGetUserQuery();
  const [addBank, { isLoading: isAdding }] = useAddBankMutation();
  const [deleteBank, { isLoading: isRemoving }] = useDeleteBankMutation();
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageData, setMessageData] = useState({ title: "", message: "", type: "success" });
  const [formData, setFormData] = useState<BankFormData>({
    bank_name: "",
    account_number: "",
    account_name: "",
    isActive: false,
  });

  // ✅ Generate DropDownPicker items from bank list
  const [bankItems] = useState(
    NIGERIAN_BANKS.map(bank => ({ label: bank, value: bank }))
  );

  const banks = userData?.user?.bank || [];

  const showMessage = (title: string, message: string, type: "success" | "error" = "success") => {
    setMessageData({ title, message, type });
    setMessageModalVisible(true);
  };

  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setFormData({
      bank_name: "",
      account_number: "",
      account_name: "",
      isActive: false,
    });
  };

  const handleInputChange = (field: keyof BankFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.bank_name.trim()) {
      showMessage("Validation Error", "Bank name is required", "error");
      return false;
    }
    if (!formData.account_number.trim()) {
      showMessage("Validation Error", "Account number is required", "error");
      return false;
    }
    if (!/^\d+$/.test(formData.account_number.trim())) {
      showMessage("Validation Error", "Account number must contain only digits", "error");
      return false;
    }
    if (formData.account_number.length !== 10) {
      showMessage("Validation Error", "Account number must be exactly 10 digits", "error");
      return false;
    }
    if (!formData.account_name.trim()) {
      showMessage("Validation Error", "Account holder name is required", "error");
      return false;
    }
    return true;
  };

  const handleSaveBank = async () => {
    if (!validateForm()) return;

    try {
      await addBank(formData).unwrap();
      handleCloseModal();
      refetch();
    } catch (error: any) {
      console.error("Save bank error:", error);
      showMessage(
        "Error",
        error?.data?.message || "Failed to save bank account",
        "error"
      );
    }
  };

  const handleDeletePress = (bank: Bank) => {
    setSelectedBank(bank);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBank?._id) return;

    try {
      await deleteBank(selectedBank._id).unwrap();
      refetch();
    } catch (error: any) {
      showMessage(
        "Error",
        error?.data?.message || "Failed to delete bank account",
        "error"
      );
    } finally {
      setDeleteModalVisible(false);
      setSelectedBank(null);
    }
  };

  const getBankIcon = () => <FontAwesome5 name="university" size={20} color="#0052FF" />;

  if (userLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#0052FF" />
        <Text className="mt-4 text-gray-600">Loading bank accounts...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-100">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-4"
            disabled={isAdding || isRemoving}
          >
            <Ionicons name="arrow-back-outline" size={24} color="#242526" />
            <Text className="text-lg font-normal text-[#242526] ml-2">Back</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">Saved Banks</Text>
          <Text className="text-gray-600 mt-2">
            Add your bank accounts for payouts and withdrawals.
          </Text>
        </View>

        <View className="px-4 py-6">
          {/* Bank List */}
          {banks.length === 0 ? (
            <View className="items-center py-8">
              <MaterialCommunityIcons name="credit-card-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 text-lg mt-4">
                No bank accounts saved
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                Add your bank account for seamless payments
              </Text>
            </View>
          ) : (
            banks.map((bank: Bank) => (
              <View
                key={bank._id}
                className="flex-row items-center justify-between py-4 border-b border-gray-100"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center mr-3">
                    {getBankIcon()}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-gray-900 font-semibold">
                        {bank.bank_name}
                      </Text>
                      {bank.isActive && (
                        <View className="bg-green-100 px-2 py-1 rounded-full ml-2">
                          <Text className="text-green-800 text-xs font-medium">
                            Active
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-gray-600 text-sm mt-1">
                      {bank.account_name}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      {bank.account_number}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleDeletePress(bank)}
                  disabled={isAdding || isRemoving}
                >
                  <Feather name="trash-2" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Add New Bank */}
          <TouchableOpacity
            className="flex-row items-center py-4 border-b border-gray-100"
            onPress={handleOpenModal}
            disabled={isAdding || isRemoving}
          >
            <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center mr-3">
              <Feather name="plus" size={20} color="#0052FF" />
            </View>
            <Text className="text-[#0052FF] font-semibold">Add New Bank</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Bank Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl max-h-[90%]">
              {/* Header */}
              <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-gray-900">
                  Add Bank Account
                </Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Feather name="x" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
                {/* Bank Name Dropdown */}
                <View className="mb-4 z-10">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </Text>
                  <DropDownPicker
                    open={isBankOpen}
                    value={formData.bank_name}
                    items={bankItems}
                    setOpen={setIsBankOpen}
                    setValue={(callback) => {
                      const newValue = callback(formData.bank_name);
                      setFormData((prev) => ({ ...prev, bank_name: newValue }));
                    }}
                    placeholder="Select your bank"
                    placeholderStyle={{ color: "#6B7280" }}
                    style={{
                      borderColor: "#D1D5DB",   // ✅ Same as TextInput border
                      borderRadius: 8,
                      minHeight: 50,
                      backgroundColor: "white",
                    }}
                    textStyle={{ color: "#111827", fontSize: 16 }}  // ✅ Same font size
                    dropDownContainerStyle={{
                      borderColor: "#D1D5DB",
                      backgroundColor: "#FFFFFF",
                    }}
                    listItemLabelStyle={{ color: "#111827" }}
                    disabled={isAdding}
                    zIndex={3000}
                    zIndexInverse={1000}
                  />
                </View>

                {/* Account Number */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3 text-gray-900"
                    placeholder="Enter 10-digit account number"
                    value={formData.account_number}
                    onChangeText={(value) => handleInputChange("account_number", value)}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>

                {/* Account Name */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Account Holder Name
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3 text-gray-900"
                    placeholder="Name as on bank account"
                    value={formData.account_name}
                    onChangeText={(value) => handleInputChange("account_name", value)}
                  />
                </View>

                {/* Active Checkbox */}
                <View className="mb-6 flex-row items-center">
                  <TouchableOpacity
                    onPress={() => handleInputChange("isActive", !formData.isActive)}
                    className={`w-6 h-6 border-2 rounded-md mr-3 items-center justify-center ${formData.isActive ? "bg-[#0052FF] border-[#0052FF]" : "border-gray-400"
                      }`}
                  >
                    {formData.isActive && <Text className="text-white text-sm">✓</Text>}
                  </TouchableOpacity>
                  <Text className="text-gray-700">Set as active (default) bank</Text>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  className={`bg-[#0052FF] rounded-full py-4 items-center justify-center mb-5 ${isAdding ? "opacity-70" : ""
                    }`}
                  onPress={handleSaveBank}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-bold text-lg">Save Bank</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-2xl w-full max-w-sm p-5">
            <Text className="text-lg font-bold text-gray-900 mb-2">
              Delete Bank Account
            </Text>
            <Text className="text-gray-600 mb-6">
              Are you sure you want to remove this bank account? This action cannot be undone.
            </Text>
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                className="px-4 py-2 rounded-full bg-gray-200"
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmDelete}
                className="px-4 py-2 rounded-full bg-red-500"
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Message Modal (Success/Error) */}
      <Modal
        visible={messageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMessageModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-2xl w-full max-w-sm p-5">
            <View className="items-center mb-4">
              {messageData.type === "success" ? (
                <AntDesign name="checkcircle" size={48} color="#22C55E" />
              ) : (
                <AntDesign name="exclamationcircle" size={48} color="#EF4444" />
              )}
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              {messageData.title}
            </Text>
            <Text className="text-gray-600 text-center mb-6">
              {messageData.message}
            </Text>
            <TouchableOpacity
              onPress={() => setMessageModalVisible(false)}
              className={`py-3 rounded-full ${messageData.type === "success" ? "bg-[#22C55E]" : "bg-[#EF4444]"
                }`}
            >
              <Text className="text-white font-semibold text-center">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}