import "react-native-reanimated";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { Provider } from "react-redux";
import { store } from "@/redux/store/store";
import { AuthProvider } from "../context/auth";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { OneSignal, LogLevel } from "react-native-onesignal";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useEffect, useRef, useState, useCallback } from "react";
import { Alert, ActivityIndicator, Modal, View, Text, InteractionManager, Platform, AppState } from "react-native";
import { useSocket } from '@/hooks/useSocket';
import {
  useCancelDeliveryMutation,
  useMarkAsAcceptedMutation,
} from "@/redux/features/deliveryStatusApi/deliveryStatusApi";
import { useGetUserQuery } from "@/redux/api/apiSlice";
import { debounce } from "lodash";
import DeliveryNotificationModal from "@/components/DeliveryNotificationModal";
import { Audio } from "expo-av";

export const unstable_settings = {
  anchor: "(tabs)",
};

// ====================== AsyncStorage Keys ======================
const USER_DATA_KEY = "@user_data";

// ---------- Helper to force operations onto main thread (Android fix) ----------
const runOnMainThread = (callback: () => void) => {
  if (Platform.OS === 'ios') {
    callback();
  } else {
    InteractionManager.runAfterInteractions(callback);
  }
};

// ====================== AsyncStorage Helpers ======================
export const saveUserData = async (userData: any) => {
  try {
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    console.log("✅ User data saved to AsyncStorage");
  } catch (error) {
    console.error("Failed to save user data:", error);
  }
};

export const getUserData = async (): Promise<any | null> => {
  try {
    const raw = await AsyncStorage.getItem(USER_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to get user data:", error);
    return null;
  }
};

export const getUserId = async (): Promise<string | null> => {
  const userData = await getUserData();
  return userData?.user?._id || null;
};

// ====================== OneSignal Helpers ======================
export const saveUserPushToken = async (playerId: string) => {
  try {
    await AsyncStorage.setItem("onesignal_player_id", playerId);
    console.log("✅ OneSignal Player ID saved:", playerId);
  } catch (error) {
    console.error("Failed to save OneSignal Player ID:", error);
  }
};

export const getUserPushToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem("onesignal_player_id");
  } catch (error) {
    console.error("Failed to get OneSignal Player ID:", error);
    return null;
  }
};

