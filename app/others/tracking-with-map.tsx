import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
    Image,
    AppState,
    ScrollView,
    Animated,
    PanResponder,
    Dimensions,
    Modal,
    Linking
} from 'react-native';
import MapView, { Marker, Region, Circle, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons, FontAwesome5, Entypo } from '@expo/vector-icons';
import * as Location from 'expo-location';
import NotificationBadge from '@/components/NotificationBadge';
import { router, useLocalSearchParams } from 'expo-router';
import { useGetUserQuery } from '@/redux/api/apiSlice';
import { useGetCustomerOngoingQuery, useGetTrackDeliveryQuery } from '@/redux/features/deliveryApi/deliveryApi';
import { useGetUserNotificationsQuery } from '@/redux/features/notificationsApi/notificationApi';
import DeliveryStatusChange from '@/components/DeliveryStatusChange';
import Constants from 'expo-constants';

import fragile from "../../assets/images/fragile.png";
import food from "../../assets/images/food.png";
import small from "../../assets/images/medium.png";
import medium from "../../assets/images/medium.png";
import large from "../../assets/images/large.png";
import clothing from "../../assets/images/clothing.png";
import electronics from "../../assets/images/electronics.png";
import document from "../../assets/images/documents.png";
import books from "../../assets/images/books.png";
import other from "../../assets/images/other.png";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/147/147142.png";
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.5;   // 50% of screen height
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.2;   // 20% of screen height

// Helper to get first package type from comma‑separated string
const getFirstPackageType = (typeStr: string | undefined): string => {
    if (!typeStr) return "document";
    const first = typeStr.split(",")[0]?.trim();
    return first && first.length > 0 ? first.toLowerCase() : "document";
};

// Helper to get array of all package types
const getPackageTypesArray = (typeStr: string | undefined): string[] => {
    if (!typeStr) return [];
    return typeStr.split(",").map(t => t.trim()).filter(t => t.length > 0);
};

