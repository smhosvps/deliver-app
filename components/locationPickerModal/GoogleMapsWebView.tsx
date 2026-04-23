import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region, Circle, Polygon } from 'react-native-maps';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { useGetGeofencesQuery } from '@/redux/features/geofencingApi/geofencingApi';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDu03H9B-waZMpoXPi7voWvXhV2kY3avI0';

interface LocationResult {
  address: string;
  coordinates: [number, number];
  location: { lat: number; lng: number };
}

interface GoogleMapsWebViewProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: LocationResult) => void;
  initialCoordinates?: { lat: number; lng: number };
}

// ---------- Helper functions for geofence validation ----------
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const isPointInPolygon = (lat: number, lng: number, polygonCoords: number[][]): boolean => {
  let inside = false;
  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = polygonCoords[i][1];
    const yi = polygonCoords[i][0];
    const xj = polygonCoords[j][1];
    const yj = polygonCoords[j][0];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

export default function GoogleMapsWebView({
  visible,
  onClose,
  onLocationSelect,
  initialCoordinates = { lat: 4.8156, lng: 7.0498 },
}: GoogleMapsWebViewProps) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>({
    latitude: initialCoordinates.lat,
    longitude: initialCoordinates.lng,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);

  const { data: geofences, isLoading: loadingGeofencing, error } = useGetGeofencesQuery();
  const [isValidLocation, setIsValidLocation] = useState(false);

  // Autocomplete states
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Check if a point is inside any geofence
  const isPointInsideGeofences = (lat: number, lng: number): boolean => {
    if (!geofences || geofences.length === 0) return false;
    for (const gf of geofences) {
      if (gf.type === 'circle' && gf.center && gf.radius) {
        const distance = haversineDistance(lat, lng, gf.center.coordinates[1], gf.center.coordinates[0]);
        if (distance <= gf.radius) return true;
      } else if (gf.type === 'polygon' && gf.polygon && gf.polygon.coordinates) {
        const outerRing = gf.polygon.coordinates[0];
        if (isPointInPolygon(lat, lng, outerRing)) return true;
      }
    }
    return false;
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      return 'Unknown location';
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return 'Unknown location';
    }
  };

  const clearSelection = () => {
    setSelectedAddress('');
    setSearchQuery('');
    setMarker(null);
    setIsValidLocation(false);
    setBottomSheetVisible(false);
    setPredictions([]);
  };

  // Core location handler – returns true if valid and bottom sheet opens
  const handleLocationChosen = async (lat: number, lng: number, address?: string): Promise<boolean> => {
    const inside = isPointInsideGeofences(lat, lng);
    if (!inside) {
      Alert.alert('Location not allowed', 'Please select a location within the delivery area.');
      return false;
    }

    setMarker({ lat, lng });
    setIsValidLocation(true);
    const finalAddress = address || await reverseGeocode(lat, lng);
    setSelectedAddress(finalAddress);
    setSearchQuery(finalAddress);
    setBottomSheetVisible(true);
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.015, longitudeDelta: 0.012 },
      400
    );
    return true;
  };

  const fetchPredictions = async (text: string) => {
    if (text.length < 3) {
      setPredictions([]);
      return;
    }
    setFetching(true);
    try {
      const token = sessionToken || Math.random().toString(36).substring(2);
      if (!sessionToken) setSessionToken(token);
      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'suggestions.placePrediction.text,suggestions.placePrediction.placeId',
        },
        body: JSON.stringify({
          input: text,
          locationBias: {
            circle: { center: { latitude: region.latitude, longitude: region.longitude }, radius: 50000 },
          },
          languageCode: 'en',
          sessionToken: token,
        }),
      });
      const data = await response.json();
      setPredictions(data.suggestions || []);
    } catch (err) {
      console.error('Places API error:', err);
      setPredictions([]);
    } finally {
      setFetching(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchPredictions(text), 300);
  };

  const handlePredictionPress = async (placeId: string, description: string) => {
    setFetching(true);
    try {
      const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;
      const detailsRes = await fetch(detailsUrl, {
        headers: {
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'location,formattedAddress,displayName',
        },
      });
      const details = await detailsRes.json();
      const lat = details.location?.latitude;
      const lng = details.location?.longitude;
      const address = details.formattedAddress || details.displayName?.text || description;
      if (lat && lng) {
        await handleLocationChosen(lat, lng, address);
      }
      setPredictions([]);
      setSessionToken(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch place details');
    } finally {
      setFetching(false);
    }
  };

  const handleMapPress = async (e: any) => {
    if (loadingGeofencing) {
      Alert.alert('Loading', 'Please wait, delivery areas are loading...');
      return;
    }
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setIsLoading(true);
    await handleLocationChosen(latitude, longitude);
    setIsLoading(false);
  };

  const handleConfirm = () => {
    if (!marker || !isValidLocation) {
      Alert.alert('Invalid location', 'Please select a location within the delivery area.');
      return;
    }
    if (!selectedAddress) {
      Alert.alert('Address missing', 'Unable to get address for this location.');
      return;
    }
    onLocationSelect({
      address: selectedAddress,
      coordinates: [marker.lng, marker.lat],
      location: { lat: marker.lat, lng: marker.lng },
    });
    onClose();
  };

  const renderGeofences = () => {
    if (!geofences) return null;
    return geofences.map((gf) => {
      if (gf.type === 'circle' && gf.center && gf.radius) {
        return (
          <Circle
            key={gf._id}
            center={{ latitude: gf.center.coordinates[1], longitude: gf.center.coordinates[0] }}
            radius={gf.radius}
            strokeColor="rgba(25, 105, 254, 0.8)"
            fillColor="rgba(25, 105, 254, 0.1)"
            strokeWidth={2}
          />
        );
      } else if (gf.type === 'polygon' && gf.polygon && gf.polygon.coordinates) {
        const outerRing = gf.polygon.coordinates[0].map(coord => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        return (
          <Polygon
            key={gf._id}
            coordinates={outerRing}
            strokeColor="rgba(25, 105, 254, 0.8)"
            fillColor="rgba(25, 105, 254, 0.1)"
            strokeWidth={2}
          />
        );
      }
      return null;
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {/* Header / Back button */}
      {selectedAddress ? (
        <View style={styles.backButtonContainer}>
          <TouchableOpacity onPress={clearSelection} style={styles.backButton}>
            <Ionicons name="arrow-back-outline" size={24} color="#000" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-outline" size={24} color="#9c9c9c" />
          </TouchableOpacity>
          <Text style={styles.title}>Home</Text>
        </View>
      )}

      {/* Search bar */}
      {!selectedAddress && (
        <View style={styles.searchBar}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search address..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]); }} style={styles.clearButton}>
                <Ionicons name="close-circle-outline" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Autocomplete suggestions */}
      {predictions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={predictions}
            keyExtractor={(item, idx) => item.placePrediction?.placeId || idx.toString()}
            renderItem={({ item }) => {
              const placeId = item.placePrediction?.placeId;
              const description = item.placePrediction?.text?.text || 'Unknown';
              return (
                <TouchableOpacity style={styles.suggestionItem} onPress={() => handlePredictionPress(placeId, description)}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.suggestionText} numberOfLines={1}>{description}</Text>
                </TouchableOpacity>
              );
            }}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'ios' ? undefined : PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
        >
          {renderGeofences()}
          {marker && (
            <Marker coordinate={{ latitude: marker.lat, longitude: marker.lng }}>
              <View style={styles.customMarker}>
                <Entypo name="direction" size={24} color="white" />
              </View>
            </Marker>
          )}
        </MapView>

        {(isLoading || fetching) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0052CC" />
            <Text style={styles.loadingText}>{isLoading ? 'Getting address...' : 'Searching...'}</Text>
          </View>
        )}
        {loadingGeofencing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0052CC" />
            <Text style={styles.loadingText}>Loading delivery areas...</Text>
          </View>
        )}
      </View>

      {/* Bottom Sheet */}
      <Modal visible={bottomSheetVisible} transparent animationType="slide" onRequestClose={clearSelection}>
        <TouchableOpacity style={styles.bottomSheetBackdrop} activeOpacity={1} onPress={clearSelection}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.bottomSheetContent}>
              <View style={styles.bottomSheetInfo}>
                <Text style={styles.bottomSheetInfoText}>
                  Drag map to set the default pick-up/drop-off location for the saved place
                </Text>
              </View>
              <View style={styles.bottomSheetAddressRow}>
                <View style={styles.bottomSheetAddressContainer}>
                  <Text style={styles.bottomSheetAddressText}>
                    {selectedAddress || 'Select a location'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.bottomSheetSearchIcon}>
                  <Ionicons name="search-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.bottomSheetConfirmButton, !isValidLocation && styles.disabledButton]}
                onPress={handleConfirm}
                disabled={!isValidLocation}
              >
                <Text style={styles.bottomSheetConfirmText}>Confirm Location</Text>
              </TouchableOpacity>
              {!isValidLocation && (
                <Text style={styles.warningText}>⚠️ This location is outside the delivery area</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 50, flexDirection: 'row', alignItems: 'center', justifyContent: "flex-start", paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  closeButton: { padding: 4 },
  title: { fontSize: 18, fontWeight: '400', color: '#9c9c9c' },
  searchBar: { padding: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 16, color: '#111827', paddingVertical: 0 },
  clearButton: { padding: 4 },
  suggestionsContainer: { position: 'absolute', top: 170, left: 12, right: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', maxHeight: 200, zIndex: 10, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestionText: { marginLeft: 8, fontSize: 14, color: '#1F2937', flex: 1 },
  mapContainer: { flex: 1, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#374151' },
  backButtonContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 16, zIndex: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  backButtonText: { marginLeft: 4, fontSize: 16, fontWeight: '500', color: '#000' },
  bottomSheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20, paddingHorizontal: 20 },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  bottomSheetContent: { paddingBottom: 20, position: 'relative' },
  bottomSheetInfo: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#F59E0B' },
  bottomSheetInfoText: { color: '#B45309', fontSize: 12 },
  bottomSheetAddressRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'center' },
  bottomSheetAddressContainer: { flex: 1 },
  bottomSheetAddressText: { fontSize: 14, color: '#1F2937' },
  bottomSheetSearchIcon: { width: 40, alignItems: 'flex-end' },
  bottomSheetConfirmButton: { backgroundColor: '#0052CC', paddingVertical: 14, borderRadius: 100, alignItems: 'center' },
  disabledButton: { backgroundColor: '#9CA3AF' },
  bottomSheetConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  customMarker: { backgroundColor: '#1969fe', borderRadius: 100, padding: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  warningText: { textAlign: 'center', color: '#EF4444', fontSize: 12, marginTop: 8 },
});