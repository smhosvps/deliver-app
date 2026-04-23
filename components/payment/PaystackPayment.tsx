import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { usePaystack } from "react-native-paystack-webview";
import { useFundWalletMutation } from "@/redux/features/wallet/walletApi";
import { useGetUserQuery } from "@/redux/api/apiSlice";
import AntDesign from "@expo/vector-icons/AntDesign";

interface PaystackPaymentProps {
  amount: number;
  email: string;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
}

export default function PaystackPayment({
  amount,
  email,
  onSuccess,
  onError,
}: PaystackPaymentProps) {
  const [fundWallet, { isLoading }] = useFundWalletMutation();
  const { data: userData }: any = useGetUserQuery();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "info">("info");

  const { popup }: any = usePaystack();

  const showModal = (title: string, message: string, type: "success" | "error" | "info") => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  const handlePayment = async () => {
    try {
      if (!email) {
        showModal("Error", "Please provide your email address", "error");
        return;
      }

      if (amount <= 0) {
        showModal("Error", "Please enter a valid amount", "error");
        return;
      }

      const reference = `TXN_${userData?.user?._id || "user"}_${Date.now()}`;

      popup.newTransaction({
        email: email,
        amount: amount,
        reference: reference,
        currency: "NGN",
        channels: ["card", "bank", "ussd", "qr", "mobile_money"],
        onSuccess: async (transaction: any) => {
          console.log("Payment successful:", transaction);

          try {
            // Call backend to verify and fund wallet
            const result = await fundWallet({
              user: userData?.user?._id,
              amount,
              reference: transaction.reference,
              paymentMethod: "paystack",
              description: `Wallet funding of ₦${amount}`,
            }).unwrap();

            console.log("Wallet funding successful:", result);

            // Notify parent
            if (onSuccess) {
              onSuccess({
                ...transaction,
                walletData: result.data,
              });
            }

            // Show success modal
            showModal(
              "Success!",
              `Wallet funded successfully!\nNew balance: ₦${result.data.wallet.balance.toLocaleString()}`,
              "success"
            );
          } catch (fundError: any) {
            console.error("Wallet funding error:", fundError);

            if (onError) {
              onError(fundError);
            }

            showModal(
              "Payment Success but Funding Failed",
              "Your payment was successful but we encountered an issue funding your wallet. Please contact support with your transaction reference.",
              "error"
            );
          }
        },
        onCancel: () => {
          console.log("Payment cancelled by user");
          showModal("Payment Cancelled", "You cancelled the payment", "info");
        },
        onLoad: () => {
          console.log("Payment webview loaded");
        },
        onError: (error: any) => {
          console.error("Payment error:", error);

          if (onError) {
            onError(error);
          }

          showModal(
            "Payment Error",
            error.message || "An error occurred during payment. Please try again.",
            "error"
          );
        },
      });
    } catch (error: any) {
      console.error("Payment initiation error:", error);

      if (onError) {
        onError(error);
      }

      showModal("Error", "Failed to initiate payment. Please try again.", "error");
    }
  };

  const getIcon = () => {
    switch (modalType) {
      case "success":
        return <AntDesign name="checkcircle" size={48} color="#10B981" />;
      case "error":
        return <AntDesign name="closecircle" size={48} color="#EF4444" />;
      case "info":
        return <AntDesign name="infocirlce" size={48} color="#3B82F6" />;
      default:
        return null;
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={handlePayment}
        disabled={isLoading || amount <= 0}
        style={{
          padding: 15,
          borderRadius: 100,
          backgroundColor: isLoading ? "#ccc" : "#1969fe",
          alignItems: "center",
          opacity: isLoading || amount <= 0 ? 0.7 : 1,
        }}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
            Pay ₦{amount.toLocaleString()} with Paystack
          </Text>
        )}
      </TouchableOpacity>

      {amount <= 0 && (
        <Text style={{ color: "red", marginTop: 5, fontSize: 12 }}>
          Please enter a valid amount (minimum ₦500)
        </Text>
      )}

      {/* Centered Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-3xl px-6 py-8 items-center">
            <TouchableOpacity
              className="absolute top-4 right-4 z-10"
              onPress={() => setModalVisible(false)}
            >
              <AntDesign name="close" size={24} color="#000" />
            </TouchableOpacity>

            <View className="w-24 h-24 items-center justify-center mb-5">
              {getIcon()}
            </View>

            <Text className="text-xl font-bold text-black mb-3 text-center">
              {modalTitle}
            </Text>
            <Text className="text-sm text-gray-500 text-center leading-5 mb-6">
              {modalMessage}
            </Text>

            <TouchableOpacity
              className="bg-[#1969fe] w-full py-4 rounded-xl items-center"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-white text-base font-semibold">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}