export default function LocationPickerModal() {
    const params = useLocalSearchParams();
    const { deliveryIdx } = params;
    const mapRef = useRef<MapView>(null);
    const locationSubscription = useRef<any>(null);
    const statusUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
    const [infoCardToggle, setInfoCardToggle] = useState(false)
    const [hideSheet, setHideSheet] = useState(false)
    const [deliveryConfirmationCode, setDeliveryConfirmationCode] = useState("");
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [assignedDeliveries, setAssignedDeliveries] = useState<any[]>([]);
    const [currentDeliveryId, setCurrentDeliverId] = useState("");
    const [packageTypesModalVisible, setPackageTypesModalVisible] = useState(false);
    const [currentPackageTypes, setCurrentPackageTypes] = useState<string[]>([]);

    const deliveryId = currentDeliveryId || deliveryIdx;

    const getPackageIcon = (type: string) => {
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
            books:books
        };
        const firstType = getFirstPackageType(type);
        return icons[firstType] || null;
    };

    const getDisplayPackageType = (rawType: string | undefined): string => {
        const firstType = getFirstPackageType(rawType);
        return firstType.charAt(0).toUpperCase() + firstType.slice(1);
    };

    const handlePackageInfoPress = (rawType: string | undefined) => {
        const types = getPackageTypesArray(rawType);
        if (types.length > 1) {
            setCurrentPackageTypes(types);
            setPackageTypesModalVisible(true);
        }
    };

    // --- RTK Query hooks with polling and refetch functions ---
    const {
        data: deliveryData,
        refetch: refetchDelivery
    } = useGetTrackDeliveryQuery(deliveryId as string, {
        skip: !deliveryId,
        pollingInterval: 10000,
    });

    const data = deliveryData?.data;
    const tracking = data?.tracking;

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


    const [processedDeliveryIds, setProcessedDeliveryIds] = useState<string[]>([]);
    const [region, setRegion] = useState<Region>({
        latitude: 4.8156,
        longitude: 7.0498,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [locationPermission, setLocationPermission] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isTracking, setIsTracking] = useState(true);
    const { data: userData, refetch: refetchUser }: any = useGetUserQuery({ pollingInterval: 10000 });
    const user = userData?.user;
    const id = user?._id;

    const {
        data: ongoingDeliveries,
        refetch: refetchOngoing
    } = useGetCustomerOngoingQuery(id, {
        skip: !id,
        pollingInterval: 20000,
        refetchOnMountOrArgChange: true,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });
    const deliveriesx = ongoingDeliveries?.data?.deliveries;

    console.log(tracking, "dexlivery x");

    const { refetch: refetchNotifications } = useGetUserNotificationsQuery(undefined, {
        pollingInterval: 30000,
        refetchOnMountOrArgChange: true,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });

    const userx = userData?.user?.deliveryPartnerInfo;

    // --- Refetch all data after focus with 10-second delay ---
    const refetchAll = useCallback(() => {
        refetchDelivery();
        refetchOngoing();
        refetchNotifications();
        refetchUser();
    }, [refetchDelivery, refetchOngoing, refetchNotifications, refetchUser]);

    const appState = useRef(AppState.currentState);
    const focusTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                if (focusTimeout.current) clearTimeout(focusTimeout.current);
                focusTimeout.current = setTimeout(() => {
                    refetchAll();
                }, 10000);
            } else if (nextAppState === 'background') {
                if (focusTimeout.current) {
                    clearTimeout(focusTimeout.current);
                    focusTimeout.current = null;
                }
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
            if (focusTimeout.current) clearTimeout(focusTimeout.current);
        };
    }, [refetchAll]);

    const formatTime = (timestamp: string | Date) => {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    // Updated Timeline Function using tracking data
    const getTimelineEvents = () => {
        if (!tracking?.timeline) return [];

        const activeStatuses = ["request_accepted", "picked_up", "in_transit", "delivered"];

        const filteredTimeline = tracking?.timeline
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
                    location = tracking?.delivery?.address || "Delivery Location";
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

    // --- New assigned deliveries logic ---
    useEffect(() => {
        if (deliveriesx && deliveriesx.length > 0) {
            const newAssignedDeliveries = deliveriesx.filter(
                (delivery: any) =>
                    delivery.status === 'assigned' &&
                    !processedDeliveryIds.includes(delivery._id)
            );
            if (newAssignedDeliveries.length > 0) {
                setAssignedDeliveries(prev => {
                    const existingIds = new Set(prev.map(d => d._id));
                    const uniqueNew = newAssignedDeliveries.filter((d: any) => !existingIds.has(d._id));
                    return [...prev, ...uniqueNew];
                });
                setProcessedDeliveryIds(prev => [...prev, ...newAssignedDeliveries.map((d: any) => d._id)]);
                if (!showNotificationModal && newAssignedDeliveries.length > 0) {
                    setShowNotificationModal(true);
                }
            }
        }
    }, [deliveriesx, processedDeliveryIds, showNotificationModal]);

    const GEOFENCE_RADIUS_METERS = 500;

    const handleNotificationRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetchNotifications();
            console.log('Notifications refreshed manually');
        } catch (error) {
            console.error('Error refreshing notifications:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refetchNotifications]);


    useEffect(() => {
        return () => {
            if (statusUpdateTimeout.current) {
                clearTimeout(statusUpdateTimeout.current);
            }
        };
    }, []);

    // Location methods
    const getUserLocation = async () => {
        try {
            setIsLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to show your current location.');
                setLocationPermission(false);
                setIsLoading(false);
                return;
            }
            setLocationPermission(true);
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const { latitude, longitude } = location.coords;
            const newLocation = { lat: latitude, lng: longitude };
            setCurrentLocation(newLocation);
            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.012,
            };
            setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 500);
            setIsLoading(false);
        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert('Error', 'Unable to get your current location. Please check your device settings.');
            setIsLoading(false);
        }
    };

    const startWatchingLocation = useCallback(async () => {
        if (!locationPermission) return;
        if (locationSubscription.current) {
            locationSubscription.current.remove();
        }
        locationSubscription.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                distanceInterval: 10,
            },
            (location) => {
                const { latitude, longitude } = location.coords;
                setCurrentLocation({ lat: latitude, lng: longitude });
                if (isTracking) {
                    const newRegion = {
                        latitude,
                        longitude,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.012,
                    };
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
        return () => {
            stopWatchingLocation();
        };
    }, []);

    useEffect(() => {
        if (locationPermission) {
            startWatchingLocation();
        } else {
            stopWatchingLocation();
        }
        return () => {
            stopWatchingLocation();
        };
    }, [locationPermission, isTracking, startWatchingLocation]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active' && locationPermission) {
                startWatchingLocation();
                getUserLocation();
            } else if (nextAppState === 'background') {
                stopWatchingLocation();
            }
        });
        return () => {
            subscription.remove();
        };
    }, [locationPermission, startWatchingLocation]);

    // Distance & trip info calculations
    const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const toRad = (value: number) => (value * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const estimateEta = (distanceKm: number, speedKmh = 20): number => {
        return (distanceKm / speedKmh) * 60;
    };

    const [tripInfo, setTripInfo] = useState({
        toPickup: null as { distance: number; eta: number } | null,
        toDropoff: null as { distance: number; eta: number } | null,
        totalEta: null as number | null,
    });

    useEffect(() => {
        if (!currentLocation || !tracking) return;
        const pickup = tracking?.pickup?.location?.coordinates;
        if (!pickup) return;
        const pickupLat = pickup[1];
        const pickupLng = pickup[0];
        const distToPickup = haversineDistance(currentLocation.lat, currentLocation.lng, pickupLat, pickupLng);
        const etaToPickup = estimateEta(distToPickup);
        let distToDelivery = tracking?.distance;
        if (!distToDelivery && pickupLatLng && deliveryLatLng) {
            distToDelivery = haversineDistance(pickupLatLng.latitude, pickupLatLng.longitude, deliveryLatLng.latitude, deliveryLatLng.longitude);
        }
        const etaToDelivery = estimateEta(distToDelivery);
        const totalEta = etaToPickup + etaToDelivery;
        setTripInfo({
            toPickup: { distance: parseFloat(distToPickup.toFixed(1)), eta: Math.round(etaToPickup) },
            toDropoff: { distance: parseFloat(distToDelivery.toFixed(1)), eta: Math.round(etaToDelivery) },
            totalEta: Math.round(totalEta),
        });
    }, [currentLocation, tracking, pickupLatLng, deliveryLatLng]);

    useEffect(() => {
        if (tracking && pickupLatLng && mapRef.current) {
            const pickupRegion = {
                latitude: pickupLatLng.latitude,
                longitude: pickupLatLng.longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.012,
            };
            mapRef.current.animateToRegion(pickupRegion, 1000);
        }
    }, [tracking, pickupLatLng]);

    const formatPhoneNumber = (phone: string) => {
        if (!phone) return "";
        const digits = phone.replace(/\D/g, "");
        if (digits.length === 11 && digits[0] === "0") {
            return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
        }
        if (digits.length === 10) {
            return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
        }
        return phone;
    };




    const timelineEvents = getTimelineEvents();

    // --- Collapsible bottom sheet logic ---
    const [isExpanded, setIsExpanded] = useState(false);
    const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

    const animateToExpanded = () => {
        setIsExpanded(true);
        Animated.timing(sheetHeight, {
            toValue: EXPANDED_HEIGHT,
            duration: 250,
            useNativeDriver: false,
        }).start();
    };

    const animateToCollapsed = () => {
        setIsExpanded(false);
        Animated.timing(sheetHeight, {
            toValue: COLLAPSED_HEIGHT,
            duration: 250,
            useNativeDriver: false,
        }).start();
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
            onPanResponderMove: (_, gestureState) => {
                const newHeight = isExpanded ? EXPANDED_HEIGHT - gestureState.dy : COLLAPSED_HEIGHT - gestureState.dy;
                if (newHeight >= COLLAPSED_HEIGHT && newHeight <= EXPANDED_HEIGHT) {
                    sheetHeight.setValue(newHeight);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (isExpanded) {
                    if (gestureState.dy > EXPANDED_HEIGHT * 0.2) {
                        animateToCollapsed();
                    } else {
                        Animated.spring(sheetHeight, {
                            toValue: EXPANDED_HEIGHT,
                            useNativeDriver: false,
                        }).start();
                    }
                } else {
                    if (gestureState.dy < -COLLAPSED_HEIGHT * 0.2) {
                        animateToExpanded();
                    } else {
                        Animated.spring(sheetHeight, {
                            toValue: COLLAPSED_HEIGHT,
                            useNativeDriver: false,
                        }).start();
                    }
                }
            },
        })
    ).current;




    // Toggle on handle tap
    const handleToggle = () => {
        if (isExpanded) {
            animateToCollapsed();
        } else {
            animateToExpanded();
        }
    };



    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#0052CC" />
                <Text className="mt-3 text-base text-gray-700">Getting your location...</Text>
            </View>
        );
    }

    const rawPackageType = tracking?.package?.type;
    const displayType = getDisplayPackageType(rawPackageType);
    const hasMultipleTypes = getPackageTypesArray(rawPackageType).length > 1;

    return (
        <View className="flex-1 bg-white">
            <View className="flex-1 relative">
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_DEFAULT}
                    style={{ flex: 1, width: '100%', height: '100%' }}
                    region={region}
                    onRegionChangeComplete={setRegion}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                    followsUserLocation={isTracking}
                    zoomControlEnabled={Platform.OS === 'android'}
                >
                    {currentLocation && (
                        <>
                            <Marker
                                coordinate={{
                                    latitude: currentLocation.lat,
                                    longitude: currentLocation.lng
                                }}
                                tracksViewChanges={false}
                            >
                                <View className="items-center justify-center">
                                    <View className="bg-[#0052CC] w-11 h-11 rounded-full items-center justify-center border-2 border-white shadow-lg">
                                        <FontAwesome5 name="motorcycle" size={20} color="#fff" />
                                    </View>
                                    <View className="absolute w-[60px] h-[60px] rounded-full bg-blue-500/30 opacity-60" />
                                </View>
                            </Marker>
                            <Circle
                                center={{
                                    latitude: currentLocation.lat,
                                    longitude: currentLocation.lng
                                }}
                                radius={GEOFENCE_RADIUS_METERS}
                                strokeColor="rgba(0, 82, 204, 0.6)"
                                fillColor="rgba(0, 82, 204, 0.15)"
                                strokeWidth={2}
                            />
                        </>
                    )}
                    {pickupLatLng && (
                        <Marker
                            coordinate={pickupLatLng}
                            title="Pickup Location"
                            description={tracking?.pickup?.address}
                        >
                            <View className="bg-green-500 w-9 h-9 rounded-full items-center justify-center border-2 border-white shadow-lg">
                                <FontAwesome5 name="box" size={16} color="#fff" />
                            </View>
                        </Marker>
                    )}
                    {deliveryLatLng && (
                        <Marker
                            coordinate={deliveryLatLng}
                            title="Delivery Location"
                            description={tracking?.delivery?.address}
                        >
                            <View className="bg-red-500 w-9 h-9 rounded-full items-center justify-center border-2 border-white shadow-lg">
                                <FontAwesome5 name="flag-checkered" size={16} color="#fff" />
                            </View>
                        </Marker>
                    )}
                    {currentLocation && pickupLatLng && (
                        <Polyline
                            coordinates={[
                                { latitude: currentLocation.lat, longitude: currentLocation.lng },
                                pickupLatLng
                            ]}
                            strokeColor="#0052CC"
                            strokeWidth={3}
                            lineDashPattern={[5, 10]}
                        />
                    )}
                </MapView>

                <View className="absolute top-[60px] right-4 bg-white rounded-full z-10">
                    <NotificationBadge
                        onRefresh={handleNotificationRefresh}
                        isRefreshing={refreshing}
                    />
                </View>
                <View className="absolute top-[60px] left-4 bg-white rounded-md z-10">
                    <View>
                        <TouchableOpacity onPress={() => router.back()} className='flex-row items-center gap-1 px-2 py-1'>
                            <Ionicons name="arrow-back-outline" size={24} color="#000" />
                            <Text>Back</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Collapsible Bottom Sheet */}
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            borderTopLeftRadius: 30,
                            borderTopRightRadius: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 5,
                            overflow: 'hidden',
                            height: sheetHeight,
                        },
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={handleToggle}
                        className="w-full flex-row items-center justify-center"
                        {...panResponder.panHandlers}
                    >
                        <View className="ml-2">
                            {isExpanded ? (
                                <Entypo name="chevron-down" size={20} color="#999" />
                            ) : (
                                <Entypo name="chevron-up" size={20} color="#999" />
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* tracking info  section*/}
                    {/* Tracking Info Card */}
                    <View className="bg-black rounded-2xl shadow-md border border-gray-100 p-4 mx-4 mb-3">
                        {/* Package Icon + Type + Tracking ID */}
                        <View className="flex-row items-center mb-3">
                            <View className="mr-3 bg-[#fcf1e8] p-2 rounded-full">
                                {rawPackageType && getPackageIcon(rawPackageType) ? (
                                    <Image
                                        source={getPackageIcon(rawPackageType)}
                                        className="w-8 h-8"
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <Ionicons name="cube-outline" size={28} color="#9CA3AF" />
                                )}
                            </View>
                            <View className="flex-1">
                                <View className="flex-row items-center gap-1">
                                    <Text className="text-base font-bold text-gray-100">
                                        {displayType}
                                    </Text>
                                    {hasMultipleTypes && (
                                        <TouchableOpacity onPress={() => handlePackageInfoPress(rawPackageType)}>
                                            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <Text className="text-xs text-gray-200">
                                    Tracking ID: #{tracking?.trackingId || "N/A"}
                                </Text>
                            </View>

                            {/* Tracking Info Card toggle */}
                            <View className="px-3 py-1 rounded-full">

                                {infoCardToggle ?

                                    <TouchableOpacity
                                        onPress={() => setInfoCardToggle(false)}
                                    >
                                        <View className="ml-2">
                                            <Entypo name="chevron-up" size={20} color="#999" />
                                        </View>
                                    </TouchableOpacity>

                                    :

                                    <TouchableOpacity
                                        onPress={() => setInfoCardToggle(true)}
                                    >
                                        <View className="ml-2">
                                            <Entypo name="chevron-down" size={20} color="#999" />
                                        </View>
                                    </TouchableOpacity>


                                }

                            </View>
                        </View>

                        {/* From / To */}
                        {infoCardToggle &&
                            <View className="flex-row">
                                <View className="flex-1 pr-2">
                                    <Text className="text-xs font-medium text-gray-300 capitalize tracking-wide mb-1">From</Text>
                                    <Text className="text-sm font-semibold text-gray-50">Sender</Text>
                                    <Text className="text-xs text-gray-100 mt-0.5">
                                        {tracking?.pickup?.contactName ||
                                            `${tracking?.customer?.firstName || ""} ${tracking?.customer?.lastName || ""}`.trim() ||
                                            "N/A"}
                                    </Text>

                                    {/* Make the phone numbers clickable to contact so user can call them here straight */}
                                    {/* Clickable Phone Number - Sender */}
                                    {(() => {
                                        const phone = tracking?.pickup?.contactPhone || tracking?.customer?.phone;
                                        return phone ? (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const isRealDevice = Constants.isDevice;
                                                    if (isRealDevice) {
                                                        Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
                                                    } else {
                                                        Alert.alert('Simulator', 'Phone calls are not supported in the simulator.');
                                                    }
                                                }}
                                            >
                                                <Text className="text-xs text-blue-500 mt-1 font-medium underline">
                                                    {formatPhoneNumber(phone)}
                                                </Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <Text className="text-xs text-gray-400 mt-1">No phone number</Text>
                                        );
                                    })()}
                                </View>
                                <View className="flex-1 pl-2">
                                    <Text className="text-xs font-medium text-gray-300 capitalize tracking-wide mb-1">To</Text>
                                    <Text className="text-sm font-semibold text-gray-50">Receiver</Text>
                                    <Text className="text-xs text-gray-100 mt-0.5">
                                        {tracking?.delivery?.contactName || "Receiver"}
                                    </Text>
                                    {/* Make the phone numbers clickable to contact so user can call them here straight */}
                                    {(() => {
                                        const phone = tracking?.delivery?.contactPhone;
                                        return phone ? (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const isRealDevice = Constants.isDevice;
                                                    if (isRealDevice) {
                                                        Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
                                                    } else {
                                                        Alert.alert('Simulator', 'Phone calls are not supported in the simulator.');
                                                    }
                                                }}
                                            >
                                                <Text className="text-xs text-blue-500 mt-1 font-medium underline">
                                                    {formatPhoneNumber(phone)}
                                                </Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <Text className="text-xs text-gray-400 mt-1">No phone number</Text>
                                        );
                                    })()}

                                </View>
                            </View>
                        }
                    </View>

                    <View className="mb-4 mx-4">
                        <View className="flex-row items-center gap-3">
                            <Image
                                source={{ uri: tracking?.customer?.avatar || DEFAULT_AVATAR }}
                                className="w-12 h-12 rounded-full border-2 border-gray-100"
                                resizeMode="cover"
                            />
                            <View className="flex-1">
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-sm font-semibold text-gray-900 truncate flex-1">
                                        {tracking?.customer?.firstName} {tracking?.customer?.lastName}
                                    </Text>
                                    <Text className="text-lg font-bold text-black">
                                        ₦{tracking?.price?.toLocaleString() || '0'}
                                    </Text>
                                </View>
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-xs text-gray-500 flex-1">
                                        {tracking?.delivery?.address}
                                    </Text>
                                    <Text className="text-xs text-gray-500 ml-1 pl-3">
                                        {tracking?.distance} km
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
                        {timelineEvents.length > 0 && (
                            <View className="mx-4 py-4">
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
                    </ScrollView>

                    <View className='mx-4 mb-5'>
                        <DeliveryStatusChange
                            deliveryId={deliveryId}
                            userId={id}
                            handleRefresh={refetchDelivery}
                            setHideSheet={setHideSheet}
                            deliveryConfirmationCode={deliveryConfirmationCode}
                            setShowCodeModal={setShowCodeModal}
                            showCodeModal={showCodeModal}
                            setDeliveryConfirmationCode={setDeliveryConfirmationCode}
                            data={data}
                            tracking={tracking}
                            currentUser={user}
                        />
                    </View>
                </Animated.View>
            </View>

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
                            <Ionicons name="cube-outline" size={48} color="#1969fe" />
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
        </View>
    );
}