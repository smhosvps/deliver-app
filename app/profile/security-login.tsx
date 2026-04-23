import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useGetUserQuery } from "@/redux/api/apiSlice";

export default function SecurityLoginScreen() {
  const router = useRouter();
  const { data: user }: any = useGetUserQuery(undefined, {
    pollingInterval: 10000,
  });

  const driverInfo = user?.user?.deliveryPartnerInfo;
  const isApproved = driverInfo?.verificationStatus?.verified === true;
  const isOnDelivery = !!driverInfo?.currentDelivery; // 👈 true if partner has an active delivery

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-4"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#242526" />
            <Text className="text-lg font-normal text-[#242526] ml-1">Back</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">
            Location & Password
          </Text>
          <Text className="text-gray-600 mt-2">
            Control how you work and protect your password.
          </Text>

          {/* Badge for unapproved accounts */}
          {!isApproved && (
            <View className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex-row items-center">
              <Ionicons name="alert-circle-outline" size={22} color="#d97706" />
              <View className="ml-2 flex-1">
                <Text className="text-amber-800 font-semibold text-sm">
                  Account not yet approved
                </Text>
                <Text className="text-amber-700 text-xs mt-0.5">
                  Location and working status options will be available once your account is verified.
                </Text>
              </View>
            </View>
          )}
        </View>

        <View className="px-4 py-6">
          {/* Conditionally show "Change Location" only if approved */}
          {isApproved && (
            <TouchableOpacity
              onPress={() => router.push("/locations/location-settings")}
              className="flex-row items-center justify-between py-4 border-b border-gray-100"
            >
              <View>
                <Text className="text-gray-900 font-semibold">
                  Change Location
                </Text>
                <Text className="text-gray-600 text-sm mt-1">
                  Update your location.
                </Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#999" />
            </TouchableOpacity>
          )}

          {/* Conditionally show "Working Status" only if approved AND not on an active delivery */}
          {isApproved && !isOnDelivery && (
            <TouchableOpacity
              onPress={() => router.push("/locations/update-status")}
              className="flex-row items-center justify-between py-4 border-b border-gray-100"
            >
              <View>
                <Text className="text-gray-900 font-semibold">
                  Working Status
                </Text>
                <Text className="text-gray-600 text-sm mt-1">
                  Update your working status.
                </Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#999" />
            </TouchableOpacity>
          )}

          {/* Conditionally show "Working Hours" only if approved */}
          {isApproved && (
            <TouchableOpacity
              onPress={() => router.push("/locations/setting-working-hours")}
              className="flex-row items-center justify-between py-4 border-b border-gray-100"
            >
              <View>
                <Text className="text-gray-900 font-semibold">
                  Working Hours
                </Text>
                <Text className="text-gray-600 text-sm mt-1">
                  Update your working hours.
                </Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#999" />
            </TouchableOpacity>
          )}

          {/* Always show "Change Languages" regardless of approval */}
          <TouchableOpacity
            onPress={() => router.push("/profile/languages-screen")}
            className="flex-row items-center justify-between py-4 border-b border-gray-100"
          >
            <View>
              <Text className="text-gray-900 font-semibold">
                Change Languages
              </Text>
              <Text className="text-gray-600 text-sm mt-1">
                Update your preferred language.
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color="#999" />
          </TouchableOpacity>

          {/* Always show "Change Password" regardless of approval */}
          <TouchableOpacity
            onPress={() => router.push("/profile/change-password")}
            className="flex-row items-center justify-between py-4 border-b border-gray-100"
          >
            <View>
              <Text className="text-gray-900 font-semibold">
                Change Password
              </Text>
              <Text className="text-gray-600 text-sm mt-1">
                Update your login password.
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}