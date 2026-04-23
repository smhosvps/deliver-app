// screens/DeliveryPartnerOnboardingScreen.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { useGetUserQuery } from "@/redux/api/apiSlice";
import {
  useSubmitForVerificationMutation,
  useUpdateLicenseMutation,
  useUpdateNinMutation,
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
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

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

interface LicenseInfo {
  number: string;
  expiryDate: string;
  image: string | null;
}

interface NinInfo {
  number: string;
  house_address: string;
  image: string | null;
}

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isSmallDevice = SCREEN_WIDTH < 375;
const isTablet = SCREEN_WIDTH >= 768;

const VEHICLE_TYPES = [
  { label: "Select vehicle type", value: "" },
  { label: "Bicycle", value: "bicycle" },
  { label: "Motorcycle", value: "motorcycle" },
  { label: "Scooter", value: "scooter" },
  { label: "Car", value: "car" },
  { label: "Van", value: "van" },
  { label: "Truck", value: "truck" },
] as const;

// Custom Notification Component
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

// Custom Picker Component
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
              <View className="bg-white rounded-t-3xl max-h-[80%]">
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
                      className={`p-4 border-b border-gray-100 ${
                        selectedValue === item.value ? "bg-blue-50" : ""
                      }`}
                      onPress={() => {
                        onValueChange(item.value);
                        setModalVisible(false);
                      }}
                    >
                      <Text
                        className={`text-sm md:text-base ${
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

// Document Upload Component
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

// Progress Step Component
const ProgressStep = ({
  step,
  currentStep,
  label,
}: {
  step: number;
  currentStep: number;
  label: string;
}) => {
  const isCompleted = step < currentStep;
  const isCurrent = step === currentStep;

  return (
    <View className="items-center flex-1">
      <View
        className={`w-8 h-8 md:w-10 md:h-10 rounded-full items-center justify-center ${
          isCompleted || isCurrent ? "bg-blue-500" : "bg-gray-300"
        }`}
      >
        <Text className="text-white font-bold text-xs md:text-sm">
          {isCompleted ? "✓" : step}
        </Text>
      </View>
      <Text
        className={`text-xs mt-1 ${isCurrent ? "text-blue-500 font-semibold" : "text-gray-500"}`}
      >
        {label}
      </Text>
    </View>
  );
};

export default function DeliveryPartnerOnboardingScreen() {
  const {
    data: userData,
    isLoading: isLoadingUser,
    refetch,
  }: any = useGetUserQuery();
  const user = userData?.user;

  const [updateVehicleRegistration, { isLoading: isUpdatingVehicle }] =
    useUpdateVehicleRegistrationMutation();
  const [updateLicense, { isLoading: isUpdatingLicense }] =
    useUpdateLicenseMutation();
  const [updateNin, { isLoading: isUpdatingNin }] = useUpdateNinMutation();
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

  // Vehicle State
  const [vehicle, setVehicle] = useState<VehicleInfo>({
    type: "",
    model: "",
    plateNumber: "",
    color: "",
    year: "",
    image: null,
  });

  // License State
  const [license, setLicense] = useState<LicenseInfo>({
    number: "",
    expiryDate: "",
    image: null,
  });

  // NIN State
  const [nin, setNin] = useState<NinInfo>({
    number: "",
    house_address: "",
    image: null,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user?.deliveryPartnerInfo) {
      const info = user.deliveryPartnerInfo;

      if (info.vehicle) {
        setVehicle({
          type: info.vehicle.type || "",
          model: info.vehicle.model || "",
          plateNumber: info.vehicle.plateNumber || "",
          color: info.vehicle.color || "",
          year: info.vehicle.year ? info.vehicle.year.toString() : "",
          image: info.vehicle.image || null,
        });
      }

      if (info.documents?.license) {
        setLicense({
          number: info.documents.license.number || "",
          expiryDate: info.documents.license.expiryDate || "",
          image: info.documents.license.image || null,
        });
      }

      if (info.documents?.nin) {
        setNin({
          number: info.documents.nin.number || "",
          house_address: info.documents.nin.house_address || "",
          image: info.documents.nin.image || null,
        });
      }

      // Set step based on completion status
      if (info.verificationStatus === "pending") {
        setStep(4);
      } else if (info.documents?.nin?.number) {
        setStep(4);
      } else if (info.documents?.license?.number) {
        setStep(3);
      } else if (info.vehicle?.type) {
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

  const validateLicense = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!license.number) newErrors.licenseNumber = "License number is required";
    if (!license.expiryDate)
      newErrors.licenseExpiry = "Expiry date is required";
    if (!license.image) newErrors.licenseImage = "License image is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [license.number, license.expiryDate, license.image]);

  const validateNin = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!nin.number) newErrors.ninNumber = "NIN is required";
    if (nin.number && !/^\d{11}$/.test(nin.number)) {
      newErrors.ninNumber = "NIN must be 11 digits";
    }
    if (!nin.house_address) newErrors.ninAddress = "House address is required";
    if (!nin.image) newErrors.ninImage = "NIN image is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [nin.number, nin.house_address, nin.image]);

  const handleSubmitVehicle = useCallback(async () => {
    if (!validateVehicle()) {
      showNotification("error", "Please fill all required fields");
      return;
    }

    try {
      await updateVehicleRegistration({
        type: vehicle.type,
        model: vehicle.model || undefined,
        plateNumber: vehicle.plateNumber || undefined,
        color: vehicle.color || undefined,
        year: vehicle.year ? parseInt(vehicle.year) : undefined,
        image: vehicle.image,
      }).unwrap();

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

  const handleSubmitLicense = useCallback(async () => {
    if (!validateLicense()) {
      showNotification("error", "Please fill all required fields");
      return;
    }

    try {
      await updateLicense({
        number: license.number,
        expiryDate: license.expiryDate,
        image: license.image,
      }).unwrap();

      showNotification("success", "License information saved successfully");
      setStep(3);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error: any) {
      showNotification(
        "error",
        error?.data?.message || "Failed to save license information"
      );
    }
  }, [license, validateLicense, updateLicense, showNotification]);

  const handleSubmitNin = useCallback(async () => {
    if (!validateNin()) {
      showNotification("error", "Please fill all required fields");
      return;
    }

    try {
      await updateNin({
        number: nin.number,
        house_address: nin.house_address,
        image: nin.image,
      }).unwrap();

      showNotification("success", "NIN information saved successfully");
      setStep(4);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error: any) {
      showNotification(
        "error",
        error?.data?.message || "Failed to save NIN information"
      );
    }
  }, [nin, validateNin, updateNin, showNotification]);

  const handleSubmitVerification = useCallback(async () => {
    try {
      const summit: any = await submitForVerification().unwrap();
      // login check
      if (summit.message === "Application submitted for verification successfully") {
        router.replace("/(tabs)");
      }
      showNotification("success", "Application submitted for verification!");
      await refetch();
    } catch (error: any) {
      showNotification(
        "error",
        error?.data?.message || "Failed to submit application"
      );
    }
  }, [submitForVerification, refetch, showNotification]);

  const handlePrevious = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [step]);

  const handleNext = useCallback(() => {
    if (step < 4) {
      setStep(step + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [step]);

  const isStepComplete = useMemo(() => {
    switch (step) {
      case 1:
        return vehicle.type && vehicle.image;
      case 2:
        return license.number && license.expiryDate && license.image;
      case 3:
        return nin.number && nin.house_address && nin.image;
      default:
        return true;
    }
  }, [step, vehicle, license, nin]);

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
        ></View>
        <View
          className="absolute bottom-40 left-32"
          style={[
            { opacity: mounted ? 0.15 : 0 },
            { transform: [{ translateY: mounted ? 0 : 10 }] },
          ]}
        ></View>
        <View
          className="absolute bottom-52 right-32"
          style={[
            { opacity: mounted ? 0.15 : 0 },
            { transform: [{ translateY: mounted ? 0 : 10 }] },
          ]}
        ></View>

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
        <View className="flex-row justify-between items-center px-4 py-3">
          <TouchableOpacity
            onPress={handlePrevious}
            onPressIn={() => router.canGoBack()}
            className={`flex-row items-center px-4 py-2 rounded-full ${
              step > 1 ? "bg-gray-500" : "bg-gray-300"
            }`}
            disabled={step === 1}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={16} color="white" />
            <Text className="text-white font-semibold ml-1 text-sm md:text-base">
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            className={`flex-row items-center px-4 py-2 rounded-full ${
              step < 4 && isStepComplete ? "bg-blue-500" : "bg-gray-300"
            }`}
            disabled={step === 4 || !isStepComplete}
            activeOpacity={0.7}
          >
            <Text className="text-white font-semibold mr-1 text-sm md:text-base">
              Next
            </Text>
            <Feather name="chevron-right" size={16} color="white" />
          </TouchableOpacity>
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
            {/* Progress Indicator */}
            <View className="flex-row justify-between mb-8 px-2">
              <ProgressStep step={1} currentStep={step} label="Vehicle" />
              <ProgressStep step={2} currentStep={step} label="License" />
              <ProgressStep step={3} currentStep={step} label="NIN" />
              <ProgressStep step={4} currentStep={step} label="Review" />
            </View>

            {/* Step 1: Vehicle Information */}
            {step === 1 && (
              <Animated.View entering={SlideInRight} exiting={SlideOutLeft}>
                <View className="mb-6">
                  <Text className="text-2xl md:text-3xl font-bold text-gray-900">
                    Vehicle Information
                  </Text>
                  <Text className="text-gray-600 mt-2 text-sm md:text-base">
                    Please provide your vehicle details for delivery operations
                  </Text>
                </View>

                <DocumentUpload
                  title="Vehicle Image"
                  onUpload={(image) => setVehicle({ ...vehicle, image })}
                  existingImage={vehicle.image}
                  error={errors.vehicleImage}
                  required
                  icon={Feather}
                />

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

                <View className="flex-row space-x-4">
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

            {/* Step 2: License Information */}
            {step === 2 && (
              <Animated.View entering={SlideInRight} exiting={SlideOutLeft}>
                <View className="mb-6">
                  <Text className="text-2xl md:text-3xl font-bold text-gray-900">
                    Driver's License
                  </Text>
                  <Text className="text-gray-600 mt-2 text-sm md:text-base">
                    Upload your valid driver's license
                  </Text>
                </View>

                <DocumentUpload
                  title="License Image"
                  onUpload={(image) => setLicense({ ...license, image })}
                  existingImage={license.image}
                  error={errors.licenseImage}
                  required
                  icon={Feather}
                />

                <View className="mb-4">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-gray-700 font-medium text-sm md:text-base">
                      License Number <Text className="text-red-500">*</Text>
                    </Text>
                  </View>
                  <TextInput
                    className={`border ${errors.licenseNumber ? "border-red-500" : "border-gray-300"} 
                      rounded-xl p-3 md:p-4 text-sm md:text-base`}
                    value={license.number}
                    onChangeText={(value) =>
                      setLicense({ ...license, number: value })
                    }
                    placeholder="Enter license number"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                  />
                  {errors.licenseNumber && (
                    <Text className="text-red-500 text-xs md:text-sm mt-1">
                      {errors.licenseNumber}
                    </Text>
                  )}
                </View>

                <View className="mb-4">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-gray-700 font-medium text-sm md:text-base">
                      Expiry Date <Text className="text-red-500">*</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className={`border ${errors.licenseExpiry ? "border-red-500" : "border-gray-300"} 
                      rounded-xl p-3 md:p-4 flex-row justify-between items-center`}
                  >
                    <Text
                      className={
                        license.expiryDate ? "text-gray-900" : "text-gray-400"
                      }
                    >
                      {license.expiryDate
                        ? new Date(license.expiryDate).toLocaleDateString()
                        : "Select expiry date"}
                    </Text>
                    <Feather name="calendar" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                  {errors.licenseExpiry && (
                    <Text className="text-red-500 text-xs md:text-sm mt-1">
                      {errors.licenseExpiry}
                    </Text>
                  )}
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={
                      license.expiryDate
                        ? new Date(license.expiryDate)
                        : new Date()
                    }
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === "ios");
                      if (selectedDate) {
                        setLicense({
                          ...license,
                          expiryDate: selectedDate.toISOString(),
                        });
                      }
                    }}
                    minimumDate={new Date()}
                  />
                )}

                <TouchableOpacity
                  className="bg-[#1969fe] py-4 rounded-full items-center mt-6 shadow-lg shadow-blue-500/30"
                  onPress={handleSubmitLicense}
                  disabled={isUpdatingLicense}
                  activeOpacity={0.7}
                >
                  {isUpdatingLicense ? (
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

            {/* Step 3: NIN Information */}
            {step === 3 && (
              <Animated.View entering={SlideInRight} exiting={SlideOutLeft}>
                <View className="mb-6">
                  <Text className="text-2xl md:text-3xl font-bold text-gray-900">
                    National Identification Number (NIN)
                  </Text>
                  <Text className="text-gray-600 mt-2 text-sm md:text-base">
                    Provide your NIN and residential address
                  </Text>
                </View>

                <DocumentUpload
                  title="NIN Image"
                  onUpload={(image) => setNin({ ...nin, image })}
                  existingImage={nin.image}
                  error={errors.ninImage}
                  required
                  icon={Feather}
                />

                <View className="mb-4">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-gray-700 font-medium text-sm md:text-base">
                      NIN Number <Text className="text-red-500">*</Text>
                    </Text>
                  </View>
                  <TextInput
                    className={`border ${errors.ninNumber ? "border-red-500" : "border-gray-300"} 
                      rounded-xl p-3 md:p-4 text-sm md:text-base`}
                    value={nin.number}
                    onChangeText={(value) =>
                      setNin({ ...nin, number: value.replace(/[^0-9]/g, "") })
                    }
                    placeholder="11-digit NIN"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={11}
                  />
                  {errors.ninNumber && (
                    <Text className="text-red-500 text-xs md:text-sm mt-1">
                      {errors.ninNumber}
                    </Text>
                  )}
                </View>

                <View className="mb-4">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-gray-700 font-medium text-sm md:text-base">
                      House Address <Text className="text-red-500">*</Text>
                    </Text>
                  </View>
                  <TextInput
                    className={`border ${errors.ninAddress ? "border-red-500" : "border-gray-300"} 
                      rounded-xl p-3 md:p-4 text-sm md:text-base min-h-[80px]`}
                    value={nin.house_address}
                    onChangeText={(value) =>
                      setNin({ ...nin, house_address: value })
                    }
                    placeholder="Enter your house address"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  {errors.ninAddress && (
                    <Text className="text-red-500 text-xs md:text-sm mt-1">
                      {errors.ninAddress}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  className="bg-[#1969fe] py-4 rounded-full items-center mt-6 shadow-lg shadow-blue-500/30"
                  onPress={handleSubmitNin}
                  disabled={isUpdatingNin}
                  activeOpacity={0.7}
                >
                  {isUpdatingNin ? (
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

            {/* Step 4: Review & Submit */}
            {step === 4 && (
              <Animated.View entering={SlideInRight} exiting={SlideOutLeft}>
                <View className="mb-6">
                  <Text className="text-2xl md:text-3xl font-bold text-gray-900">
                    Review & Submit
                  </Text>
                  <Text className="text-gray-600 mt-2 text-sm md:text-base">
                    Please review your information before submitting
                  </Text>
                </View>

                <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
                  <Text className="text-lg font-semibold text-gray-800 mb-3">
                    Vehicle Information
                  </Text>
                  <View className="space-y-2">
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
                  </View>
                </View>

                <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
                  <Text className="text-lg font-semibold text-gray-800 mb-3">
                    License Information
                  </Text>
                  <View className="space-y-2">
                    <View className="flex-row">
                      <Text className="text-gray-500 w-24">Number:</Text>
                      <Text className="text-gray-900 flex-1">
                        {license.number}
                      </Text>
                    </View>
                    <View className="flex-row">
                      <Text className="text-gray-500 w-24">Expiry:</Text>
                      <Text className="text-gray-900 flex-1">
                        {new Date(license.expiryDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
                  <Text className="text-lg font-semibold text-gray-800 mb-3">
                    NIN Information
                  </Text>
                  <View className="space-y-2">
                    <View className="flex-row">
                      <Text className="text-gray-500 w-24">NIN:</Text>
                      <Text className="text-gray-900 flex-1">{nin.number}</Text>
                    </View>
                    <View className="flex-row">
                      <Text className="text-gray-500 w-24">Address:</Text>
                      <Text className="text-gray-900 flex-1">
                        {nin.house_address}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  className="bg-[#1969fe] py-4 rounded-full items-center shadow-lg shadow-blue-500/30"
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
                  By submitting, you confirm that all information provided is
                  accurate
                </Text>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}