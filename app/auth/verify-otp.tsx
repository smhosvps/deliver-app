import {
  useActivationMutation,
  useResendOtpMutation,
} from "@/redux/features/user/userApi";
import { useAppSelector } from "@/redux/store/store";
import Feather from "@expo/vector-icons/Feather";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  ScrollView,
  Animated,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";

// Custom Notification Component (unchanged)
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

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
        position: "absolute",
        top: Platform.OS === "ios" ? 50 : 30,
        left: 20,
        right: 20,
        zIndex: 1000,
        elevation: 1000,
      }}
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

export default function OtpVerification() {
  const params = useLocalSearchParams();
  const email = params.email as string;
  const purpose = params.purpose as string; // "registration" or "email-verification"

  console.log(purpose, "purpose");

  const [
    activation,
    { isLoading: isActivationLoading, isSuccess: isActivationSuccess, data: activationData },
  ] = useActivationMutation();
  const [resendOtp, { isLoading: isResendLoading }] = useResendOtpMutation();

  const { width } = Dimensions.get("window");
  const isDarkMode = useAppSelector((state) => state.theme.isDarkMode);
  const { setUserCredentials } = useAuth();

  // Ref to prevent multiple submissions
  const hasSubmitted = useRef(false);

  // Modal state for success (only shown when needed)
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // Responsive breakpoints
  const isLargeScreen = width > 768;
  const containerWidth = isLargeScreen ? 500 : "100%";
  const horizontalPadding = isLargeScreen ? 8 : 4;
  const titleSize = isLargeScreen ? "text-4xl" : "text-2xl";
  const descriptionSize = isLargeScreen ? "text-lg" : "text-base";
  const otpTextSize = isLargeScreen ? "text-xl" : "text-lg";

  const [otp, setOtp] = useState(["", "", "", "", ""]);
  const [countdown, setCountdown] = useState(300);
  const [error, setError] = useState("");
  const [isOtpComplete, setIsOtpComplete] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Notification state
  const [notification, setNotification] = useState({
    visible: false,
    type: "info" as "success" | "error" | "info",
    message: "",
  });

  const showNotification = (
    type: "success" | "error" | "info",
    message: string
  ) => {
    setNotification({ visible: true, type, message });
  };

  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, visible: false }));
  };

  // Validate email on component mount
  useEffect(() => {
    if (!email) {
      showNotification("error", "Missing email information");
      router.back();
      return;
    }
  }, [email]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // Auto-submit when OTP is complete
  useEffect(() => {
    const otpString = otp.join("");
    setIsOtpComplete(otpString.length === 5);

    if (otpString.length === 5 && !isActivationLoading && !hasSubmitted.current) {
      handleVerify();
    }
  }, [otp]);

  const handleChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      setError("");

      if (value !== "" && index < 4) {
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
        }, 10);
      }

      if (value === "" && index > 0) {
        setTimeout(() => {
          inputRefs.current[index - 1]?.focus();
        }, 10);
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join("");

    if (otpString.length !== 5) {
      setError("Please enter a valid 5-digit OTP");
      return;
    }

    if (isActivationLoading || hasSubmitted.current) {
      return;
    }

    hasSubmitted.current = true;

    try {
      const payload = {
        otp: otpString,
        email: email,
        purpose: purpose || "registration",
      };

      const result: any = await activation(payload).unwrap();
      setUserCredentials(result);

      console.log(result, "result");

      if (result?.success) {
        // ✅ SPECIAL CASE: delivery partner needs to complete profile
        if (result.message === "Please complete your verification details to start delivering.") {
          // Navigate directly to the delivery partner profile completion screen
          router.replace("/others/otherInfo-screen"); // 👈 adjust route if needed
          return; // Do NOT show the modal
        }

        // For all other successful verifications, show the modal
        setSuccessModalVisible(true);
      } else {
        // In case success is false (unlikely), allow retry
        hasSubmitted.current = false;
      }
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        "Verification failed. Please check the code and try again.";
      setError(errorMessage);
      setOtp(["", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      showNotification("error", errorMessage);
      hasSubmitted.current = false; // Allow retry on error
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResendLoading) return;

    try {
      const result: any = await resendOtp({
        email,
        purpose: purpose || "register",
      }).unwrap();

      setCountdown(300);
      setOtp(["", "", "", "", ""]);
      setError("");
      inputRefs.current[0]?.focus();
      showNotification(
        "success",
        result?.message || "New OTP sent successfully!"
      );
    } catch (err: any) {
      const errorMessage =
        err?.data?.message || "Failed to resend OTP. Please try again.";
      setError(errorMessage);
      showNotification("error", errorMessage);
    }
  };

  const handleModalAction = (action: "dashboard" | "login") => {
    setSuccessModalVisible(false);
    if (action === "dashboard") {
      router.replace("/(tabs)");
    } else {
      router.replace({
        pathname: "/auth/login-with-email",
        params: { email },
      });
    }
  };

  const canVerify = isOtpComplete && !isActivationLoading && !hasSubmitted.current;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        animated={true}
        backgroundColor="transparent"
        translucent
      />

      <CustomNotification
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onHide={hideNotification}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        style={{ zIndex: 1 }}
      >
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
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className={`flex-1 px-${horizontalPadding} mt-3`}>
              {/* Header */}
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row gap-2 items-center py-4"
                disabled={isActivationLoading || isResendLoading}
              >
                <Feather name="arrow-left" size={20} color="black" />
                <Text className="text-black">Back</Text>
              </TouchableOpacity>

              {/* Main content */}
              <View className="mt-4">
                <Text className={`font-semibold ${titleSize} text-gray-800`}>
                  Check Your Inbox
                </Text>
                <Text
                  className={`${descriptionSize} text-gray-600 mt-2 leading-6`}
                >
                  We've sent a 5-digit verification code to your email address (
                  {email}). Enter it below to continue.
                </Text>

                {/* OTP Inputs */}
                <View
                  className={`${isLargeScreen ? "mx-auto w-[400px]" : "px-4"} mt-6`}
                >
                  <View
                    className={`flex-row justify-between ${isLargeScreen ? "gap-4" : ""}`}
                  >
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => (inputRefs.current[index] = ref)}
                        className={`w-12 h-12 md:w-14 md:h-14 border-2 rounded-lg text-center font-semibold ${
                          isDarkMode
                            ? digit
                              ? "border-[#0079ff] text-white bg-[#00264d]"
                              : "border-gray-500 text-white bg-[#00264d]"
                            : digit
                              ? "border-[#0079ff] text-gray-900 bg-white"
                              : "border-gray-300 text-gray-900 bg-white"
                        } ${error ? "border-red-500" : ""} ${otpTextSize}`}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        onChangeText={(value) => handleChange(index, value)}
                        onKeyPress={({ nativeEvent: { key } }) =>
                          handleKeyPress(index, key)
                        }
                        selectTextOnFocus
                        editable={!isActivationLoading}
                        autoFocus={index === 0}
                      />
                    ))}
                  </View>
                </View>

                {error ? (
                  <Text className="text-red-500 text-center text-sm mt-4">
                    {error}
                  </Text>
                ) : (
                  <View className="h-6 mt-4" />
                )}

                <View className="items-center mt-2">
                  <Text
                    className={`text-blue-500 text-sm md:text-base ${
                      countdown > 0 ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {countdown > 0 && `${countdown}s`}
                  </Text>
                </View>

                <TouchableOpacity
                  className={`py-4 rounded-full items-center justify-center mt-4 ${
                    canVerify ? "bg-[#0079ff]" : "bg-gray-400"
                  } ${isActivationLoading ? "opacity-70" : ""}`}
                  onPress={handleVerify}
                  disabled={!canVerify}
                >
                  {isActivationLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text
                      className={`text-white font-semibold ${isLargeScreen ? "text-lg" : "text-base"}`}
                    >
                      Verify
                    </Text>
                  )}
                </TouchableOpacity>

                <View className="flex-row justify-center items-center mt-6">
                  <Text
                    className={
                      isDarkMode
                        ? "text-gray-300 text-base"
                        : `text-gray-600 ${isLargeScreen ? "text-lg" : "text-base"}`
                    }
                  >
                    Didn't receive the code?
                  </Text>
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={countdown > 0 || isResendLoading}
                    className="ml-2"
                  >
                    {isResendLoading ? (
                      <ActivityIndicator color="#0079ff" size="small" />
                    ) : (
                      <Text
                        className={`text-[#0079ff] font-semibold ${isLargeScreen ? "text-lg" : "text-base"} ${
                          countdown > 0 ? "opacity-50" : ""
                        }`}
                      >
                        Resend
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Success Modal - Only shown for normal verifications */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSuccessModalVisible(false)}>
          <View className="flex-1 justify-center items-center bg-black/50">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-3xl p-6 m-4 w-full max-w-sm shadow-xl">
                <View className="items-center mt-2">
                  <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center">
                    <Feather name="check-circle" size={40} color="#1a6cff" />
                  </View>
                </View>
                <Text className="text-xl font-bold text-center mt-4">
                  Verification Successful!
                </Text>
                <Text className="text-gray-600 text-center mt-2 px-2">
                  Your email has been verified. What would you like to do next?
                </Text>
                <View className="mt-6 gap-3">
                  <TouchableOpacity
                    onPress={() => handleModalAction("dashboard")}
                    className="py-4 rounded-xl items-center bg-[#1a6cff] flex-row justify-center"
                  >
                    <Text className="text-white font-semibold text-base ml-2">
                      Go to Dashboard
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleModalAction("login")}
                    className="py-4 rounded-xl items-center border border-gray-200 flex-row justify-center"
                  >
                    <Text className="text-gray-700 font-medium ml-2">
                      Proceed to Login
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