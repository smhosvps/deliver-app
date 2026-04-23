import { useEffect, useState } from "react";
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
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useCheckUserExitMutation } from "@/redux/features/user/userApi";

export default function EmailEntryScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [checkUserExit, { isLoading, reset }] = useCheckUserExitMutation<any>();
  const { width } = Dimensions.get("window");

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"exists" | "notfound" | "notRider" | null>(
    null
  );
  const [modalData, setModalData] = useState<any>(null);

  // Responsive breakpoints
  const isLargeScreen = width > 768;
  const containerWidth = isLargeScreen ? 500 : "100%";
  const titleSize = isLargeScreen ? "text-4xl" : "text-2xl";
  const descriptionSize = isLargeScreen ? "text-lg" : "text-base";
  const inputPadding = isLargeScreen ? 6 : 4;

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidEmail = validateEmail(email);


  const handleOnSubmit = async () => {
    if (!email.trim()) {
      Toast.show({ type: "error", text1: "Enter your email address" });
      return;
    }
    if (!isValidEmail) {
      Toast.show({ type: "error", text1: "Invalid email address" });
      return;
    }
    if (isLoading) return;

    try {
      const payload = { email: email.trim().toLowerCase() };
      const result: any = await checkUserExit(payload).unwrap();
      console.log("API Response:", result);

      if (result?.data?.exists && result?.data?.user) {
        // User exists
        setModalType("exists");
        setModalData(result.data);
        setModalVisible(true);
      }
    } catch (err: any) {
      console.log("Error caught:", err);
      if (err?.status === 404) {
        // User not found
        setModalType("notfound");
        setModalData(null);
        setModalVisible(true);
      } else if (err?.status === 403) {
        // Not a rider account
        setModalType("notRider");
        setModalData({ message: err?.data?.message || "This account is not a rider account. Please use the customer app." });
        setModalVisible(true);
      } else {
        const errorMessage = err?.data?.message || "An error occurred";
        Toast.show({ type: "error", text1: errorMessage });
      }
    }
  };

  const handleProceed = () => {
    setModalVisible(false);
    if (modalType === "exists" && modalData?.user) {
      if (modalData.user.isVerified) {
        router.push({
          pathname: "/auth/login-with-email",
          params: { email, target: email, method: "email" },
        });
      } else {
        router.push({
          pathname: "/auth/verify-otp",
          params: {
            email,
            userId: modalData.user._id,
            purpose: "email-verification",
          },
        });
      }
    } else if (modalType === "notfound") {
      router.push({
        pathname: "/auth/register-account",
        params: { email, method: "email" },
      });
    }
    // For notRider, just close the modal – user can press "OK"
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  // Reset mutation state when email changes
  useEffect(() => {
    if (email) reset();
  }, [email, reset]);

  const isButtonDisabled = !isValidEmail || isLoading;

  const getIconColor = () => {
    if (modalType === "exists") {
      return modalData?.user?.isVerified ? "#1969fe" : "#1969fe";
    }
    if (modalType === "notRider") {
      return "#EF4444";
    }
    return "#1969fe";
  };

  const getIconBgColor = () => {
    if (modalType === "exists") {
      return modalData?.user?.isVerified ? "bg-blue-100" : "bg-blue-100";
    }
    if (modalType === "notRider") {
      return "bg-red-100";
    }
    return "bg-blue-100";
  };

  const getIconName = () => {
    if (modalType === "exists") {
      return modalData?.user?.isVerified ? "check-circle" : "log-in";
    }
    if (modalType === "notfound") {
      return "user-plus";
    }
    return "alert-circle"; // For notRider
  };

  const getTitle = () => {
    if (modalType === "exists") return "Welcome Back!";
    if (modalType === "notfound") return "New Here?";
    return "Access Denied";
  };

  const getMessage = () => {
    if (modalType === "exists") {
      return modalData?.user?.isVerified
        ? "An account with this email already exists. Please log in to continue."
        : "Your email is not verified yet. Please verify to continue.";
    }
    if (modalType === "notfound") {
      return "We couldn't find an account with this email. Would you like to create a new account?";
    }
    return modalData?.message || "This account is not a rider account. Please use the customer app.";
  };

  const getButtonText = () => {
    if (modalType === "exists") {
      return modalData?.user?.isVerified ? "Proceed to Login" : "Verify Email";
    }
    if (modalType === "notfound") {
      return "Create Account";
    }
    return "OK";
  };

  const showCancelButton = modalType !== "notRider";

  return (
    <SafeAreaView className="flex-1 bg-white">
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
          >
            <View className={`flex-1 px-4 md:px-8`}>
              <TouchableOpacity
                onPress={() => router.back()}
                className={`flex-row items-center py-4 ${isLargeScreen ? "mt-6" : ""}`}
                disabled={isLoading}
              >
                <Feather name="arrow-left" size={20} color="#000" />
                <Text className="ml-2 text-base text-black">Back</Text>
              </TouchableOpacity>

              <View className="mt-4">
                <Text className={`${titleSize} font-bold text-black`}>
                  Let's start with your email
                </Text>
                <Text
                  className={`mt-2 ${descriptionSize} text-gray-500 leading-6`}
                >
                  Enter your email address we'll check if you already have an
                  account. If not, we'll create one for you.
                </Text>
              </View>

              <View className="mt-8">
                <Text
                  className={`${isLargeScreen ? "text-base" : "text-sm"} font-medium text-black mb-2`}
                >
                  Email Address
                </Text>
                <View className="border border-gray-200 rounded-xl bg-white">
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter Email Address"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className={`px-${inputPadding} py-${inputPadding} text-base text-black`}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View className="flex-1" />

              <View className="pb-8">
                <TouchableOpacity
                  onPress={handleOnSubmit}
                  disabled={isButtonDisabled}
                  className={`w-full py-${isLargeScreen ? 6 : 4} rounded-full items-center justify-center ${isButtonDisabled ? "bg-gray-100" : "bg-[#1a6cff]"
                    }`}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      className={`${isLargeScreen ? "text-lg" : "text-base"} font-semibold ${isButtonDisabled ? "text-gray-400" : "text-white"
                        }`}
                    >
                      Continue
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseModal}>
          <View className="flex-1 justify-center items-center bg-black/50">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-3xl p-6 m-4 w-full max-w-sm shadow-xl">
                <View className="items-center mt-2">
                  <View
                    className={`w-16 h-16 rounded-full items-center justify-center ${getIconBgColor()}`}
                  >
                    <Feather
                      name={getIconName()}
                      size={32}
                      color={getIconColor()}
                    />
                  </View>
                </View>

                <Text className="text-xl font-bold text-center mt-4">
                  {getTitle()}
                </Text>

                <Text className="text-gray-600 text-center mt-2 px-2">
                  {getMessage()}
                </Text>

                <View className="mt-6 gap-3">
                  <TouchableOpacity
                    onPress={handleProceed}
                    className={`py-4 rounded-full items-center ${modalType === "notRider" ? "bg-red-500" : "bg-[#1969fe]"
                      }`}
                  >
                    <Text className="text-white font-semibold text-base">
                      {getButtonText()}
                    </Text>
                  </TouchableOpacity>

                  {showCancelButton && (
                    <TouchableOpacity
                      onPress={handleCloseModal}
                      className="py-3 rounded-full items-center border border-gray-200"
                    >
                      <Text className="text-gray-700 font-medium">
                        Maybe Later
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
}