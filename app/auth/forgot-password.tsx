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
} from "react-native";
import { useEffect, useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useForgot_passwordMutation } from "@/redux/features/user/userApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

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

  const getIcon = () => {
    const size = 24;
    const color = 'white';
    switch (type) {
      case 'success': return <MaterialCommunityIcons name="check-circle" size={size} color={color} />;
      case 'error': return <MaterialCommunityIcons name="alert-circle" size={size} color={color} />;
      default: return <Ionicons name="information-circle" size={size} color={color} />;
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
        <View className="mr-3">{getIcon()}</View>
        <Text className="text-white font-medium flex-1 text-base">{message}</Text>
        <TouchableOpacity onPress={hideNotification} className="p-1">
          <Feather name="x" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [forgot_password, { data, isLoading, isSuccess, error }] =
    useForgot_passwordMutation<any>();
  const { width } = Dimensions.get("window");


  // Notification state
  const [notification, setNotification] = useState({
    visible: false,
    type: 'info' as 'success' | 'error' | 'info',
    message: '',
  });



  // Responsive breakpoints
  const isLargeScreen = width > 768;
  const containerWidth = isLargeScreen ? 500 : '100%';
  const horizontalPadding = isLargeScreen ? 8 : 4;
  const titleSize = isLargeScreen ? 'text-4xl' : 'text-2xl';
  const descriptionSize = isLargeScreen ? 'text-lg' : 'text-base';
  const inputPadding = isLargeScreen ? 6 : 4;

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isValidEmail = validateEmail(email);

  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("email");
        if (savedEmail) {
          setEmail(savedEmail);
        }
      } catch (error) {
        console.error("Failed to load email:", error);
      }
    };
    loadSavedEmail();
  }, []);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ visible: true, type, message });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  const handleOnSubmit = async () => {
    if (!email.trim()) {
      showNotification('error', "Enter your email address");
      return;
    }

    if (!isValidEmail) {
      showNotification('error', "Invalid email address");
      return;
    }

    if (isLoading) return;

    try {
      const payload = { email: email.trim().toLowerCase() };
      await forgot_password(payload).unwrap();
    } catch (err) {
      console.error("Password reset failed:", err);
    }
  };

  useEffect(() => {
    if (isSuccess && data) {
      showNotification('success', data?.message || "Reset instructions sent to your email");

      setTimeout(() => {
        router.push({
          pathname: "/auth/reset-password",
          params: {
            email: email,
            target: email,
            method: "email",
          },
        });
      }, 1500);
    }
  }, [isSuccess, data, email]);

  useEffect(() => {
    if (error) {
      const err = error as FetchBaseQueryError;
      const errorMessage =
        (err.data as { message?: string })?.message || "Failed to send reset instructions. Please try again.";
      showNotification('error', errorMessage);
    }
  }, [error]);

  const isButtonDisabled = !isValidEmail || isLoading;

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
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={{ zIndex: 1 }}
      >
        {/* Responsive Container */}
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
          >
            <View className={`flex-1 px-${horizontalPadding} mt-3`}>
              {/* Header */}
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row justify-start gap-2 items-center py-4"
                disabled={isLoading}
              >
                <Feather name="arrow-left" size={20} color="black" />
                <Text className="text-black">Back</Text>
              </TouchableOpacity>

              {/* Main content */}
              <View className="flex-1">
                <Text className={`font-semibold ${titleSize} mt-2 text-gray-800`}>
                  Forgot Your Password?
                </Text>
                <Text className={`${descriptionSize} text-gray-600 mt-2 leading-6 ${
                  isLargeScreen ? 'w-[90%]' : ''
                }`}>
                  Don't worry, it happens to the best of us. Enter the email linked
                  to your account, and we'll send you instructions to reset your
                  password.
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
                  {email && !isValidEmail && (
                    <Text className={`text-red-500 ${isLargeScreen ? 'text-sm' : 'text-xs'} mt-2`}>
                      Please enter a valid email address
                    </Text>
                  )}
                </View>
              </View>

              {/* Continue Button */}
              <View className="mb-6 mt-8">
                <TouchableOpacity
                  className={`p-5 rounded-full items-center justify-center ${
                    isButtonDisabled ? "bg-gray-300" : "bg-[#1a6cff]"
                  }`}
                  onPress={handleOnSubmit}
                  disabled={isButtonDisabled}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className={`${isLargeScreen ? 'text-lg' : 'text-base'} font-medium ${
                      isButtonDisabled ? "text-gray-500" : "text-white"
                    }`}>
                      Send Reset Instructions
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