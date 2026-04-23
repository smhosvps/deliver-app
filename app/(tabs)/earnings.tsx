import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { format } from "date-fns";
import { useGetMyBalanceQuery } from "@/redux/features/widthdrawApi/withdrawalApi";

import emptyBoxIconx from "../../assets/images/earnings.png";

// ========== HELPER FUNCTIONS ==========
// Custom rounding: floor if fractional part < 0.6, else ceil
const customRound = (num: number): number => {
  const fractional = num - Math.floor(num);
  return fractional < 0.6 ? Math.floor(num) : Math.ceil(num);
};

// Format amount for transactions (applies custom rounding)
const formatAmount = (amount: number, type: string) => {
  const rounded = customRound(amount);
  const formatted = rounded.toLocaleString();
  return type === "credit" ? `+₦${formatted}` : `-₦${formatted}`;
};

// Helper to format transaction for UI
const formatTransaction = (tx: any) => {
  const isEarning = tx.type === 'earning';
  // Determine credit/debit: earnings are positive (credit), withdrawals are negative (debit)
  const uiType = isEarning ? 'credit' : 'debit';
  const statusMap: Record<string, string> = {
    completed: 'success',
    approved: 'success',
    pending: 'pending',
    rejected: 'failed',
  };
  const displayStatus = statusMap[tx.status] || tx.status;

  return {
    id: tx.id,
    amount: tx.amount,
    type: uiType,
    description: tx.description,
    date: tx.date,
    status: displayStatus,
    // Optional: if reference is needed, use id
    reference: tx.id,
  };
};

export default function EarningScreen() {
  const {
    data: earningData,
    isLoading: isLoadingEarning,
    refetch: refetchEarning,
    isFetching: isFetchingEarning,
  } = useGetMyBalanceQuery({});

  const balanceData = earningData?.data?.balance;
  const rawTransactions = earningData?.data?.transactions || [];
  const transactions = rawTransactions.map(formatTransaction);

  console.log(rawTransactions, "raw transactions");

  const handleRefresh = () => {
    refetchEarning();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, hh:mm a");
    } catch {
      return "Invalid date";
    }
  };

  // Apply custom rounding to available balance
  const rawBalance = balanceData?.available ?? 0;
  const roundedBalance = customRound(rawBalance);
  const formattedAmount = `₦${roundedBalance.toLocaleString()}`;
  const formattedBalance = formattedAmount; // Corrected: no extra braces

  if (isLoadingEarning) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0052CC" />
          <Text className="mt-4 text-gray-600">Loading earnings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetchingEarning}
            onRefresh={handleRefresh}
            colors={["#0052CC"]}
            tintColor="#0052CC"
          />
        }
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 pt-6 pb-4">
          <Text className="text-2xl font-bold text-gray-900">Earnings</Text>
          <Text className="mt-2 text-sm text-gray-600 leading-5">
            Track what you’ve earned from deliveries and withdraw to your bank when you’re ready.
          </Text>
        </View>

        {/* Balance Card */}
        <View className="mx-4 mt-4 bg-[#1969fe] rounded-2xl p-5">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                <Text className="ml-2 text-white text-sm font-semibold">
                  Available Balance
                </Text>
              </View>
              <Text className="text-white text-3xl font-bold">
                {formattedBalance}
              </Text>

              {/* Quick Stats */}
              <View className="mt-4 flex-row items-center">
                <View className="flex-row items-center mr-6">
                  <MaterialIcons name="swap-vert" size={16} color="#FFFFFF" />
                  <Text className="ml-1 text-white text-xs">
                    {transactions.length} Transactions
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/earnings/withdraw")}
              className="bg-white px-5 py-3 rounded-full flex-row items-center"
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={20} color="#1969fe" />
              <Text className="ml-2 text-[#1969fe] text-base font-semibold">
                Withdraw
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="mx-4 mt-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900">
              Recent Transactions
            </Text>
            {transactions.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push("/earnings/transactions")}
              >
                <Text className="text-[#1969fe] text-sm font-semibold">
                  View All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {transactions.length === 0 ? (
            <View className="py-12 items-center rounded-xl">
              <View className="rounded-full items-center justify-center">
                <Image
                  source={emptyBoxIconx}
                  className="w-24 h-24"
                  resizeMode="contain"
                />
              </View>
              <Text className="mt-4 text-gray-500 font-medium">
                No transactions yet
              </Text>
              <Text className="mt-2 text-gray-400 text-sm text-center px-8">
                Your transaction history will appear here after you complete deliveries.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/earnings/transactions")}
                className="mt-6 bg-blue-600 px-6 py-3 rounded-full"
              >
                <Text className="text-white font-semibold">Withdraw</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="rounded-xl overflow-hidden">
              {transactions.slice(0, 5).map((transaction: any, index: any) => (
                <TouchableOpacity
                  key={transaction.id}
                  className={`flex-row items-center p-4 ${index !== transactions.slice(0, 5).length - 1 ? "border-b border-gray-200" : ""}`}
                // onPress={() => router.push(`/wallet/transaction/${transaction.id}`)}
                >
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center bg-blue-100 border border-blue-600`}
                  >
                    <MaterialIcons
                      name={
                        transaction.type === "credit"
                          ? "call-received"
                          : "call-made"
                      }
                      size={20}
                      color="#1969fe"
                    />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="font-semibold text-gray-900">
                      {transaction.description}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      {formatDate(transaction.date)}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      Ref: {transaction.reference}
                    </Text>
                  </View>

                  <View className="items-end">
                    <Text
                      className={`font-bold ${transaction.type === "credit"
                          ? "text-green-600"
                          : "text-red-600"
                        }`}
                    >
                      {formatAmount(transaction.amount, transaction.type)}
                    </Text>
                    <View
                      className={`mt-1 px-2 py-1 rounded-full ${transaction.status === "success"
                          ? "bg-green-50"
                          : transaction.status === "pending"
                            ? "bg-yellow-50"
                            : "bg-red-50"
                        }`}
                    >
                      <Text
                        className={`text-xs font-medium capitalize ${transaction.status === "success"
                            ? "text-green-700"
                            : transaction.status === "pending"
                              ? "text-yellow-700"
                              : "text-red-700"
                          }`}
                      >
                        {transaction.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {transactions.length > 5 && (
                <TouchableOpacity
                  onPress={() => router.push("/earnings/transactions")}
                  className="py-4 items-center border-t border-gray-200 mb-16"
                >
                  <Text className="text-blue-600 font-semibold">
                    View {transactions.length - 5} more transactions
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}