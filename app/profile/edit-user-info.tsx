import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal, // 👈 added
  Image
} from "react-native";
import { Ionicons, AntDesign } from "@expo/vector-icons"; // 👈 added AntDesign
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import DropDownPicker from "react-native-dropdown-picker";
import Toast from "react-native-toast-message";
import { format } from "date-fns";
import { useGetUserQuery } from "../../redux/api/apiSlice";
import { router } from "expo-router";
import { useUpdateUserDataMutation } from "@/redux/features/user/userApi";

import flag from '../../assets/images/nigeria.png'

interface FormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  address: string;
  gender: string;
  phone: string; // 👈 consistent key
}

export default function EditProfileScreen() {
  const { data, isLoading: loadingUser, refetch } = useGetUserQuery<any>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [updateUserData, { isLoading }] = useUpdateUserDataMutation();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"error" | "success" | "info">("error");

  const showModal = (title: string, message: string, type: "error" | "success" | "info" = "error") => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    address: "",
    gender: "",
    phone: "",
  });
  const [originalData, setOriginalData] = useState<FormData>({ ...formData });

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 16);

  useEffect(() => {
    if (data?.user) {
      const rawPhone = data.user.phoneNumber || data.user.phone || "";
      const digits = rawPhone.replace(/\D/g, "");
      const phoneNumber = digits.slice(-11);

      const userData = {
        firstName: data.user.firstName || "",
        lastName: data.user.lastName || "",
        dateOfBirth: data.user.dateOfBirth || "",
        email: data.user.email || "",
        address: data.user.address || "",
        gender: data.user.gender || "",
        phone: phoneNumber,
      };
      setFormData(userData);
      setOriginalData(userData);
    }
  }, [data?.user]);

  const hasChanges = useCallback(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  }, [formData, originalData]);

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (selectedDate > minDate) {
        Toast.show({
          type: "error",
          text1: "You must be at least 16 years old",
        });
        return;
      }
      setFormData((prev) => ({
        ...prev,
        dateOfBirth: selectedDate.toISOString().split("T")[0],
      }));
    }
  };

  const [genderItems] = useState([
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
  ]);

  const handleSubmit = async () => {
    if (!data?.user?._id || !hasChanges()) return;

    if (!formData.firstName?.trim()) {
      showModal("Validation Error", "First Name is required");
      return;
    }

    if (!formData.lastName?.trim()) {
      showModal("Validation Error", "Last Name is required");
      return;
    }

    if (!formData.email?.trim()) {
      showModal("Validation Error", "Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showModal("Validation Error", "Please enter a valid email address");
      return;
    }

    if (!formData.phone || formData.phone.length !== 11) {
      showModal("Validation Error", "Phone number must be exactly 11 digits");
      return;
    }

    try {
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        gender: formData.gender,
        phone: formData.phone, // backend expects phoneNumber
      };

      await updateUserData(updateData).unwrap();
      await refetch();

      Toast.show({
        type: "success",
        text1: "Profile updated successfully!",
      });

      setTimeout(() => {
        router.push("/profile/personal-info");
      }, 1500);
    } catch (error: any) {
      console.log("Update error:", error);
      Toast.show({
        type: "error",
        text1: error?.data?.message || "Failed to update profile",
      });
    }
  };

  const inputFields = [
    {
      key: "firstName",
      label: "First Name",
      icon: "person-outline" as const,
      required: true,
      editable: true,
    },
    {
      key: "lastName",
      label: "Last Name",
      icon: "person-outline" as const,
      required: true,
      editable: true,
    },
    {
      key: "email",
      label: "Email",
      icon: "mail-outline" as const,
      required: true,
      editable: !data?.user?.email,
    },
    {
      key: "address",
      label: "Address",
      icon: "location-outline" as const,
      editable: true,
    },
    {
      key: "phone",
      label: "Phone Number",
      icon: "call-outline" as const,
      required: true,
      editable: !data?.user?.phone,
    },
  ];

  const getModalIcon = () => {
    switch (modalType) {
      case "error":
        return <AntDesign name="closecircle" size={48} color="#EF4444" />;
      case "success":
        return <AntDesign name="checkcircle" size={48} color="#10B981" />;
      case "info":
        return <AntDesign name="infocirlce" size={48} color="#3B82F6" />;
      default:
        return null;
    }
  };

  if (loadingUser) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100">
        <StatusBar barStyle="dark-content" animated backgroundColor="#f5f5f5" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#007AFF" />
          <Text className="mt-4 text-lg text-gray-600">Loading your information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" animated backgroundColor="#f5f5f5" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-4 md:px-8 mb-8 android:mt-3">
            {/* Header */}
            <View className="mb-6">
              <View className="flex-row justify-start gap-2 items-center mb-4">
                <TouchableOpacity onPress={() => router.back()}>
                  <Ionicons name="arrow-back-outline" size={24} color="#242526" />
                </TouchableOpacity>
                <Text className="text-lg font-normal text-[#242526]">Back</Text>
                <View className="w-6" />
              </View>
              <Text className="text-2xl font-bold text-gray-900">Edit Profile</Text>
              <Text className="text-gray-600 mt-2">
                Edit your profile information when needed.
              </Text>
            </View>

            {/* Form */}
            <View className="bg-white rounded-xl">
              {inputFields.map((field) => (
                <View key={field.key} className="mb-4">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-sm text-gray-600">
                      {field.label}
                      {field.required && <Text className="text-red-500"> *</Text>}
                    </Text>
                  </View>

                  {field.key === "phone" ? (
                    <View className="flex-row items-center border border-[#F2f4f6] bg-white rounded-lg pl-2">
                      <Image
                        source={flag}
                        className="w-4 h-4"
                        resizeMode="contain"
                      />
                      <TextInput
                        className="flex-1 p-3 text-base text-gray-800"
                        value={formData.phone}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/\D/g, "").slice(0, 11);
                          setFormData((prev) => ({ ...prev, phone: cleaned }));
                        }}
                        keyboardType="phone-pad"
                        maxLength={11}
                        placeholder="08012345678"
                        placeholderTextColor="#6b7280"
                        editable={!isLoading}
                      />
                    </View>
                  ) : (
                    <TextInput
                      className={`text-base p-3 rounded-lg border border-[#F2f4f6] bg-white text-gray-800 ${!field.editable ? "opacity-70" : ""
                        }`}
                      value={formData[field.key as keyof FormData] || ""}
                      onChangeText={(text) =>
                        setFormData((prev) => ({
                          ...prev,
                          [field.key]: text,
                        }))
                      }
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      placeholderTextColor="#6b7280"
                      editable={field.editable && !isLoading}
                      keyboardType={field.key === "email" ? "email-address" : "default"}
                      autoCapitalize={field.key === "email" ? "none" : "words"}
                    />
                  )}
                </View>
              ))}

              {/* Date of Birth */}
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-2">Date of Birth</Text>
                <TouchableOpacity
                  className="mt-1 p-3 rounded-lg border border-[#F2f4f6] bg-white"
                  onPress={() => setShowDatePicker(true)}
                  disabled={isLoading}
                >
                  <Text className="text-gray-900 text-base">
                    {formData.dateOfBirth
                      ? format(new Date(formData.dateOfBirth), "dd MMM yyyy")
                      : "Select your date of birth"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : minDate}
                    mode="date"
                    display="spinner"
                    maximumDate={minDate}
                    onChange={handleDateChange}
                  />
                )}
              </View>

              {/* Gender Dropdown */}
              <View className="z-10 mb-4">
                <Text className="text-sm text-gray-600 mb-2">Gender</Text>
                <DropDownPicker
                  open={isGenderOpen}
                  value={formData.gender}
                  items={genderItems}
                  setOpen={setIsGenderOpen}
                  setValue={(callback) => {
                    setFormData((prev) => ({
                      ...prev,
                      gender: callback(prev.gender),
                    }));
                  }}
                  placeholder="Select Gender"
                  placeholderStyle={{ color: "#6B7280" }}
                  style={{
                    borderColor: "#F2f4f6",
                    borderRadius: 8,
                    minHeight: 50,
                    backgroundColor: "white",
                  }}
                  textStyle={{ color: "#111827", fontSize: 16 }}
                  dropDownContainerStyle={{
                    borderColor: "#D1D5DB",
                    backgroundColor: "#FFFFFF",
                  }}
                  listItemLabelStyle={{ color: "#111827" }}
                  disabled={isLoading}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!hasChanges() || isLoading}
                className={`py-4 rounded-full items-center justify-center mt-4 ${!hasChanges() || isLoading ? "bg-gray-300" : "bg-[#007AFF]"
                  }`}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white text-base md:text-lg font-semibold">
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Modal for Validation Errors */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-3xl px-6 py-8 items-center">
            <TouchableOpacity
              className="absolute top-4 right-4 z-10"
              onPress={() => setModalVisible(false)}
            >
              <AntDesign name="close" size={24} color="#000" />
            </TouchableOpacity>

            <View className="w-24 h-24 items-center justify-center mb-5">
              {getModalIcon()}
            </View>

            <Text className="text-xl font-bold text-black mb-3 text-center">
              {modalTitle}
            </Text>
            <Text className="text-sm text-gray-500 text-center leading-5 mb-6">
              {modalMessage}
            </Text>

            <TouchableOpacity
              className="bg-[#007AFF] w-full py-4 rounded-xl items-center"
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-white text-base font-semibold">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
}