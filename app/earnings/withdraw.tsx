import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import {
  useGetMyBalanceQuery,
  useRequestWithdrawalMutation,
} from "@/redux/features/widthdrawApi/withdrawalApi";

// ========== CUSTOM ROUNDING (same as EarningsScreen) ==========
const customRound = (num: number): number => {
  const fractional = num - Math.floor(num);
  return fractional < 0.5 ? Math.floor(num) : Math.ceil(num);
};

export default function WithdrawScreen() {
  // Fetch balance data
  const {
    data: earningData,
    isLoading: isLoadingEarning,
    refetch: refetchEarning,
  } = useGetMyBalanceQuery({});

  // Withdrawal mutation
  const [requestWithdrawal, { isLoading: isRequesting }] = useRequestWithdrawalMutation();

  const balanceData = earningData?.data?.balance;
  const rawAvailableBalance = balanceData?.available || 0;
  
  // ✅ Apply custom rounding to the balance
  const roundedBalance = customRound(rawAvailableBalance);
  const formattedBalance = `₦${roundedBalance.toLocaleString()}`;
  const availableBalance = roundedBalance; // use rounded balance for validation

  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAmountChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    setAmount(numericText);
  };

  const getFormattedAmount = () => {
    if (!amount) return "0";
    const num = parseInt(amount);
    return isNaN(num) ? "0" : num.toLocaleString();
  };

  const getNumericAmount = () => {
    if (!amount) return 0;
    const num = parseInt(amount);
    return isNaN(num) ? 0 : num;
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const closeSuccessModal = () => {
    setShowSuccess(false);
    router.back();
  };

  const numericAmount = getNumericAmount();
  const isAmountValid = numericAmount >= 500 && numericAmount <= availableBalance;

  const handleRequestWithdrawal = async () => {
    if (!isAmountValid) {
      if (numericAmount < 500) {
        Alert.alert("Invalid Amount", "Minimum withdrawal amount is ₦500.");
      } else if (numericAmount > availableBalance) {
        Alert.alert("Insufficient Balance", `You can only withdraw up to ${formattedBalance}.`);
      }
      return;
    }

    try {
      await requestWithdrawal({ amount: numericAmount }).unwrap();
      // Success: show modal and refetch balance
      refetchEarning();
      setShowSuccess(true);
      setAmount(""); // clear amount field
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      const errorMessage = error?.data?.message || "Failed to request withdrawal. Please try again.";
      Alert.alert("Withdrawal Failed", errorMessage);
    }
  };

  if (isLoadingEarning) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#1969fe" />
        <Text className="mt-4 text-gray-600">Loading balance...</Text>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 py-3">
          <View className="flex-row gap-2 items-center">
             <TouchableOpacity onPress={() => router.back()} className="py-2">
             <Ionicons name="arrow-back-outline" size={24} color="#242526" />
          </TouchableOpacity>
          </View>
        </View>

        <View className="px-4 pb-4 pt-2">
          <Text className="text-2xl font-bold text-black mb-2 font-inter-bold">
            Withdraw
          </Text>
          <Text className="text-[14px] text-gray-500 leading-5 font-inter-regular">
            Request to withdraw the amount you earned.
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Current Balance */}
          <View className="bg-[#1969fe] mx-4 my-4 p-5 rounded-2xl items-center">
            <Text className="text-sm text-gray-100 mb-2">Current Balance</Text>
            <Text className="text-3xl font-bold text-white">{formattedBalance}</Text>
          </View>

          {/* Description */}
          <View className="px-4 py-3">
            <Text className="text-sm text-gray-500 leading-5">
              Choose how much you want to withdraw. Minimum withdrawal is ₦500.
            </Text>
          </View>

          {/* Quick Amount Buttons */}
          <View className="px-4 py-5">
            <Text className="text-sm font-semibold text-black mb-3">Quick Select</Text>
            <View className="flex-row flex-wrap gap-3">
              {[1000, 2500, 5000, 10000, 15000, 20000].map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  className={`px-5 py-3 rounded-lg border ${
                    amount === quickAmount.toString()
                      ? "bg-[#1969fe] border-[#1969fe]"
                      : "border-gray-200"
                  }`}
                  onPress={() => handleQuickAmount(quickAmount)}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      amount === quickAmount.toString() ? "text-white" : "text-gray-600"
                    }`}
                  >
                    ₦{quickAmount.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amount Input */}
          <View className="px-4 py-5">
            <Text className="text-sm font-semibold text-black mb-3">Or Enter Custom Amount</Text>
            <View className="flex-row items-center border-2 border-gray-200 rounded-xl px-4 py-4 mb-2">
              <Text className="text-xl font-semibold text-black mr-2">₦</Text>
              <TextInput
                className="flex-1 text-xl font-semibold text-black p-0"
                value={getFormattedAmount()}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={9}
              />
            </View>
            <Text className="text-xs text-gray-500 mb-1">Minimum withdrawal: ₦500</Text>

            {numericAmount > 0 && numericAmount < 500 && (
              <Text className="text-xs text-red-500">Amount must be at least ₦500</Text>
            )}
            {numericAmount > 0 && numericAmount > availableBalance && (
              <Text className="text-xs text-red-500">
                Amount exceeds available balance of {formattedBalance}
              </Text>
            )}
          </View>

          {/* Withdraw Button */}
          <View className="px-4 py-5">
            <TouchableOpacity
              className={`p-4 rounded-full items-center ${
                isAmountValid ? "bg-[#1969fe]" : "bg-gray-300"
              }`}
              onPress={handleRequestWithdrawal}
              disabled={!isAmountValid || isRequesting}
            >
              {isRequesting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-semibold">Request Withdrawal</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Success Modal */}
        <Modal visible={showSuccess} transparent={true} animationType="fade">
          <View className="flex-1 bg-black/50 justify-center px-9">
            <View className="bg-white rounded-3xl px-6 py-8 items-center">
              <Image
                source={require("@/assets/images/success-icon.png")}
                className="w-24 h-24 mb-5"
              />

              <Text className="text-xl font-bold text-black mb-3 text-center">
                Withdrawal Request Submitted!
              </Text>
              <Text className="text-sm text-gray-500 text-center leading-5 mb-6">
                It will be processed by an admin. You can check the status in your transaction history.
              </Text>

              <TouchableOpacity
                className="bg-[#1969fe] w-full py-4 rounded-full items-center"
                onPress={closeSuccessModal}
              >
                <Text className="text-white text-base font-semibold">Back to Earnings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}