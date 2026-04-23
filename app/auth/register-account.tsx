import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Animated,
  StatusBar,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { useRegisteruserMutation } from "@/redux/features/user/userApi";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import flag from '../../assets/images/nigeria.png'

// Custom Notification Component
const CustomNotification = ({ 
  visible, 
  type = 'info', 
  message = '', 
  onHide 
}: { 
  visible: boolean; 
  type?: 'success' | 'error' | 'info'; 
  message: string; 
  onHide: () => void;
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideNotification();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      hideNotification();
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'alert-circle';
      default: return 'info';
    }
  };

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 20,
        right: 20,
        zIndex: 1000,
        elevation: 1000,
      }}
    >
      <View className={`${getBackgroundColor()} rounded-2xl px-4 py-3 flex-row items-center shadow-xl`}>
        <View className="mr-3">
          <Feather name={getIconName()} size={24} color="white" />
        </View>
        <Text className="text-white font-medium flex-1 text-base">{message}</Text>
        <TouchableOpacity onPress={hideNotification} className="p-1">
          <Feather name="x" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default function CreatePasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Initialize fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState((params.email as string) || "");
  const [userType, setUserType] = useState("delivery_partner");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [registeruser, { data, isLoading, isSuccess, error }] =
    useRegisteruserMutation<any>();
  const { width } = Dimensions.get("window");

  console.log(data, "data")

  // Notification state
  const [notification, setNotification] = useState({
    visible: false,
    type: 'info' as 'success' | 'error' | 'info',
    message: '',
  });

  // Responsive breakpoints
  const isLargeScreen = width > 768;
  const containerWidth = isLargeScreen ? 500 : "100%";
  const horizontalPadding = isLargeScreen ? 8 : 5;
  const titleSize = isLargeScreen ? "text-4xl" : "text-2xl";
  const descriptionSize = isLargeScreen ? "text-lg" : "text-base";
  const inputPadding = isLargeScreen ? 6 : 4;
  const labelSize = isLargeScreen ? "text-base" : "text-sm";

  // Format phone number: only digits, max 11
  const formatPhoneNumber = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    return digits;
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhoneNumber(text));
  };

  // Form validation - phone must be exactly 11 digits
  const isFormValid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    email.trim().length > 0 &&
    phone.length === 11 &&
    newPassword.length >= 6 &&
    confirmPassword.length >= 6 &&
    newPassword === confirmPassword;

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidEmail = validateEmail(email);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ visible: true, type, message });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  const handleRegister = async () => {
    if (!isFormValid) return;

    if (!isValidEmail) {
      showNotification('error', "Please enter a valid email address");
      return;
    }

    if (phone.length !== 11) {
      showNotification('error', "Phone number must be exactly 11 digits");
      return;
    }

    try {
      const data = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        userType,
        phone: phone.trim(),
        password: newPassword,
      };

      await registeruser(data).unwrap();
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  // Handle successful registration
  useEffect(() => {
    if (isSuccess && data) {
      showNotification('success', data?.message || "Registration successful! Please verify your email.");

      setTimeout(() => {
        router.push({
          pathname: "/auth/verify-otp",
          params: {
            email: email,
            purpose: "registration",
          },
        });
      }, 1500);
    }
  }, [isSuccess, data, email]);

  // Handle registration errors
  useEffect(() => {
    if (error) {
      const err = error as FetchBaseQueryError;
      const errorMessage =
        (err.data as { message?: string })?.message ||
        "Registration failed. Please try again.";
      showNotification('error', errorMessage);
    }
  }, [error]);

  const isButtonDisabled = !isFormValid || isLoading || !isValidEmail;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Custom Notification */}
      <CustomNotification
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onHide={hideNotification}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        style={{ zIndex: 1 }}
      >
        {/* Responsive Container */}
        <View
          className="flex-1 md:mt-52"
          style={
            isLargeScreen
              ? {
                  width: containerWidth,
                  alignSelf: "center",
                  maxWidth: "100%",
                }
              : {}
          }
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className={`flex-1 px-${horizontalPadding}`}>
              {/* Header */}
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row items-center py-4"
                disabled={isLoading}
              >
                <Feather name="arrow-left" size={20} color="#000" />
                <Text className="ml-2 text-base text-black">Back</Text>
              </TouchableOpacity>

              {/* Title Section */}
              <View className="mt-4">
                <Text className={`${titleSize} font-bold text-black`}>
                  Create Your Account
                </Text>
                <Text
                  className={`mt-2 ${descriptionSize} text-gray-500 leading-6`}
                >
                  Fill in your details to create your account and get started.
                </Text>
              </View> 

              {/* First Name Input */}
              <View className="mt-6">
                <Text className={`${labelSize} font-medium text-black mb-2`}>
                  First Name
                </Text>
                <View className="border border-gray-200 rounded-xl bg-white/90 backdrop-blur-sm">
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Enter your first name"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    autoCorrect={false}
                    className={`px-${inputPadding} py-${inputPadding} text-base text-black`}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Last Name Input */}
              <View className="mt-4">
                <Text className={`${labelSize} font-medium text-black mb-2`}>
                  Last Name
                </Text>
                <View className="border border-gray-200 rounded-xl bg-white/90 backdrop-blur-sm">
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Enter your last name"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    autoCorrect={false}
                    className={`px-${inputPadding} py-${inputPadding} text-base text-black`}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View className="mt-4">
                <Text className={`${labelSize} font-medium text-black mb-2`}>
                  Email Address
                </Text>
                <View className="border border-gray-200 rounded-xl bg-white/90 backdrop-blur-sm">
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email address"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className={`px-${inputPadding} py-${inputPadding} text-base text-black`}
                    editable={!isLoading}
                  />
                </View>
                {email && !isValidEmail && (
                  <Text
                    className={`text-red-500 ${isLargeScreen ? "text-sm" : "text-xs"} mt-1`}
                  >
                    Please enter a valid email address
                  </Text>
                )}
              </View>

              {/* Phone Input - Fixed: Exactly 11 digits with flag icon */}
              <View className="mt-4">
                <Text className={`${labelSize} font-medium text-black mb-2`}>
                  Phone Number
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-white/90 backdrop-blur-sm px-3">
                  <Image
                    source={flag}
                    className="w-6 h-4 mr-2"
                    resizeMode="contain"
                  />
                  <Text className="text-gray-700 mr-1">+234</Text>
                  <TextInput
                    value={phone}
                    onChangeText={handlePhoneChange}
                    placeholder="08012345678"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className={`flex-1 py-${inputPadding} text-base text-black`}
                    editable={!isLoading}
                    maxLength={11}
                  />
                </View>
                {phone.length > 0 && phone.length !== 11 && (
                  <Text className="text-red-500 text-xs mt-1">
                    Phone number must be exactly 11 digits
                  </Text>
                )}
              </View>

              {/* New Password Input - Disable autofill suggestions */}
              <View className="mt-4">
                <Text className={`${labelSize} font-medium text-black mb-2`}>
                  Password
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-white/90 backdrop-blur-sm">
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    textContentType="none"
                    importantForAutofill="no"
                    className={`flex-1 px-${inputPadding} py-${inputPadding} text-base text-black`}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    className={`px-${inputPadding}`}
                    disabled={isLoading}
                  >
                    <Feather name={showNewPassword ? "eye-off" : "eye"} size={22} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <Text
                  className={`text-gray-500 ${isLargeScreen ? "text-sm" : "text-xs"} mt-1`}
                >
                  Password must be at least 6 characters
                </Text>
              </View>

              {/* Confirm Password Input - Disable autofill suggestions */}
              <View className="mt-4 mb-8">
                <Text className={`${labelSize} font-medium text-black mb-2`}>
                  Confirm Password
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-white/90 backdrop-blur-sm">
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    textContentType="none"
                    importantForAutofill="no"
                    className={`flex-1 px-${inputPadding} py-${inputPadding} text-base text-black`}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`px-${inputPadding}`}
                    disabled={isLoading}
                  >
                    <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={22} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                {confirmPassword && newPassword !== confirmPassword && (
                  <Text
                    className={`text-red-500 ${isLargeScreen ? "text-sm" : "text-xs"} mt-1`}
                  >
                    Passwords do not match
                  </Text>
                )}
              </View>

              {/* Register Button */}
              <View className="mt-4 mb-8">
                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={isButtonDisabled}
                  className={`w-full py-${isLargeScreen ? 6 : 4} rounded-full items-center justify-center ${
                    isButtonDisabled ? "bg-gray-200" : "bg-[#1a6cff]"
                  }`}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      className={`${isLargeScreen ? "text-lg" : "text-base"} font-semibold ${
                        isButtonDisabled ? "text-gray-400" : "text-white"
                      }`}
                    >
                      Create Account
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}