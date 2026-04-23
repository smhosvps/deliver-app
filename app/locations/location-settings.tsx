import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Modal,
    TouchableWithoutFeedback,
    Linking,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import LocationPickerModal from '@/components/locationPickerModal/LocationPickerModal';
import { useUpdateLocationMutation } from '@/redux/features/deliveryPartnerApi /deliveryPartnerApi';
import { goBack } from 'expo-router/build/global-state/routing';

interface LocationUpdateResponse {
    success: boolean;
    message: string;
    location: {
        coordinates: {
            lat: number;
            lng: number;
        };
        lastUpdated: string;
    };
}

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertModalProps {
    visible: boolean;
    title: string;
    message: string;
    buttons: AlertButton[];
    onClose?: () => void;
}

const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
    visible,
    title,
    message,
    buttons,
    onClose,
}) => {
    const handleButtonPress = (onPress?: () => void) => {
        if (onPress) onPress();
        if (onClose) onClose();
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 bg-black/50 justify-center items-center px-4">
                    <TouchableWithoutFeedback>
                        <View className="bg-white rounded-2xl w-full max-w-sm p-5">
                            <Text className="text-lg font-bold text-gray-900 mb-2">
                                {title}
                            </Text>
                            <Text className="text-gray-600 mb-6">
                                {message}
                            </Text>
                            <View className="flex-row justify-end gap-3">
                                {buttons.map((button, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => handleButtonPress(button.onPress)}
                                        className={`px-4 py-2 rounded-lg ${button.style === 'destructive'
                                                ? 'bg-red-500'
                                                : button.style === 'cancel'
                                                    ? 'bg-gray-200'
                                                    : 'bg-blue-500'
                                            }`}
                                    >
                                        <Text
                                            className={`font-semibold ${button.style === 'cancel'
                                                    ? 'text-gray-700'
                                                    : 'text-white'
                                                }`}
                                        >
                                            {button.text}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default function UpdateLocationPage() {
    const router = useRouter();
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [address, setAddress] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [locationPickerVisible, setLocationPickerVisible] = useState(false);
    const [updateLocation] = useUpdateLocationMutation();

    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);

    const showAlert = (title: string, message: string, buttons: AlertButton[]) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertButtons(buttons);
        setAlertVisible(true);
    };

    const closeAlert = () => {
        setAlertVisible(false);
    };

    useEffect(() => {
        getCurrentLocation();
    }, []);

    const getCurrentLocation = async () => {
        setIsLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showAlert(
                    'Permission Denied',
                    'Location permission is required to update your location. Please enable it in settings.',
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => { } },
                        {
                            text: 'Open Settings',
                            style: 'default',
                            onPress: () => {
                                if (Platform.OS === 'ios') {
                                    Linking.openURL('app-settings:');
                                } else {
                                    Linking.openSettings();
                                }
                            },
                        },
                    ]
                );
                return;
            }

            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
            });

            const { latitude, longitude } = currentLocation.coords;

            const [addressResult] = await Location.reverseGeocodeAsync({
                latitude,
                longitude,
            });

            const formattedAddress = addressResult
                ? `${addressResult.street || ''} ${addressResult.city || ''} ${addressResult.region || ''}`
                : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            setLocation({ lat: latitude, lng: longitude });
            setAddress(formattedAddress);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Location error:', error);
            showAlert('Error', 'Failed to get current location. Please try again.', [
                { text: 'OK', onPress: () => { } },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLocationSelect = (selectedLocation: {
        address: string;
        coordinates: [number, number];
        location: { lat: number; lng: number };
    }) => {
        setLocation({
            lat: selectedLocation.location.lat,
            lng: selectedLocation.location.lng,
        });
        setAddress(selectedLocation.address);
        setLastUpdated(new Date());
    };

    const handleUpdateLocation = async (locationData?: { lat: number; lng: number }) => {
        const locationToUpdate = locationData || location;

        if (!locationToUpdate) {
            showAlert('Error', 'No location available to update', [
                { text: 'OK', onPress: () => { } },
            ]);
            return;
        }

        setIsUpdating(true);

        try {
            const response = (await updateLocation({
                lat: locationToUpdate.lat,
                lng: locationToUpdate.lng,
            }).unwrap()) as LocationUpdateResponse;

            router.back()

            if (response.location?.coordinates) {
                setLocation({
                    lat: response.location.coordinates.lat,
                    lng: response.location.coordinates.lng,
                });
                setLastUpdated(new Date());

                // Reverse geocode to get updated address
                const [addressResult] = await Location.reverseGeocodeAsync({
                    latitude: response.location.coordinates.lat,
                    longitude: response.location.coordinates.lng,
                });

                if (addressResult) {
                    setAddress(
                        `${addressResult.street || ''} ${addressResult.city || ''} ${addressResult.region || ''
                        }`
                    );
                }
            }
        } catch (error: any) {
            console.error('Update location error:', error);

            let errorMessage = 'Failed to update location';

            if (error?.data?.message) {
                errorMessage = error.data.message;
            } else if (error?.error) {
                errorMessage = error.error;
            } else if (error?.status === 403) {
                errorMessage = 'You must be a delivery partner to update location';
            } else if (error?.status === 401) {
                errorMessage = 'Please login again to update location';
            }

            showAlert('Error', errorMessage, [{ text: 'OK', onPress: () => { } }]);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUseCurrentLocation = () => {
        getCurrentLocation();
    };

    const formatLastUpdated = () => {
        if (!lastUpdated) return 'Never';
        const now = new Date();
        const diffMs = now.getTime() - lastUpdated.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        const diffHours = Math.floor(diffMins / 60);
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white">
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <View className="flex-1 justify-center items-center">
                    <View className="bg-blue-50 p-6 rounded-3xl">
                        <ActivityIndicator size="large" color="#3B82F6" />
                    </View>
                    <Text className="mt-6 text-lg font-medium text-gray-700">
                        Getting your location...
                    </Text>
                    <Text className="mt-2 text-sm text-gray-500">Please wait a moment</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

            <View className="px-4 py-4">
                <View className="justify-between flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="flex-row items-center mb-4"
                    >
                        <Ionicons name="arrow-back-outline" size={24} color="#242526" />
                        <Text className="text-lg font-normal text-[#242526] ml-1">Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`p-2 rounded-full items-center mb-3 ${isLoading ? 'opacity-50' : ''
                            }`}
                        onPress={handleUseCurrentLocation}
                        disabled={isLoading}
                        activeOpacity={0.7}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#3B82F6" />
                        ) : (
                            <Ionicons name="refresh" size={20} color="#3B82F6" />
                        )}
                    </TouchableOpacity>
                </View>

                <Text className="text-2xl font-bold text-gray-900">Update Location</Text>
                <Text className="text-gray-600 mt-2">
                    Keep your location accurate for better deliveries
                </Text>
            </View>

            <View className="flex-1 px-4 pt-6">
                {/* Location Card */}
                <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <TouchableOpacity
                        onPress={() => setLocationPickerVisible(true)}
                        activeOpacity={0.8}
                        className="h-40 bg-gray-100 relative"
                    >
                        <View className="absolute inset-0 items-center justify-center">
                            <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center shadow-lg">
                                <Ionicons name="location" size={24} color="#FFFFFF" />
                            </View>
                        </View>
                        <View className="flex-1 flex-row flex-wrap">
                            {[...Array(16)].map((_, i) => (
                                <View key={i} className="w-1/4 h-1/4 border border-gray-200/50" />
                            ))}
                        </View>
                        <View className="absolute bottom-2 right-2 bg-black/50 px-3 py-1 rounded-full">
                            <Text className="text-white text-xs">Tap to change</Text>
                        </View>
                    </TouchableOpacity>

                    <View className="p-5">
                        <View className="flex-row items-start mb-2">
                            <Ionicons name="location-outline" size={20} color="#3B82F6" />
                            <View className="flex-1 ml-2">
                                <Text className="text-gray-900 font-medium mb-1">
                                    Current Location
                                </Text>
                                <Text className="text-gray-600 text-sm" numberOfLines={2}>
                                    {address ||
                                        `${location?.lat.toFixed(6)}, ${location?.lng.toFixed(6)}`}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center mt-2 pt-2 border-t border-gray-100">
                            <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                            <Text className="text-gray-500 text-xs ml-1">
                                Last updated: {formatLastUpdated()}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-100 flex-row items-center">
                    <View className="bg-blue-100 p-2 rounded-full mr-3">
                        <Ionicons name="information-circle" size={20} color="#1969ef" />
                    </View>
                    <Text className="text-sm text-blue-700 flex-1">
                        Tap on the map to select a precise location, or use current location
                    </Text>
                </View>

                <View className="mt-6 mb-4 gap-3">
                    <TouchableOpacity
                        className={`p-4 rounded-full items-center flex-row justify-center ${isUpdating ? 'bg-gray-300' : 'bg-[#1969ef]'
                            }`}
                        onPress={() => handleUpdateLocation()}
                        disabled={isUpdating}
                        activeOpacity={0.7}
                    >
                        {isUpdating ? (
                            <>
                                <ActivityIndicator size="small" color="#ffffff" />
                                <Text className="text-white text-base font-semibold ml-2">
                                    Updating...
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text className="text-white text-base font-semibold ml-2">
                                    Update Location
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {location && (
                <View className="px-4 pb-4">
                    <Text className="text-xs text-gray-400 text-center">
                        Your location is only used for delivery matching and is kept private
                    </Text>
                </View>
            )}

            <LocationPickerModal
                visible={locationPickerVisible}
                onClose={() => setLocationPickerVisible(false)}
                onLocationSelect={(selectedLocation) => {
                    handleLocationSelect(selectedLocation);
                    setLocationPickerVisible(false);
                }}
                initialAddress={address}
                initialCoordinates={location || { lat: 4.8156, lng: 7.0498 }}
            />

            <CustomAlertModal
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                buttons={alertButtons}
                onClose={closeAlert}
            />
        </SafeAreaView>
    );
}