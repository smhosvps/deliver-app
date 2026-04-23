import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    StatusBar,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetUserQuery } from '@/redux/api/apiSlice';
import { useUpdateStatusMutation } from '@/redux/features/deliveryPartnerApi /deliveryPartnerApi';

type DriverStatus = 'available' | 'offline';

export default function UpdateStatusPage() {
    const router = useRouter();
    const { data: dataDriver, isLoading: loadingUser, refetch }: any = useGetUserQuery();
    const [isAvailable, setIsAvailable] = useState<boolean>(true);
    const [updateStatus, { isLoading: isUpdating }] = useUpdateStatusMutation();

    // Set initial status from user data when loaded
    useEffect(() => {
        if (dataDriver?.user?.deliveryPartnerInfo?.status) {
            const userStatus = dataDriver.user.deliveryPartnerInfo.status as DriverStatus;
            setIsAvailable(userStatus === 'available');
        }
    }, [dataDriver]);

    const handleToggleStatus = async () => {
        const newStatus: DriverStatus = isAvailable ? 'offline' : 'available';
        try {
            const response = await updateStatus({ status: newStatus }).unwrap();
            // Refetch user data to get updated status
            await refetch();
            Alert.alert(
                'Success',
                response.message || `Status updated to ${newStatus === 'available' ? 'Available' : 'Offline'}`,
                [{ text: 'OK' }]
            );
            // Navigate back after successful update
            setTimeout(() => router.back(), 1000);
        } catch (error: any) {
            console.error('Update status error:', error);
            let errorMessage = 'Failed to update status';
            if (error?.data?.message) {
                errorMessage = error.data.message;
            } else if (error?.status === 403) {
                errorMessage = 'You must be a delivery partner to update status';
            } else if (error?.status === 401) {
                errorMessage = 'Please login again';
            }
            Alert.alert('Error', errorMessage);
        }
    };

    if (loadingUser) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#1969fe" />
                    <Text className="mt-4 text-gray-600">Loading your status...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const currentStatusLabel = isAvailable ? 'Available' : 'Offline';
    const currentStatusColor = isAvailable ? 'bg-green-500' : 'bg-gray-500';
    const currentStatusLight = isAvailable ? 'bg-green-50' : 'bg-gray-50';

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

            <View className="px-4 py-4">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="flex-row items-center mb-4"
                >
                    <Ionicons name="arrow-back-outline" size={24} color="#242526" />
                    <Text className="text-lg font-normal text-[#242526] ml-1">Back</Text>
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-gray-900">
                    Update Status
                </Text>
                <Text className="text-gray-600 mt-2">
                    Toggle your availability for deliveries.
                </Text>
            </View>

            {/* Current Status Card */}
            <View className="mx-4 mt-6">
                <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Status Header */}
                    <View className={`${currentStatusLight} px-4 py-3 border-b border-gray-200`}>
                        <Text className="text-sm font-medium text-gray-600">Current Status</Text>
                    </View>

                    {/* Status Content */}
                    <View className="p-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center">
                                <View className={`w-3 h-3 rounded-full ${currentStatusColor} mr-2`} />
                                <Text className="text-xl font-bold text-gray-800">
                                    {currentStatusLabel}
                                </Text>
                            </View>
                        </View>
                        <Text className="text-gray-500 text-sm">
                            {isAvailable
                                ? 'Ready to accept new delivery requests'
                                : 'Not available for deliveries'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Toggle Switch */}
            <View className="flex-1 px-4 mt-6">
                <View className="bg-gray-50 rounded-xl p-6 mb-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-base font-semibold text-gray-700">Status</Text>
                        <Switch
                            trackColor={{ false: '#D1D5DB', true: '#1969fe' }}
                            thumbColor={isAvailable ? '#FFFFFF' : '#FFFFFF'}
                            ios_backgroundColor="#D1D5DB"
                            onValueChange={handleToggleStatus}
                            value={isAvailable}
                            disabled={isUpdating}
                        />
                    </View>
                    <View className="flex-row justify-between">
                        <Text className="text-sm text-gray-600">Offline</Text>
                        <Text className="text-sm text-gray-600">Available</Text>
                    </View>
                </View>

                <View className="mt-4">
                    <Text className="text-sm text-gray-500 text-center">
                        {isAvailable
                            ? "When you're available, you'll receive delivery requests."
                            : "When offline, you won't receive any requests."}
                    </Text>
                </View>

                {/* Last Updated Info */}
                {dataDriver?.user?.deliveryPartnerInfo?.location?.lastUpdated && (
                    <View className="mt-6">
                        <Text className="text-xs text-gray-400 text-center">
                            Last location update: {new Date(dataDriver.user.deliveryPartnerInfo.location.lastUpdated).toLocaleTimeString()}
                        </Text>
                    </View>
                )}
            </View>

            {/* Update Button (optional, but we keep for consistency) */}
            <View className="p-4 bg-white border-t border-gray-200">
                <TouchableOpacity
                    className={`p-4 rounded-full items-center flex-row justify-center ${isUpdating
                        ? 'bg-gray-300'
                        : 'bg-[#1969fe]'
                        }`}
                    onPress={handleToggleStatus}
                    disabled={isUpdating}
                    activeOpacity={0.7}
                >
                    {isUpdating ? (
                        <>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text className="text-white text-base font-semibold ml-2">Updating...</Text>
                        </>
                    ) : (
                        <Text className="text-white text-base font-semibold">
                            {isAvailable ? 'Go Offline' : 'Go Online'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}