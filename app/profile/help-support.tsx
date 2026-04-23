import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function HelpSupportScreen() {
  const router = useRouter();

  const supportItems = [
    { label: "Frequently Asked Questions (FAQs)", route: "profile/faqs" },
    { label: "Contact Support", route: "profile/contact-support" },
    { label: "Report an Issue with a Delivery", route: "profile/report-issue" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-100">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-4"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#242526" />
            <Text className="text-lg font-normal text-[#242526] ml-1">Back</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">
            Help & Support
          </Text>
          <Text className="text-gray-600 mt-2">
            Need assistance? We're here to help.
          </Text>
        </View>

        <View className="px-4 py-6">
          {supportItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push(item.route as any)}
              className="flex-row items-center justify-between py-4 border-b border-gray-100"
            >
              <Text className="text-gray-900 font-semibold flex-1">
                {item.label}
              </Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#999" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}