import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { format } from "date-fns";
import { useGetMyBalanceQuery } from "@/redux/features/widthdrawApi/withdrawalApi";

// ========== CUSTOM ROUNDING (same as EarningsScreen) ==========
const customRound = (num: number): number => {
  const fractional = num - Math.floor(num);
  return fractional < 0.5 ? Math.floor(num) : Math.ceil(num);
};

export default function TransactionsScreen() {
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");

  // Fetch transactions
  const {
    data: earningData,
    isLoading: isLoadingEarning,
    refetch: refetch,
    isFetching: isFetchingEarning,
  } = useGetMyBalanceQuery({});

  // ✅ Transform raw transactions inside useMemo – no external rawTransactions variable
  const transactions = useMemo(() => {
    const raw = earningData?.data?.transactions || [];
    return raw.map((tx: any) => {
      // Determine transaction type: earning -> credit, withdrawal -> debit
      const uiType = tx.type === "earning" ? "credit" : "debit";
      // Map status: completed/success -> success, pending -> pending, etc.
      let displayStatus = tx.status?.toLowerCase();
      if (displayStatus === "completed" || displayStatus === "approved") {
        displayStatus = "success";
      }
      return {
        id: tx.id,
        _id: tx.id,
        amount: tx.amount,
        type: uiType,
        status: displayStatus,
        date: tx.date,
        createdAt: tx.date,
        description: tx.description,
        reference: tx.id,
      };
    });
  }, [earningData]); // ✅ Only depends on earningData

  const handleRefresh = () => {
    refetch();
  };

  // Filter transactions based on selected filter
  const filteredTransactions =
    filter === "all"
      ? transactions
      : transactions.filter((t: any) => t.type === filter);

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy • hh:mm a");
    } catch {
      return "Invalid date";
    }
  };

  // ✅ Format amount with custom rounding
  const formatAmount = (amount: number, type: string) => {
    const rounded = customRound(amount);
    const formatted = rounded.toLocaleString();
    return type === "credit" ? `+₦${formatted}` : `-₦${formatted}`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "success":
        return { bg: "bg-green-100", text: "text-green-700" };
      case "pending":
        return { bg: "bg-yellow-100", text: "text-yellow-700" };
      case "failed":
        return { bg: "bg-red-100", text: "text-red-700" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700" };
    }
  };

  const renderTransactionItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="bg-white p-4 mx-4 my-1 rounded-xl"
      // onPress={() => router.push(`/wallet/transaction/${item.id}`)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-row items-start flex-1">
          <View
            className={`w-12 h-12 rounded-full items-center justify-center bg-blue-100`}
          >
            <MaterialIcons
              name={item.type === "credit" ? "call-received" : "call-made"}
              size={24}
              color="#1969fe"
            />
          </View>

          <View className="ml-3 flex-1">
            <Text className="font-semibold text-gray-900 text-base">
              {item.description}
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              {formatDate(item.createdAt)}
            </Text>

            <View className="flex-row flex-wrap mt-2">
              <View
                className={`px-3 py-1 rounded-full mr-2 mt-1 ${getStatusColor(item.status).bg}`}
              >
                <Text
                  className={`text-xs font-medium ${getStatusColor(item.status).text}`}
                >
                  {item.status?.toUpperCase() || "COMPLETED"}
                </Text>
              </View>

              <View className="px-3 py-1 bg-gray-100 rounded-full mt-1">
                <Text className="text-xs font-medium text-gray-700">
                  Ref: {item.reference?.slice(-8)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="items-end ml-2">
          <Text
            className={`text-lg font-bold ${item.type === "credit" ? "text-green-600" : "text-red-600"}`}
          >
            {formatAmount(item.amount, item.type)}
          </Text>
          <Text className="text-gray-500 text-xs mt-1">
            {item.type === "credit" ? "Credit" : "Debit"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <MaterialIcons name="receipt-long" size={64} color="#9CA3AF" />
      <Text className="mt-6 text-gray-500 font-medium text-lg">
        No transactions found
      </Text>
      <Text className="mt-2 text-gray-400 text-center px-12">
        {filter === "all"
          ? "You haven't made any transactions yet."
          : `No ${filter} transactions found.`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
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
          All Transactions
        </Text>
        <Text className="text-[14px] text-gray-500 leading-5 font-inter-regular">
          Total: {transactions.length} transactions
        </Text>
      </View>

      {/* Filter Tabs */}
      <View className="px-4 py-3 border-b border-gray-200">
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => setFilter("all")}
            className={`flex-1 py-2 rounded-full mr-2 items-center ${filter === "all" ? "bg-[#1969fe]" : "bg-gray-100"}`}
          >
            <Text className={`font-semibold ${filter === "all" ? "text-white" : "text-gray-700"}`}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter("credit")}
            className={`flex-1 py-2 rounded-full mx-2 items-center ${filter === "credit" ? "bg-[#1969fe]" : "bg-gray-100"}`}
          >
            <Text className={`font-semibold ${filter === "credit" ? "text-white" : "text-gray-700"}`}>
              Credits
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter("debit")}
            className={`flex-1 py-2 rounded-full ml-2 items-center ${filter === "debit" ? "bg-[#1969fe]" : "bg-gray-100"}`}
          >
            <Text className={`font-semibold ${filter === "debit" ? "text-white" : "text-gray-700"}`}>
              Debits
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transaction List */}
      {isLoadingEarning ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0052CC" />
          <Text className="mt-4 text-gray-600">Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isFetchingEarning}
              onRefresh={handleRefresh}
              colors={["#1969fe"]}
              tintColor="#1969fe"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingVertical: 8,
            flexGrow: 1,
          }}
        />
      )}
    </SafeAreaView>
  );
}