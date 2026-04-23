import * as Notifications from 'expo-notifications';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  AppState,
  AppStateStatus,
} from 'react-native';
import MapView, { Marker, Region, Circle, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import NotificationBadge from '@/components/NotificationBadge';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useGetUserQuery } from '@/redux/api/apiSlice';
import { useGetTrackDeliveryQuery } from '@/redux/features/deliveryApi/deliveryApi';
import { useGetUserNotificationsQuery } from '@/redux/features/notificationsApi/notificationApi';
import { useGetMyBalanceQuery } from '@/redux/features/widthdrawApi/withdrawalApi';
import { OnlineOfflineToggle } from '@/components/OnlineOfflineSwitcher';
import { useUpdateStatusMutation } from '@/redux/features/deliveryPartnerApi /deliveryPartnerApi';
import { useUpdatePushTokenMutation } from '@/redux/features/user/userApi';
import { getUserPushToken } from '../_layout';

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/147/147142.png";

// Configure notification handler (must be outside component)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }) as Notifications.NotificationBehavior,
});

export default function Home() {
  const params = useLocalSearchParams();
  const { deliveryIdx } = params;

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const locationSubscription = useRef<any>(null);
  const focusTimeout = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);
  const [tokenUpdated, setTokenUpdated] = useState(false);
  const [updatePushToken] = useUpdatePushTokenMutation();

  // Local states
  const [pendingOffers, setPendingOffers] = useState<any[]>([]);
  const [currentDeliveryId, setCurrentDeliverId] = useState("");
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [appStateVisible, setAppStateVisible] = useState(AppState.currentState);

  const { data: userData, refetch: refetchUser, isSuccess: userLoaded, }: any = useGetUserQuery(undefined, {
    pollingInterval: 10000,
  });

  const userxs = userData?.user


  // Request notification permissions and set up custom ringtone channel
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('delivery_offers', {
          name: 'Delivery Offers',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'ringtone',          // custom ringtone (filename without extension)
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1969fe',
        });
      }
    };
    requestPermissions();
  }, []);


  // Auto-update push token when user data is loaded
  useEffect(() => {
    const sendPushTokenToBackend = async () => {
      if (userLoaded && userxs?._id && !tokenUpdated) {
        try {
          const playerId = await getUserPushToken();

          if (playerId) {
            console.log('Found OneSignal Player ID:', playerId);
            await updatePushToken({
              playerId: playerId,
              deviceType: Platform.OS
            }).unwrap();
            console.log('Push token successfully updated for user:', userxs?._id);
            setTokenUpdated(true);
          } else {
            console.log('No OneSignal Player ID found in AsyncStorage');
          }
        } catch (error) {
          console.error('Failed to update push token:', error);
        }
      }
    };

    sendPushTokenToBackend();
  }, [userLoaded, userxs?._id, updatePushToken, tokenUpdated]);

  // Listen to app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppStateVisible(nextAppState);
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  // Auto-remove expired offers every second
  useEffect(() => {
    const checkExpiry = setInterval(() => {
      const now = new Date();
      setPendingOffers(prev => prev.filter(offer =>
        !offer.expiresAt || new Date(offer.expiresAt) > now
      ));
    }, 1000);
    return () => clearInterval(checkExpiry);
  }, []);

  const deliveryId = currentDeliveryId || deliveryIdx;

  // RTK Query hooks
  const { data: deliveryData, refetch: refetchDelivery } = useGetTrackDeliveryQuery(deliveryId as string, {
    skip: !deliveryId,
    pollingInterval: 10000,
  });

  const { data: earningData, refetch: refetchBalance } = useGetMyBalanceQuery(undefined, {
    pollingInterval: 15000,
  });


  const { refetch: refetchNotifications } = useGetUserNotificationsQuery(undefined, {
    pollingInterval: 30000,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const [updateStatus, { isLoading: isUpdating }] = useUpdateStatusMutation();

  // Derived data
  const data = deliveryData?.data;
  const tracking = data?.tracking;
  const balanceData = earningData?.data?.balance;
  const user = userData?.user;
  const driverInfo = user?.deliveryPartnerInfo;
  const isAvailable = driverInfo?.status === 'available';
  const isOnDelivery = !!driverInfo?.currentDelivery;       // 👈 true if partner has an active delivery
  const displayStatus = isOnDelivery ? "Busy" : (isAvailable ? "Online" : "Offline");
  const statusColorClass = isOnDelivery ? "text-red-600" : (isAvailable ? "text-blue-600" : "text-yellow-800");

  // Verification badge logic
  const getVerificationBadge = () => {
    const verificationStatus = driverInfo?.verificationStatus;
    if (!verificationStatus) return { text: '📝 Not Submitted', style: 'bg-gray-100 text-gray-800' };
    if (verificationStatus.verified === true) return { text: 'Approved', style: 'bg-green-100 text-green-800' };
    if (verificationStatus.submitted === true) return { text: 'Pending Review', style: 'bg-yellow-100 text-yellow-800' };
    return { text: '📝 Not Submitted', style: 'bg-gray-100 text-gray-800' };
  };
  const verificationBadge = getVerificationBadge();
  const isApproved = driverInfo?.verificationStatus?.verified === true;

  // Location states
  const [region, setRegion] = useState<Region>({
    latitude: 4.8156,
    longitude: 7.0498,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [isTracking, setIsTracking] = useState(true);

  // Auto‑refresh logic
  const refetchAll = useCallback(async (showErrorToast = false) => {
    if (!isMounted.current) return;
    setRefreshError(null);
    try {
      await Promise.allSettled([
        refetchUser(),
        refetchBalance(),
        refetchNotifications(),
        deliveryId ? refetchDelivery() : Promise.resolve(),
      ]);
    } catch (err) {
      console.error('Refetch error:', err);
      if (showErrorToast && isMounted.current) {
        setRefreshError('Failed to refresh. Pull down to retry.');
        setTimeout(() => {
          if (isMounted.current) setRefreshError(null);
        }, 5000);
      }
    }
  }, [refetchUser, refetchBalance, refetchNotifications, refetchDelivery, deliveryId]);

  useFocusEffect(
    useCallback(() => {
      if (focusTimeout.current) clearTimeout(focusTimeout.current);
      focusTimeout.current = setTimeout(() => {
        if (isMounted.current) refetchAll(true);
      }, 500);
      return () => {
        if (focusTimeout.current) clearTimeout(focusTimeout.current);
      };
    }, [refetchAll])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (focusTimeout.current) clearTimeout(focusTimeout.current);
        focusTimeout.current = setTimeout(() => {
          if (isMounted.current) refetchAll(true);
        }, 1000);
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [refetchAll]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (focusTimeout.current) clearTimeout(focusTimeout.current);
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchAll(true);
    } catch (err) {
      console.log(err)
      Alert.alert('Refresh Failed', 'Unable to refresh. Check your connection.');
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  // Location functions
  const getUserLocation = async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        setLocationPermission(false);
        setIsLoading(false);
        return;
      }
      setLocationPermission(true);
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ lat: latitude, lng: longitude });
      const newRegion = { latitude, longitude, latitudeDelta: 0.015, longitudeDelta: 0.012 };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const startWatchingLocation = useCallback(async () => {
    if (!locationPermission) return;
    if (locationSubscription.current) locationSubscription.current.remove();
    locationSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      (location) => {
        const { latitude, longitude } = location.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        setRouteCoordinates(prev => [...prev, { latitude, longitude }].slice(-50));
        if (isTracking) {
          const newRegion = { latitude, longitude, latitudeDelta: 0.015, longitudeDelta: 0.012 };
          mapRef.current?.animateToRegion(newRegion, 500);
        }
      }
    );
  }, [locationPermission, isTracking]);

  const stopWatchingLocation = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  }, []);

  useEffect(() => {
    getUserLocation();
    return () => stopWatchingLocation();
  }, []);

  useEffect(() => {
    if (locationPermission) startWatchingLocation();
    else stopWatchingLocation();
    return () => stopWatchingLocation();
  }, [locationPermission, isTracking, startWatchingLocation]);

  // Trip info
  const pickupLatLng = useMemo(() => {
    const coords = tracking?.pickup?.location?.coordinates;
    if (!coords) return null;
    return { latitude: coords[1], longitude: coords[0] };
  }, [tracking]);

  const deliveryLatLng = useMemo(() => {
    const coords = tracking?.delivery?.location?.coordinates;
    if (!coords) return null;
    return { latitude: coords[1], longitude: coords[0] };
  }, [tracking]);

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const estimateEta = (distanceKm: number, speedKmh = 20) => (distanceKm / speedKmh) * 60;

  const [tripInfo, setTripInfo] = useState({
    toPickup: null as { distance: number; eta: number } | null,
    toDropoff: null as { distance: number; eta: number } | null,
    totalEta: null as number | null,
  });

  useEffect(() => {
    if (!currentLocation || !tracking) return;
    const pickup = tracking?.pickup?.location?.coordinates;
    if (!pickup) return;
    const pickupLat = pickup[1], pickupLng = pickup[0];
    const distToPickup = haversineDistance(currentLocation.lat, currentLocation.lng, pickupLat, pickupLng);
    const etaToPickup = estimateEta(distToPickup);
    let distToDelivery = tracking?.distance || 0;
    if (!distToDelivery && pickupLatLng && deliveryLatLng) {
      distToDelivery = haversineDistance(pickupLatLng.latitude, pickupLatLng.longitude, deliveryLatLng.latitude, deliveryLatLng.longitude);
    }
    const etaToDelivery = estimateEta(distToDelivery);
    setTripInfo({
      toPickup: { distance: parseFloat(distToPickup.toFixed(1)), eta: Math.round(etaToPickup) },
      toDropoff: { distance: parseFloat(distToDelivery.toFixed(1)), eta: Math.round(etaToDelivery) },
      totalEta: Math.round(etaToPickup + etaToDelivery),
    });
  }, [currentLocation, tracking, pickupLatLng, deliveryLatLng]);

  useEffect(() => {
    if (tracking && pickupLatLng && mapRef.current) {
      mapRef.current.animateToRegion({ latitude: pickupLatLng.latitude, longitude: pickupLatLng.longitude, latitudeDelta: 0.015, longitudeDelta: 0.012 }, 1000);
    }
  }, [tracking, pickupLatLng]);


  const handleToggleStatus = useCallback(async () => {
    if (isUpdating) {
      Alert.alert('Please wait', 'Status update in progress...');
      return;
    }
    const newStatus = isAvailable ? 'offline' : 'available';
    try {
      await updateStatus({ status: newStatus }).unwrap();
      await refetchUser();
    } catch (error: any) {
      Alert.alert('Error', error?.data?.message || 'Failed to update status');
    }
  }, [isAvailable, isUpdating, updateStatus, refetchUser]);

  const getUserFullName = () => user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "Delivery Partner";
  const getAvatarUrl = () => user?.avatar?.url || DEFAULT_AVATAR;

  const reviews = user?.deliveryPartnerInfo?.reviews || [];
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / totalReviews : 0;

  // Custom rounding for balance
  const customRound = (num: any) => {
    const fractional = num - Math.floor(num);
    return fractional < 0.5 ? Math.floor(num) : Math.ceil(num);
  };

  const formattedBalance = balanceData?.available
    ? `₦${customRound(balanceData.available).toLocaleString()}`
    : "₦0";

  const showTripDetails = !!(tracking && tripInfo.toPickup && tripInfo.toDropoff);
  const snapPoints = useMemo(() => (showTripDetails ? ['20%', '40%'] : ['20%', '42%']), [showTripDetails]);

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0052CC" />
        <Text style={styles.loaderText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          showsMyLocationButton={false}
          followsUserLocation={isTracking}
          zoomControlEnabled={Platform.OS === 'android'}
        >
          {currentLocation && (
            <>
              <Marker coordinate={{ latitude: currentLocation.lat, longitude: currentLocation.lng }} tracksViewChanges={false}>
                <View style={styles.riderMarkerContainer}>
                  <View style={styles.riderMarker}><FontAwesome5 name="motorcycle" size={20} color="#fff" /></View>
                  <View style={styles.riderMarkerPulse} />
                </View>
              </Marker>
              <Circle center={{ latitude: currentLocation.lat, longitude: currentLocation.lng }} radius={500} strokeColor="rgba(0,82,204,0.6)" fillColor="rgba(0,82,204,0.15)" strokeWidth={2} />
            </>
          )}
          {pickupLatLng && (
            <Marker coordinate={pickupLatLng} title="Pickup Location" description={tracking?.pickup?.address}>
              <View style={styles.pickupMarker}><FontAwesome5 name="box" size={16} color="#fff" /></View>
            </Marker>
          )}
          {deliveryLatLng && (
            <Marker coordinate={deliveryLatLng} title="Delivery Location" description={tracking?.delivery?.address}>
              <View style={styles.deliveryMarker}><FontAwesome5 name="flag-checkered" size={16} color="#fff" /></View>
            </Marker>
          )}
          {routeCoordinates.length > 1 && <Polyline coordinates={routeCoordinates} strokeColor="#0052CC" strokeWidth={4} />}
          {currentLocation && pickupLatLng && <Polyline coordinates={[currentLocation, pickupLatLng]} strokeColor="#22c55e" strokeWidth={3} lineDashPattern={[5, 10]} />}
        </MapView>

        <View style={styles.notificationBadge}>
          <NotificationBadge onRefresh={handleManualRefresh} isRefreshing={refreshing} />
        </View>

        {refreshError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{refreshError}</Text>
            <TouchableOpacity onPress={() => refetchAll(true)}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        )}


        <BottomSheet ref={bottomSheetRef} snapPoints={snapPoints} enablePanDownToClose={false} index={0} backgroundStyle={styles.bottomSheetBackground}>
          <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
            {!showTripDetails && (
              <View className="mb-4">
                <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} className="flex-row items-center gap-3" activeOpacity={0.7}>
                  <Image source={{ uri: getAvatarUrl() }} className="w-14 h-14 rounded-full border-2 border-gray-200" />
                  <View className="flex-1 flex-row justify-between">
                    <View>
                      <Text className="font-semibold text-gray-900 capitalize">{getUserFullName()}</Text>
                      <Text className={`${statusColorClass} text-sm mt-[1px]`}>{displayStatus}</Text>
                    </View>
                    {verificationBadge.text === "Approved" ? <></> :
                      <View className="flex-row items-center justify-between">
                        <View className={`px-2 py-0.5 rounded-full ${verificationBadge.style}`}>
                          <Text className="text-xs font-medium">{verificationBadge.text}</Text>
                        </View>
                      </View>
                    }
                    {totalReviews > 0 && (
                      <View className="flex-row items-center mt-1">
                        <FontAwesome5 name="star" size={12} color="#f59e0b" solid />
                        <Text className="text-xs text-gray-500 ml-1">{averageRating.toFixed(1)} ({totalReviews} reviews)</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            )}
            {!showTripDetails && (
              <TouchableOpacity onPress={() => router.push("/(tabs)/earnings")} className="bg-black rounded-2xl p-4 mb-4">
                <Text className="text-xs text-gray-400 mb-1">Available Balance</Text>
                <View className="flex-row justify-between items-center">
                  <Text className="text-3xl font-bold text-white">{hideBalance ? '****' : formattedBalance}</Text>
                  <TouchableOpacity onPress={() => setHideBalance(!hideBalance)}>
                    <View className="bg-white rounded-full px-3 py-1.5 flex-row items-center gap-1">
                      <Text className="text-xs text-black">Hide</Text>
                      {hideBalance ? <Ionicons name="eye-off-outline" size={20} color="#000" /> : <Ionicons name="eye-outline" size={20} color="#000" />}
                    </View>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}

            {!showTripDetails && (
              <View className="mb-4">
                {isOnDelivery ? (
                  <View className="bg-red-50 rounded-xl p-4 items-center border border-red-200">
                    <Text className="text-red-700 font-semibold text-base">You're currently on an active delivery</Text>
                    <Text className="text-red-600 text-xs mt-1 text-center">
                      Please complete your current delivery before changing status.
                    </Text>
                  </View>
                ) : isApproved ? (
                  <OnlineOfflineToggle isOnline={isAvailable} onToggle={handleToggleStatus} disabled={isUpdating} isUpdating={isUpdating} />
                ) : (
                  <TouchableOpacity onPress={() => router.push("/others/otherInfo-screen")} className="bg-yellow-50 rounded-xl p-3 items-center" activeOpacity={0.7}>
                    <Text className="text-gray-700 font-semibold text-base">We're Reviewing Your Details</Text>
                    <Text className="text-gray-600 text-xs mt-1 text-center">This usually takes a short while. Click on this tab to view verification.</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {showTripDetails && (
              <View className="bg-gray-50 rounded-xl p-4 mt-2 border border-gray-200">
                <Text className="text-base font-semibold text-gray-900 mb-3">Trip Details</Text>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-500">To pickup:</Text>
                  <Text className="text-sm text-gray-900">{tripInfo.toPickup?.distance} km · {tripInfo.toPickup?.eta} min</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-500">To dropoff:</Text>
                  <Text className="text-sm text-gray-900">{tripInfo.toDropoff?.distance} km · {tripInfo.toDropoff?.eta} min</Text>
                </View>
                <View className="flex-row justify-between pt-2 mt-2 border-t border-gray-200">
                  <Text className="text-sm text-gray-500">Total ETA:</Text>
                  <Text className="text-base font-bold text-blue-600">{tripInfo.totalEta} min</Text>
                </View>
              </View>
            )}
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { flex: 1, position: 'relative' },
  map: StyleSheet.absoluteFillObject,
  notificationBadge: {
    position: 'absolute',
    top: 60,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 999,
    paddingHorizontal: 2,
    paddingVertical: 2,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorBanner: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  errorText: { color: '#EF4444', fontSize: 12, flex: 1 },
  retryText: { color: '#0052CC', fontWeight: '600', marginLeft: 8 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loaderText: { marginTop: 12, fontSize: 16, color: '#374151' },
  bottomSheetBackground: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  bottomSheetContent: { padding: 16 },
  riderMarkerContainer: { alignItems: 'center', justifyContent: 'center' },
  riderMarker: { backgroundColor: '#0052CC', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  riderMarkerPulse: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0, 82, 204, 0.3)', opacity: 0.6 },
  pickupMarker: { backgroundColor: '#22c55e', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  deliveryMarker: { backgroundColor: '#ef4444', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
});