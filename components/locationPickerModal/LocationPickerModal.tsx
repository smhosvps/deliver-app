import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import GoogleMapsWebView from './GoogleMapsWebView';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: {
    address: string;
    coordinates: [number, number];
    location: { lat: number; lng: number };
  }) => void;
  initialAddress?: string;
  initialCoordinates?: { lat: number; lng: number };
}

const PORT_HARCOURT_COORDINATES = {
  lat: 4.8156,
  lng: 7.0498,
};

const PORT_HARCOURT_ADDRESS = 'Port Harcourt, Rivers State, Nigeria';

export default function LocationPickerModal({
  visible,
  onClose,
  onLocationSelect,
  initialAddress = PORT_HARCOURT_ADDRESS,
  initialCoordinates = PORT_HARCOURT_COORDINATES,
}: LocationPickerModalProps) {
  const [showMapView, setShowMapView] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'comingSoon' | 'currentLocation' | 'error';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'comingSoon',
  });

  const handleSelectLocationType = (type: 'search' | 'map') => {
    if (type === 'map') {
      setShowMapView(true);
    } else {
      setAlertConfig({
        visible: true,
        title: 'Coming Soon',
        message: 'Search-based location picker will be available soon.',
        type: 'comingSoon',
      });
    }
  };

  const getCurrentLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAlertConfig({
          visible: true,
          title: 'Permission Denied',
          message: 'Location permission is required to use your current location.',
          type: 'error',
        });
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
      });

      const { latitude, longitude } = currentLocation.coords;

      // Reverse geocode to get address
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const formattedAddress = addressResult
        ? `${addressResult.street || ''} ${addressResult.city || ''} ${addressResult.region || ''} ${addressResult.country || ''}`.trim()
        : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

      onLocationSelect({
        address: formattedAddress || 'Current Location',
        coordinates: [longitude, latitude],
        location: { lat: latitude, lng: longitude },
      });
      onClose();
    } catch (error) {
      console.error('Error getting current location:', error);
      setAlertConfig({
        visible: true,
        title: 'Location Error',
        message: 'Could not fetch your current location. Please try again later.',
        type: 'error',
      });
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleCurrentLocationPress = () => {
    getCurrentLocation();
  };

  const handleAlertConfirm = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  if (showMapView) {
    return (
      <GoogleMapsWebView
        visible={visible}
        onClose={() => {
          setShowMapView(false);
          onClose();
        }}
        onLocationSelect={(location) => {
          setShowMapView(false);
          onLocationSelect(location);
        }}
        initialCoordinates={initialCoordinates}
      />
    );
  }

  if (visible && !showMapView) {
    return (
      <>
        <Modal
          visible={visible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={onClose}
        >
          <View className="flex-1 bg-white mt-12">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 android:mt-3">
              <TouchableOpacity onPress={onClose} className="p-2">
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-gray-900 text-center">
                Select Location Method
              </Text>
              <View style={{ width: 60 }} />
            </View>

            <View className="flex-1 p-5">
              <Text className="text-base text-gray-500 mb-6 md:text-xl">
                Choose how you want to select a location
              </Text>

              {/* Map Selection Option */}
              <TouchableOpacity
                className="flex-row items-center bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-200"
                onPress={() => handleSelectLocationType('map')}
              >
                <View className="w-15 h-15 rounded-xl mr-4 bg-blue-50">
                  <Ionicons name="map" size={32} color="#1969fe" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-blue-800 mb-1">
                    Select on Map
                  </Text>
                  <Text className="text-sm text-blue-500 mb-2">
                    Pinpoint exact location on an interactive Google Map
                  </Text>
                  <Text className="text-xs text-blue-500 leading-5">
                    • Search any address{"\n"}
                    • Get exact coordinates{"\n"}
                    • Visual map interface
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#1969fe" />
              </TouchableOpacity>

              {/* Current Location Option */}
              <TouchableOpacity
                className="flex-row items-center bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-200"
                onPress={handleCurrentLocationPress}
                disabled={isFetchingLocation}
              >
                <View className="w-15 h-15 rounded-xl justify-center items-center mr-4 bg-blue-50">
                  {isFetchingLocation ? (
                    <ActivityIndicator size="small" color="#1969fe" />
                  ) : (
                    <Ionicons name="locate" size={32} color="#1969fe" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-blue-800 mb-1">
                    Use Current Location
                  </Text>
                  <Text className="text-sm text-blue-500 mb-2">
                    Automatically detect your current position
                  </Text>
                  <Text className="text-xs text-blue-500 leading-5">
                    • Most accurate for pickup locations{"\n"}
                    • One-tap selection{"\n"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#1969fe" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Custom Alert Modal */}
        <Modal
          visible={alertConfig.visible}
          transparent
          animationType="fade"
          onRequestClose={handleAlertConfirm}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-6">
            <View className="bg-white rounded-2xl w-full max-w-sm p-6">
              <View className="items-center mb-4">
                <View
                  className={`w-12 h-12 rounded-full justify-center items-center ${
                    alertConfig.type === 'error' ? 'bg-red-100' : 'bg-blue-100'
                  }`}
                >
                  <Ionicons
                    name={
                      alertConfig.type === 'error'
                        ? 'alert-circle-outline'
                        : alertConfig.type === 'comingSoon'
                        ? 'time-outline'
                        : 'locate-outline'
                    }
                    size={28}
                    color={alertConfig.type === 'error' ? '#DC2626' : '#0052CC'}
                  />
                </View>
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center mb-2">
                {alertConfig.title}
              </Text>
              <Text className="text-base text-gray-600 text-center mb-6">
                {alertConfig.message}
              </Text>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-[#0052CC]"
                onPress={handleAlertConfirm}
              >
                <Text className="text-center font-semibold text-white">OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return null;
}