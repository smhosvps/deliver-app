
import { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from "react-native";
import { usePaystack } from "react-native-paystack-webview";

interface PaystackPaymentChooseTypeProps {
    amount: number;
    email: string;
    deliveryId: string;
    deliveryCode?: string;
    onSuccess: (response: any) => void;
    onCancel: () => void;
    onError: (error: any) => void;
}

export default function PaystackPaymentChooseType({
    amount,
    email,
    deliveryId,
    deliveryCode,
    onSuccess,
    onCancel,
    onError,
}: PaystackPaymentChooseTypeProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { popup }: any = usePaystack();

    const handlePayment = async () => {
        try {
            if (!email) {
                Alert.alert("Error", "Please provide your email address");
                return;
            }

            if (amount <= 0) {
                Alert.alert("Error", "Please enter a valid amount");
                return;
            }

            setIsLoading(true);

            const reference = `DEL_${deliveryId}_${Date.now()}`;

            popup.newTransaction({
                email: email,
                amount,
                reference: reference,
                currency: "NGN",
                channels: ["card", "bank", "ussd", "qr", "mobile_money"],
                onSuccess: async (transaction: any) => {
                    console.log("Payment successful for delivery:", transaction);
                    setIsLoading(false);

                    // Call onSuccess callback with transaction data
                    onSuccess({
                        ...transaction,
                        deliveryId,
                        deliveryCode,
                        amount: amount,
                    });
                },
                onCancel: () => {
                    console.log("Payment cancelled by user");
                    setIsLoading(false);
                    Alert.alert("Payment Cancelled", "You cancelled the payment");
                    onCancel();
                },
                onError: (error: any) => {
                    console.error("Payment error:", error);
                    setIsLoading(false);

                    // Handle specific error messages
                    let errorMessage = "An error occurred during payment. Please try again.";
                    if (error.message) {
                        errorMessage = error.message;
                    } else if (typeof error === 'string') {
                        errorMessage = error;
                    }

                    Alert.alert("Payment Error", errorMessage);
                    onError(error);
                },
                onLoad: () => {
                    console.log("Payment webview loaded");
                },
            });
        } catch (error: any) {
            console.error("Payment initiation error:", error);
            setIsLoading(false);

            Alert.alert("Error", "Failed to initiate payment. Please try again.");
            onError(error);
        }
    };

    return (
        <View className="w-full">
            <TouchableOpacity
                onPress={handlePayment}
                disabled={isLoading || amount <= 0}
                className={`w-full py-4 px-6 rounded-full items-center ${isLoading || amount <= 0
                        ? "bg-gray-300"
                        : "bg-[#1969fe]"
                    }`}
                style={{
                    opacity: isLoading || amount <= 0 ? 0.7 : 1,
                }}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                    <Text className="text-white text-base font-semibold">
                        Pay ₦{amount.toLocaleString()} with Card/Bank
                    </Text>
                )}
            </TouchableOpacity>

            {amount <= 0 && (
                <Text className="text-red-500 text-xs mt-2 text-center">
                    Invalid payment amount
                </Text>
            )}
        </View>
    );
}