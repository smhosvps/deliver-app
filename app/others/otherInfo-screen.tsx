// screens/DeliveryPartnerOnboardingScreen.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useGetUserQuery } from "@/redux/api/apiSlice";
import {
  useSubmitForVerificationMutation,
  useUpdateVehicleRegistrationMutation,
} from "@/redux/features/user/userApi";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import { router } from "expo-router";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import SuccessIcon from "../../assets/images/success-icon.png";

// Types
interface NotificationState {
  visible: boolean;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

interface VehicleInfo {
  type: string;
  model: string;
  plateNumber: string;
  color: string;
  year: string;
  image: string | null;
}

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isSmallDevice = SCREEN_WIDTH < 375;
const isTablet = SCREEN_WIDTH >= 768;
const VEHICLE_TYPES = [
  { label: "Select vehicle type", value: "" },
  { label: "Bicycle", value: "bicycle" },
  { label: "Motorcycle", value: "bike" },
  { label: "Car", value: "car" },
  { label: "Van", value: "van" },
] as const;

// ---------- CustomNotification Component ----------
const CustomNotification = React.memo(
  ({
    visible,
    type = "info",
    message = "",
    onHide,
  }: {
    visible: boolean;
    type?: "success" | "error" | "info" | "warning";
    message: string;
    onHide: () => void;
  }) => {
    const translateY = useSharedValue(-100);
    const opacity = useSharedValue(0);
    const { width } = useWindowDimensions();

    useEffect(() => {
      if (visible) {
        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
          mass: 0.8,
        });
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
        case "warning":
          return "bg-yellow-500";
        default:
          return "bg-blue-500";
      }
    };

    const getIcon = () => {
      const size = isSmallDevice ? 20 : 24;
      const color = "white";
      switch (type) {
        case "success":
          return <Feather name="check-circle" size={size} color={color} />;
        case "error":
          return <Feather name="alert-circle" size={size} color={color} />;
        case "warning":
          return <Feather name="alert-triangle" size={size} color={color} />;
        default:
          return <Feather name="info" size={size} color={color} />;
      }
    };

    const hideNotification = useCallback(() => {
      translateY.value = withTiming(-100, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(onHide)();
      });
    }, []);

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
            maxWidth: isTablet ? 400 : width - 40,
            alignSelf: "center",
          },
        ]}
      >
        <View
          className={`${getBackgroundColor()} rounded-2xl px-4 py-3 flex-row items-center shadow-xl`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }}
        >
          <View className="mr-3">{getIcon()}</View>
          <Text className="text-white font-medium flex-1 text-sm md:text-base">
            {message}
          </Text>
          <TouchableOpacity
            onPress={hideNotification}
            className="p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={isSmallDevice ? 16 : 18} color="white" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }
);
CustomNotification.displayName = "CustomNotification";

