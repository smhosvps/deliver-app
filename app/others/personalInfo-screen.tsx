// screens/PersonalInfoScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { differenceInYears, format } from "date-fns";
import { useGetUserQuery } from "@/redux/api/apiSlice";
import { useUpdatePersonalInfoMutation } from "@/redux/features/user/userApi";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

// Types
interface Address {
  addressType: "home" | "office" | "other";
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface NotificationState {
  visible: boolean;
  type: "success" | "error" | "info";
  message: string;
}

interface FormErrors {
  dateOfBirth?: string;
  gender?: string;
  addresses?: Record<number, Partial<Record<keyof Address, string>>>;
}

// Constants
const GENDER_OPTIONS = [
  { label: "Select gender", value: "" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
] as const;

const ADDRESS_TYPE_OPTIONS = [
  { label: "Home", value: "home" },
  { label: "Office", value: "office" },
  { label: "Other", value: "other" },
] as const;

// Custom Picker Component
const CustomPicker = React.memo(
  ({
    selectedValue,
    onValueChange,
    items,
    placeholder = "Select",
    error,
    label,
  }: {
    selectedValue: string;
    onValueChange: (value: string) => void;
    items: readonly { label: string; value: string }[];
    placeholder?: string;
    error?: string;
    label?: string;
  }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const selectedItem = items.find((item) => item.value === selectedValue);

    return (
      <View className="mb-4">
        {label && (
          <Text className="text-gray-700 mb-1 font-medium">{label}</Text>
        )}
        <TouchableOpacity
          className={`border ${error ? "border-red-500" : "border-gray-300"} 
          rounded-xl p-4 bg-white flex-row justify-between items-center`}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text className={selectedValue ? "text-gray-900" : "text-gray-400"}>
            {selectedItem ? selectedItem.label : placeholder}
          </Text>
          <Feather name="chevron-down" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}

        <Modal visible={modalVisible} transparent animationType="slide">
          <TouchableOpacity
            className="flex-1 bg-black/50"
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View className="flex-1 justify-end">
              <View className="bg-white rounded-t-3xl">
                <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text className="text-gray-500">Cancel</Text>
                  </TouchableOpacity>
                  <Text className="font-semibold text-gray-900">
                    {label || placeholder}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text className="text-blue-500 font-semibold">Done</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={items.filter((item) => item.value !== "")}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className={`p-4 border-b border-gray-100 ${
                        selectedValue === item.value ? "bg-blue-50" : ""
                      }`}
                      onPress={() => {
                        onValueChange(item.value);
                        setModalVisible(false);
                      }}
                    >
                      <Text
                        className={`${
                          selectedValue === item.value
                            ? "text-blue-500 font-semibold"
                            : "text-gray-800"
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }
);

CustomPicker.displayName = "CustomPicker";

// Custom Notification Component
const CustomNotification = ({
  visible,
  type = "info",
  message = "",
  onHide,
}: {
  visible: boolean;
  type?: "success" | "error" | "info";
  message: string;
  onHide: () => void;
}) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 200 });

      const timer = setTimeout(() => {
        translateY.value = withTiming(-100, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onHide)();
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  const getIcon = () => {
    const size = 24;
    const color = "white";
    switch (type) {
      case "success":
        return <Feather name="check-circle" size={size} color={color} />;
      case "error":
        return <Feather name="alert-circle" size={size} color={color} />;
      default:
        return <Feather name="info" size={size} color={color} />;
    }
  };

  const hideNotification = () => {
    translateY.value = withTiming(-100, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onHide)();
    });
  };

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: "absolute",
          top: Platform.OS === "ios" ? 50 : 30,
          left: 20,
          right: 20,
          zIndex: 1000,
          elevation: 1000,
        },
      ]}
    >
      <View
        className={`${getBackgroundColor()} rounded-2xl px-4 py-3 flex-row items-center shadow-xl`}
      >
        <View className="mr-3">{getIcon()}</View>
        <Text className="text-white font-medium flex-1 text-base">
          {message}
        </Text>
        <TouchableOpacity onPress={hideNotification} className="p-1">
          <Feather name="x" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Address Form Component
const AddressForm = React.memo(
  ({
    address,
    index,
    onUpdate,
    onRemove,
    errors,
    canRemove,
  }: {
    address: Address;
    index: number;
    onUpdate: (index: number, field: keyof Address, value: string) => void;
    onRemove: (index: number) => void;
    errors?: Partial<Record<keyof Address, string>>;
    canRemove: boolean;
  }) => {
    const inputRefs = useRef<Record<string, TextInput | null>>({});

    return (
      <View className="mb-6 p-4 border border-gray-200 rounded-xl bg-white">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <Feather name="map-pin" size={20} color="#3B82F6" />
            <Text className="font-semibold text-gray-900 ml-2">
              Address {index + 1}
            </Text>
          </View>
          {canRemove && (
            <TouchableOpacity onPress={() => onRemove(index)} className="p-2">
              <Feather name="trash-2" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        <CustomPicker
          label="Address Type"
          selectedValue={address.addressType}
          onValueChange={(value) =>
            onUpdate(index, "addressType", value as Address["addressType"])
          }
          items={ADDRESS_TYPE_OPTIONS}
          error={errors?.addressType}
        />

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">Street Address</Text>
          <TextInput
            ref={(ref) => {
              inputRefs.current[`street-${index}`] = ref;
            }}
            className={`border ${errors?.street ? "border-red-500" : "border-gray-300"} 
            rounded-xl p-4 text-base bg-white`}
            value={address.street}
            onChangeText={(value) => onUpdate(index, "street", value)}
            placeholder="Enter street address"
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.current[`city-${index}`]?.focus()}
            blurOnSubmit={false}
          />
          {errors?.street && (
            <Text className="text-red-500 text-sm mt-1">{errors.street}</Text>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">City</Text>
          <TextInput
            ref={(ref) => {
              inputRefs.current[`city-${index}`] = ref;
            }}
            className={`border ${errors?.city ? "border-red-500" : "border-gray-300"} 
            rounded-xl p-4 text-base bg-white`}
            value={address.city}
            onChangeText={(value) => onUpdate(index, "city", value)}
            placeholder="Enter city"
            returnKeyType="next"
            onSubmitEditing={() => inputRefs.current[`state-${index}`]?.focus()}
            blurOnSubmit={false}
          />
          {errors?.city && (
            <Text className="text-red-500 text-sm mt-1">{errors.city}</Text>
          )}
        </View>

        <View className="flex-row gap-4">
          <View className="flex-1 mb-4">
            <Text className="text-gray-700 mb-1 font-medium">State</Text>
            <TextInput
              ref={(ref) => {
                inputRefs.current[`state-${index}`] = ref;
              }}
              className={`border ${errors?.state ? "border-red-500" : "border-gray-300"} 
              rounded-xl p-4 text-base bg-white`}
              value={address.state}
              onChangeText={(value) => onUpdate(index, "state", value)}
              placeholder="State"
              returnKeyType="next"
              onSubmitEditing={() =>
                inputRefs.current[`zipCode-${index}`]?.focus()
              }
              blurOnSubmit={false}
            />
            {errors?.state && (
              <Text className="text-red-500 text-sm mt-1">{errors.state}</Text>
            )}
          </View>

          <View className="flex-1 mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Zip Code</Text>
            <TextInput
              ref={(ref) => {
                inputRefs.current[`zipCode-${index}`] = ref;
              }}
              className={`border ${errors?.zipCode ? "border-red-500" : "border-gray-300"} 
              rounded-xl p-4 text-base bg-white`}
              value={address.zipCode}
              onChangeText={(value) => onUpdate(index, "zipCode", value)}
              placeholder="Zip Code"
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() =>
                inputRefs.current[`country-${index}`]?.focus()
              }
              blurOnSubmit={false}
            />
            {errors?.zipCode && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.zipCode}
              </Text>
            )}
          </View>
        </View>

        <View className="mb-2">
          <Text className="text-gray-700 mb-1 font-medium">Country</Text>
          <TextInput
            ref={(ref) => {
              inputRefs.current[`country-${index}`] = ref;
            }}
            className={`border ${errors?.country ? "border-red-500" : "border-gray-300"} 
            rounded-xl p-4 text-base bg-white`}
            value={address.country}
            onChangeText={(value) => onUpdate(index, "country", value)}
            placeholder="Enter country"
            returnKeyType="done"
          />
          {errors?.country && (
            <Text className="text-red-500 text-sm mt-1">{errors.country}</Text>
          )}
        </View>
      </View>
    );
  }
);

AddressForm.displayName = "AddressForm";

// Main Component
export default function PersonalInfoScreen() {
  const {
    data: userData,
    isLoading: isLoadingUser,
    refetch,
  } = useGetUserQuery();
  const [updatePersonalInfo, { isLoading: isUpdating }] =
    useUpdatePersonalInfoMutation();
  const [mounted, setMounted] = useState(false);
  const user = userData?.user;

  // Form state
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([
    {
      addressType: "home",
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  ]);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    type: "info",
    message: "",
  });

  // Animation values
  const scale = useSharedValue(0.5);

  useEffect(() => {
    setMounted(true);
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
  }, []);

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setDateOfBirth(user.dateOfBirth || "");
      setGender(user.gender || "");
      if (user.addresses && user.addresses.length > 0) {
        setAddresses(user.addresses);
      }
    }
  }, [user]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    const addressErrors: Record<
      number,
      Partial<Record<keyof Address, string>>
    > = {};

    // Validate date of birth
    if (!dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else {
      const age = differenceInYears(new Date(), new Date(dateOfBirth));
      if (age < 18) {
        newErrors.dateOfBirth = "You must be at least 18 years old";
      }
    }

    if (!gender) newErrors.gender = "Gender is required";

    // Validate addresses
    addresses.forEach((addr, index) => {
      const addrError: Partial<Record<keyof Address, string>> = {};

      if (!addr.street?.trim()) addrError.street = "Street is required";
      if (!addr.city?.trim()) addrError.city = "City is required";
      if (!addr.state?.trim()) addrError.state = "State is required";
      if (!addr.zipCode?.trim()) addrError.zipCode = "Zip code is required";
      if (!addr.country?.trim()) addrError.country = "Country is required";

      if (Object.keys(addrError).length > 0) {
        addressErrors[index] = addrError;
      }
    });

    if (Object.keys(addressErrors).length > 0) {
      newErrors.addresses = addressErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [dateOfBirth, gender, addresses]);

  const showNotification = useCallback(
    (type: NotificationState["type"], message: string) => {
      setNotification({ visible: true, type, message });
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      showNotification("error", "Please fix the errors in the form");
      return;
    }

    try {
      await updatePersonalInfo({
        dateOfBirth,
        gender,
        addresses,
      }).unwrap();

      showNotification("success", "Personal information updated successfully!");
      await refetch();
    } catch (err) {
      showNotification(
        "error",
        "Failed to update information. Please try again."
      );
    }
  }, [
    validateForm,
    updatePersonalInfo,
    dateOfBirth,
    gender,
    addresses,
    refetch,
    showNotification,
  ]);

  const updateAddressField = useCallback(
    (index: number, field: keyof Address, value: string) => {
      setAddresses((prev) => {
        const newAddresses = [...prev];
        newAddresses[index] = { ...newAddresses[index], [field]: value };
        return newAddresses;
      });

      // Clear error for this field
      if (errors.addresses?.[index]?.[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (newErrors.addresses) {
            delete newErrors.addresses[index]?.[field];
            if (Object.keys(newErrors.addresses[index] || {}).length === 0) {
              delete newErrors.addresses[index];
            }
            if (Object.keys(newErrors.addresses).length === 0) {
              delete newErrors.addresses;
            }
          }
          return newErrors;
        });
      }
    },
    [errors]
  );

  const addAddress = useCallback(() => {
    setAddresses((prev) => [
      ...prev,
      {
        addressType: "home",
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
    ]);
  }, []);

  const removeAddress = useCallback(
    (index: number) => {
      if (addresses.length > 1) {
        setAddresses((prev) => prev.filter((_, i) => i !== index));

        // Clear errors for removed address
        if (errors.addresses?.[index]) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            if (newErrors.addresses) {
              delete newErrors.addresses[index];
              if (Object.keys(newErrors.addresses).length === 0) {
                delete newErrors.addresses;
              }
            }
            return newErrors;
          });
        }
      }
    },
    [addresses.length, errors]
  );

  const handleNext = useCallback(() => {
    // Navigate to next screen
    router.push("/others/otherInfo-screen");
  }, [router]);

  const onDateChange = useCallback(
    (event: any, selectedDate?: Date) => {
      setShowDatePicker(Platform.OS === "ios");
      if (selectedDate) {
        setDateOfBirth(selectedDate.toISOString());
        // Clear date error
        if (errors.dateOfBirth) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.dateOfBirth;
            return newErrors;
          });
        }
      }
    },
    [errors.dateOfBirth]
  );

  const formatDate = useCallback((dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM dd, yyyy");
    } catch {
      return "Invalid date";
    }
  }, []);

  if (isLoadingUser) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Loading your information...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <CustomNotification
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onHide={hideNotification}
      />

      {/* Special Designed Background Elements */}
      <View className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        {/* Geometric Pattern - Circles and Gradients */}
        <View className="absolute top-0 left-0 w-full h-full">
          {/* Large top left circle */}
          <View
            className="absolute top-1/4 -left-16 w-80 h-80 rounded-full"
            style={[
              {
                backgroundColor: "rgba(59, 130, 246, 0.05)",
                transform: [{ translateX: mounted ? 0 : -20 }],
                opacity: mounted ? 1 : 0,
                shadowColor: "#3b82f6",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 60,
              },
            ]}
          />
          {/* Bottom right circle */}
          <View
            className="absolute bottom-1/3 -right-16 w-96 h-96 rounded-full"
            style={[
              {
                backgroundColor: "rgba(99, 102, 241, 0.05)",
                transform: [{ translateX: mounted ? 0 : 20 }],
                opacity: mounted ? 1 : 0,
                shadowColor: "#6366f1",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 70,
              },
            ]}
          />
          {/* Center subtle circle */}
          <View
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
            style={[
              {
                backgroundColor: "rgba(59, 130, 246, 0.03)",
                transform: [
                  { translateX: -250 },
                  { translateY: -250 },
                  { scale: mounted ? 1 : 0.5 },
                ],
                opacity: mounted ? 0.6 : 0,
                shadowColor: "#3b82f6",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 80,
              },
            ]}
          />
        </View>

        {/* Floating Grid Pattern - Subtle */}
        <View className="absolute inset-0" style={{ opacity: 0.03 }}>
          <View
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </View>

        {/* Floating Icons - Very Subtle */}
        <View
          className="absolute top-32 left-12"
          style={[
            { opacity: mounted ? 0.15 : 0 },
            { transform: [{ translateY: mounted ? 0 : 10 }] },
          ]}
        >
          <Feather name="user" size={48} color="#3b82f6" />
        </View>
        <View
          className="absolute top-52 right-20"
          style={[
            { opacity: mounted ? 0.15 : 0 },
            { transform: [{ translateY: mounted ? 0 : 10 }] },
          ]}
        >
          <Feather name="map-pin" size={48} color="#3b82f6" />
        </View>
        <View
          className="absolute bottom-40 left-32"
          style={[
            { opacity: mounted ? 0.15 : 0 },
            { transform: [{ translateY: mounted ? 0 : 10 }] },
          ]}
        >
          <Ionicons name="location-outline" size={48} color="#3b82f6" />
        </View>
        <View
          className="absolute bottom-52 right-32"
          style={[
            { opacity: mounted ? 0.15 : 0 },
            { transform: [{ translateY: mounted ? 0 : 10 }] },
          ]}
        >
          <MaterialIcons name="home" size={48} color="#3b82f6" />
        </View>

        {/* Animated Gradient Orbs */}
        <View
          className="absolute top-16 left-1/3 w-40 h-40 rounded-full"
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.05)",
            shadowColor: "#3b82f6",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 40,
          }}
        />
        <View
          className="absolute bottom-16 right-1/3 w-48 h-48 rounded-full"
          style={{
            backgroundColor: "rgba(99, 102, 241, 0.05)",
            shadowColor: "#6366f1",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 50,
          }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 ">
          <View></View>

          <TouchableOpacity
            onPress={handleNext}
            className="flex-row items-center bg-blue-500 px-4 py-2 rounded-full"
            disabled={isUpdating}
          >
            <Text className="text-white font-semibold mr-1">Next</Text>
            <Feather name="chevron-right" size={16} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-12 "
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900">
              Personal Information
            </Text>
            <Text className="text-gray-600 mt-2">
              Update your personal details and addresses
            </Text>
          </View>

          {/* Date of Birth */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">
              Date of Birth
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className={`border ${errors.dateOfBirth ? "border-red-500" : "border-gray-300"} 
                rounded-xl p-4 bg-white flex-row justify-between items-center`}
              activeOpacity={0.7}
            >
              <Text className={dateOfBirth ? "text-gray-900" : "text-gray-400"}>
                {dateOfBirth
                  ? formatDate(dateOfBirth)
                  : "Select your date of birth"}
              </Text>
              <Feather name="calendar" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            {errors.dateOfBirth && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.dateOfBirth}
              </Text>
            )}
          </View>

          {/* Gender */}
          <CustomPicker
            label="Gender"
            selectedValue={gender}
            onValueChange={setGender}
            items={GENDER_OPTIONS}
            placeholder="Select gender"
            error={errors.gender}
          />

          {/* Addresses Section */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-gray-900">Addresses</Text>
            <TouchableOpacity
              onPress={addAddress}
              className="bg-[#1969fe] px-4 py-2 rounded-full flex-row items-center"
              activeOpacity={0.7}
            >
              <Feather name="plus" size={18} color="white" />
              <Text className="text-white font-semibold ml-1">Add</Text>
            </TouchableOpacity>
          </View>

          {addresses.map((addr, index) => (
            <AddressForm
              key={index}
              address={addr}
              index={index}
              onUpdate={updateAddressField}
              onRemove={removeAddress}
              errors={errors.addresses?.[index]}
              canRemove={addresses.length > 1}
            />
          ))}

          {/* Submit Button */}
          <TouchableOpacity
            className={`bg-[#1969fe] py-4 rounded-full items-center mb-[100px] 
              ${isUpdating ? "opacity-50" : ""} shadow-lg shadow-blue-500`}
            onPress={handleSubmit}
            disabled={isUpdating}
            activeOpacity={0.7}
          >
            {isUpdating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">
                Update Information
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth ? new Date(dateOfBirth) : new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}