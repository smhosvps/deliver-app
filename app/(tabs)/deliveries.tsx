// screens/DeliveriesScreen.tsx
import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  AppState,
  AppStateStatus,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import {
  useGetCustomerOngoingQuery,
  useGetCustomerPastQuery,
  useDeleteDeliveryMutation,
} from "@/redux/features/deliveryApi/deliveryApi";
import { useGetUserQuery } from "@/redux/api/apiSlice";

import fragile from "../../assets/images/fragile.png";
import food from "../../assets/images/food.png";
import small from "../../assets/images/medium.png";
import medium from "../../assets/images/medium.png";
import large from "../../assets/images/large.png";
import clothing from "../../assets/images/clothing.png";
import electronics from "../../assets/images/electronics.png";
import document from "../../assets/images/documents.png";
import other from "../../assets/images/other.png";
import books from "../../assets/images/books.png";
import packageIconx from "../../assets/images/package.png";

import emptyBoxIconx from "../../assets/images/box.png";

// Delivery status icons and colors
const DELIVERY_STATUS = {
  pending: {
    text: "Pending",
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    icon: "time-outline",
  },
  request_accepted: {
    text: "Request Accepted",
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    icon: "person-outline",
  },
  picked_up: {
    text: "Picked Up",
    color: "#8B5CF6",
    bgColor: "#EDE9FE",
    icon: "cube-outline",
  },
  in_transit: {
    text: "In Transit",
    color: "#10B981",
    bgColor: "#D1FAE5",
    icon: "car-outline",
  },
  delivered: {
    text: "Delivered",
    color: "#10B981",
    bgColor: "#D1FAE5",
    icon: "checkmark-circle-outline",
  },
  cancelled: {
    text: "Cancelled",
    color: "#EF4444",
    bgColor: "#FEE2E2",
    icon: "close-circle-outline",
  },
  failed: {
    text: "Failed",
    color: "#DC2626",
    bgColor: "#FEE2E2",
    icon: "alert-circle-outline",
  },
};

