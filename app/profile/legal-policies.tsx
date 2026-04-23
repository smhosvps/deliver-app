import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function LegalPoliciesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        <View className="px-4 py-4 ">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-4"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#242526" />
            <Text className="text-lg font-normal text-[#242526] ml-1">Back</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">
            Legal & Policies
          </Text>
          <Text className="text-gray-600 mt-2">
            View terms of use and privacy policy.
          </Text>
        </View>
        <View className="px-4 py-6">
          <TouchableOpacity onPress={() => router.push("/profile/terms-conditions")} className="flex-row items-center justify-between py-4 border-b border-gray-100">
            <Text className="text-gray-900 font-semibold">Terms of Use</Text>
            <Ionicons name="chevron-forward-outline" size={20} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/profile/privacy-policy")} className="flex-row items-center justify-between py-4">
            <Text className="text-gray-900 font-semibold">Privacy Policy</Text>
            <Ionicons name="chevron-forward-outline" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}