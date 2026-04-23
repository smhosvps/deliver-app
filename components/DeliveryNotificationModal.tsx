import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useCancelDeliveryMutation,
  useCancelMultipleDeliveriesMutation,
  useMarkAsAcceptedMutation,
} from '@/redux/features/deliveryStatusApi/deliveryStatusApi';
import { router } from 'expo-router';

const ACCEPT_TIMEOUT_SECONDS = 30;

interface DeliveryAnimation {
  widthAnim: Animated.Value;
  timeLeft: number;
  timer: NodeJS.Timeout | null;
  isAccepted: boolean;
  buttonWidth: number;
  buttonHeight: number;
}

export default function DeliveryNotificationModal({
  visible,
  deliveries,
  closeModal,   // now responsible for clearing offers and hiding modal
  onAccept,
  id,
}: any) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const animationsRef = useRef<Map<string, DeliveryAnimation>>(new Map());

  const [cancelMultiple, { isLoading: isCancellingAll }] = useCancelMultipleDeliveriesMutation();
  const [cancelDelivery, { isLoading: isCancelling }] = useCancelDeliveryMutation();
  const [markAsAccepted, { isLoading: isAccepted }] = useMarkAsAcceptedMutation();

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto‑close when no deliveries left
  useEffect(() => {
    if (visible && deliveries.length === 0) {
      closeModal();
    }
  }, [visible, deliveries, closeModal]);

  useEffect(() => {
    if (!visible) {
      setErrorModalVisible(false);
      setErrorTitle('');
      setErrorMessage('');
    }
  }, [visible]);

  const showErrorModal = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorModalVisible(true);
  };

  const stopTimer = (id: string) => {
    const anim = animationsRef.current.get(id);
    if (anim?.timer) {
      clearInterval(anim.timer);
      anim.timer = null;
    }
  };

  const startTimer = (id: string, buttonWidth: number) => {
    const anim = animationsRef.current.get(id);
    if (!anim) return;

    if (anim.timer) {
      clearInterval(anim.timer);
      anim.timer = null;
    }

    anim.widthAnim.setValue(0);
    Animated.timing(anim.widthAnim, {
      toValue: buttonWidth,
      duration: ACCEPT_TIMEOUT_SECONDS * 1000,
      useNativeDriver: false,
    }).start();

    anim.timeLeft = ACCEPT_TIMEOUT_SECONDS;
    anim.isAccepted = false;
    anim.buttonWidth = buttonWidth;

    const timer = setInterval(() => {
      const currentAnim = animationsRef.current.get(id);
      if (!currentAnim) return;

      if (currentAnim.isAccepted) {
        if (currentAnim.timer) {
          clearInterval(currentAnim.timer);
          currentAnim.timer = null;
        }
        return;
      }

      if (currentAnim.timeLeft <= 1) {
        clearInterval(currentAnim.timer!);
        currentAnim.timer = null;
        handleAutoReject(id);
      } else {
        currentAnim.timeLeft--;
      }
    }, 1000);

    anim.timer = timer;
  };

  const handleReject = async (delivery: any) => {
    const anim = animationsRef.current.get(delivery._id);
    if (anim) stopTimer(delivery._id);

    if (!delivery.deliveryPartner || delivery.deliveryPartner !== id) {
      closeModal();
      return;
    }

    closeModal(); // immediately hide modal and clear offers
    setProcessingId(delivery._id);

    try {
      const result = await cancelDelivery({
        deliveryId: delivery._id,
        reason: 'partner_unavailable',
        userId: id,
      }).unwrap();

      if (!result.success && result.message?.toLowerCase().includes('cancelled')) {
        showErrorModal('Info', 'This delivery is no longer available');
      } else if (!result.success) {
        showErrorModal('Error', result.message || 'Failed to reject delivery');
      }
    } catch (error: any) {
      const errorMsg = error?.data?.message || error?.message || 'Failed to reject delivery';
      if (errorMsg.toLowerCase().includes('cancelled')) {
        showErrorModal('Info', 'This delivery is no longer available');
      } else {
        showErrorModal('Error', errorMsg);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleAutoReject = async (deliveryId: string) => {
    if (processingId === deliveryId) return;
    const anim = animationsRef.current.get(deliveryId);
    if (anim && !anim.isAccepted) {
      const delivery = deliveries.find((d: any) => d._id === deliveryId);
      if (delivery && delivery.deliveryPartner === id) {
        await handleReject(delivery);
      } else {
        closeModal();
      }
    }
  };

  const handleRejectAll = async () => {
    const assignedDeliveries = deliveries.filter((d: any) => d.deliveryPartner === id);
    const deliveryIds = assignedDeliveries.map((d: any) => d._id);
    
    for (const [id] of animationsRef.current.entries()) {
      stopTimer(id);
    }
    setProcessingId('all');
    closeModal(); // hide modal and clear offers

    if (deliveryIds.length === 0) return;

    try {
      const result = await cancelMultiple(deliveryIds).unwrap();
      if (!result.success) {
        showErrorModal('Error', result.message || 'Failed to cancel requests');
      }
    } catch (error: any) {
      const errorMsg = error?.data?.message || 'Failed to cancel requests';
      showErrorModal('Error', errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAccept = async (deliveryId: string) => {
    const anim = animationsRef.current.get(deliveryId);
    if (anim) {
      anim.isAccepted = true;
      stopTimer(deliveryId);
    }

    setProcessingId(deliveryId);

    try {
      await markAsAccepted({
        deliveryId,
        userId: id,
      }).unwrap();

      if (onAccept) await onAccept(deliveryId);

      const otherDeliveryIds = deliveries
        .filter((d: any) => d._id !== deliveryId)
        .map((d: any) => d._id);

      if (otherDeliveryIds.length > 0) {
        for (const otherId of otherDeliveryIds) {
          stopTimer(otherId);
        }
        await cancelMultiple(otherDeliveryIds).unwrap();
      }

      // Success: clear all offers, hide modal, navigate
      closeModal();
      router.replace({
        pathname: '/tracking-details/tracking-details',
        params: { deliveryId: deliveryId as string },
      });
    } catch (error: any) {
      if (anim) anim.isAccepted = false;
      console.log(error, "error");
      const errorMsg = error?.data?.message || 'Failed to accept delivery';
      // Do not close the main modal – just show error modal
      showErrorModal('Error', errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    if (!visible) {
      for (const [id] of animationsRef.current.entries()) {
        stopTimer(id);
      }
      animationsRef.current.clear();
      return;
    }

    deliveries.forEach((delivery: any) => {
      if (!animationsRef.current.has(delivery._id)) {
        animationsRef.current.set(delivery._id, {
          widthAnim: new Animated.Value(0),
          timeLeft: ACCEPT_TIMEOUT_SECONDS,
          timer: null,
          isAccepted: false,
          buttonWidth: 0,
          buttonHeight: 0,
        });
      }
    });

    const existingIds = new Set(deliveries.map((d: any) => d._id));
    for (const [id] of animationsRef.current.entries()) {
      if (!existingIds.has(id)) {
        stopTimer(id);
        animationsRef.current.delete(id);
      }
    }
  }, [visible, deliveries]);

  const onAcceptLayout = (id: string, event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const anim = animationsRef.current.get(id);
    if (anim && width > 0 && height > 0 && !anim.isAccepted) {
      anim.buttonWidth = width;
      anim.buttonHeight = height;
      if (visible && !anim.timer) {
        startTimer(id, width);
      }
    }
  };

  const formatPrice = (price: number) => `₦${price.toLocaleString()}`;

  const renderDeliveryCard = ({ item: delivery }: { item: any }) => {
    const anim = animationsRef.current.get(delivery._id);
    const isProcessing = processingId === delivery._id;
    const isRejecting = isProcessing && isCancelling;
    const isAccepting = isProcessing && isAccepted;
    const isDisabled = processingId !== null || (anim?.isAccepted === true);

    return (
      <View className="bg-white rounded-2xl mb-4 p-4 shadow-sm border border-gray-100">
        {/* Header */}
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-row gap-3 flex-1">
            {delivery.customer?.avatar?.url ? (
              <Image
                source={{ uri: delivery.customer.avatar.url }}
                className="w-12 h-12 rounded-full bg-gray-300"
              />
            ) : (
              <Image
                source={{
                  uri: `https://ui-avatars.com/api/?background=0052CC&color=fff&name=${encodeURIComponent(
                    `${delivery.customer?.firstName} ${delivery.customer?.lastName}`
                  )}`,
                }}
                className="w-12 h-12 rounded-full bg-gray-300"
              />
            )}
            <View className="flex-1">
              <Text className="font-bold text-black text-base">
                {delivery.customer?.firstName} {delivery.customer?.lastName}
              </Text>
              <View className="flex-row items-center gap-1 mt-1">
                <Ionicons name="call-outline" size={12} color="#6B7280" />
                <Text className="text-gray-500 text-xs">
                  {delivery.customer?.phone}
                </Text>
              </View>
            </View>
          </View>
          <View className="items-end">
            <Text className="font-bold text-[#0052CC] text-lg">
              {formatPrice(delivery.totalAmount)}
            </Text>
            {delivery.distance && (
              <Text className="text-gray-500 text-xs">{delivery.distance}</Text>
            )}
          </View>
        </View>

        {/* Timeline */}
        <View className="mb-4">
          <View className="flex-row gap-3">
            <View className="items-center">
              <View className="bg-blue-100 p-[2px] rounded-full">
                <View className="w-3 h-3 bg-[#1969fe] rounded-full" />
              </View>
              <View className="w-0.5 h-9 bg-[#1969fe] rounded-full" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-black">Pickup</Text>
              <Text className="text-gray-500 text-sm" numberOfLines={2}>
                {delivery.pickup?.address}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="items-center">
              <View className="bg-blue-100 p-[2px] rounded-full">
                <View className="w-3 h-3 bg-[#1969fe] rounded-full" />
              </View>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-black">Dropoff</Text>
              <Text className="text-gray-500 text-sm" numberOfLines={2}>
                {delivery.delivery?.address}
              </Text>
            </View>
          </View>
        </View>

        {/* Package Details */}
        <View className="bg-gray-50 rounded-xl p-3 mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="cube-outline" size={16} color="#6B7280" />
            <Text className="font-semibold text-black text-sm">Package Details</Text>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-row items-center gap-1">
              <Ionicons name="scale-outline" size={12} color="#9CA3AF" />
              <Text className="text-gray-500 text-xs">
                {delivery.package?.type}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          {/* Decline Button */}
          <TouchableOpacity
            className="flex-1 bg-gray-100 py-4 rounded-full"
            onPress={() => handleReject(delivery)}
            disabled={isDisabled}
          >
            {isRejecting ? (
              <ActivityIndicator size="small" color="#9CA3AF" />
            ) : (
              <Text className="text-center text-gray-600 font-semibold">Decline</Text>
            )}
          </TouchableOpacity>

          {/* Accept Button with Right‑to‑Left Progress */}
          <View className="flex-1">
            <TouchableOpacity
              className="w-full bg-gray-900 py-4 rounded-full overflow-hidden"
              disabled={isDisabled}
              onPress={() => handleAccept(delivery._id)}
              onLayout={(e) => onAcceptLayout(delivery._id, e)}
            >
              {anim && !anim.isAccepted && !isAccepting && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: anim.widthAnim,
                    backgroundColor: 'rgba(0, 82, 204, 0.6)',
                    borderRadius: 9999,
                    pointerEvents: 'none',
                  }}
                />
              )}
              {isAccepting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-center text-gray-100 font-semibold">Accept</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View className="flex-1 bg-black/50">
          <View className="flex-1 justify-end">
            <View className="w-full rounded-t-2xl overflow-hidden shadow-lg max-h-[90%]">
              {deliveries.length > 1 && (
                <View className="max-w-[220px] mb-4">
                  <TouchableOpacity
                    className="flex-row items-center justify-center bg-red-50 py-2.5 mx-4 mt-4 rounded-full border border-red-100 gap-2"
                    onPress={handleRejectAll}
                    disabled={processingId !== null || isCancellingAll}
                  >
                    {isCancellingAll ? (
                      <ActivityIndicator size="small" color="#dc2626" />
                    ) : (
                      <>
                        <Ionicons name="close-outline" size={18} color="#dc2626" />
                        <Text className="text-sm text-red-600 font-semibold">
                          Cancel All Requests ({deliveries.length})
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <FlatList
                data={deliveries}
                renderItem={renderDeliveryCard}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                ListEmptyComponent={
                  <View className="py-8 items-center">
                    <Text className="text-gray-500">No pending requests</Text>
                  </View>
                }
              />

              <View className="bg-gray-900 py-4 items-center justify-center">
                <Text className="text-gray-200 text-sm font-medium">
                  Accept deliveries to start earning
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl w-full max-w-sm p-6">
            <View className="items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-red-100 justify-center items-center">
                <Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
              </View>
            </View>
            <Text className="text-xl font-bold text-gray-900 text-center mb-2">
              {errorTitle}
            </Text>
            <Text className="text-base text-gray-600 text-center mb-6">
              {errorMessage}
            </Text>
            <TouchableOpacity
              className="py-3 rounded-xl bg-[#0052CC]"
              onPress={() => setErrorModalVisible(false)}
            >
              <Text className="text-center font-semibold text-white">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}