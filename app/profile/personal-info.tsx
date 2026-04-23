import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetUserQuery } from "@/redux/api/apiSlice";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { data, isLoading: loadingUser, error } = useGetUserQuery<any>();

  // Helper to format date safely
  const formatDate = (dateString: string | undefined, dateFormat: string = 'dd MMM yyyy') => {
    if (!dateString) return undefined;
    try {
      return format(new Date(dateString), dateFormat);
    } catch {
      return dateString; // fallback in case of invalid date
    }
  };

  const userDetails = {
    name:
      data?.user?.firstName && data?.user?.lastName
        ? `${data?.user?.firstName} ${data?.user?.lastName}`
        : undefined,
    email: data?.user?.email,
    phone: data?.user?.phone,
    gender: data?.user?.gender,
    country: data?.user?.country,
    address: data?.user?.address,
    dateofbirth: formatDate(data?.user?.dateOfBirth),                // 👈 formatted
    createdAt: formatDate(data?.user?.createdAt, 'dd MMM yyyy'),     // 👈 formatted
    updatedAt: formatDate(data?.user?.updatedAt, 'dd MMM yyyy'),     // 👈 formatted
  };

  // Only include items that have values
  const detailItems = [
    userDetails.name && {
      icon: "person-outline",
      label: "Name",
      value: userDetails.name,
    },
    userDetails.email && {
      icon: "mail-outline",
      label: "Email",
      value: userDetails.email,
    },
    userDetails.phone && {
      icon: "call-outline",
      label: "Phone",
      value: userDetails.phone,
    },
    userDetails.gender && {
      icon: "people-outline",
      label: "Gender",
      value: userDetails.gender,
    },
    userDetails.address && {
      icon: "location-outline",
      label: "Address",
      value: userDetails.address,
    },
    userDetails.dateofbirth && {
      icon: "calendar-outline",
      label: "Date of Birth",
      value: userDetails.dateofbirth,
    },
    userDetails.createdAt && {
      icon: "time-outline",
      label: "Member Since",
      value: userDetails.createdAt,
    },
  ].filter(Boolean); // Filter out undefined items

  if (loadingUser) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading your information...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-4 py-4 border-b border-gray-100">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-4"
          >
            <Ionicons name="chevron-back-outline" size={24} color="#000" />
            <Text className="ml-2 text-gray-700">Back</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text className="text-xl font-semibold text-gray-900 mt-4">Error Loading Data</Text>
          <Text className="text-gray-600 text-center mt-2">
            There was a problem loading your personal information. Please try again.
          </Text>
          <TouchableOpacity
            className="bg-blue-500 px-6 py-3 rounded-full mt-6"
            onPress={() => router.back()}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-100">
          <View className="flex-row justify-start gap-2 items-center mb-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back-outline" size={24} color="#242526" />
            </TouchableOpacity>
            <Text className="text-lg font-normal text-[#242526]">Back</Text>
            <View className="w-6" />
          </View>
          <Text className="text-2xl font-bold text-gray-900">
            Personal Information
          </Text>
          <Text className="text-gray-600 mt-2">
            Keep your details up to date so we can contact you when needed.
          </Text>
        </View>

        {/* Account Details */}
        {detailItems.length > 0 ? (
          <View className="px-4 mt-6">
            <View className="bg-white rounded-xl ">
              <Text className="text-xl font-semibold text-gray-900 mb-6">
                Account Information
              </Text>

              {detailItems.map((item, index) => (
                <View
                  key={index}
                  className={`pb-4 ${index < detailItems.length - 1
                    ? "border-b border-gray-100 mb-2"
                    : ""
                    }`}
                >
                  <View className="flex-row items-start mb-2">
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color="#666666"
                      style={{ marginRight: 12, marginTop: 2 }}
                    />
                    <View className="flex-1">
                      <Text className="text-sm uppercase font-medium text-gray-600 mb-1">
                        {item.label}
                      </Text>
                      <Text className="text-base text-gray-900 leading-6">
                        {item.value}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Edit Profile Button */}
            <TouchableOpacity
              className="bg-blue-500 rounded-full py-4 mt-6 items-center"
              onPress={() => router.push("/profile/edit-user-info")}
            >
              <Text className="text-white font-semibold text-base">
                Edit Profile
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center px-4 mt-12">
            <Ionicons name="person-outline" size={64} color="#9ca3af" />
            <Text className="text-xl font-semibold text-gray-900 mt-4">No Information Available</Text>
            <Text className="text-gray-600 text-center mt-2">
              Complete your profile to see your personal information here.
            </Text>
            <TouchableOpacity
              className="bg-blue-500 px-6 py-3 rounded-full mt-6"
              onPress={() => router.push("/profile/edit-user-info")}
            >
              <Text className="text-white font-semibold">Complete Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}