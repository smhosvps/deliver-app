import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import DropDownPicker from "react-native-dropdown-picker";
import { useGetUserQuery } from "@/redux/api/apiSlice";
import {
  useCancelDeliveryMutation,
  useConfirmDeliveryByPartnerMutation,
  useGetDeliveryConfirmationStatusQuery,
  useMarkAsInTransitMutation,
  useMarkAsPickedUpMutation,
} from "@/redux/features/deliveryStatusApi/deliveryStatusApi";
import { useGetTrackDeliveryQuery } from "@/redux/features/deliveryApi/deliveryApi";
import fragile from "../../assets/images/fragile.png";
import food from "../../assets/images/food.png";
import small from "../../assets/images/medium.png";
import medium from "../../assets/images/medium.png";
import large from "../../assets/images/large.png";
import clothing from "../../assets/images/clothing.png";
import electronics from "../../assets/images/electronics.png";
import document from "../../assets/images/documents.png";
import other from "../../assets/images/other.png";
import SuccessIcon from "../../assets/images/success-icon.png";
import warningIcon from "../../assets/images/exclamation.png";
import books from "../../assets/images/books.png";
import { AntDesign } from "@expo/vector-icons";

const DELIVERY_STATUS = {
  pending: {
    text: "Pending",
    color: "#F59E0B",
    bgColor: "#FEF3C7",
  },
  assigned: {
    text: "Assigned",
    color: "#3B82F6",
    bgColor: "#DBEAFE",
  },
  request_accepted: {
    text: "Request Accepted",
    color: "#3B82F6",
    bgColor: "#DBEAFE",
  },
  picked_up: {
    text: "Picked Up",
    color: "#8B5CF6",
    bgColor: "#EDE9FE",
  },
  in_transit: {
    text: "In Transit",
    color: "#10B981",
    bgColor: "#D1FAE5",
  },
  delivered: {
    text: "Delivered",
    color: "#10B981",
    bgColor: "#D1FAE5",
  },
  cancelled: {
    text: "Cancelled",
    color: "#EF4444",
    bgColor: "#FEE2E2",
  },
  failed: {
    text: "Failed",
    color: "#DC2626",
    bgColor: "#FEE2E2",
  },
};

// Predefined cancellation reasons for dropdown
const CANCELLATION_REASONS = [
  { label: "Customer Request", value: "customer_request" },
  { label: "Unavailable", value: "partner_unavailable" },
  { label: "Bad Weather", value: "bad_weather" },
  { label: "Vehicle Issue", value: "vehicle_issue" },
  { label: "Address Issue", value: "address_issue" },
  { label: "Other", value: "other" },
];

// -------------------- FIXED HELPER FUNCTIONS FOR PACKAGE.TYPE --------------------

// Helper: get array of all package types
const getPackageTypesArray = (typeStr: string | undefined): string[] => {
  if (!typeStr) return [];
  return typeStr.split(",").map(t => t.trim()).filter(t => t.length > 0);
};

// ✅ FIXED: get the best matching icon by scanning all types
const getPackageIcon = (typeStr: string | undefined) => {
  if (!typeStr) return null;
  const types = typeStr.split(",").map(t => t.trim().toLowerCase());
  const icons: Record<string, any> = {
    document: document,
    small: small,
    other: other,
    medium: medium,
    large: large,
    fragile: fragile,
    electronics: electronics,
    food: food,
    clothes: clothing,
    books: books,
  };
  for (const t of types) {
    if (icons[t]) return icons[t];
  }
  return null;
};

// ✅ FIXED: display a summary for multiple types, e.g. "Books + 1 more"
const getDisplayPackageType = (rawType: string | undefined): string => {
  if (!rawType) return "Package";
  const types = rawType.split(",").map(t => t.trim());
  if (types.length === 1) {
    return types[0].charAt(0).toUpperCase() + types[0].slice(1);
  }
  return `${types[0]} + ${types.length - 1} more`;
};
// -------------------- END OF PACKAGE HELPER FUNCTIONS --------------------

