import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // ✅ added for navigation
import {
    useCancelDeliveryMutation,
    useConfirmDeliveryByPartnerMutation,
    useMarkAsInTransitMutation,
    useMarkAsPickedUpMutation,
} from '@/redux/features/deliveryStatusApi/deliveryStatusApi';

import SuccessIcon from "../assets/images/success-icon.png";

// Predefined cancellation reasons
const CANCELLATION_REASONS = [
    { label: 'Customer Request', value: 'customer_request' },
    { label: 'Unavailable', value: 'partner_unavailable' },
    { label: 'Bad Weather', value: 'bad_weather' },
    { label: 'Vehicle Issue', value: 'vehicle_issue' },
    { label: 'Address Issue', value: 'address_issue' },
    { label: 'Other', value: 'other' },
];

interface DeliveryStatusChangeModalProps {
    deliveryId: any;
    userId: string;
    data?: any;
    tracking?: any;
    handleRefresh: () => void;
    deliveryConfirmationCode: any;
    setDeliveryConfirmationCode: any;
    showCodeModal: boolean;
    setHideSheet: any;
    setShowCodeModal: (show: boolean) => void;
    currentUser?: any;
}

export default function DeliveryStatusChange({
    deliveryId,
    userId,
    data,
    tracking,
    setHideSheet,
    handleRefresh,
    deliveryConfirmationCode = [], // Default to empty array to prevent undefined
    setDeliveryConfirmationCode,
    showCodeModal,
    setShowCodeModal,
    currentUser,
}: DeliveryStatusChangeModalProps) {
    const router = useRouter(); // ✅ for navigation after success

    // Local states
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedCancelReason, setSelectedCancelReason] = useState<string | null>(null);
    const [customCancelReason, setCustomCancelReason] = useState('');
    const [confirmError, setConfirmError] = useState('');

    // ✅ Success modal state
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [successModalTitle, setSuccessModalTitle] = useState('');
    const [successModalMessage, setSuccessModalMessage] = useState('');
    const [successModalTrackingId, setSuccessModalTrackingId] = useState('');
    const [countdown, setCountdown] = useState(3);

    const isDeliveryPartner = currentUser?.userType === 'delivery_partner';

    // Refs for OTP inputs
    const inputRefs = useRef<TextInput[]>([]);

    // Mutations
    const [markAsPickedUp, { isLoading: isPickingUp }] = useMarkAsPickedUpMutation();
    const [markAsInTransit, { isLoading: isInTransit }] = useMarkAsInTransitMutation();
    const [confirmByPartner, { isLoading: isConfirmingByPartner }] = useConfirmDeliveryByPartnerMutation();
    const [cancelDelivery, { isLoading: isCancelling }] = useCancelDeliveryMutation();

    // Use tracking data as primary source
    const mergedDelivery = tracking || data?.tracking;
    const currentStatus = mergedDelivery?.status;

    const isCancelled = currentStatus === 'cancelled';
    const isDelivered = currentStatus === 'delivered';
    const isAssigned = currentStatus === 'request_accepted';
    const isPickedUp = currentStatus === 'picked_up';
    const isInTransitStatus = currentStatus === 'in_transit';

    const cancelledByCurrentUser = isCancelled && mergedDelivery?.cancelledBy === userId;

    // Reset code when modal is closed
    useEffect(() => {
        if (!showCodeModal) {
            setDeliveryConfirmationCode(Array(5).fill(''));
            setConfirmError('');
        }
    }, [showCodeModal, setDeliveryConfirmationCode]);

    // ✅ Auto‑navigate countdown effect for success modal
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
        setHideSheet(false); // ensure bottom sheet is visible again if needed
        router.replace("/deliveries");
    };

    const getCancellationReasonLabel = (value: string) => {
        const reason = CANCELLATION_REASONS.find((r) => r.value === value);
        return reason?.label || value;
    };

    const resetCancelModal = () => {
        setShowCancelModal(false);
        setSelectedCancelReason(null);
        setCustomCancelReason('');
    };

    const showCancellationConfirmation = () => {
        setShowCancelModal(true);
    };

    // Handle Cancel Delivery – show success modal on success
    const handleCancelDelivery = async () => {
        if (!selectedCancelReason) {
            Alert.alert('Error', 'Please select a cancellation reason');
            return;
        }
        if (selectedCancelReason === 'other' && !customCancelReason.trim()) {
            Alert.alert('Error', 'Please provide details for "Other" reason');
            return;
        }

        const finalReason =
            selectedCancelReason === 'other'
                ? `other: ${customCancelReason.trim()}`
                : selectedCancelReason;

        try {
            await cancelDelivery({
                deliveryId: mergedDelivery?.deliveryId || deliveryId,
                reason: finalReason,
                userId,
            }).unwrap();

            // ✅ Show success modal for cancellation
            setSuccessModalTitle('Delivery Cancelled');
            setSuccessModalMessage('Your delivery has been cancelled successfully.');
            setSuccessModalTrackingId(mergedDelivery?.trackingId || '');
            setSuccessModalVisible(true);
            setCountdown(3);

            resetCancelModal();
            handleRefresh(); // refresh data in background
        } catch (error: any) {
            Alert.alert('Error', error?.data?.message || 'Failed to cancel delivery');
        }
    };

    // Mark as Picked Up
    const handleMarkAsPickedUp = async () => {
        try {
            await markAsPickedUp({ deliveryId, userId }).unwrap();
            handleRefresh();
        } catch (error: any) {
            Alert.alert('Error', error?.data?.message || 'Failed to mark as picked up');
        }
    };

    // Mark as In Transit
    const handleMarkAsInTransit = async () => {
        try {
            await markAsInTransit({ deliveryId, userId }).unwrap();
            handleRefresh();
        } catch (error: any) {
            Alert.alert('Error', error?.data?.message || 'Failed to mark as in transit');
        }
    };

    // Open Confirm Delivery Code Modal
    const handleMarkAsDelivered = () => {
        setHideSheet(true);
        setShowCodeModal(true);
        setConfirmError('');
    };

    // OTP Handlers
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return;

        const newCode = [...deliveryConfirmationCode];
        newCode[index] = value;
        setDeliveryConfirmationCode(newCode);
        setConfirmError('');

        if (value && index < 4) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyPress = (index: number, key: string) => {
        if (key === 'Backspace' && !deliveryConfirmationCode[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (text: string) => {
        const digits = text.replace(/\D/g, '').slice(0, 5);
        const newCode = Array(5).fill('');
        digits.split('').forEach((digit, i) => {
            newCode[i] = digit;
        });
        setDeliveryConfirmationCode(newCode);
        setConfirmError('');
        if (digits.length === 5) {
            inputRefs.current[4]?.focus();
        }
    };

    // Confirm Delivery by Partner – show success modal on success
    const handleConfirmDeliveryPartner = async () => {
        const code = deliveryConfirmationCode.join('').trim();
        setConfirmError('');

        if (code.length !== 5) {
            setConfirmError('Please enter a valid 5-digit code');
            return;
        }

        const finalDeliveryId = mergedDelivery?._id || mergedDelivery?.deliveryId || deliveryId;

        try {
            await confirmByPartner({
                deliveryId: finalDeliveryId,
                code,
                userId,
            }).unwrap();

            // ✅ Show success modal for delivery completion
            setSuccessModalTitle('Delivery Completed!');
            setSuccessModalMessage('You have successfully completed this delivery.');
            setSuccessModalTrackingId(mergedDelivery?.trackingId || '');
            setSuccessModalVisible(true);
            setCountdown(3);

            setShowCodeModal(false);
            setDeliveryConfirmationCode(Array(5).fill(''));
            setConfirmError('');
            handleRefresh();
        } catch (error: any) {
            const errorMessage = error?.data?.message || 'Invalid confirmation code';
            setConfirmError(errorMessage);
        }
    };

    // Safe code length check
    const codeLength = Array.isArray(deliveryConfirmationCode)
        ? deliveryConfirmationCode.join('').length
        : 0;

    // Render action buttons for delivery partner
    const renderDeliveryPartnerActions = () => {
        if (!isDeliveryPartner || !mergedDelivery) return null;

        // If cancelled by this partner
        if (isCancelled && cancelledByCurrentUser) {
            return (
                <View className="bg-gray-50 p-4 rounded-lg mb-4 items-center border-l-4 border-l-red-500">
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

        // No actions if already delivered or cancelled by someone else
        if (isDelivered || (isCancelled && !cancelledByCurrentUser)) return null;

        // Assigned status
        if (isAssigned) {
            return (
                <View className="mb-4 gap-3">
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
                        onPress={showCancellationConfirmation}
                        disabled={isCancelling}
                    >
                        <Text className="text-white text-base font-semibold">Cancel Delivery</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Picked up status
        if (isPickedUp) {
            return (
                <View className="mb-4 gap-3">
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

        // In transit status - Confirm Delivery
        if (isInTransitStatus) {
            return (
                <View className="mb-4">
                    <TouchableOpacity
                        className="bg-[#1969fe] py-3.5 rounded-full items-center justify-center flex-row gap-2"
                        onPress={handleMarkAsDelivered}
                        disabled={isConfirmingByPartner}
                    >
                        {isConfirmingByPartner ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-white text-base font-semibold">Mark as Delivered</Text>
                        )}
                    </TouchableOpacity>
                </View>
            );
        }

        return null;
    };

    return (
        <View className="mt-4">
            {renderDeliveryPartnerActions()}

            {/* ==================== CONFIRM DELIVERY CODE MODAL ==================== */}
            <Modal
                visible={showCodeModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCodeModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center px-4">
                    <View className="bg-white rounded-2xl p-6 w-full max-w-[400px]">
                        <View className="items-end">
                            <TouchableOpacity onPress={() => setShowCodeModal(false)}>
                                <Ionicons name="close-sharp" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-xl font-bold text-black text-center mb-1">
                            Confirm Delivery
                        </Text>

                        {confirmError ? (
                            <Text className="text-red-500 text-center font-medium mb-4">
                                {confirmError}
                            </Text>
                        ) : null}

                        <Text className="text-sm text-gray-500 text-center mb-6 leading-5">
                            Ask the receiver for their 5-digit delivery code and enter it below to confirm this delivery.
                        </Text>

                        <View className="flex-row justify-center gap-3 mb-8">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => {
                                        if (ref) inputRefs.current[index] = ref;
                                    }}
                                    className={`w-12 h-14 border-2 rounded-xl text-center text-2xl font-semibold ${
                                        deliveryConfirmationCode[index]
                                            ? 'border-[#1969fe] bg-blue-50 text-[#1969fe]'
                                            : 'border-gray-300 text-gray-900 bg-white'
                                    }`}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    value={deliveryConfirmationCode[index] || ''}
                                    onChangeText={(value) => handleOtpChange(index, value)}
                                    onKeyPress={({ nativeEvent: { key } }) => handleOtpKeyPress(index, key)}
                                    onPaste={(e) => handlePaste(e.nativeEvent.text)}
                                    selectTextOnFocus
                                    autoFocus={index === 0}
                                />
                            ))}
                        </View>

                        <TouchableOpacity
                            className="bg-[#1969fe] py-3.5 rounded-full items-center"
                            onPress={handleConfirmDeliveryPartner}
                            disabled={isConfirmingByPartner || codeLength !== 5}
                        >
                            {isConfirmingByPartner ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text className="text-white text-base font-semibold">Confirm Delivery</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ==================== CANCELLATION REASON MODAL ==================== */}
            <Modal
                visible={showCancelModal}
                transparent={true}
                animationType="slide"
                onRequestClose={resetCancelModal}
            >
                <View className="flex-1 bg-black/50 justify-center items-center px-4">
                    <View className="bg-white rounded-2xl p-6 w-full max-w-[400px]">
                        <Text className="text-xl font-bold text-black text-center mb-4">
                            Cancel Delivery
                        </Text>
                        <Text className="text-sm text-gray-500 text-center mb-4">
                            Please select a reason for cancellation
                        </Text>

                        <ScrollView className="max-h-64 mb-4">
                            {CANCELLATION_REASONS.map((reason) => (
                                <TouchableOpacity
                                    key={reason.value}
                                    className={`py-3 px-4 rounded-lg mb-2 border ${
                                        selectedCancelReason === reason.value
                                            ? 'border-[#1969fe] bg-blue-50'
                                            : 'border-gray-200 bg-white'
                                    }`}
                                    onPress={() => setSelectedCancelReason(reason.value)}
                                >
                                    <Text
                                        className={`text-base ${
                                            selectedCancelReason === reason.value
                                                ? 'text-[#1969fe] font-semibold'
                                                : 'text-gray-700'
                                        }`}
                                    >
                                        {reason.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {selectedCancelReason === 'other' && (
                            <TextInput
                                className="border border-gray-300 rounded-lg p-3 text-base mb-4"
                                placeholder="Please specify reason..."
                                value={customCancelReason}
                                onChangeText={setCustomCancelReason}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        )}

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 bg-gray-100 py-3.5 rounded-full border border-gray-300 items-center"
                                onPress={resetCancelModal}
                            >
                                <Text className="text-gray-500 text-base font-semibold">Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-1 bg-red-500 py-3.5 rounded-full items-center"
                                onPress={handleCancelDelivery}
                                disabled={isCancelling}
                            >
                                {isCancelling ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text className="text-white text-base font-semibold">Confirm Cancel</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ==================== SUCCESS MODAL (AUTO-NAVIGATION) ==================== */}
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
                                {successModalTitle}
                            </Text>
                        </View>

                        <View className="bg-gray-50 p-4 rounded-lg mb-4">
                            <Text className="text-center text-gray-600">
                                {successModalMessage}
                            </Text>
                        </View>

                        {successModalTrackingId ? (
                            <View className="bg-blue-50 p-3 rounded-lg mb-4">
                                <Text className="text-center text-blue-800 text-sm">
                                    Tracking ID: {successModalTrackingId}
                                </Text>
                            </View>
                        ) : null}

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
        </View>
    );
}