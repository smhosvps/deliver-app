import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetUserQuery, useLogoutMutation } from "@/redux/api/apiSlice";
import UpdateProfilePicture from "@/components/profilePictureUpdate/UpdateProfilePicture";
import { useAuth } from "../../context/auth";
import { useState } from "react";
import { clearCredentials } from "@/redux/features/auth/authSlice";
import { useDispatch } from "react-redux";
import Svg, { Path, Circle } from "react-native-svg";
import { Feather, Ionicons } from "@expo/vector-icons";

// ---------- SVG Icon Components ----------
const PersonOutlineIcon = ({ size = 20, color = "#1969fe" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const MoneyBillTransferIcon = ({ size = 20, color = "#1969fe" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 12H3L5 10M18 12H21L19 10M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7ZM12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const LockClosedOutlineIcon = ({ size = 20, color = "#1969fe" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 17V15M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11M5 11H19C20.1046 11 21 11.8954 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C3 11.8954 3.89543 11 5 11Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const HelpCircleOutlineIcon = ({ size = 20, color = "#1969fe" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
    <Path
      d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const DocumentTextOutlineIcon = ({ size = 20, color = "#1969fe" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6C2 4.89543 2.89543 4 4 4Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path d="M8 8h8M8 12h6M8 16h4" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
  </Svg>
);

const TrashSharpIcon = ({ size = 20, color = "#1969fe" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v5M14 11v5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

// ---------- Menu Items with SVG Icons ----------
const menuItems = [
  {
    label: "Personal Information",
    subtitle: "Update your name, phone number, and email.",
    Icon: PersonOutlineIcon,
    route: "profile/personal-info",
  },
  {
    label: "Saved Bank",
    subtitle: "Add account for payout and withdrawals.",
    Icon: MoneyBillTransferIcon,
    route: "profile/saved-addresses",
  },
  {
    label: "Location & Password",
    subtitle: "Manage location and password.",
    Icon: LockClosedOutlineIcon,
    route: "profile/security-login",
  },
  {
    label: "Help & Support",
    subtitle: "Get assistance or report an issue.",
    Icon: HelpCircleOutlineIcon,
    route: "profile/help-support",
  },
  {
    label: "Legal & Policies",
    subtitle: "View terms of use and privacy policy.",
    Icon: DocumentTextOutlineIcon,
    route: "profile/legal-policies",
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { data, isLoading: isUserLoading }: any = useGetUserQuery();
  const [logoutMutation, { isLoading: isLogoutLoading }] = useLogoutMutation();
  const dispatch = useDispatch<any>();
  const { logout: authLogout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const datax = data?.user?.deliveryPartnerInfo?.location;
  console.log(datax, "data locations");

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
      dispatch(clearCredentials());
      authLogout();
      setShowLogoutModal(false);
      router.replace("/auth/onboarding");
    } catch (err) {
      console.error("Logout failed:", err);
      setShowLogoutModal(false);
    }
  };

  const openLogoutConfirmation = () => setShowLogoutModal(true);
  const closeLogoutConfirmation = () => setShowLogoutModal(false);

  const isLoading = isUserLoading || isLogoutLoading;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4" showsVerticalScrollIndicator={false}>
        <Text className="text-gray-800 text-2xl font-bold mt-3">Profile</Text>
        <Text className="text-gray-600 py-1.5">
          Manage your personal details, addresses, and app preferences.
        </Text>

        {/* Profile Header Card */}
        <View className="bg-[#1969fe] px-4 py-3 rounded-3xl mt-3">
          {isUserLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#fff" />
              <Text className="text-white mt-2">Loading profile...</Text>
            </View>
          ) : (
            <>
              <UpdateProfilePicture />
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-1">
                  <Text className="text-white text-2xl font-bold">
                    {data?.user?.firstName} {data?.user?.lastName}
                  </Text>
                  <Text className="text-blue-100 text-sm md:text-base mt-1">
                    {data?.user?.phone || "No phone number"}
                  </Text>
                  <Text className="text-blue-100 text-sm md:text-base mt-1">
                    {data?.user?.email}
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-white px-4 py-4 rounded-full self-end"
                  onPress={() => router.push("/profile/edit-user-info")}
                  disabled={isLoading}
                >
                  <Text className="text-[#1969fe] font-semibold">Edit profile</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Menu Items */}
        <View className="px-4 py-6">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push(item.route as any)}
              className="flex-row items-center justify-between py-4 border-b border-gray-100"
              disabled={isLoading}
            >
              <View className="flex-1 flex-row items-center">
                <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center mr-3">
                  <item.Icon size={20} color="#1969fe" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-base">
                    {item.label}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-0.5">
                    {item.subtitle}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#999" />
            </TouchableOpacity>
          ))}

          {/* Logout Button */}
          <TouchableOpacity
            className="flex-row items-center justify-between py-4 "
            onPress={openLogoutConfirmation}
            disabled={isLoading}
          >
            <View className="flex-1 flex-row items-center">
              <View className="w-10 h-10 bg-red-100 rounded-lg items-center justify-center mr-3">
                <Feather name="log-out" size={20} color="#FF3333" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold text-base">Log Out</Text>
                <Text className="text-gray-500 text-sm mt-0.5">
                  Sign out of your account securely.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/profile/delete-account")}
            className="mb-10 bg-[#991616] flex-row justify-center p-4 rounded-full items-center gap-2 mt-3">
            <TrashSharpIcon size={17} color="#fafafa" />
            <Text className="text-white font-semibold">Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeLogoutConfirmation}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl px-4 md:px-8 pt-4 min-h-64">
            <View className="items-center mb-4">
              <View className="w-12 h-1.5 bg-gray-400 rounded-full mb-4" />
            </View>

            <Text className="text-xl md:text-2xl font-semibold mb-6 text-gray-800 text-center">
              Are you sure you want to log out?
            </Text>

            {isLogoutLoading ? (
              <View className="items-center justify-center py-4">
                <ActivityIndicator size="large" color="#0052FF" />
                <Text className="mt-2 text-gray-600">Logging out...</Text>
              </View>
            ) : (
              <View className="flex-row justify-between gap-4">
                <TouchableOpacity
                  className="flex-1 py-4 rounded-full items-center bg-gray-100"
                  onPress={closeLogoutConfirmation}
                  disabled={isLogoutLoading}
                >
                  <Text className="text-gray-800 text-base md:text-xl font-medium">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 py-4 rounded-full items-center bg-red-500"
                  onPress={handleLogout}
                  disabled={isLogoutLoading}
                >
                  <Text className="text-white text-base md:text-xl font-medium">Log Out</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}