// ---------- CustomPicker Component ----------
const CustomPicker = React.memo(
  ({
    selectedValue,
    onValueChange,
    items,
    placeholder = "Select",
    error,
    label,
    icon: Icon,
    required = false,
  }: {
    selectedValue: string;
    onValueChange: (value: string) => void;
    items: readonly { label: string; value: string }[];
    placeholder?: string;
    error?: string;
    label?: string;
    icon?: React.ElementType;
    required?: boolean;
  }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const selectedItem = items.find((item) => item.value === selectedValue);

    return (
      <View className="mb-4">
        {label && (
          <View className="flex-row items-center mb-1">
            {Icon && <Icon size={16} color="#6B7280" className="mr-1" />}
            <Text className="text-gray-700 font-medium text-sm md:text-base">
              {label} {required && <Text className="text-red-500">*</Text>}
            </Text>
          </View>
        )}
        <TouchableOpacity
          className={`border ${error ? "border-red-500" : "border-gray-300"} 
            rounded-xl p-3 md:p-4 bg-white flex-row justify-between items-center`}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text
            className={
              selectedValue
                ? "text-gray-900 text-sm md:text-base"
                : "text-gray-400 text-sm md:text-base"
            }
            numberOfLines={1}
          >
            {selectedItem ? selectedItem.label : placeholder}
          </Text>
          <Feather name="chevron-down" size={isSmallDevice ? 18 : 20} color="#9CA3AF" />
        </TouchableOpacity>
        {error && (
          <Animated.View
            entering={FadeInUp}
            className="flex-row items-center mt-1"
          >
            <Feather name="alert-circle" size={12} color="#EF4444" />
            <Text className="text-red-500 text-xs md:text-sm ml-1">
              {error}
            </Text>
          </Animated.View>
        )}

        <Modal visible={modalVisible} transparent animationType="slide">
          <TouchableOpacity
            className="flex-1 bg-black/50"
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View className="flex-1 justify-end">
              <View className="bg-white rounded-t-3xl max-h-[80%] pb-7" >
                <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text className="text-gray-500 text-sm md:text-base">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <Text className="font-semibold text-gray-900 text-sm md:text-base">
                    {label || placeholder}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text className="text-blue-500 font-semibold text-sm md:text-base">
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={items.filter((item) => item.value !== "")}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className={`p-4 border-b border-gray-100 ${selectedValue === item.value ? "bg-blue-50" : ""
                        }`}
                      onPress={() => {
                        onValueChange(item.value);
                        setModalVisible(false);
                      }}
                    >
                      <Text
                        className={`text-sm md:text-base ${selectedValue === item.value
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

// ---------- DocumentUpload Component ----------
const DocumentUpload = React.memo(
  ({
    title,
    onUpload,
    existingImage,
    error,
    required = false,
    icon: Icon = Feather,
  }: {
    title: string;
    onUpload: (image: string) => void;
    existingImage?: string | null;
    error?: string;
    required?: boolean;
    icon?: React.ElementType;
  }) => {
    const [imageUri, setImageUri] = useState(existingImage || null);
    const [isUploading, setIsUploading] = useState(false);

    const pickImage = useCallback(async () => {
      try {
        setIsUploading(true);

        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission needed",
            "Please grant camera roll permissions to upload documents"
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
          base64: true,
          aspect: [4, 3],
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const base64Image = `data:image/jpeg;base64,${asset.base64}`;
          setImageUri(asset.uri);
          onUpload(base64Image);
        }
      } catch (error) {
        console.log("Image picker error:", error);
        Alert.alert("Error", "Failed to pick image. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }, [onUpload]);

    return (
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        className="mb-4"
      >
        <View className="flex-row items-center mb-2">
          <Icon name="upload" size={16} color="#6B7280" className="mr-1" />
          <Text className="text-gray-700 font-medium text-sm md:text-base">
            {title} {required && <Text className="text-red-500">*</Text>}
          </Text>
        </View>

        <TouchableOpacity
          onPress={pickImage}
          disabled={isUploading}
          activeOpacity={0.7}
        >
          <View
            className={`border-2 ${error ? "border-red-500" : "border-gray-300"} 
            border-dashed rounded-xl p-4 items-center justify-center
            ${isUploading ? "opacity-50" : ""}`}
            style={{ minHeight: isSmallDevice ? 120 : 150 }}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : imageUri ? (
              <View className="items-center">
                <Image
                  source={{ uri: imageUri }}
                  className={`${isSmallDevice ? "w-24 h-24" : "w-32 h-32"} rounded-lg`}
                  resizeMode="cover"
                />
                <Text className="text-blue-500 text-xs mt-2">
                  Tap to change
                </Text>
              </View>
            ) : (
              <View className="items-center">
                <Feather name="upload" size={isSmallDevice ? 32 : 40} color="#9CA3AF" />
                <Text className="text-gray-500 text-sm md:text-base mt-2">
                  Tap to upload
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
                  JPG or PNG, max 5MB
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {error && (
          <Animated.View
            entering={FadeInUp}
            className="flex-row items-center mt-1"
          >
            <Feather name="alert-circle" size={12} color="#EF4444" />
            <Text className="text-red-500 text-xs md:text-sm ml-1">
              {error}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    );
  }
);
DocumentUpload.displayName = "DocumentUpload";

// ---------- Main Component ----------
export default function DeliveryPartnerOnboardingScreen() {
  const {
    data: userData,
    isLoading: isLoadingUser,
    refetch,
  }: any = useGetUserQuery();
  const user = userData?.user;

  const [updateVehicleRegistration, { isLoading: isUpdatingVehicle }] =
    useUpdateVehicleRegistrationMutation();
  const [submitForVerification, { isLoading: isSubmitting }] =
    useSubmitForVerificationMutation();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    type: "info",
    message: "",
  });

  // Success modal state
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Vehicle State (only vehicle details)
  const [vehicle, setVehicle] = useState<VehicleInfo>({
    type: "",
    model: "",
    plateNumber: "",
    color: "",
    year: "",
    image: null,
  });

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-navigate countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (successModalVisible && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (successModalVisible && countdown === 0) {
      handleAutoNavigate();
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [successModalVisible, countdown]);

  // Load existing vehicle info from user data
  useEffect(() => {
    if (user?.deliveryPartnerInfo?.vehicle) {
      const info = user.deliveryPartnerInfo.vehicle;
      setVehicle({
        type: info.type || "",
        model: info.model || "",
        plateNumber: info.plateNumber || "",
        color: info.color || "",
        year: info.year ? info.year.toString() : "",
        image: info.image || null,
      });
      // If vehicle type and image already exist, move to step 2 (review)
      if (info.type && info.image) {
        setStep(2);
      }
    }
  }, [user]);

  const showNotification = useCallback(
    (type: NotificationState["type"], message: string) => {
      setNotification({ visible: true, type, message });
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, visible: false }));
  }, []);

  const validateVehicle = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!vehicle.type) newErrors.vehicleType = "Vehicle type is required";
    if (!vehicle.image) newErrors.vehicleImage = "Vehicle image is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [vehicle.type, vehicle.image]);

  const handleSubmitVehicle = useCallback(async () => {
    if (!validateVehicle()) {
      showNotification("error", "Please fill all required fields");
      return;
    }

    try {
      const payload: any = {
        type: vehicle.type,
        model: vehicle.model || undefined,
        plateNumber: vehicle.plateNumber || undefined,
        color: vehicle.color || undefined,
        year: vehicle.year ? parseInt(vehicle.year) : undefined,
        image: vehicle.image,
      };

      await updateVehicleRegistration(payload).unwrap();

      showNotification("success", "Vehicle information saved successfully");
      setStep(2);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error: any) {
      showNotification(
        "error",
        error?.data?.message || "Failed to save vehicle information"
      );
    }
  }, [vehicle, validateVehicle, updateVehicleRegistration, showNotification]);

  const handleSubmitVerification = useCallback(async () => {
    try {
      const result = await submitForVerification().unwrap();
      if (result.message === "Application submitted for verification successfully") {
        // Show success modal instead of immediate navigation
        setSuccessModalVisible(true);
        setCountdown(3);
        await refetch(); // Refresh user data
      } else {
        showNotification("error", result.message || "Submission failed");
      }
    } catch (error: any) {
      showNotification(
        "error",
        error?.data?.message || "Failed to submit application"
      );
    }
  }, [submitForVerification, refetch, showNotification]);

  const handleSuccessModalClose = useCallback(() => {
    setSuccessModalVisible(false);
    router.replace("/(tabs)");
  }, []);

  const handleAutoNavigate = useCallback(() => {
    setSuccessModalVisible(false);
    router.replace("/(tabs)");
  }, []);

  if (isLoadingUser) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4 text-sm md:text-base">
          Loading your information...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <CustomNotification
        visible={notification.visible}
        type={notification.type}
        message={notification.message}
        onHide={hideNotification}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        {/* Header */}
        <View className="px-4 flex-row justify-between items-center py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row gap-2 items-center"
          >
            <Feather name="arrow-left" size={20} color="black" />
            <Text className="text-black">Back</Text>
          </TouchableOpacity>
          <View />
        </View>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            className={`p-4 md:p-6 ${isTablet ? "max-w-2xl self-center w-full" : ""}`}
          >
            {/* Step 1: Vehicle Information */}
            {step === 1 && (
              <Animated.View entering={SlideInRight} exiting={SlideOutLeft}>
                <View className="mb-6">
                  <Text className="text-2xl md:text-3xl font-bold text-gray-900">
                    Add Your Vehicle Details
                  </Text>
                  <Text className="text-gray-600 mt-2 text-sm md:text-base">
                    Help us know what you ride so we can send you the right kind of deliveries.
                  </Text>
                </View>

                <CustomPicker
                  label="Vehicle Type"
                  selectedValue={vehicle.type}
                  onValueChange={(value) =>
                    setVehicle({ ...vehicle, type: value })
                  }
                  items={VEHICLE_TYPES}
                  error={errors.vehicleType}
                  icon={MaterialCommunityIcons}
                  required
                />

                <View className="mb-4">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-gray-700 font-medium text-sm md:text-base">
                      Model (Optional)
                    </Text>
                  </View>
                  <TextInput
                    className="border border-gray-300 rounded-xl p-3 md:p-4 text-sm md:text-base"
                    value={vehicle.model}
                    onChangeText={(value) =>
                      setVehicle({ ...vehicle, model: value })
                    }
                    placeholder="e.g., Honda CB150"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View className="mb-4">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-gray-700 font-medium text-sm md:text-base">
                      Plate Number (Optional)
                    </Text>
                  </View>
                  <TextInput
                    className="border border-gray-300 rounded-xl p-3 md:p-4 text-sm md:text-base"
                    value={vehicle.plateNumber}
                    onChangeText={(value) =>
                      setVehicle({ ...vehicle, plateNumber: value })
                    }
                    placeholder="ABC-1234"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                  />
                </View>

                <View className="flex-row gap-x-4">
                  <View className="flex-1 mb-4">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-gray-700 font-medium text-sm md:text-base">
                        Color (Optional)
                      </Text>
                    </View>
                    <TextInput
                      className="border border-gray-300 rounded-xl p-3 md:p-4 text-sm md:text-base"
                      value={vehicle.color}
                      onChangeText={(value) =>
                        setVehicle({ ...vehicle, color: value })
                      }
                      placeholder="Red"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View className="flex-1 mb-4">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-gray-700 font-medium text-sm md:text-base">
                        Year (Optional)
                      </Text>
                    </View>
                    <TextInput
                      className="border border-gray-300 rounded-xl p-3 md:p-4 text-sm md:text-base"
                      value={vehicle.year}
                      onChangeText={(value) =>
                        setVehicle({ ...vehicle, year: value })
                      }
                      placeholder="2023"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                </View>

                <DocumentUpload
                  title="Vehicle Image"
                  onUpload={(image) => setVehicle({ ...vehicle, image })}
                  existingImage={vehicle.image}
                  error={errors.vehicleImage}
                  required
                  icon={Feather}
                />

                <TouchableOpacity
                  className="bg-[#1969fe] py-4 rounded-full items-center mt-6 shadow-lg shadow-blue-500/30"
                  onPress={handleSubmitVehicle}
                  disabled={isUpdatingVehicle}
                  activeOpacity={0.7}
                >
                  {isUpdatingVehicle ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator color="white" size="small" />
                      <Text className="text-white font-bold text-lg ml-2">
                        Saving...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white font-bold text-lg">
                      Save & Continue
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Step 2: Review & Submit */}
            {step === 2 && (
              <Animated.View entering={SlideInRight} exiting={SlideOutLeft}>
                <View className="mb-6">
                  <Text className="text-2xl md:text-3xl font-bold text-gray-900">
                    Review & Submit
                  </Text>
                  <Text className="text-gray-600 mt-2 text-sm md:text-base">
                    Please review your vehicle information before submitting
                  </Text>
                </View>

                <View className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
                  <Text className="text-lg font-semibold text-gray-800 mb-3"> 
                    Vehicle Information
                  </Text>
                  <View className="gap-2">
                    <View className="flex-row">
                      <Text className="text-gray-500 w-24">Type:</Text>
                      <Text className="text-gray-900 flex-1 capitalize">
                        {vehicle.type}
                      </Text>
                    </View>
                    {vehicle.model && (
                      <View className="flex-row">
                        <Text className="text-gray-500 w-24">Model:</Text>
                        <Text className="text-gray-900 flex-1">
                          {vehicle.model}
                        </Text>
                      </View>
                    )}
                    {vehicle.plateNumber && (
                      <View className="flex-row">
                        <Text className="text-gray-500 w-24">Plate:</Text>
                        <Text className="text-gray-900 flex-1">
                          {vehicle.plateNumber}
                        </Text>
                      </View>
                    )}
                    {vehicle.color && (
                      <View className="flex-row">
                        <Text className="text-gray-500 w-24">Color:</Text>
                        <Text className="text-gray-900 flex-1">
                          {vehicle.color}
                        </Text>
                      </View>
                    )}
                    {vehicle.year && (
                      <View className="flex-row">
                        <Text className="text-gray-500 w-24">Year:</Text>
                        <Text className="text-gray-900 flex-1">
                          {vehicle.year}
                        </Text>
                      </View>
                    )}
                    {vehicle.image && (
                      <View className="mt-2">
                        <Text className="text-gray-500 mb-2">Vehicle Image:</Text>
                        <Image
                          source={{ uri: vehicle.image }}
                          className="w-64 h-64 rounded-lg"
                          resizeMode="cover"
                        />
                      </View>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  className="bg-[#1969fe] py-4 rounded-full items-center shadow-blue-500/30"
                  onPress={handleSubmitVerification}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  {isSubmitting ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator color="white" size="small" />
                      <Text className="text-white font-bold text-lg ml-2">
                        Submitting...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white font-bold text-lg">
                      Submit for Verification
                    </Text>
                  )}
                </TouchableOpacity>

                <Text className="text-gray-500 text-xs text-center mt-4">
                  By submitting, you confirm that all information provided is accurate
                </Text>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal with Auto-navigation */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={handleSuccessModalClose}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 w-4/5 max-w-sm">
            <TouchableOpacity
              className="items-end"
              onPress={handleSuccessModalClose}
            >
              <Ionicons name="close" size={24} color="gray" />
            </TouchableOpacity>
            <View className="items-center mb-4">
              <View className="items-center justify-center mb-3">
                <Image
                  source={SuccessIcon}
                  className="w-16 h-16"
                  resizeMode="contain"
                />
              </View>
              <Text className="text-xl font-bold text-black text-center">
                We're Reviewing Your Details
              </Text>
            </View>
            <View className="bg-gray-50 p-4 rounded-lg mb-4">
              <Text className="text-center text-gray-600">
                Thanks for submitting your documents. Our team is reviewing your account. You'll be notified once you're activated.
              </Text>
            </View>
            <View className="bg-yellow-50 p-3 rounded-lg mb-4">
              <Text className="text-center text-yellow-600 text-sm">
                This usually takes a short while. You can close the app – we'll alert you when you're ready to start earning.
              </Text>
            </View>
            <View className="bg-gray-100 p-2 rounded-lg mb-3">
              <Text className="text-center text-gray-600 text-sm">
                Redirecting in {countdown} seconds...
              </Text>
            </View>
            <TouchableOpacity
              className="bg-blue-500 py-3 rounded-full items-center"
              onPress={handleSuccessModalClose}
            >
              <Text className="text-white font-semibold">Continue to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}