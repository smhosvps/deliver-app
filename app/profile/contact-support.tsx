// app/contact-support.tsx or screens/ContactSupportScreen.tsx
import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetContactSupportQuery } from "@/redux/features/contactUsApi/contactSupportApi";
import { Ionicons } from "@expo/vector-icons";

export default function ContactSupportScreen() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch contact support data
  const { data, isLoading, isError, error, refetch } =
    useGetContactSupportQuery(undefined, {
      pollingInterval: 30000, // Poll every 30 seconds for updates
    });

  const contactData = data?.contact;

  // Handle email press
  const handleEmailPress = useCallback(() => {
    if (!contactData?.email) return;

    Linking.openURL(`mailto:${contactData.email}`).catch(() => {
      Alert.alert("Error", "Could not open email client");
    });
  }, [contactData?.email]);

  // Handle phone press
  const handlePhonePress = useCallback((phoneNumber: string) => {
    // Remove spaces and special characters for dialing
    const cleanNumber = phoneNumber.replace(/\s+/g, "");

    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      Alert.alert("Error", "Could not open phone dialer");
    });
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0052FF" />
          <Text className="mt-4 text-gray-600">
            Loading support information...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-red-500 text-center mb-4">
            {error?.data?.message || "Failed to load support information"}
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            className="bg-blue-600 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No data state
  if (!contactData) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-gray-600 text-center mb-4">
            No support information available at the moment.
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            className="bg-blue-600 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Refresh</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Filter active phone numbers
  const activePhoneNumbers =
    contactData.phoneNumbers?.filter((phone) => phone.isActive) || [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#0052FF"
          />
        }
      >
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
            Contact Support
          </Text>
          <Text className="text-gray-600 mt-2">
            {contactData.description ||
              "Stuck on something? Our support team is here to help with delivery issues, payments, or account questions."}
          </Text>
        </View>

        <View className="px-4 py-6">
          {/* Email Section - Only show if email exists */}
          {contactData.email && (
            <>
              <Text className="text-gray-900 font-semibold mb-2">
                Send Us an Email
              </Text>
              <Text className="text-gray-600 text-sm mb-4">
                Prefer email? Share the details of your issue and we'll get back
                to you with a solution.
              </Text>
              <TouchableOpacity
                onPress={handleEmailPress}
                className="flex-row items-center py-3 mb-6"
                activeOpacity={0.7}
              >
                <Ionicons name="mail-outline" size={20} color="#0052FF" />
                <Text className="text-gray-900 font-semibold ml-3 flex-1">
                  {contactData.email}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Phone Section - Only show if there are active phone numbers */}
          {activePhoneNumbers.length > 0 && (
            <>
              <Text className="text-gray-900 font-semibold mb-2">
                Call Our Support Line
              </Text>
              <Text className="text-gray-600 text-sm mb-4">
                Need to speak to someone directly? Call our support team for
                urgent issues.
              </Text>

              {activePhoneNumbers.map((phone, index) => (
                <TouchableOpacity
                  key={phone._id || index}
                  onPress={() => handlePhonePress(phone.number)}
                  className={`flex-row items-center py-3 ${
                    index < activePhoneNumbers.length - 1
                      ? "border-b border-gray-100 mb-3"
                      : ""
                  }`}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={20} color="#0052FF" />
                  <View className="ml-3 flex-1">
                    <Text className="text-gray-900 font-semibold">
                      {phone.number}
                    </Text>
                    {phone.label !== "Support" && (
                      <Text className="text-xs text-gray-500 mt-1">
                        {phone.label}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Fallback message if no contact methods available */}
          {!contactData.email && activePhoneNumbers.length === 0 && (
            <View className="py-8">
              <Text className="text-gray-500 text-center">
                No contact methods available at the moment.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}