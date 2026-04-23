import { useReset_passwordMutation } from "@/redux/features/user/userApi";
import { useAppSelector } from "@/redux/store/store";
import Feather from "@expo/vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const paramEmail = params.email as string;
  const isDarkMode = useAppSelector((state) => state.theme.isDarkMode);
  const [resetPassword, { isLoading }] = useReset_passwordMutation();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const { width } = Dimensions.get("window");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Define breakpoint for larger screens
  const isLargeScreen = width > 768;
  const containerWidth = isLargeScreen ? 500 : "100%";
  const horizontalPadding = isLargeScreen ? 8 : 4;
  const titleSize = isLargeScreen ? 'text-4xl' : 'text-2xl';
  const descriptionSize = isLargeScreen ? 'text-lg' : 'text-base';

  useEffect(() => {
    const loadEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("email");

        if (savedEmail) {
          setEmail(savedEmail);
        } else if (paramEmail) {
          setEmail(paramEmail);
        } else {
          router.replace("/auth/verify-email");
          return;
        }
      } catch (error) {
        console.error("Failed to load email:", error);
        router.replace("/auth/verify-email");
      }
    };

    loadEmail();
  }, [paramEmail]);

  const validateInputs = () => {
    const newErrors: { [key: string]: string } = {};
    if (!otp.trim()) {
      newErrors.otp = "Verification code is required";
    } else if (!/^\d{5}$/.test(otp)) {
      newErrors.otp = "Code must be 5 digits";
    }
    if (!newPassword) {
      newErrors.password = "Password is required";
    } else if (newPassword.length < 8) {
      newErrors.password = "Minimum 8 characters required";
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords must match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;

    try {
      const payload = {
        email: email,
        otp,
        newPassword,
      };
      const result: any = await resetPassword(payload).unwrap();

      console.log(result, "fhhfh")

      if (result?.success) {
        setResetSuccess(true);
        setModalVisible(true);
        await AsyncStorage.multiRemove(["email"]);
      }
    } catch (err: any) {
      // Show error inline or via a small toast? We'll use a simple alert for now
      setErrors({ form: err.data?.message || "An error occurred" });
    }
  };

  const handleModalAction = (action: 'login' | 'dashboard') => {
    setModalVisible(false);
    if (action === 'login') {
      router.replace({
        pathname: "/auth/login-with-email",
        params: { email }
      });
    } else {
      router.replace("/(tabs)");
    }
  };

  // Clear error when user starts typing
  const handleOtpChange = (text: string) => {
    setOtp(text);
    if (errors.otp) setErrors((prev) => ({ ...prev, otp: "" }));
    if (errors.form) setErrors((prev) => ({ ...prev, form: "" }));
  };

  const handleNewPasswordChange = (text: string) => {
    setNewPassword(text);
    if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
    if (errors.confirmPassword && confirmPassword === text) {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
    if (errors.form) setErrors((prev) => ({ ...prev, form: "" }));
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (errors.confirmPassword && newPassword === text) {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
    if (errors.form) setErrors((prev) => ({ ...prev, form: "" }));
  };

  const isFormValid =
    otp.length === 5 &&
    newPassword.length >= 8 &&
    confirmPassword === newPassword;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        animated={true}
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
          <View className={`flex-1 px-${horizontalPadding}`}>
            {/* Header */}
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row justify-start gap-2 items-center py-4"
              disabled={isLoading}
            >
              <Feather name="arrow-left" size={20} color="black" />
              <Text className="text-black">Back</Text>
            </TouchableOpacity>

            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              <View className="pb-6">
                <Text className={`font-semibold ${titleSize} mt-2 text-gray-800`}>
                  Reset Password
                </Text>
                <Text className={`${descriptionSize} text-gray-600 mt-2 leading-6`}>
                  We sent a verification code to {email}.
                </Text>

                {/* Form error */}
                {errors.form && (
                  <View className="mt-4 p-3 bg-red-50 rounded-lg">
                    <Text className="text-red-600 text-sm">{errors.form}</Text>
                  </View>
                )}

                <View className="gap-6 mt-6">
                  {/* Verification Code Input */}
                  <View className="gap-2">
                    <Text className={`${isLargeScreen ? 'text-base' : 'text-sm'} font-medium mb-2 text-gray-700`}>
                      Verification Code
                    </Text>
                    <View className="border border-gray-300 rounded-xl bg-white/90 backdrop-blur-sm px-4 android:py-1 ios:py-4">
                      <TextInput
                        className="text-base text-gray-900"
                        placeholder="Enter 5-digit code"
                        placeholderTextColor="#6B7280"
                        value={otp}
                        onChangeText={handleOtpChange}
                        keyboardType="number-pad"
                        autoCapitalize="none"
                        maxLength={5}
                        editable={!isLoading}
                      />
                    </View>
                    {errors.otp && (
                      <Text className="text-red-500 text-sm mt-1">
                        {errors.otp}
                      </Text>
                    )}
                  </View>

                  {/* New Password Input */}
                  <View className="gap-2">
                    <Text className={`${isLargeScreen ? 'text-base' : 'text-sm'} font-medium mb-2 text-gray-700`}>
                      New Password
                    </Text>
                    <View className="flex-row items-center border border-gray-300 rounded-xl bg-white/90 backdrop-blur-sm px-4 android:py-1 ios:py-4">
                      <TextInput
                        className="flex-1 text-base text-gray-900"
                        placeholder="Enter new password"
                        placeholderTextColor="#6B7280"
                        value={newPassword}
                        onChangeText={handleNewPasswordChange}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        className="pl-2"
                        disabled={isLoading}
                      >
                        <Feather name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
                      </TouchableOpacity>
                    </View>
                    {errors.password && (
                      <Text className="text-red-500 text-sm mt-1">
                        {errors.password}
                      </Text>
                    )}
                  </View>

                  {/* Confirm Password Input */}
                  <View className="gap-2">
                    <Text className={`${isLargeScreen ? 'text-base' : 'text-sm'} font-medium mb-2 text-gray-700`}>
                      Confirm Password
                    </Text>
                    <View className="flex-row items-center border border-gray-300 rounded-xl bg-white/90 backdrop-blur-sm px-4 android:py-1 ios:py-4">
                      <TextInput
                        className="flex-1 text-base text-gray-900"
                        placeholder="Confirm your password"
                        placeholderTextColor="#6B7280"
                        value={confirmPassword}
                        onChangeText={handleConfirmPasswordChange}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="pl-2"
                        disabled={isLoading}
                      >
                        <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#666" />
                      </TouchableOpacity>
                    </View>
                    {errors.confirmPassword && (
                      <Text className="text-red-500 text-sm mt-1">
                        {errors.confirmPassword}
                      </Text>
                    )}
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    className={`py-4 rounded-full items-center justify-center mt-4 ${
                      isFormValid && !isLoading ? "bg-[#0079ff]" : "bg-gray-300"
                    }`}
                    onPress={handleSubmit}
                    disabled={!isFormValid || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-white text-base md:text-lg font-semibold">
                        Reset Password
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View className="flex-1 justify-center items-center bg-black/50">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-3xl p-6 m-4 w-full max-w-sm shadow-xl">
                {/* Icon */}
                <View className="items-center mt-2">
                  <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center">
                    <Feather name="check-circle" size={40} color="#1969fe" />
                  </View>
                </View>

                {/* Title */}
                <Text className="text-xl font-bold text-center mt-4">
                  Password Reset Successful!
                </Text>

                {/* Message */}
                <Text className="text-gray-600 text-center mt-2 px-2">
                  Your password has been changed. What would you like to do next?
                </Text>

                {/* Action Buttons */}
                <View className="mt-6 gap-3">
                  <TouchableOpacity
                    onPress={() => handleModalAction('login')}
                    className="py-4 rounded-xl items-center bg-[#1a6cff] flex-row justify-center"
                  >
                    <Feather name="log-in" size={20} color="white" />
                    <Text className="text-white font-semibold text-base ml-2">
                      Login Now
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}