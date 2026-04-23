import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useGetUserQuery } from "@/redux/api/apiSlice";
import { useUpdatePasswordMutation } from "@/redux/features/user/userApi";

import successIconx from "../../assets/images/success-icon.png";
import warningIconx from "../../assets/images/exclamation.png";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { data, refetch } = useGetUserQuery<any>();
  const [updatePassword, { isLoading, error }] = useUpdatePasswordMutation();

  const [formData, setFormData] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  // Modal state for notifications
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "success" as "success" | "error" | "info",
    onConfirm: undefined as (() => void) | undefined,
  });

  const showModal = (config: {
    title: string;
    message: string;
    type?: "success" | "error" | "info";
    onConfirm?: () => void;
  }) => {
    setModalConfig({
      title: config.title,
      message: config.message,
      type: config.type || "info",
      onConfirm: config.onConfirm,
    });
    setModalVisible(true);
  };

  const hideModal = () => {
    setModalVisible(false);
    if (modalConfig.onConfirm) modalConfig.onConfirm();
  };

  const togglePasswordVisibility = (field: keyof typeof passwordVisibility) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleInputChange = (field: keyof PasswordForm, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSubmit = async () => {
    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      showModal({
        title: "Error",
        message: "Please fill in all fields",
        type: "error",
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showModal({
        title: "Error",
        message: "New passwords do not match",
        type: "error",
      });
      return;
    }

    if (!validatePassword(formData.newPassword)) {
      showModal({
        title: "Error",
        message: "Password must be at least 6 characters",
        type: "error",
      });
      return;
    }

    try {
      await updatePassword({
        id: data?.user?._id,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      }).unwrap();
      refetch();

      showModal({
        title: "Success",
        message: "Password updated successfully!",
        type: "success",
        onConfirm: () => router.back(),
      });

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      console.error("Password update error:", err);
      const errorMessage = err?.data?.message || "Failed to update password";
      showModal({
        title: "Error",
        message: errorMessage,
        type: "error",
      });
    }
  };

  useEffect(() => {
    if (error) {
      const errorMessage = (error as any)?.data?.message || "Failed to update password";
      showModal({
        title: "Error",
        message: errorMessage,
        type: "error",
      });
    }
  }, [error]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-4 py-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center mb-4"
            >
              <Ionicons name="arrow-back-outline" size={24} color="#242526" />
              <Text className="text-lg font-normal text-[#242526] ml-1">
                Back
              </Text>
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900">
              Change Password
            </Text>
            <Text className="text-gray-600 mt-2">
              Update your login password.
            </Text>
          </View>

          <View className="px-4 py-6">
            {/* Current Password */}
            <Text className="text-gray-900 font-semibold mb-2">
              Current Password
            </Text>
            <View className="border border-gray-300 rounded-lg px-4 ios:py-3 android:py-1 flex-row items-center mb-6">
              <TextInput
                className="flex-1 text-gray-900"
                value={formData.currentPassword}
                onChangeText={(text) => handleInputChange("currentPassword", text)}
                placeholder="Enter current password"
                secureTextEntry={!passwordVisibility.currentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => togglePasswordVisibility("currentPassword")}
              >
                <Ionicons
                  name={passwordVisibility.currentPassword ? "eye" : "eye-off"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <Text className="text-gray-900 font-semibold mb-2">
              New Password
            </Text>
            <View className="border border-gray-300 rounded-lg px-4 ios:py-3 android:py-1 flex-row items-center mb-6">
              <TextInput
                className="flex-1 text-gray-900"
                value={formData.newPassword}
                onChangeText={(text) => handleInputChange("newPassword", text)}
                placeholder="Enter new password"
                secureTextEntry={!passwordVisibility.newPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => togglePasswordVisibility("newPassword")}
              >
                <Ionicons
                  name={passwordVisibility.newPassword ? "eye" : "eye-off"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <Text className="text-gray-900 font-semibold mb-2">
              Confirm Password
            </Text>
            <View className="border border-gray-300 rounded-lg px-4 ios:py-3 android:py-1 flex-row items-center mb-6">
              <TextInput
                className="flex-1 text-gray-900"
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange("confirmPassword", text)}
                placeholder="Confirm new password"
                secureTextEntry={!passwordVisibility.confirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => togglePasswordVisibility("confirmPassword")}
              >
                <Ionicons
                  name={passwordVisibility.confirmPassword ? "eye" : "eye-off"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>

            {/* Change Password Button */}
            <TouchableOpacity
              className={`bg-blue-600 rounded-full py-4 items-center ${
                isLoading ? "opacity-50" : ""
              }`}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  Change Password
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Alert Modal with Image Icons */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={hideModal}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 w-4/5 max-w-sm">
            <View className="items-center mb-4">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-3"
              >
                <Image
                  source={modalConfig.type === "success" ? successIconx : warningIconx}
                  style={{ width: 50, height: 50, resizeMode: "contain" }}
                />
              </View>
              <Text className="text-xl font-bold text-black text-center">
                {modalConfig.title}
              </Text>
              <Text className="text-sm text-gray-500 text-center mt-2 leading-5">
                {modalConfig.message}
              </Text>
            </View>

            <TouchableOpacity
              className="bg-blue-600 py-3 rounded-full items-center"
              onPress={hideModal}
            >
              <Text className="text-white font-semibold">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}