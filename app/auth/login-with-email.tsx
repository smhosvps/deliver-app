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
} from "react-native";
import { useEffect, useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { router, useLocalSearchParams } from "expo-router";
import { useLoginuserMutation } from "@/redux/api/apiSlice";
import { useAuth } from "../../context/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";

// Custom Notification Component 
const CustomNotification = ({ 
  visible, 
  type, 
  message, 
  onHide 
}: { 
  visible: boolean; 
  type: 'success' | 'error' | 'info'; 
  message: string; 
  onHide: () => void;
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideNotification();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'info':
        return 'info';
      default:
        return 'bell';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        opacity: fadeAnim,
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 16,
        right: 16,
        zIndex: 1000,
      }}
    >
      <View className={`${getBackgroundColor()} rounded-xl shadow-lg p-4 flex-row items-center`}>
        <Feather name={getIcon()} size={24} color="white" />
        <Text className="text-white font-medium flex-1 ml-3">{message}</Text>
        <TouchableOpacity onPress={hideNotification} className="p-1">
          <Feather name="x" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default function LoginWithEmailScreen() {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState((params.email as string) || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState({
    visible: false,
    type: 'info' as 'success' | 'error' | 'info',
    message: '',
  });

  const [loginuser, { isLoading }] = useLoginuserMutation();
  const { width } = Dimensions.get("window");
  const { setUserCredentials } = useAuth();

  // Responsive breakpoints
  const isLargeScreen = width > 768;
  const containerWidth = isLargeScreen ? 500 : '100%';
  const horizontalPadding = isLargeScreen ? 8 : 4;
  const titleSize = isLargeScreen ? 'text-4xl' : 'text-2xl';
  const descriptionSize = isLargeScreen ? 'text-lg' : 'text-base';
  const inputPadding = isLargeScreen ? 6 : 4;

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({
      visible: true,
      type,
      message,
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => password.length >= 6;

  const isFormValid = validateEmail(email) && validatePassword(password);

  const handleLogin = async () => {
    if (!validatePassword(password)) {
      showNotification("error", "Password must be at least 6 characters");
      return;
    }

    if (!validateEmail(email)) {
      showNotification("error", "Please enter a valid email address");
      return;
    }

    try {
      const credentials: any = {
        email: email.trim().toLowerCase(),
        password,
      };

      const userData: any = await loginuser(credentials).unwrap();
      console.log(userData, "user data");

      // Save credentials if "Remember Me" is checked
      if (rememberMe) {
        await AsyncStorage.multiSet([
          ["email", email],
          ["password", password],
          ["loginMethod", "email"],
        ]);
      } else {
        await clearSavedCredentials();
      }

      // Store user credentials in auth context
      setUserCredentials(userData);

      // Determine navigation based on the message
      const message = userData?.message || "";
      if (message === "Please complete your verification details to start delivering.") {
        // Navigate to the delivery partner profile completion screen
        router.replace("/others/otherInfo-screen"); // <-- adjust route as needed
      } else {
        // Normal user -> main tabs
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("Login failed:", err);
      const errorMessage = getErrorMessage(err);

      if (
        errorMessage.includes("Account not verified") ||
        errorMessage.includes("not verified")
      ) {
        showNotification("error", "Please verify your account to continue");
        setTimeout(() => {
          router.push({
            pathname: `/auth/verify-otp`,
            params: {
              email: email,
              method: "email",
            },
          });
        }, 1500);
      } else {
        showNotification("error", errorMessage);
      }
    }
  };

  const getErrorMessage = (error: unknown): string => {
    if (typeof error === "object" && error !== null && "data" in error) {
      const fetchError = error as FetchBaseQueryError;
      return (
        (fetchError.data as { message?: string })?.message || "Login failed"
      );
    }
    return "Login failed. Please try again.";
  };

  const clearSavedCredentials = async () => {
    try {
      await AsyncStorage.multiRemove(["email", "password", "loginMethod"]);
    } catch (error) {
      console.error("Failed to clear credentials:", error);
    }
  };

  const toggleRememberMe = () => {
    setRememberMe(!rememberMe);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const [savedEmail, savedPassword] = await Promise.all([
          AsyncStorage.getItem("email"),
          AsyncStorage.getItem("password"),
        ]);

        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch (error) {
        console.error("Failed to load credentials:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadSavedCredentials();
  }, []);

  if (!isInitialized) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#1a6cff" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <CustomNotification
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onHide={hideNotification}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={{ zIndex: 1 }}
      >
        <View 
          className="flex-1 md:mt-52"
          style={isLargeScreen ? { 
            width: containerWidth, 
            alignSelf: 'center',
            maxWidth: '100%'
          } : {}}
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
                disabled={isLoading}
              >
                <Feather name="arrow-left" size={20} color="black" />
                <Text className="text-black">Back</Text>
              </TouchableOpacity>

              {/* Main content */}
              <View className="flex-1">
                <Text className={`font-semibold ${titleSize} mt-2 text-gray-800`}>
                  Welcome Back
                </Text>
                <Text className={`${descriptionSize} text-gray-600 mt-2 leading-6`}>
                  Enter your password to continue your deliveries. It's great to
                  have you back!
                </Text>

                {/* Email Input */}
                <View className="mt-8">
                  <Text className={`${isLargeScreen ? 'text-base' : 'text-sm'} font-medium text-gray-600 mb-2`}>
                    Email Address
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    className={`border border-gray-200 bg-white/90 backdrop-blur-sm rounded-xl px-${inputPadding} py-${inputPadding} text-base text-gray-800`}
                    placeholder="Enter your email address"
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!isLoading}
                  />
                </View>

                {/* Password Input */}
                <View className="mt-6">
                  <Text className={`${isLargeScreen ? 'text-base' : 'text-sm'} font-medium text-gray-600 mb-2`}>
                    Password
                  </Text>
                  <View className="flex-row items-center border border-gray-200 bg-white/90 backdrop-blur-sm rounded-xl">
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      className={`flex-1 px-${inputPadding} py-${inputPadding} text-base text-gray-800`}
                      placeholder="●●●●●●●●"
                      placeholderTextColor="#6B7280"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="password"
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={togglePasswordVisibility}
                      className={`px-${inputPadding}`}
                      disabled={isLoading}
                    >
                      <Feather
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Remember Me & Forgot Password */}
                <View className="flex-row justify-between items-center mt-6">
                  <TouchableOpacity
                    onPress={toggleRememberMe}
                    className="flex-row items-center"
                    disabled={isLoading}
                  >
                    <View
                      className={`w-5 h-5 border border-gray-400 rounded-md mr-2 items-center justify-center ${
                        rememberMe ? "bg-[#1a6cff] border-[#1a6cff]" : "bg-white"
                      }`}
                    >
                      {rememberMe && (
                        <Feather name="check" size={14} color="white" />
                      )}
                    </View>
                    <Text className={`text-gray-800 ${isLargeScreen ? 'text-base' : 'text-sm'}`}>
                      Remember Me
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push("/auth/forgot-password")}
                    disabled={isLoading}
                  >
                    <Text className={`text-[#1a6cff] font-medium ${isLargeScreen ? 'text-base' : 'text-sm'}`}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Continue Button */}
              <View className="mb-6 mt-8">
                <TouchableOpacity
                  className={`p-5 rounded-full items-center justify-center ${
                    isFormValid && !isLoading ? "bg-[#1a6cff]" : "bg-gray-300"
                  }`}
                  onPress={handleLogin}
                  disabled={!isFormValid || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      className={`${isLargeScreen ? 'text-lg' : 'text-base'} font-medium ${
                        isFormValid && !isLoading ? "text-white" : "text-gray-500"
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
    </SafeAreaView>
  );
}