export default function TrackingDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { deliveryId } = params;

  // Get current user data
  const { data: userData }: any = useGetUserQuery();
  const currentUser = userData?.user;
  const isDeliveryPartner = currentUser?.userType === "delivery_partner";
  const userId = currentUser?._id;

  // RTK Query hooks with polling for active deliveries
  const {
    data: deliveryData,
    isLoading: isLoadingDelivery,
    refetch: refetchDelivery,
  } = useGetTrackDeliveryQuery(deliveryId as string, {
    skip: !deliveryId,
    pollingInterval: 10000,
  });

  // Get confirmation status
  const {
    data: confirmationData,
    isLoading: isLoadingConfirmation,
    refetch: refetchConfirmation,
  } = useGetDeliveryConfirmationStatusQuery(deliveryId as string, {
    skip: !deliveryId,
  });

  const datax = deliveryData?.data?.tracking;
  const trackingId = datax?.trackingId;

  // Status update mutations
  const [markAsPickedUp, { isLoading: isPickingUp }] = useMarkAsPickedUpMutation();
  const [markAsInTransit, { isLoading: isInTransit }] = useMarkAsInTransitMutation();
  const [cancelDelivery, { isLoading: isCancelling }] = useCancelDeliveryMutation();
  const [confirmByPartner, { isLoading: isConfirmingByPartner }] = useConfirmDeliveryByPartnerMutation();

  // State for UI
  const [deliveryConfirmationCode, setDeliveryConfirmationCode] = useState<string[]>(Array(5).fill(""));
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string | null>(null);
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonItems, setReasonItems] = useState(CANCELLATION_REASONS);
  const [confirmError, setConfirmError] = useState<string>("");
  const [cancelError, setCancelError] = useState<string>("");

  // Success modal state
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Modal for showing all package types
  const [packageTypesModalVisible, setPackageTypesModalVisible] = useState(false);
  const [allPackageTypes, setAllPackageTypes] = useState<string[]>([]);

  // Refs for OTP inputs
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Notification modal state
  const [notificationModal, setNotificationModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "info" | "confirm",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null as (() => void) | null,
    onCancel: null as (() => void) | null,
  });

  // Helper to show simple notification
  const showNotification = (title: string, message: string, type: "success" | "error" | "info" = "info") => {
    setNotificationModal({
      visible: true,
      title,
      message,
      type,
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm: () => setNotificationModal((prev) => ({ ...prev, visible: false })),
      onCancel: null,
    });
  };

  // Combine delivery and confirmation data
  const delivery = deliveryData?.data?.tracking || {};
  const confirmationStatus = confirmationData?.data?.delivery?.confirmation;
  const mergedDelivery = {
    ...delivery,
    confirmation: confirmationStatus || delivery.confirmation || {
      customerConfirmed: false,
      partnerConfirmed: false,
      confirmationAttempts: 0,
    },
  };

  const isLoading = isLoadingDelivery || isLoadingConfirmation;

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchDelivery(), refetchConfirmation()]);
  }, [refetchDelivery, refetchConfirmation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchAll();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchAll]);

  // Auto‑navigate countdown effect for success modal
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (successModalVisible && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (successModalVisible && countdown === 0) {
      handleSuccessModalClose();
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [successModalVisible, countdown]);

  const handleSuccessModalClose = () => {
    setSuccessModalVisible(false);
    setCountdown(3);
    router.replace("/deliveries");
  };

  const resetCancelModal = () => {
    setSelectedCancelReason(null);
    setCustomCancelReason("");
    setShowCancelModal(false);
    setReasonOpen(false);
    setCancelError("");
  };

  // Open cancel modal for delivery partner
  const handleCancelDeliveryPartner = () => {
    setCancelError("");
    setShowCancelModal(true);
  };

  const getCancellationReasonLabel = (value: string) => {
    const reason = CANCELLATION_REASONS.find((r) => r.value === value);
    return reason?.label || value;
  };

  // Cancel Delivery with full logging + modal error display
  const handleCancelDelivery = async () => {
    setCancelError("");

    if (!selectedCancelReason) {
      setCancelError("Please select a cancellation reason");
      return;
    }
    if (selectedCancelReason === "other" && !customCancelReason.trim()) {
      setCancelError("Please provide details for 'Other' reason");
      return;
    }

    const finalReason =
      selectedCancelReason === "other"
        ? `other: ${customCancelReason.trim()}`
        : selectedCancelReason;

    const finalDeliveryId = mergedDelivery._id || mergedDelivery.deliveryId || (deliveryId as string);

    const payload = {
      deliveryId: finalDeliveryId,
      reason: finalReason,
      userId,
    };

    console.log("=== CANCEL DELIVERY ATTEMPT STARTED ===");
    console.log("Payload being sent to backend:", JSON.stringify(payload, null, 2));

    try {
      const response = await cancelDelivery(payload).unwrap();
      console.log("✅ SUCCESS - Cancel Delivery Response:", response);

      // ✅ On success: close modal and navigate to deliveries (no success modal)
      resetCancelModal();

      // Use replace to prevent going back to the cancelled delivery screen
      router.replace("/(tabs)/deliveries");
    } catch (error: any) {
      const errorMessage = error?.data?.message || "Failed to cancel delivery";
      console.error("❌ FAILED to cancel delivery:", errorMessage);
      console.error("Full error object:", error);

      // Show error message inside the cancel modal (no separate success modal)
      setCancelError(errorMessage);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11) {
      return `0${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    return phone;
  };

  const formatTime = (timestamp: string | Date) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Updated Timeline Function
  const getTimelineEvents = () => {
    if (!mergedDelivery?.timeline) return [];

    const activeStatuses = ["request_accepted", "picked_up", "in_transit", "delivered"];

    const filteredTimeline = mergedDelivery.timeline
      .filter((event: any) => activeStatuses.includes(event.status))
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const statusOrder = ["request_accepted", "picked_up", "in_transit", "delivered"];

    return statusOrder.map((status, index) => {
      const event = filteredTimeline.find((e: any) => e.status === status);

      let title = "";
      let location = "";

      switch (status) {
        case "request_accepted":
          title = "Request Accepted";
          location = "Delivery partner has accepted the request";
          break;
        case "picked_up":
          title = "Package Picked Up";
          location = "Package collected from pickup location";
          break;
        case "in_transit":
          title = "In Transit";
          location = "On the way to delivery location";
          break;
        case "delivered":
          title = "Delivered";
          location = mergedDelivery?.delivery?.address || "Delivery Location";
          break;
        default:
          title = status;
      }

      const isCompleted = !!event?.timestamp;

      return {
        id: index + 1,
        title,
        location,
        time: event?.timestamp ? formatTime(event.timestamp) : "",
        completed: isCompleted,
        status: status,
      };
    });
  };

  // OTP Handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newCode = [...deliveryConfirmationCode];
    newCode[index] = value;
    setDeliveryConfirmationCode(newCode);
    setConfirmError("");

    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !deliveryConfirmationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 5);
    if (digits.length > 0) {
      const newCode = Array(5).fill("");
      digits.split("").forEach((digit, i) => {
        newCode[i] = digit;
      });
      setDeliveryConfirmationCode(newCode);
      setConfirmError("");
      if (digits.length === 5) {
        inputRefs.current[4]?.focus();
      }
    }
  };

  const handleMarkAsPickedUp = async () => {
    try {
      await markAsPickedUp({
        deliveryId: mergedDelivery._id || mergedDelivery.deliveryId || (deliveryId as string),
        userId,
      }).unwrap();
      handleRefresh();
    } catch (error: any) {
      showNotification("Error", error.data?.message || "Failed to mark as picked up", "error");
    }
  };

  const handleMarkAsInTransit = async () => {
    try {
      await markAsInTransit({
        deliveryId: mergedDelivery._id || mergedDelivery.deliveryId || (deliveryId as string),
        userId,
      }).unwrap();
      handleRefresh();
    } catch (error: any) {
      showNotification("Error", error.data?.message || "Failed to mark as in transit", "error");
    }
  };

  const handleMarkAsDelivered = () => {
    setDeliveryConfirmationCode(Array(5).fill(""));
    setConfirmError("");
    setShowCodeModal(true);
  };

  const handleConfirmDeliveryPartner = async () => {
    const code = deliveryConfirmationCode.join("").trim();
    setConfirmError("");

    if (code.length !== 5) {
      setConfirmError("Please enter a valid 5-digit code");
      return;
    }

    const finalDeliveryId = mergedDelivery._id || mergedDelivery.deliveryId || (deliveryId as string);

    const payload = {
      deliveryId: finalDeliveryId,
      code: code,
      userId,
    };

    try {
      const response = await confirmByPartner(payload).unwrap();
      console.log("✅ SUCCESS - Delivery Response:", response);

      // Close the code modal
      setShowCodeModal(false);
      setDeliveryConfirmationCode(Array(5).fill(""));
      setConfirmError("");

      // ✅ Show success modal immediately after API success
      setSuccessModalVisible(true);
      setCountdown(3);

      // Optional: refresh data in background to keep everything in sync
      handleRefresh();
    } catch (error: any) {
      const errorMessage = error?.data?.message || "Invalid confirmation code";
      console.error("❌ Confirm Delivery Error:", errorMessage);
      setConfirmError(errorMessage);
    }
  };

  // Show modal with all package types
  const handleShowAllPackageTypes = () => {
    const rawType = mergedDelivery?.package?.type;
    const typesArray = getPackageTypesArray(rawType);
    if (typesArray.length > 1) {
      setAllPackageTypes(typesArray);
      setPackageTypesModalVisible(true);
    }
  };

  // Custom rounding: floor if fractional part < 0.6, else ceil
  const customRound = (num: any) => {
    const fractional = num - Math.floor(num);
    return fractional < 0.5 ? Math.floor(num) : Math.ceil(num);
  };

  // Apply to your balance formatting
  const formattedDeliveryAmount = mergedDelivery?.price
    ? `₦${customRound(mergedDelivery?.price).toLocaleString()}`
    : "₦0";

  const renderDeliveryPartnerActions = () => {
    if (!isDeliveryPartner || !mergedDelivery) return null;

    const status = mergedDelivery.status;
    const confirmation = mergedDelivery.confirmation || {};
    const isCancelled = status === "cancelled";
    const isInTransit = status === "in_transit";
    const isPickedUp = status === "picked_up";
    const isAssigned = status === "request_accepted";

    if (isCancelled && mergedDelivery.cancelledBy === currentUser?._id) {
      return (
        <View className="bg-gray-50 mx-4 p-4 rounded-lg mb-4 items-center border-l-4 border-l-red-500">
          <Ionicons name="close-circle" size={24} color="#EF4444" />
          <Text className="text-base font-semibold text-gray-500 mt-2 text-center">
            You cancelled this delivery
          </Text>
          {mergedDelivery.cancellationReason && (
            <Text className="text-sm text-red-500 mt-1 italic text-center">
              Reason: {getCancellationReasonLabel(mergedDelivery.cancellationReason)}
            </Text>
          )}
        </View>
      );
    }

    if (isAssigned) {
      return (
        <View className="px-4 mb-4 gap-3">
          <TouchableOpacity
            className="bg-[#1969fe] py-3.5 rounded-full items-center justify-center flex-row gap-2"
            onPress={handleMarkAsPickedUp}
            disabled={isPickingUp}
          >
            {isPickingUp ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-base font-semibold">Mark as Picked Up</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-red-500 py-3.5 rounded-full items-center justify-center flex-row gap-2"
            onPress={handleCancelDeliveryPartner}
            disabled={isCancelling}
          >
            <Text className="text-white text-base font-semibold">Cancel Delivery</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isPickedUp) {
      return (
        <View className="px-4 mb-4 gap-3">
          <TouchableOpacity
            className="bg-[#1969fe] py-3.5 rounded-full items-center justify-center flex-row gap-2"
            onPress={handleMarkAsInTransit}
            disabled={isInTransit}
          >
            {isInTransit ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-base font-semibold">Mark as In Transit</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (isInTransit) {
      return (
        <View className="px-4 mb-4">
          <TouchableOpacity
            className="bg-[#1969fe] py-3.5 rounded-full items-center justify-center flex-row gap-2"
            onPress={handleMarkAsDelivered}
            disabled={isConfirmingByPartner || confirmation.partnerConfirmed}
          >
            {isConfirmingByPartner ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-base font-semibold">
                {confirmation.partnerConfirmed ? "Confirmed" : "Mark as Delivered"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const timelineEvents = getTimelineEvents();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0052CC" />
          <Text className="text-sm text-gray-500 mt-3">Loading delivery details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!mergedDelivery || (!mergedDelivery._id && !mergedDelivery.deliveryId)) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-8">
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text className="text-lg font-semibold text-gray-800 mt-4">Delivery Not Found</Text>
          <Text className="text-sm text-gray-500 text-center mt-2">
            The delivery details could not be loaded. Please check the delivery ID and try again.
          </Text>
          <TouchableOpacity className="bg-[#1969fe] px-6 py-3 rounded-full mt-6" onPress={() => router.back()}>
            <Text className="text-base font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ Use the fixed helper functions for package display
  const rawPackageType = mergedDelivery?.package?.type;
  const packageIcon = getPackageIcon(rawPackageType);
  const displayPackageType = getDisplayPackageType(rawPackageType);
  const hasMultipleTypes = getPackageTypesArray(rawPackageType).length > 1;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={24} color="#242526" />
          </TouchableOpacity>
          <Text className="text-lg font-normal text-[#242526] ml-1">Back</Text>
        </View>
        <View className="flex-row gap-2">
          {mergedDelivery?.status &&
            (mergedDelivery.status === "request_accepted" ||
              mergedDelivery.status === "in_transit" ||
              mergedDelivery.status === "picked_up") && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/others/tracking-with-map",
                    params: { deliveryIdx: deliveryId as string },
                  })
                }
                disabled={isRefreshing}
              >
                <Ionicons name="compass-outline" size={24} color="#0052CC" />
              </TouchableOpacity>
            )}
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={["#0052CC"]} tintColor="#0052CC" />}
      >
        <View className="px-4 pb-4 pt-2">
          <Text className="text-2xl font-bold text-black mb-2 font-inter-bold">Tracking Details</Text>
          <Text className="text-[14px] text-gray-500 leading-5 font-inter-regular">
            Track your delivery progress and other information.
          </Text>
        </View>

        <View className="px-4 pt-2">
          <View className="flex-row border-b border-gray-200 mb-4 pb-4">
            <View className="flex-row flex-1 items-center">
              <View className="mr-3 bg-[#fcf1e8] p-2 rounded-full">
                {packageIcon ? (
                  <Image source={packageIcon} className="w-12 h-12" resizeMode="contain" />
                ) : (
                  <Ionicons name="cube-outline" size={32} color="#9CA3AF" />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1">
                  <Text className="text-sm font-bold text-black capitalize">
                    {displayPackageType}
                  </Text>
                  {hasMultipleTypes && (
                    <TouchableOpacity onPress={handleShowAllPackageTypes}>
                      <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>
                <View className="flex-row items-center">
                  <Text className="text-base text-gray-500">
                    Tracking ID: #{trackingId || "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            {mergedDelivery?.status === "request_accepted" ||
              mergedDelivery?.status === "picked_up" ||
              mergedDelivery?.status === "in_transit" ? (
              <View>
                <TouchableOpacity
                  className="ml-2 mr-3 bg-[#f4f4f4] p-2 rounded-full"
                  onPress={() => router.push("/profile/help-support")}
                >
                  <AntDesign name="customer-service" size={18} color="#1969fe" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* Package Info */}
        <View className="mx-4">
          <View className="flex-row mb-4">
            <View className="flex-1">
              <Text className="text-sm font-light text-gray-500 mb-1">From</Text>
              <Text className="text-sm font-bold text-black mb-1">Sender</Text>
              <Text className="text-xs text-gray-500">
                {mergedDelivery?.pickup?.contactName ||
                  mergedDelivery?.customer?.firstName + " " + mergedDelivery?.customer?.lastName}
              </Text>
              <Text className="text-xs text-gray-500">
                {formatPhoneNumber(mergedDelivery?.pickup?.contactPhone || mergedDelivery?.customer?.phone)}
              </Text>
            </View>
            <View className="flex-1 border-l-[1px] border-gray-300">
              <View className="px-2">
                <Text className="text-sm font-semibold text-gray-500 mb-1">To</Text>
                <Text className="text-sm font-bold text-black mb-1">Receiver</Text>
                <Text className="text-xs text-gray-500">{mergedDelivery?.delivery?.contactName || "Receiver"}</Text>
                <Text className="text-xs text-gray-500">{formatPhoneNumber(mergedDelivery?.delivery?.contactPhone)}</Text>
              </View>
            </View>
          </View>

          <View className="flex-row mb-4">
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-700 mb-1">Delivery Type</Text>
              <Text className="text-sm font-medium text-gray-500 capitalize">{datax?.deliveryType} Delivery</Text>
            </View>
            <View className="flex-1 border-l-[1px] border-gray-300">
              <View className="px-2">
                <Text className="text-base font-semibold text-gray-700 mb-1">Status</Text>
                {(() => {
                  const statusKey = mergedDelivery?.status?.toLowerCase() as keyof typeof DELIVERY_STATUS;
                  const statusInfo = DELIVERY_STATUS[statusKey] || {
                    text: mergedDelivery?.status || "Unknown",
                    color: "#6B7280",
                    bgColor: "#F3F4F6",
                  };
                  return (
                    <View
                      style={{ backgroundColor: statusInfo.bgColor }}
                      className="self-start px-3 py-1 rounded-full"
                    >
                      <Text style={{ color: statusInfo.color }} className="text-xs font-medium">
                        {statusInfo.text}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            </View>
          </View>

          {/* Price */}
          {(mergedDelivery?.status === "request_accepted" ||
            mergedDelivery?.status === "picked_up" ||
            mergedDelivery?.status === "in_transit") && (
              <View className="mb-4 flex-row justify-between items-center border-t-[1px] border-gray-300 pt-3">
                <Text className="text-base font-semibold text-gray-700">Delivery Price</Text>


                <Text className="text-2xl font-bold text-[#1969fe]">{formattedDeliveryAmount}</Text>


              </View>
            )}

          {/* Addresses */}
          {(mergedDelivery?.status === "request_accepted" ||
            mergedDelivery?.status === "picked_up" ||
            mergedDelivery?.status === "in_transit") && (
              <View className="mb-4">
                <View className="flex-row mb-3 items-start">
                  <Ionicons name="location-outline" size={20} color="#3B82F6" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs font-semibold text-gray-500 mb-1">Pickup Location</Text>
                    <Text className="text-sm text-black leading-5">{mergedDelivery?.pickup?.address || "Pickup location"}</Text>
                  </View>
                </View>
                <View className="flex-row items-start">
                  <Ionicons name="flag-outline" size={20} color="#10B981" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs font-semibold text-gray-500 mb-1">Delivery Location</Text>
                    <Text className="text-sm text-black leading-5">{mergedDelivery?.delivery?.address || "Delivery location"}</Text>
                  </View>
                </View>
              </View>
            )}
        </View>

        {/* Tracking Timeline */}
        {timelineEvents.length > 0 && (
          <View className="mx-4 py-4 border-t-[1px] border-gray-300">
            <Text className="text-base font-bold text-black mb-4">Delivery Timeline</Text>
            <View className="mb-6">
              {timelineEvents.map((event: any, index: number) => {
                const isLast = index === timelineEvents.length - 1;
                return (
                  <View key={event.id} className="flex-row">
                    <View className="w-8 items-center mr-3">
                      <View className="bg-gray-200 rounded-full p-[2px]">
                        <View
                          className={`w-2 h-2 rounded-full border-3 border-white ${event.completed ? "bg-[#1969fe]" : "bg-gray-300"
                            }`}
                        />
                      </View>
                      {!isLast && (
                        <View
                          className={`w-0.5 flex-1 ${timelineEvents[index + 1]?.completed ? "bg-[#1969fe]" : "bg-gray-300"
                            }`}
                        />
                      )}
                    </View>

                    <View className="flex-1 mb-6">
                      <View className="flex-row justify-between items-start">
                        <Text
                          className={`text-sm font-semibold ${event.completed ? "text-black" : "text-gray-400"
                            }`}
                        >
                          {event.title}
                        </Text>
                        {event.time && (
                          <Text className="text-xs text-gray-500 font-medium">
                            {event.time}
                          </Text>
                        )}
                      </View>
                      {event.location && (
                        <Text
                          className={`text-xs mt-1 ${event.completed ? "text-gray-500" : "text-gray-400"
                            }`}
                        >
                          {event.location}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Delivery Partner Actions */}
        {renderDeliveryPartnerActions()}
      </ScrollView>

      {/* Confirmation Code Modal */}
      <Modal visible={showCodeModal} transparent={true} animationType="slide" onRequestClose={() => setShowCodeModal(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-[400px]">
            <View className="items-end">
              <TouchableOpacity onPress={() => {
                setShowCodeModal(false);
                setDeliveryConfirmationCode(Array(5).fill(""));
                setConfirmError("");
              }}>
                <Ionicons name="close-sharp" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text className="text-xl font-bold text-black text-center mb-1">Confirm Delivery</Text>

            {confirmError ? (
              <Text className="text-red-500 text-center font-medium mb-4">{confirmError}</Text>
            ) : null}

            <Text className="text-sm text-gray-500 text-center mb-6 leading-5">
              Ask the receiver for their 5-digit delivery code and enter it below to confirm this delivery.
            </Text>

            <View className="flex-row justify-center gap-3 mb-8">
              {deliveryConfirmationCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  className={`w-12 h-14 border-2 rounded-xl text-center text-2xl font-semibold ${digit
                    ? "border-[#1969fe] bg-blue-50 text-[#1969fe]"
                    : "border-gray-300 text-gray-900 bg-white"
                    }`}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value)}
                  onKeyPress={({ nativeEvent: { key } }) => handleOtpKeyPress(index, key)}
                  onPaste={(e) => handlePaste(e.nativeEvent.text)}
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-[#1969fe] py-3.5 rounded-full items-center"
                onPress={handleConfirmDeliveryPartner}
                disabled={isConfirmingByPartner || deliveryConfirmationCode.join("").length !== 5}
              >
                {isConfirmingByPartner ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-base font-semibold">Confirm Delivery</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Delivery Modal with Error Display */}
      <Modal visible={showCancelModal} transparent={true} animationType="slide" onRequestClose={resetCancelModal}>
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-[400px]">
            <View className="items-end">
              <TouchableOpacity onPress={resetCancelModal}>
                <Ionicons name="close-sharp" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="items-center mb-2">
              <View className="items-center justify-center mb-3">
                <Image
                  source={warningIcon}
                  className="w-16 h-16"
                  resizeMode="contain"
                />
              </View>
              <Text className="text-xl font-bold text-black mt-3 mb-1 text-center">Cancel Delivery</Text>
            </View>

            {cancelError ? (
              <Text className="text-red-500 text-center font-medium mb-4">{cancelError}</Text>
            ) : null}

            <Text className="text-sm text-gray-500 text-center mb-5 leading-5">
              Please select a reason for cancellation. This action cannot be undone.
            </Text>
            <View className="z-50 mb-5">
              <Text className="text-sm font-semibold text-gray-800 mb-2">Select Cancellation Reason *</Text>
              <DropDownPicker
                open={reasonOpen}
                value={selectedCancelReason}
                items={reasonItems}
                setOpen={setReasonOpen}
                setValue={setSelectedCancelReason}
                setItems={setReasonItems}
                placeholder="Select a reason..."
                placeholderStyle={{ color: "#9CA3AF" }}
                style={{
                  borderColor: "#D1D5DB",
                  borderWidth: 1,
                  borderRadius: 8,
                  minHeight: 50,
                  backgroundColor: "#FFFFFF",
                  marginBottom: 20,
                }}
                listItemContainerStyle={{
                  height: 24,
                }}
                dropDownContainerStyle={{
                  borderColor: "#D1D5DB",
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderRadius: 8,
                  marginTop: 2,
                }}
                textStyle={{ color: "#374151", fontSize: 16 }}
                labelStyle={{ fontWeight: "400" }}
                listItemLabelStyle={{ color: "#374151", fontSize: 12 }}
                selectedItemLabelStyle={{ fontWeight: "600", color: "#0052CC" }}
                ArrowDownIconComponent={() => <Ionicons name="chevron-down" size={20} color="#6B7280" />}
                ArrowUpIconComponent={() => <Ionicons name="chevron-up" size={20} color="#6B7280" />}
                TickIconComponent={() => <Ionicons name="checkmark" size={20} color="#0052CC" />}
                disabled={isCancelling}
                zIndex={3000}
                zIndexInverse={1000}
              />
            </View>

            {selectedCancelReason === "other" && (
              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-800 mb-2">Please specify the reason for cancellation *</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 text-base h-28 text-left"
                  placeholder="Enter details about the cancellation reason..."
                  value={customCancelReason}
                  onChangeText={(text) => {
                    setCustomCancelReason(text);
                    setCancelError("");
                  }}
                  multiline={true}
                  numberOfLines={4}
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text className="text-xs text-gray-400 text-right mt-1">{customCancelReason.length}/200 characters</Text>
              </View>
            )}

            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex-row items-start mb-5">
              <Ionicons name="information-circle-outline" size={20} color="#F59E0B" className="mt-0.5" />
              <Text className="text-sm text-yellow-800 ml-2 flex-1 leading-5">
                Once cancelled, this action cannot be undone. The delivery will be marked as cancelled for all parties.
              </Text>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 py-3.5 rounded-full items-center flex-row justify-center ${!selectedCancelReason || (selectedCancelReason === "other" && !customCancelReason.trim())
                  ? "bg-gray-400"
                  : "bg-red-500"
                  }`}
                onPress={handleCancelDelivery}
                disabled={isCancelling || !selectedCancelReason || (selectedCancelReason === "other" && !customCancelReason.trim())}
              >
                {isCancelling ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-base font-semibold">Cancel Delivery</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Global Notification / Confirmation Modal */}
      <Modal visible={notificationModal.visible} transparent={true} animationType="fade" onRequestClose={() => setNotificationModal((prev) => ({ ...prev, visible: false }))}>
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-[320px]">
            <View className="items-center mb-4">
              {notificationModal.type === "success" && <Ionicons name="checkmark-circle" size={48} color="#10B981" />}
              {notificationModal.type === "error" && <Ionicons name="close-circle" size={48} color="#EF4444" />}
              {notificationModal.type === "info" && <Ionicons name="information-circle" size={48} color="#3B82F6" />}
              {notificationModal.type === "confirm" && <Ionicons name="help-circle" size={48} color="#F59E0B" />}
              <Text className="text-xl font-bold text-black mt-2 text-center">{notificationModal.title}</Text>
              <Text className="text-sm text-gray-500 text-center mt-2">{notificationModal.message}</Text>
            </View>
            <View className="flex-row gap-3 mt-4">
              {notificationModal.type === "confirm" ? (
                <>
                  <TouchableOpacity
                    className="flex-1 bg-gray-100 py-3 rounded-lg border border-gray-300 items-center"
                    onPress={notificationModal.onCancel || (() => setNotificationModal((prev) => ({ ...prev, visible: false })))}
                  >
                    <Text className="text-gray-500 text-base font-semibold">{notificationModal.cancelText}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-[#1969fe] py-3 rounded-lg items-center"
                    onPress={notificationModal.onConfirm || (() => setNotificationModal((prev) => ({ ...prev, visible: false })))}
                  >
                    <Text className="text-white text-base font-semibold">{notificationModal.confirmText}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  className="flex-1 bg-[#1969fe] py-3 rounded-lg items-center"
                  onPress={() => setNotificationModal((prev) => ({ ...prev, visible: false }))}
                >
                  <Text className="text-white text-base font-semibold">OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Package Types Info Modal */}
      <Modal
        visible={packageTypesModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPackageTypesModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <TouchableOpacity
              className="items-end"
              onPress={() => setPackageTypesModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="gray" />
            </TouchableOpacity>
            <View className="items-center mb-4">
              <View className="items-center justify-center mb-3">
                <Image
                  source={packageIcon}
                  className="w-16 h-16"
                  resizeMode="contain"
                />
              </View>
              <Text className="text-xl font-bold text-black mt-2 text-center">Package Contents</Text>
            </View>
            <View className="bg-gray-50 p-4 rounded-lg mb-4">
              {allPackageTypes.map((type, idx) => (
                <View key={idx} className="flex-row items-center mb-2 last:mb-0">
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text className="ml-2 text-gray-700 capitalize">{type}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

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
              <Text className="text-xl font-bold text-black text-center">Delivery Completed!</Text>
            </View>
            <View className="bg-gray-50 p-4 rounded-lg mb-4">
              <Text className="text-center text-gray-600">
                You have successfully completed this delivery.
              </Text>
            </View>
            <View className="bg-blue-50 p-3 rounded-lg mb-4">
              <Text className="text-center text-blue-800 text-sm">
                Tracking ID: {trackingId}
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
              <Text className="text-white font-semibold">My Deliveries</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}