// Package type icons (image assets)
const PACKAGE_TYPE_ICONS: any = {
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

// Helper: get array of all package types
const getPackageTypesArray = (typeStr: string | undefined): string[] => {
  if (!typeStr) return [];
  return typeStr.split(",").map(t => t.trim()).filter(t => t.length > 0);
};

// ✅ FIXED: get the best matching icon by scanning all types in the comma‑separated list
const getPackageIcon = (typeStr: string | undefined) => {
  if (!typeStr) return null;
  const types = typeStr.split(",").map(t => t.trim().toLowerCase());
  for (const t of types) {
    if (PACKAGE_TYPE_ICONS[t]) return PACKAGE_TYPE_ICONS[t];
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

export default function DeliveriesScreen() {
  const [activeTab, setActiveTab] = useState("ongoing");
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [deletedDeliveryCode, setDeletedDeliveryCode] = useState<string>("");
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [packageTypesModalVisible, setPackageTypesModalVisible] = useState(false);
  const [currentPackageTypes, setCurrentPackageTypes] = useState<string[]>([]);

  // Refs to prevent memory leaks and track component state
  const isMounted = useRef(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const lastRefreshTime = useRef<number>(Date.now());
  const refreshAttempts = useRef<number>(0);

  const {
    data: userData,
    isLoading: userLoading,
    refetch: refetchUser,
  }: any = useGetUserQuery(undefined, {
    skip: !isScreenFocused,
  });

  const id = userData?.user?._id;

  // Delete delivery mutation
  const [deleteDelivery, { isLoading: isDeletingDelivery }] = useDeleteDeliveryMutation();

  // RTK Query hooks with error handling and retry logic
  const {
    data: ongoingDeliveries,
    isLoading: ongoingLoading,
    isFetching: ongoingFetching,
    refetch: refetchOngoing,
  } = useGetCustomerOngoingQuery(id, {
    skip: !id || !isScreenFocused,
    pollingInterval: 0,
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  const {
    data: pastDeliveries,
    isLoading: pastLoading,
    isFetching: pastFetching,
    refetch: refetchPast,
  } = useGetCustomerPastQuery(id, {
    skip: !id || !isScreenFocused,
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Extract data with fallbacks
  const ongoingDeliveriesList = ongoingDeliveries?.data?.deliveries || [];
  const pastDeliveriesList = pastDeliveries?.data?.deliveries || [];


  // Safe refresh function with error handling and retry logic
  const safeRefresh = useCallback(async (force = false) => {
    if (!isMounted.current) return;

    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime.current;

    if (!force && timeSinceLastRefresh < 5000) {
      console.log("Skipping refresh - too frequent");
      return;
    }

    setRefreshError(null);

    try {
      console.log("Refreshing deliveries...");

      const refreshPromise = Promise.allSettled([
        refetchUser().catch((err: any) => ({ status: 'rejected', reason: err })),
        activeTab === "ongoing"
          ? refetchOngoing().catch(err => ({ status: 'rejected', reason: err }))
          : refetchPast().catch(err => ({ status: 'rejected', reason: err }))
      ]);

      const timeoutPromise = new Promise((_, reject) => {
        refreshTimeoutRef.current = setTimeout(() => {
          reject(new Error("Refresh timeout"));
        }, 10000);
      });

      const results = await Promise.race([refreshPromise, timeoutPromise]) as any[];

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      if (isMounted.current) {
        lastRefreshTime.current = now;
        refreshAttempts.current = 0;

        const hasErrors = results.some(result => result.status === 'rejected');
        if (hasErrors) {
          console.warn("Some refreshes failed:", results);
        }
      }
    } catch (error) {
      console.error("Refresh error:", error);

      if (isMounted.current) {
        refreshAttempts.current += 1;

        if (refreshAttempts.current > 2) {
          setRefreshError("Unable to refresh. Please check your connection.");
        }
      }
    }
  }, [activeTab, refetchOngoing, refetchPast, refetchUser]);

  // Handle app state changes with debounce
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active' && isMounted.current) {
        setTimeout(() => {
          if (isMounted.current && isScreenFocused) {
            safeRefresh(true);
          }
        }, 500);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [safeRefresh, isScreenFocused]);

  // Handle screen focus with cleanup
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused");
      setIsScreenFocused(true);

      const initialRefresh = setTimeout(() => {
        if (isMounted.current) {
          safeRefresh(true);
        }
      }, 300);

      const interval = setInterval(() => {
        if (isMounted.current && isScreenFocused) {
          safeRefresh(false);
        }
      }, 30000);

      return () => {
        console.log("Screen unfocused");
        setIsScreenFocused(false);
        clearTimeout(initialRefresh);
        clearInterval(interval);
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    }, [safeRefresh])
  );

  // Handle pull to refresh with loading state
  const onRefresh = useCallback(async () => {
    if (!isMounted.current) return;

    setRefreshing(true);
    try {
      await safeRefresh(true);
    } catch (error) {
      console.error("Manual refresh error:", error);
      if (isMounted.current) {
        Alert.alert(
          "Refresh Failed",
          "Unable to refresh deliveries. Please check your connection and try again."
        );
      }
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  }, [safeRefresh]);

  // Get current deliveries based on active tab
  const currentDeliveries = activeTab === "ongoing" ? ongoingDeliveriesList : pastDeliveriesList;

  // Loading states
  const isLoadingInitial = userLoading || (activeTab === "ongoing" ? ongoingLoading : pastLoading);
  const isFetching = activeTab === "ongoing" ? ongoingFetching : pastFetching;
  const isRefreshing = refreshing || isFetching;

  // Format delivery time
  const formatDeliveryTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}min`;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.log(error);
      return "Invalid date";
    }
  };

  // Get icon source for delivery (uses the improved getPackageIcon)
  const getDeliveryIcon = (delivery: any) => {
    const rawType = delivery?.package?.type;

    console.log(rawType, "package icon")
    const iconAsset = getPackageIcon(rawType);
    if (iconAsset) {
      return { type: "image", source: iconAsset };
    }
    return { type: "emoji", emoji: "📦" };
  };

  // Check if delivery has multiple package types
  const hasMultipleTypes = (delivery: any): boolean => {
    const rawType = delivery?.package?.type;
    return getPackageTypesArray(rawType).length > 1;
  };

  // Show modal with all package types
  const handleShowAllTypes = (delivery: any) => {
    const rawType = delivery?.package?.type;
    const types = getPackageTypesArray(rawType);
    if (types.length > 1) {
      setCurrentPackageTypes(types);
      setPackageTypesModalVisible(true);
    }
  };

  // Check if delivery is in editable state
  const isEditableDelivery = (delivery: any) => {
    return delivery?.paymentStatus !== "paid";
  };

  // Check if delivery can be deleted
  const canDeleteDelivery = (delivery: any) => {
    return isEditableDelivery(delivery);
  };

  // Handle delete press
  const handleDeletePress = (delivery: any) => {
    setSelectedDelivery(delivery);
    setDeleteModalVisible(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!selectedDelivery) return;

    try {
      const response = await deleteDelivery(selectedDelivery._id).unwrap();

      if (response.success && isMounted.current) {
        setDeletedDeliveryCode(selectedDelivery.deliveryCode);
        setDeleteModalVisible(false);
        setSelectedDelivery(null);
        setSuccessModalVisible(true);

        await safeRefresh(true);
      }
    } catch (error: any) {
      console.error("Delete delivery error:", error);
      if (isMounted.current) {
        Alert.alert(
          "Error",
          error.data?.message || "Failed to delete delivery. Please try again."
        );
      }
    }
  };

  // Navigate to tracking details
  const navigateToTracking = (delivery: any) => {
    router.push({
      pathname: "/tracking-details/tracking-details",
      params: {
        deliveryId: delivery._id,
        status: delivery.status,
        deliveryCode: delivery.deliveryCode
      }
    });
  };

  // Render delivery card
  const renderDeliveryCard = (delivery: any) => {
    const statusInfo = DELIVERY_STATUS[delivery.status as keyof typeof DELIVERY_STATUS] || DELIVERY_STATUS.request_accepted;
    const iconData = getDeliveryIcon(delivery);
    const displayType = getDisplayPackageType(delivery?.package?.type);

    // Determine button based on status and payment status
    // Determine button based on status and payment status
    const renderActionButton = () => {
      // ✅ Delivered OR Cancelled → show "View Delivery"
      if (delivery.status === "delivered" || delivery.status === "cancelled") {
        return (
          <TouchableOpacity
            className="bg-[#1969fe] py-4 rounded-full items-center justify-center flex-row"
            onPress={() => navigateToTracking(delivery)}
          >
            <Text className="text-base font-semibold text-white font-inter-semibold">
              View Delivery
            </Text>
          </TouchableOpacity>
        );
      }

      // All other active (non‑pending, non‑delivered, non‑cancelled) → track delivery
      if (delivery.status !== "pending") {
        return (
          <TouchableOpacity
            className="bg-[#1969fe] py-4 rounded-full items-center justify-center flex-row"
            onPress={() => navigateToTracking(delivery)}
          >
            <Text className="text-base font-semibold text-white font-inter-semibold">
              Track Delivery
            </Text>
          </TouchableOpacity>
        );
      }

      // Fallback for "pending" status → view details
      return (
        <TouchableOpacity
          className="bg-[#1969fe] py-4 rounded-full items-center justify-center flex-row"
          onPress={() => navigateToTracking(delivery)}
        >
          <Text className="text-base font-semibold text-white font-inter-semibold">
            View Details
          </Text>
        </TouchableOpacity>
      );
    };

    return (
      <View
        key={delivery._id}
        className="rounded-xl p-4 mb-3 border border-gray-200 relative"
      >
        {/* Delete Button (only for deletable deliveries) */}
        {canDeleteDelivery(delivery) && (
          <TouchableOpacity
            onPress={() => handleDeletePress(delivery)}
            className="absolute top-4 right-4 z-10 bg-red-50 p-2 rounded-full"
            style={{ zIndex: 10 }}
            disabled={isDeletingDelivery}
          >
            {isDeletingDelivery && selectedDelivery?._id === delivery._id ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            )}
          </TouchableOpacity>
        )}

        {/* Card Header */}
        {activeTab === "past" && (
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-2">
              <View
                className="flex-row items-center px-2 py-1 rounded-full gap-1"
                style={{ backgroundColor: statusInfo.bgColor }}
              >
                <Ionicons name={statusInfo.icon as any} size={12} color={statusInfo.color} />
                <Text
                  className="text-xs font-semibold font-inter-semibold"
                  style={{ color: statusInfo.color }}
                >
                  {statusInfo.text}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Delivery Info */}
        <View className="flex-row justify-between items-center mb-4">
          {/* Package Icon and Info */}
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-2">
                <Text className="text-2xl capitalize font-semibold text-black font-inter-semibold">
                  {displayType}
                </Text>
                {hasMultipleTypes(delivery) && (
                  <TouchableOpacity onPress={() => handleShowAllTypes(delivery)}>
                    <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
              <Text className="text-base text-gray-500 font-inter-bold">
                #{delivery.trackingId}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="bicycle-outline" size={16} color="#777777" />
                <View className="flex-1 flex-row items-center gap-1.5">
                  <Text className="text-lg text-[#777777] font-inter-regular font-light">
                    {delivery?.deliveryType || "Bike Delivery"}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="time-outline" size={16} color="#10b981" />
                    <Text className="text-lg font-light text-[#10b981] font-inter-regular">
                      {activeTab === "ongoing"
                        ? `${formatDeliveryTime(delivery.estimatedDuration || 0)}`
                        : formatDate(delivery.updatedAt)
                      }
                    </Text>
                  </View>
                </View>
              </View>
              <View className="flex-row justify-between">
                {/* Status Badge for ongoing deliveries */}
                {activeTab === "ongoing" && delivery.status !== "pending" && (
                  <View className="flex-row items-center gap-2 mt-2">
                    <View
                      className="flex-row items-center px-2 py-1 rounded-full gap-1"
                      style={{ backgroundColor: statusInfo.bgColor }}
                    >
                      <Ionicons name={statusInfo.icon as any} size={12} color={statusInfo.color} />
                      <Text
                        className="text-xs font-semibold font-inter-semibold"
                        style={{ color: statusInfo.color }}
                      >
                        {statusInfo.text}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
            {/* Icon rendering */}
            <View className="items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
              {iconData.type === "image" ? (
                <Image source={iconData.source} className="w-12 h-12" resizeMode="contain" />
              ) : (
                <Text className="text-4xl">{iconData.emoji}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {renderActionButton()}
      </View>
    );
  };

  // Render initial loading state
  if (isLoadingInitial) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1969fe" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-4">
        <Text className="text-2xl font-bold text-black mb-2 font-inter-bold">
          My Deliveries
        </Text>
        <Text className="text-[14px] text-gray-500 leading-5 font-inter-regular">
          Track your current deliveries and revisit completed ones all in one place.
        </Text>

        {/* Auto-refresh indicator */}
        {isFetching && !isRefreshing && (
          <View className="flex-row items-center mt-2">
            <ActivityIndicator size="small" color="#1969fe" />
            <Text className="text-xs text-blue-600 ml-2 font-inter-regular">
              Auto-refreshing...
            </Text>
          </View>
        )}

        {/* Error indicator */}
        {refreshError && (
          <View className="bg-red-50 p-2 rounded-lg mt-2 flex-row items-center gap-2">
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text className="text-xs text-red-600 flex-1 font-inter-regular">
              {refreshError}
            </Text>
            <TouchableOpacity onPress={() => safeRefresh(true)}>
              <Text className="text-xs text-blue-600 font-inter-semibold">Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={["#0052CC"]}
            tintColor="#0052CC"
          />
        }
      >
        {/* Tabs */}
        <View className="flex-row px-4">
          <TouchableOpacity
            className={`flex-1 items-center justify-center flex-row gap-2 py-3 relative ${activeTab === "ongoing" ? "border-b-2 border-[#1969fe] mb-[-1px]" : ""}`}
            onPress={() => setActiveTab("ongoing")}
          >
            <Text
              className={`text-base font-normal font-inter-semibold ${activeTab === "ongoing" ? "text-black" : "text-gray-400"}`}
            >
              Ongoing
            </Text>
            {ongoingDeliveriesList.length > 0 && (
              <View className="bg-[#1969fe] rounded-full px-1.5 py-0.5 min-w-5 items-center justify-center">
                <Text className="text-xs font-semibold text-white font-inter-semibold">
                  {ongoingDeliveriesList.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 items-center justify-center flex-row gap-2 py-3 relative ${activeTab === "past" ? "border-b-2 border-[#1969fe] mb-[-1px]" : ""}`}
            onPress={() => setActiveTab("past")}
          >
            <Text
              className={`text-base font-normal font-inter-semibold ${activeTab === "past" ? "text-black" : "text-gray-400"}`}
            >
              Past
            </Text>
            {pastDeliveriesList.length > 0 && (
              <View className="bg-[#1969fe] rounded-full px-1.5 py-0.5 min-w-5 items-center justify-center">
                <Text className="text-xs font-semibold text-white font-inter-semibold">
                  {pastDeliveriesList.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Empty State */}
        {currentDeliveries.length === 0 ? (
          <View className="items-center justify-center py-20 px-10">
            <View className="rounded-full items-center justify-center">
              <Image
                  source={emptyBoxIconx}
                  className="w-24 h-24"
                  resizeMode="contain"
                />
            </View>
            <Text className="text-base font-semibold text-gray-700 mt-2 text-center font-inter-semibold">
              {activeTab === "ongoing"
                ? "No active deliveries at the moment."
                : "No past deliveries found."
              }
            </Text>
            <Text className="text-sm text-gray-400 mt-1 text-center font-inter-regular">
              {activeTab === "ongoing"
                ? "Ready to receive something?"
                : "Your completed deliveries will appear here."
              }
            </Text>
          </View>
        ) : (
          <View className="px-4 py-4 gap-3">
            {/* Delivery Cards */}
            {currentDeliveries.map(renderDeliveryCard)}

            {/* Pull to refresh hint */}
            <View className="flex-row items-center justify-center gap-2 pb-24">
              <Ionicons name="refresh-outline" size={14} color="#9CA3AF" />
              <Text className="text-xs text-gray-400 font-inter-regular">
                Pull down to refresh manually
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 w-4/5 max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="trash-outline" size={32} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-black">Delete Delivery?</Text>
            </View>

            {selectedDelivery && (
              <View className="bg-gray-50 p-4 rounded-lg mb-4">
                <Text className="text-center text-gray-700 mb-2">
                  Are you sure you want to delete this delivery?
                </Text>
                <Text className="text-center font-semibold text-gray-900">
                  #{selectedDelivery.trackingId}
                </Text>
                <Text className="text-center text-sm text-gray-500 mt-2">
                  {selectedDelivery.package?.type || "Package"} • {selectedDelivery.package?.weight || 0}kg
                </Text>
                <Text className="text-center text-xs text-gray-400 mt-1">
                  Status: {selectedDelivery.status} • Payment: {selectedDelivery.paymentStatus}
                </Text>
              </View>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 py-3 rounded-lg items-center"
                onPress={() => {
                  setDeleteModalVisible(false);
                  setSelectedDelivery(null);
                }}
                disabled={isDeletingDelivery}
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 py-3 rounded-lg items-center"
                onPress={handleConfirmDelete}
                disabled={isDeletingDelivery}
              >
                {isDeletingDelivery ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-semibold">Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 w-4/5 max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="checkmark-circle-outline" size={32} color="#1969fe" />
              </View>
              <Text className="text-xl font-bold text-black">Deleted Successfully!</Text>
            </View>

            <View className="bg-blue-50 p-4 rounded-lg mb-4">
              <Text className="text-center text-gray-700 mb-2">
                Your delivery has been deleted.
              </Text>
              <Text className="text-center font-semibold text-gray-900">
                #{deletedDeliveryCode}
              </Text>
            </View>

            <TouchableOpacity
              className="bg-[#1969fe] py-3 rounded-lg items-center"
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text className="text-white font-semibold">OK</Text>
            </TouchableOpacity>
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
                  source={packageIconx}
                  className="w-16 h-16"
                  resizeMode="contain"
                />
              </View>
              <Text className="text-xl font-bold text-black mt-2 text-center">
                Package Contents
              </Text>
            </View>
            <View className="bg-gray-50 p-4 rounded-lg mb-4">
              {currentPackageTypes.map((type, idx) => (
                <View key={idx} className="flex-row items-center mb-2 last:mb-0">
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text className="ml-2 text-gray-700 capitalize">{type}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}