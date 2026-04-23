import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  Platform,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Path, Svg } from "react-native-svg";
import { router } from "expo-router";
import DropDownPicker from "react-native-dropdown-picker";
import Toast from "react-native-toast-message";
import {
  useCancelDeletionMutation,
  useDeleteMyAccountMutation,
  useGetUserStatusQuery,
} from "../../redux/features/user/userApi";
import { useGetUserQuery } from "../../redux/api/apiSlice";
import { useAppSelector } from "../../redux/store/store";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useCreateDeletionReasonMutation,
  useReverseDeleteDeletionReasonMutation,
} from "../../redux/features/deleterReasonsApi/deleteReasonsApi";

interface Reason {
  label: string;
  value: string;
}

export default function DeleteAccountScreen() {
  const { data: dataUser } = useGetUserQuery<any>();
  const userId = dataUser?.user?._id;
  const isDarkMode = useAppSelector((state) => state.theme.isDarkMode);
  const { width } = useWindowDimensions();

  // State
  const [modalVisible, setModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [reason, setReason] = useState("");
  const [isReasonOpen, setIsReasonOpen] = useState(false);

  // API Hooks
  const [
    createDeletionReason,
    {
      isLoading: loadingDelete,
      error: errorDelete,
      isSuccess: successSubmission,
    },
  ] = useCreateDeletionReasonMutation();

  const [
    deleteMyAccount,
    { error: deleteError, isSuccess: deleteSuccess, isLoading: isDeleting },
  ] = useDeleteMyAccountMutation<any>();

  const [
    cancelDeletion,
    {
      isLoading: loadingCancelDeletion,
      error: errorCancelDeletion,
      isSuccess: cancelSuccess,
    },
  ] = useCancelDeletionMutation();

  const [
    reverseDeleteDeletionReason,
    { isLoading: loadingReverseDeletionReason, isSuccess: reverseSuccess },
  ] = useReverseDeleteDeletionReasonMutation();

  const {
    data: statusData,
    isLoading: loadingStatus,
    isError: statusError,
    refetch,
  } = useGetUserStatusQuery<any>(userId);

  // Reasons for deletion
  const reasons: Reason[] = [
    {
      label: "No longer using the service",
      value: "No longer using the service",
    },
    {
      label: "Difficulty navigating platform",
      value: "Difficulty navigating platform",
    },
    { label: "Account security concern", value: "Account security concern" },
    { label: "Privacy concern", value: "Privacy concern" },
    { label: "Personal reasons", value: "Personal reasons" },
  ];

  // Handle submission of deletion request
  const handleSubmit = () => {
    if (!reason) {
      Alert.alert("Error", "Please select a reason for deletion");
      return;
    }
    setModalVisible(true);
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      // First create deletion reason
      await createDeletionReason({ userId, reason }).unwrap();
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.data?.message || "Failed to process deletion request"
      );
      console.log(err.data?.message, "delete reason");
    }
  };

  // Handle account deletion
  const handleUserDeleteAccount = async () => {
    try {
      // Then initiate account deletion
      await deleteMyAccount(userId).unwrap();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.data?.message || "Failed to process deletion request"
      );
    }
  };

  // Handle cancellation of deletion
  const handleCancelDeletion = async () => {
    try {
      // First reverse the deletion reason
      await reverseDeleteDeletionReason(userId).unwrap();

      setCancelModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err.data?.message || "Failed to cancel deletion");
    }
  };

  const handleCancelUserDeletion = async () => {
    try {
      // Then cancel the account deletion
      await cancelDeletion(userId).unwrap();
      setCancelModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err.data?.message || "Failed to cancel deletion");
    }
  };

  // Effects for handling API responses
  useEffect(() => {
    if (successSubmission) {
      handleUserDeleteAccount();
    }
    if (reverseSuccess) {
      handleCancelUserDeletion();
    }
  }, [successSubmission, reverseSuccess]);

  // Effects for handling API responses
  useEffect(() => {
    if (deleteSuccess) {
      refetch();
    }
  }, [cancelSuccess]);

  useEffect(() => {
    if (deleteSuccess) {
      refetch();
    }
  }, [deleteSuccess]);

  useEffect(() => {
    if (errorDelete && "data" in errorDelete) {
      Alert.alert("Error", (errorDelete.data as { message: string }).message);
    }
  }, [errorDelete]);

  // Loading state
  if (loadingStatus || isDeleting) {
    return (
      <View
        className={`flex-1 items-center justify-center ${isDarkMode ? "bg-[#000c19]" : "bg-gray-100"
          }`}
      >
        <ActivityIndicator
          size="large"
          color={isDarkMode ? "white" : "black"}
        />
      </View>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-[#000c19]" : "bg-white"}`}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        animated={true}
        backgroundColor={isDarkMode ? "#000c19" : "#f5f5f5"}
      />

      <View
        className="px-4 flex-1"
        style={{ marginTop: Platform.OS === "ios" ? 10 : 10 }}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6 md:mt-6 pt-4">
          <View className="flex-col">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center mb-4"
            >
              <Ionicons name="arrow-back-outline" size={24} color="#242526" />
              <Text className="text-lg font-normal text-[#242526] ml-1">Back</Text>
            </TouchableOpacity>
            <Text
              className={`${isDarkMode ? "text-gray-300" : "text-[#333]"
                } text-xl font-semibold md:text-2xl`}
            >
              Delete My Account
            </Text>

            <Text className="text-gray-600 w-[80%] mt-2">
              It takes 7 days for your account to be fully deleted from our database.
            </Text>
          </View>
        </View>

        {/* Main Content */}
        {statusData?.data?.status === "pending-deletion" ? (
          <View
            className={`${isDarkMode ? "bg-gray-900 " : "bg-white "
              } py-6 px-2 rounded-lg`}
          >
            <Text
              className={`${isDarkMode ? "text-white" : "text-gray-800"
                } text-lg md:text-2xl font-bold mb-4`}
            >
              Account Scheduled for Deletion
            </Text>

            <View
              className={`${isDarkMode ? "bg-blue-900/20" : "bg-blue-200"
                } p-4 rounded-lg mb-6`}
            >
              <Text
                className={`${isDarkMode ? "text-blue-50" : "text-[#1969fe]"
                  } text-center text-lg font-medium `}
              >
                {statusData.data.daysRemaining} day
                {statusData.data.daysRemaining !== 1 ? "s" : ""} remaining
              </Text>
            </View>

            <Text
              className={`${isDarkMode ? "text-gray-300" : "text-gray-600"
                } mb-2`}
            >
              Scheduled for:{" "}
              {new Date(statusData.data.deletionRequestDate).toLocaleString()}
            </Text>

            <Text
              className={`${isDarkMode ? "text-gray-300" : "text-gray-600"
                } mb-6`}
            >
              You can cancel this deletion anytime before the scheduled date.
            </Text>

            <TouchableOpacity
              onPress={() => setCancelModalVisible(true)}
              disabled={loadingCancelDeletion || loadingReverseDeletionReason}
              className={`bg-[#1969fe] py-3 rounded-full ${loadingCancelDeletion || loadingReverseDeletionReason
                ? "opacity-50"
                : ""
                }`}
            >
              {loadingCancelDeletion || loadingReverseDeletionReason ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-medium">
                  Cancel Deletion
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View
            className={`${isDarkMode ? "bg-gray-900 " : "bg-white "
              } py-6 px-2 rounded-lg`}
          >
            <Text
              className={`${isDarkMode ? "text-white" : "text-gray-800"
                } text-lg md:text-2xl font-bold mb-2`}
            >
              Account Status: Active
            </Text>
            <Text
              className={`${isDarkMode ? "text-gray-300" : "text-gray-600"
                } text-sm md:text-lg mb-6`}
            >
              Please provide a reason to help us improve our services.
            </Text>

            {/* Reason Picker */}
            <View className="mb-6 z-10">
              <DropDownPicker
                open={isReasonOpen}
                value={reason}
                items={reasons}
                setOpen={setIsReasonOpen}
                setValue={setReason}
                placeholder="Select reason"
                placeholderStyle={{
                  color: isDarkMode ? "#9CA3AF" : "#6B7280",
                }}
                style={{
                  borderColor: isDarkMode ? "#374151" : "#D1D5DB",
                  borderRadius: 8,
                  minHeight: width > 600 ? 80 : 50,
                  backgroundColor: isDarkMode ? "#1F2937" : "#F3F4F6",
                }}
                textStyle={{
                  color: isDarkMode ? "#F3F4F6" : "#111827",
                  fontSize: width > 600 ? 20 : 16,
                }}
                dropDownContainerStyle={{
                  borderColor: isDarkMode ? "#374151" : "#D1D5DB",
                  backgroundColor: isDarkMode ? "#1F2937" : "#F3F4F6",
                }}
                listItemLabelStyle={{
                  color: isDarkMode ? "#F3F4F6" : "#111827",
                }}
                labelStyle={{ fontWeight: "500" }}
              />
            </View>

            {/* Delete Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!reason || loadingDelete}
              className={`bg-[#1969fe] py-4 rounded-full ${!reason || loadingDelete ? "opacity-50" : ""
                }`}
            >
              {loadingDelete ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-bold">
                  Delete Account
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        handleDelete={handleDeleteAccount}
        isLoading={loadingDelete}
        isDarkMode={isDarkMode}
        type="delete"
      />

      {/* Cancel Deletion Confirmation Modal */}
      <DeleteModal
        modalVisible={cancelModalVisible}
        setModalVisible={setCancelModalVisible}
        handleDelete={handleCancelDeletion}
        isLoading={loadingCancelDeletion || loadingReverseDeletionReason}
        isDarkMode={isDarkMode}
        type="cancel"
      />

      <Toast />
    </SafeAreaView>
  );
}

interface DeleteModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  handleDelete: () => void;
  isLoading: boolean;
  isDarkMode: boolean;
  type: "delete" | "cancel";
}

const DeleteModal = ({
  modalVisible,
  setModalVisible,
  handleDelete,
  isLoading,
  isDarkMode,
  type,
}: DeleteModalProps) => {

  return (
    <Modal
      animationType="fade"
      transparent
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View
          className={`w-full md:w-[55%] max-w-md rounded-xl ${isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            {isLoading ? (
              <View className="items-center p-6">
                <ActivityIndicator
                  size="large"
                  color={isDarkMode ? "white" : "#0079ff"}
                />
                <Text
                  className={`mt-4 text-lg ${isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                >
                  Processing your request...
                </Text>
              </View>
            ) : (
              <View className="p-6 items-center">
                <View
                  className={`${type === "delete"
                    ? "bg-red-100 dark:bg-red-900/20"
                    : "bg-blue-100 dark:bg-blue-900/20"
                    } p-4 rounded-full mb-4`}
                >
                  <Svg width={60} height={60} viewBox="0 0 24 24">
                    <Path
                      d={
                        type === "delete"
                          ? "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                          : "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 13h2v2h-2zm0-8h2v6h-2z"
                      }
                      fill={type === "delete" ? "#ef4444" : "#3b82f6"}
                    />
                  </Svg>
                </View>

                <Text
                  className={`text-xl font-bold mt-4 ${isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                >
                  {type === "delete"
                    ? "Confirm Account Deletion"
                    : "Confirm Cancellation"}
                </Text>

                <Text
                  className={`text-center mt-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                >
                  {type === "delete"
                    ? "Your account will be scheduled for deletion in 7 days. During this period:"
                    : "Are you sure you want to cancel the account deletion?"}
                </Text>

                {type === "delete" ? (
                  <View className="mt-4 mb-6 w-full">
                    <View className="flex-row items-start mb-2">
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        style={{ marginTop: 2, marginRight: 8 }}
                      />
                      <Text
                        className={`flex-1 ${isDarkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                      >
                        You can cancel the deletion anytime within 7 days
                      </Text>
                    </View>

                    <View className="flex-row items-start">
                      <Ionicons
                        name="warning-outline"
                        size={18}
                        color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        style={{ marginTop: 2, marginRight: 8 }}
                      />
                      <Text
                        className={`flex-1 ${isDarkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                      >
                        After 7 days, all your data will be permanently deleted
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text
                    className={`mt-4 mb-6 ${isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                  >
                    Your account will remain active and all data will be
                    preserved.
                  </Text>
                )}

                <View className="flex-row border-t border-gray-200 dark:border-gray-700 w-full">
                  <TouchableOpacity
                    className="flex-1 p-4 items-center border-r border-gray-200 dark:border-gray-700"
                    onPress={() => setModalVisible(false)}
                  >
                    <Text className="text-blue-500 dark:text-blue-400 font-medium">
                      {type === "delete" ? "Cancel" : "No, Keep Scheduled"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 p-4 items-center rounded-full "
                    onPress={handleDelete}
                  >
                    <Text
                      className={`${type === "delete"
                        ? "text-red-500 dark:text-red-400"
                        : "text-green-500 dark:text-green-400"
                        } font-medium`}
                    >
                      {type === "delete" ? "Confirm" : "Yes, Cancel Deletion"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
