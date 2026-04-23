import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useGetUserQuery } from "@/redux/api/apiSlice";
import { useGetMyDeliveriesQuery } from "@/redux/features/deliveryApi/deliveryApi";
import { useCreateReportMutation, useUploadImagesMutation } from "@/redux/features/report/offeringApi";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import DropDownPicker from "react-native-dropdown-picker";


import success from "../../assets/images/success-icon.png";
import info from "../../assets/images/info.png";

// Format delivery for display
const formatDeliveryLabel = (delivery: any) => {
  const date = new Date(delivery.createdAt).toLocaleDateString();
  const time = new Date(delivery.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const status = delivery.status.replace('_', ' ').toUpperCase();
  return `#${delivery.trackingId} - ${date}, ${time} (${status})`;
};

const Issue_Type = [
  { label: "Damaged Item", value: "damaged" },
  { label: "Can't reach the customer", value: "customer unavailable" },
  { label: "Bad Weather", value: "bad weather" },
  { label: "Other", value: "other" },
];

export default function ReportIssueScreen() {
  const router = useRouter();

  // Form states
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);

  // Dropdown states
  const [showDeliveryDropdown, setShowDeliveryDropdown] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successTitle, setSuccessTitle] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Queries & Mutations
  const { data: userData }: any = useGetUserQuery();
  const id = userData?.user?._id;

  const {
    data: mydeliveries,
    isLoading: loading,
    refetch: refetchDeliveries,
  } = useGetMyDeliveriesQuery(id);

  const [createReport, { isLoading: isSubmitting }] = useCreateReportMutation();
  const [uploadImages] = useUploadImagesMutation();

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchDeliveries();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchDeliveries]);

  // Show Error Modal
  const showErrorModal = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorModalVisible(true);
  };

  // Show Success Modal
  const showSuccessModal = (title: string, message: string) => {
    setSuccessTitle(title);
    setSuccessMessage(message);
    setSuccessModalVisible(true);
  };

  // Pick and upload images
  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showErrorModal('Permission Required', 'Permission to access media library is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setUploading(true);

        const base64Images = result.assets.map(asset =>
          `data:image/jpeg;base64,${asset.base64}`
        );

        const uploadResult = await uploadImages({ images: base64Images }).unwrap();

        setImages(prev => [...prev, ...uploadResult.images]);
        showSuccessModal('Images Uploaded', `${uploadResult.images.length} image(s) uploaded successfully!`);
      }
    } catch (error: any) {
      console.error("Image upload error:", error);
      showErrorModal('Upload Failed', error?.data?.message || 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    showSuccessModal('Image Removed', 'Image removed successfully');
  };

  // Select delivery
  const selectDelivery = (delivery: any) => {
    setSelectedDelivery(delivery);
    setShowDeliveryDropdown(false);
  };

  // Form validation
  const validateForm = (): boolean => {
    if (!selectedDelivery) {
      showErrorModal('Validation Error', 'Please select a delivery');
      return false;
    }
    if (!selectedIssueType) {
      showErrorModal('Validation Error', 'Please select an issue type');
      return false;
    }
    if (!description.trim()) {
      showErrorModal('Validation Error', 'Please provide a description');
      return false;
    }
    if (description.trim().length < 10) {
      showErrorModal('Validation Error', 'Description must be at least 10 characters long');
      return false;
    }
    return true;
  };

  // Submit report
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const deliveryType = selectedDelivery.deliveryPartner ? "delivery2" : "delivery1";

      const reportData: any = {
        deliveryId: selectedDelivery._id,
        deliveryCode: selectedDelivery.trackingId,
        deliveryType,
        issueType: selectedIssueType,
        description: description.trim(),
        customerName: `${selectedDelivery.customer.firstName} ${selectedDelivery.customer.lastName}`,
        customerPhone: selectedDelivery.customer.phone,
      };

      if (images.length > 0) {
        reportData.images = images;
      }

      await createReport(reportData).unwrap();

      showSuccessModal(
        'Report Submitted Successfully',
        'Thank you! Our support team will review your report and get back to you shortly.'
      );

      // Optional: Auto go back after success
      // setTimeout(() => router.back(), 2000);

    } catch (error: any) {
      console.error("Submit error:", error);
      showErrorModal(
        'Submission Failed',
        error?.data?.message || 'Failed to submit your report. Please try again.'
      );
    }
  };

  // Filter reportable deliveries
  const reportableDeliveries = mydeliveries?.deliveries?.filter(
    (delivery: any) => delivery.status !== 'cancelled' && delivery.status !== 'delivered'
  ) || [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0052FF"]} tintColor="#0052FF" />
        }
      >
        {/* Header */}
        <View className="px-4 py-4">
          <View className="flex-row justify-start gap-2 items-center mb-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back-outline" size={24} color="#242526" />
            </TouchableOpacity>
            <Text className="text-lg font-normal text-[#242526]">Back</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900">Report an Issue</Text>
          <Text className="text-gray-600 mt-2">
            Tell us what went wrong so we can help resolve it quickly.
          </Text>
        </View>

        <View className="px-4 py-6">
          {loading && (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#0052FF" />
              <Text className="text-gray-600 mt-4">Loading deliveries...</Text>
            </View>
          )}

          {!loading && reportableDeliveries.length === 0 && (
            <View className="py-8 items-center bg-gray-50 rounded-lg">
              <Text className="text-gray-500 text-center">
                No active deliveries found.{'\n'}
                You can only report issues for in-progress deliveries.
              </Text>
            </View>
          )}

          {!loading && reportableDeliveries.length > 0 && (
            <>
              {/* Select Delivery */}
              <Text className="text-gray-900 font-semibold mb-2">
                Select Delivery <Text className="text-red-500">*</Text>
              </Text>
              <View className="relative mb-6 z-40">
                <TouchableOpacity
                  onPress={() => setShowDeliveryDropdown(!showDeliveryDropdown)}
                  className={`border rounded-lg px-4 py-3 flex-row items-center justify-between bg-white ${showDeliveryDropdown ? 'border-blue-500' : 'border-gray-300'}`}
                >
                  <Text className={selectedDelivery ? "text-gray-900" : "text-gray-500"}>
                    {selectedDelivery ? formatDeliveryLabel(selectedDelivery) : "Choose a delivery..."}
                  </Text>
                  <Feather name="chevron-down" size={20} color={showDeliveryDropdown ? "#0052FF" : "#999"} />
                </TouchableOpacity>

                {showDeliveryDropdown && (
                  <View className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 z-50">
                    <ScrollView>
                      {reportableDeliveries.map((delivery: any) => (
                        <TouchableOpacity
                          key={delivery._id}
                          onPress={() => selectDelivery(delivery)}
                          className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                        >
                          <Text className="text-gray-900 font-medium">{formatDeliveryLabel(delivery)}</Text>
                          <Text className="text-gray-500 text-xs mt-1">
                            From: {delivery.pickup.address.substring(0, 35)}...
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Issue Type */}
              <View className="mb-6 z-30">
                <Text className="text-gray-900 font-semibold mb-2">
                  Issue Type <Text className="text-red-500">*</Text>
                </Text>
                <DropDownPicker
                  open={issueOpen}
                  value={selectedIssueType}
                  items={Issue_Type}
                  setOpen={setIssueOpen}
                  setValue={setSelectedIssueType}
                  placeholder="Select issue type..."
                  placeholderStyle={{ color: "#9CA3AF" }}
                  style={{
                    borderColor: "#D1D5DB",
                    borderRadius: 8,
                    minHeight: 50,
                    backgroundColor: "#FFFFFF",
                  }}
                  dropDownContainerStyle={{
                    borderColor: "#D1D5DB",
                    borderRadius: 8,
                    backgroundColor: "#FFFFFF",
                  }}
                  textStyle={{ color: "#374151", fontSize: 16 }}
                  selectedItemLabelStyle={{ fontWeight: "600", color: "#0052CC" }}
                  ArrowDownIconComponent={() => <Ionicons name="chevron-down" size={20} color="#6B7280" />}
                  ArrowUpIconComponent={() => <Ionicons name="chevron-up" size={20} color="#6B7280" />}
                  TickIconComponent={() => <Ionicons name="checkmark" size={20} color="#0052CC" />}
                  zIndex={3000}
                  zIndexInverse={1000}
                />
              </View>

              {/* Selected Delivery Details */}
              {selectedDelivery && (
                <View className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                  <Text className="text-blue-800 font-semibold mb-2">Selected Delivery</Text>
                  <Text className="text-blue-700 text-sm">Code: {selectedDelivery.trackingId}</Text>
                  <Text className="text-blue-700 text-sm">Status: {selectedDelivery.status.replace('_', ' ')}</Text>
                  <Text className="text-blue-700 text-sm">From: {selectedDelivery.pickup.address}</Text>
                  <Text className="text-blue-700 text-sm">To: {selectedDelivery.delivery.address}</Text>
                </View>
              )}

              {/* Description */}
              <Text className="text-gray-900 font-semibold mb-2">
                Description <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className={`border rounded-lg px-4 py-3 mb-1 text-gray-900 min-h-[120px] ${description.length > 0 && description.length < 10 ? 'border-red-300' : 'border-gray-300'}`}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the issue in detail..."
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
              {description.length > 0 && description.length < 10 && (
                <Text className="text-red-500 text-xs mb-4 ml-1">
                  Description must be at least 10 characters
                </Text>
              )}

              {/* Uploaded Images */}
              {images.length > 0 && (
                <View className="mb-6 mt-4">
                  <Text className="text-gray-900 font-semibold mb-3">
                    Uploaded Images ({images.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {images.map((image, index) => (
                      <View key={index} className="mr-3 relative">
                        <Image source={{ uri: image }} className="w-24 h-24 rounded-lg border border-gray-200" />
                        <TouchableOpacity
                          onPress={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 border-2 border-white"
                        >
                          <MaterialIcons name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Add Photos */}
              <TouchableOpacity
                onPress={pickImages}
                disabled={uploading || isSubmitting}
                className="border-2 border-dashed border-blue-300 mt-4 rounded-lg py-6 px-4 items-center mb-8 bg-blue-50/30"
              >
                {uploading ? (
                  <View className="items-center">
                    <ActivityIndicator size="large" color="#0052FF" />
                    <Text className="text-gray-600 text-sm mt-2">Uploading images...</Text>
                  </View>
                ) : (
                  <>
                    <MaterialIcons name="add-photo-alternate" size={32} color="#0052FF" />
                    <Text className="text-gray-900 font-semibold mt-2">Add photos (optional)</Text>
                    <Text className="text-gray-500 text-sm mt-1 text-center px-4">
                      Photos of the package or damage can help us resolve this faster.
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting || uploading || !selectedDelivery || !selectedIssueType}
                className={`rounded-full py-4 items-center ${isSubmitting || uploading || !selectedDelivery || !selectedIssueType ? "bg-blue-300" : "bg-[#1969fe]"}`}
              >
                <Text className="text-white font-bold text-lg">
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </Text>
              </TouchableOpacity>

              <Text className="text-gray-400 text-xs text-center mt-4">
                Fields marked with <Text className="text-red-500">*</Text> are required
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* ==================== SUCCESS MODAL ==================== */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white rounded-3xl px-8 py-10 items-center max-w-sm w-full">
            <Image
              source={success}
              className="w-24 h-24"
              resizeMode="contain"
            />
            <Text className="text-2xl font-bold text-gray-900 mt-6 text-center">
              {successTitle}
            </Text>

            <Text className="text-gray-600 text-center mt-3 leading-5">
              {successMessage}
            </Text>

            <TouchableOpacity
              onPress={() => {
                setSuccessModalVisible(false);
                // Optional: Go back after closing success modal
                // router.back();
              }}
              className="bg-[#1969fe] w-full py-4 rounded-2xl items-center mt-8"
            >
              <Text className="text-white font-semibold text-base">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================== ERROR MODAL ==================== */}
      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white rounded-3xl px-8 py-10 items-center max-w-sm w-full">
                <Image
              source={info}
              className="w-24 h-24"
              resizeMode="contain"
            />

            <Text className="text-2xl font-bold text-gray-900 mt-6 text-center">
              {errorTitle}
            </Text>

            <Text className="text-gray-600 text-center mt-3 leading-5">
              {errorMessage}
            </Text>

            <TouchableOpacity
              onPress={() => setErrorModalVisible(false)}
              className="bg-red-500 w-full py-4 rounded-2xl items-center mt-8"
            >
              <Text className="text-white font-semibold text-base">Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}