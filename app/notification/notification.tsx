// app/notifications.tsx
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TouchableWithoutFeedback,
  Modal,
  Alert,
  Image,
  ActivityIndicator, // added for loading spinner
} from "react-native";
import { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDistanceToNow } from "date-fns";
import {
  useDeleteAllNotificationsMutation,
  useDeleteAllReadNotificationsMutation,
  useDeleteNotificationMutation,
  useGetUserNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
} from "@/redux/features/notificationsApi/notificationApi";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import emptyBellIconx from "../../assets/images/bell.png";

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // Modal states (only for bulk actions)
  const [markAllModal, setMarkAllModal] = useState({ visible: false });
  const [deleteAllModal, setDeleteAllModal] = useState({ visible: false });
  const [deleteReadModal, setDeleteReadModal] = useState({ visible: false });

  // Loading state for single delete (stores the id of notification being deleted)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Loading states for bulk actions
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeletingRead, setIsDeletingRead] = useState(false);

  // RTK Query hooks
  const { data, isLoading, refetch } = useGetUserNotificationsQuery();

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [deleteAll] = useDeleteAllNotificationsMutation();
  const [deleteRead] = useDeleteAllReadNotificationsMutation();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "report_resolved":
        return <Ionicons name="checkmark-circle" size={24} color="#10B981" />;
      case "report_rejected":
        return <MaterialIcons name="error-outline" size={24} color="#EF4444" />;
      case "report_in_progress":
      case "report_updated":
        return <Ionicons name="information-circle" size={24} color="#3B82F6" />;
      default:
        return <Ionicons name="notifications" size={24} color="#6B7280" />;
    }
  };

  // Get background color based on read status
  const getItemBackground = (read: boolean) => {
    return read ? "bg-white" : "bg-blue-50";
  };

  // Handle mark as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id).unwrap();
      await refetch();
    } catch (error) {
      console.error("Error marking as read:", error);
      Alert.alert("Error", "Failed to mark as read. Please try again.");
    }
  };

  // Handle single delete (no modal, immediate delete with loading indicator)
  const handleDeleteSingle = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteNotification(id).unwrap();
      await refetch();
    } catch (error) {
      console.error("Error deleting notification:", error);
      Alert.alert("Error", "Failed to delete notification. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // Handle mark all as read (with loading indicator)
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      setMarkAllModal({ visible: false });
      return;
    }

    setIsMarkingAll(true);
    try {
      await markAllAsRead().unwrap();
      await refetch();
      setMarkAllModal({ visible: false });
    } catch (error) {
      console.error("Error marking all as read:", error);
      Alert.alert("Error", "Failed to mark all as read. Please try again.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Handle delete all (with loading indicator)
  const handleDeleteAll = async () => {
    if (notifications.length === 0) {
      setDeleteAllModal({ visible: false });
      return;
    }

    setIsDeletingAll(true);
    try {
      await deleteAll().unwrap();
      await refetch();
      setDeleteAllModal({ visible: false });
    } catch (error) {
      console.error("Error deleting all:", error);
      Alert.alert("Error", "Failed to delete all notifications. Please try again.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Handle delete read (with loading indicator)
  const handleDeleteRead = async () => {
    const readCount = notifications.filter((n) => n.read).length;
    if (readCount === 0) {
      setDeleteReadModal({ visible: false });
      return;
    }

    setIsDeletingRead(true);
    try {
      await deleteRead().unwrap();
      await refetch();
      setDeleteReadModal({ visible: false });
    } catch (error) {
      console.error("Error deleting read:", error);
      Alert.alert("Error", "Failed to delete read notifications. Please try again.");
    } finally {
      setIsDeletingRead(false);
    }
  };

  // Handle pull‑to‑refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  // Format time
  const formatTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  // Close options menu
  const closeOptions = () => {
    setShowOptions(false);
  };

  // Custom Modal Component (only used for bulk actions now)
  const ConfirmationModal = ({
    visible,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    destructive = false,
    isLoading = false,
  }: any) => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-center items-center bg-black/50">
          <TouchableWithoutFeedback>
            <View className="bg-white rounded-2xl w-80 p-6">
              <Text className="text-xl font-bold text-gray-900 mb-2">{title}</Text>
              <Text className="text-gray-600 mb-6">{message}</Text>

              <View className="flex-row justify-end gap-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="px-4 py-2 rounded-full bg-gray-100"
                  disabled={isLoading}
                >
                  <Text className="text-gray-700 font-medium">{cancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onConfirm}
                  className={`px-4 py-2 rounded-full flex-row items-center ${
                    destructive ? "bg-red-500" : "bg-blue-500"
                  } ${isLoading ? "opacity-70" : ""}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white font-medium ml-2">
                        {confirmText === "Delete All" ? "Deleting..." : "Processing..."}
                      </Text>
                    </>
                  ) : (
                    <Text className="text-white font-medium">{confirmText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Bulk Action Modals (no modal for single delete) */}
      <ConfirmationModal
        visible={markAllModal.visible}
        onClose={() => !isMarkingAll && setMarkAllModal({ visible: false })}
        onConfirm={handleMarkAllAsRead}
        title="Mark All as Read"
        message={`Mark all ${unreadCount} notifications as read?`}
        confirmText="Mark All"
        destructive={false}
        isLoading={isMarkingAll}
      />

      <ConfirmationModal
        visible={deleteAllModal.visible}
        onClose={() => !isDeletingAll && setDeleteAllModal({ visible: false })}
        onConfirm={handleDeleteAll}
        title="Delete All Notifications"
        message={`Are you sure you want to delete all ${notifications.length} notifications?`}
        confirmText="Delete All"
        destructive={true}
        isLoading={isDeletingAll}
      />

      <ConfirmationModal
        visible={deleteReadModal.visible}
        onClose={() => !isDeletingRead && setDeleteReadModal({ visible: false })}
        onConfirm={handleDeleteRead}
        title="Delete Read Notifications"
        message={`Delete ${notifications.filter((n) => n.read).length} read notifications?`}
        confirmText="Delete"
        destructive={true}
        isLoading={isDeletingRead}
      />

      {/* Main Content - Wrapped in TouchableWithoutFeedback for outside clicks */}
      <TouchableWithoutFeedback onPress={closeOptions}>
        <View className="flex-1">
          {/* Header */}
          <View className="bg-white px-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row items-center py-4"
              >
                <Ionicons name="arrow-back-outline" size={24} color="#242526" />
                <Text className="text-lg font-bold text-[#242526] ml-1">Back</Text>
              </TouchableOpacity>

              {/* Options Button */}
              {notifications.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowOptions(!showOptions)}
                  className="p-2"
                >
                  <View className="w-1 h-1 bg-gray-600 rounded-full mb-1" />
                  <View className="w-1 h-1 bg-gray-600 rounded-full mb-1" />
                  <View className="w-1 h-1 bg-gray-600 rounded-full" />
                </TouchableOpacity>
              )}
            </View>
            {/* Title */}
            <Text className="text-2xl font-bold text-black mt-">
              Notifications
            </Text>
            {unreadCount > 0 && (
              <Text className="text-sm text-blue-600 mt-0.5 mb-2">
                {unreadCount} unread
              </Text>
            )}

            {/* Options Menu - Positioned absolutely */}
            {showOptions && notifications.length > 0 && (
              <View className="absolute top-16 right-4 bg-white rounded-lg shadow-lg border border-gray-200 z-10 w-56">
                <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-100">
                  <Text className="font-semibold text-gray-700">Options</Text>
                  <TouchableOpacity onPress={closeOptions}>
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setMarkAllModal({ visible: true });
                    setShowOptions(false);
                  }}
                  className="flex-row items-center px-4 py-3 border-b border-gray-100"
                >
                  <Ionicons name="checkmark-done" size={20} color="#3B82F6" />
                  <Text className="ml-3 text-gray-700">Mark all as read</Text>
                  {unreadCount > 0 && (
                    <Text className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                      {unreadCount}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setDeleteReadModal({ visible: true });
                    setShowOptions(false);
                  }}
                  className="flex-row items-center px-4 py-3 border-b border-gray-100"
                >
                  <Feather name="check-square" size={20} color="#10B981" />
                  <Text className="ml-3 text-gray-700">Delete read</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setDeleteAllModal({ visible: true });
                    setShowOptions(false);
                  }}
                  className="flex-row items-center px-4 py-3"
                >
                  <Feather name="trash-2" size={20} color="#EF4444" />
                  <Text className="ml-3 text-red-600">Delete all</Text>
                  <Text className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {notifications.length}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Notifications List */}
          <ScrollView
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {isLoading ? (
              <View className="flex-1 justify-center items-center py-20">
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : notifications.length === 0 ? (
              <View className="flex-1 justify-center items-center py-20 px-4">
                <View className="rounded-full items-center justify-center">
                  <Image
                    source={emptyBellIconx}
                    className="w-24 h-24"
                    resizeMode="contain"
                  />
                </View>
                <Text className="text-gray-800 text-lg mt-4 text-center">
                  No notifications yet
                </Text>
                <Text className="text-gray-500 text-sm mt-2 text-center">
                  When you get notifications, they'll appear here
                </Text>
              </View>
            ) : (
              <>
                {notifications.map((notification: any) => (
                  <TouchableWithoutFeedback key={notification._id} onPress={closeOptions}>
                    <View
                      className={`${getItemBackground(
                        notification.read
                      )} border-b border-gray-100`}
                    >
                      <View className="flex-row p-4">
                        {/* Icon */}
                        <View className="mr-3 mt-1">
                          {getNotificationIcon(notification.type)}
                        </View>

                        {/* Content */}
                        <View className="flex-1">
                          <View className="flex-row items-start justify-between">
                            <Text className="font-semibold text-gray-900 flex-1">
                              {notification.type
                                .split("_")
                                .map(
                                  (word: any) =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                )
                                .join(" ")}
                            </Text>
                            <Text className="text-xs text-gray-500 ml-2">
                              {formatTime(notification.createdAt)}
                            </Text>
                          </View>

                          <Text className="text-gray-600 text-sm mt-1 leading-5">
                            {notification.content}
                          </Text>

                          {/* Actions */}
                          <View className="flex-row mt-3 space-x-3">
                            {!notification.read && (
                              <TouchableOpacity
                                onPress={() => handleMarkAsRead(notification._id)}
                                className="flex-row items-center mr-4"
                              >
                                <Ionicons name="checkmark" size={16} color="#3B82F6" />
                                <Text className="text-blue-600 text-xs ml-1">
                                  Mark read
                                </Text>
                              </TouchableOpacity>
                            )}

                            {/* Single delete button - no modal, shows spinner while deleting */}
                            <TouchableOpacity
                              onPress={() => handleDeleteSingle(notification._id)}
                              disabled={deletingId === notification._id}
                              className="flex-row items-center"
                            >
                              {deletingId === notification._id ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                              ) : (
                                <>
                                  <Feather name="trash-2" size={16} color="#EF4444" />
                                  <Text className="text-red-600 text-xs ml-1">
                                    Delete
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                ))}
              </>
            )}

            {/* Bottom spacing */}
            <View className="h-8" />
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}