// ====================== Main App Content ======================
function AppContent() {
  const colorScheme = useColorScheme();
  const { socket, isConnected } = useSocket();
  const [cancelDelivery, { isLoading: isCancelling }] =
    useCancelDeliveryMutation();
  const [markAsAccepted, { isLoading: isAccepting }] =
    useMarkAsAcceptedMutation();
  const soundRef = useRef<Audio.Sound | null>(null);

  const [pendingOffers, setPendingOffers] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const { data: userData } = useGetUserQuery();

  // State for userId from AsyncStorage
  const [storedUserId, setStoredUserId] = useState<string | null>(null);
  // Final userId: prefer stored, fallback to API result
  const userId = storedUserId || userData?.user?._id;

  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // Unified function to stop sound, clear offers, hide modal
  const stopSoundAndClearOffers = useCallback(() => {
    runOnMainThread(() => {
      soundRef.current?.stopAsync();
    });
    setPendingOffers([]);
    setModalVisible(false);
  }, []);

  // hideModal just calls the unified function
  const hideModal = useCallback(() => {
    stopSoundAndClearOffers();
  }, [stopSoundAndClearOffers]);

  // Load stored userId on mount
  useEffect(() => {
    getUserId().then((id) => {
      if (id) {
        setStoredUserId(id);
        console.log("📦 Loaded userId from AsyncStorage:", id);
      }
    });
  }, []);

  // Save user data to AsyncStorage whenever API returns new data
  useEffect(() => {
    if (userData?.user?._id) {
      saveUserData(userData);
      setStoredUserId(userData.user._id);
    }
  }, [userData]);

  // Debounced action handler (Accept / Reject) for OneSignal notification clicks
  const debouncedHandleRideAction = useRef(
    debounce(
      async (rideId: string, actionId: string, currentUserId: string) => {
        if (processingRef.current) return;
        processingRef.current = true;
        setIsProcessing(true);

        try {
          if (actionId === "accept") {
            await markAsAccepted({ deliveryId: rideId, userId: currentUserId }).unwrap();
            // Alert.alert("Success", "Ride accepted successfully.");
            hideModal(); // clears offers and hides modal
             router.push(`/tracking-details/tracking-details?deliveryId=${rideId}`);
          } else if (actionId === "reject") {
            await cancelDelivery({
              deliveryId: rideId,
              reason: "partner_unavailable",
              userId: currentUserId,
            }).unwrap();
            hideModal(); // clears offers and hides modal
            // Alert.alert("Declined", "You have declined the ride request.");
          }
        } catch (error: any) {
          console.error("Ride action error:", error);
          if (error?.status === 409) {
            Alert.alert(
              "Already Taken",
              error?.data?.message ||
              "This delivery has already been accepted by another partner."
            );
          } else {
            const errorMessage =
              error?.data?.message || error?.message || "Failed to process your response.";
            Alert.alert("Action Failed", errorMessage);
          }
        } finally {
          processingRef.current = false;
          setIsProcessing(false);
          // Do not call hideModal again here because we already did in success paths
        }
      },
      600,
      { leading: true, trailing: false }
    )
  ).current;

  // Socket listeners – only in‑app modal, no push notifications
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onNewOffer = (offer: any) => {
      const transformed = {
        _id: offer.deliveryId,
        deliveryId: offer.deliveryId,
        totalAmount: offer.price,
        pickup: { address: offer.pickupAddress },
        delivery: { address: offer.deliveryAddress },
        package: { type: offer.package || 'Package' },
        customer: {
          firstName: offer.customerName?.split(' ')[0] || 'Customer',
          lastName: offer.customerName?.split(' ')[1] || '',
          phone: offer.phone || '',
          avatar: { url: offer.avatar || '' },
        },
        expiresAt: offer.expiresAt,
      };
      setPendingOffers(prev => prev.some(o => o._id === transformed._id) ? prev : [...prev, transformed]);
    };

    socket.on('new_delivery_offer', onNewOffer);
    socket.on('delivery_assigned', (data: any) => {
      // When delivery is assigned, clear all offers and hide modal
      stopSoundAndClearOffers();
      if (data.deliveryId) {
        router.push(`/tracking-details/tracking-details?deliveryId=${data.deliveryId}`);
      }
    });
    return () => {
      socket.off('new_delivery_offer', onNewOffer);
      socket.off('delivery_assigned');
    };
  }, [socket, isConnected, stopSoundAndClearOffers]);

  // Auto modal based on pending offers
  useEffect(() => {
    if (pendingOffers.length > 0) {
      setModalVisible(true);
    } else {
      // If pendingOffers becomes empty, ensure modal is hidden and sound stops
      if (modalVisible) {
        stopSoundAndClearOffers();
      }
    }
  }, [pendingOffers, modalVisible, stopSoundAndClearOffers]);

  // Expire offers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setPendingOffers(prev => prev.filter(o => !o.expiresAt || new Date(o.expiresAt) > now));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Stop sound when modal is not visible (extra safety)
  useEffect(() => {
    if (!modalVisible) {
      runOnMainThread(() => {
        soundRef.current?.stopAsync();
      });
    }
  }, [modalVisible]);

  // Sound creation – wrapped in runOnMainThread
  useEffect(() => {
    runOnMainThread(() => {
      Audio.Sound.createAsync(require('@/assets/sounds/ringtone.mp3'))
        .then(({ sound }) => {
          soundRef.current = sound;
        })
        .catch(console.warn);
    });
    return () => {
      runOnMainThread(() => {
        soundRef.current?.unloadAsync();
      });
    };
  }, []);

  // Play sound when modal becomes visible – wrapped in runOnMainThread
  useEffect(() => {
    if (modalVisible && soundRef.current) {
      runOnMainThread(() => {
        soundRef.current?.replayAsync().catch(() => {});
      });
    }
  }, [modalVisible]);

  // App state listener (kept for potential future use, but no notifications)
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      // you can optionally store next state if needed
    });
    return () => sub.remove();
  }, []);

  const handleRideAction = useCallback(
    (rideId: string, actionId: string) => {
      if (processingRef.current || isAccepting || isCancelling) {
        console.warn("⚠️ Action already in progress, ignoring duplicate.");
        return;
      }
      if (!userId) {
        Alert.alert("Error", "You are not logged in.");
        return;
      }
      if (!rideId) return;
      debouncedHandleRideAction(rideId, actionId, userId);
    },
    [userId, isAccepting, isCancelling, debouncedHandleRideAction]
  );

  // ====================== OneSignal Setup ======================
  useEffect(() => {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    OneSignal.initialize("2c0e56a2-f8cf-4a11-a4d6-c65482bb6005");
    OneSignal.Notifications.requestPermission(true);

    if (userId) {
      OneSignal.login(userId);
    }

    const pushSubscriptionListener = (event: any) => {
      if (event.current?.id) {
        console.log("🆕 New OneSignal Player ID:", event.current.id);
        saveUserPushToken(event.current.id);
      }
    };

    const notificationClickListener = (event: any) => {
      const data = event.notification?.additionalData;
      const actionId = event.result?.actionId;

      console.log("🔔 Notification clicked → Action:", actionId, "Data:", data);

      if (data?.type === "ride_request" && data?.rideId) {
        handleRideAction(data.rideId, actionId || "open");
      }
    };

    const foregroundWillDisplayListener = (event: any) => {
      console.log("📲 Foreground notification received");
      event.notification.display();
    };

    OneSignal.User.pushSubscription.addEventListener(
      "change",
      pushSubscriptionListener
    );
    OneSignal.Notifications.addEventListener("click", notificationClickListener);
    OneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      foregroundWillDisplayListener
    );

    return () => {
      OneSignal.User.pushSubscription.removeEventListener(
        "change",
        pushSubscriptionListener
      );
      OneSignal.Notifications.removeEventListener(
        "click",
        notificationClickListener
      );
      OneSignal.Notifications.removeEventListener(
        "foregroundWillDisplay",
        foregroundWillDisplayListener
      );
    };
  }, [userId, handleRideAction]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/onboarding" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/verify-email"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="auth/login-with-email"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="auth/forgot-password"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="auth/privacy-policy"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="auth/terms-conditions"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="earnings/withdraw"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen name="others/payment" options={{ headerShown: false }} />
        <Stack.Screen
          name="others/edit-delivery"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="others/send-packages"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="others/tracking-with-map"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="others/recieve-packages"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="tracking-details/tracking-details"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/personal-info"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/saved-addresses"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/security-login"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="notification/notification"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/change-password"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/help-support"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/report-issue"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/contact-support"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="profile/faqs" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile/legal-policies"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/languages-screen"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/privacy-policy"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/terms-conditions"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="auth/register-account"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="auth/verify-otp" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/reset-password"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/edit-user-info"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="earnings/transactions"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="others/choose-type"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="others/review-details"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="others/personalInfo-screen"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="others/available-partners"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="others/otherInfo-screen"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="others/vehicle-document-update"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="locations/location-settings"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="locations/update-status"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="locations/setting-working-hours"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile/delete-account"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="dashbaord-tracking/tracking-screen"
          options={{ headerShown: false }}
        />
      </Stack>

      <StatusBar style="auto" />

      {/* Global Processing Modal */}
      <Modal transparent visible={isProcessing} animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              padding: 24,
              borderRadius: 12,
              alignItems: "center",
              minWidth: 180,
            }}
          >
            <ActivityIndicator size="large" color="#000" />
            <Text style={{ marginTop: 12, fontSize: 16 }}>Processing...</Text>
          </View>
        </View>
      </Modal>

      <DeliveryNotificationModal
        visible={modalVisible}
        deliveries={pendingOffers}
        closeModal={hideModal}
        onAccept={() => {}}
        onViewDetails={(deliveryId: string) => {
          router.push(`/tracking-details/tracking-details?deliveryId=${deliveryId}`);
          hideModal();
        }}
        id={userId}
        // onClearAllOffers prop removed – closeModal does everything
      />
    </ThemeProvider>
  );
}

// ====================== Root Layout ======================
export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AppContent />
        </GestureHandlerRootView>
      </AuthProvider>
    </Provider>
  );
}