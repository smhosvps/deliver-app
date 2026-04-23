
// import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';

// export default function TrackingScreen() {
//   return (
//     <ScrollView className="flex-1 bg-white">
//       {/* Map Area */}
//       <View className="h-96 bg-gray-200 relative mb-4">
//         <Image
//           source={{
//             uri: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/iPhone%2016%20-%20128-tu4muE0K6YuhFOsDViSt1Osho7bcUp.png',
//           }}
//           className="w-full h-full"
//           resizeMode="cover"
//         />
//       </View>

//       {/* Food Tracking Card */}
//       <View className="mx-4 mb-4 bg-black rounded-2xl p-4">
//         <View className="flex-row items-center gap-3 mb-3">
//           <View className="w-10 h-10 bg-orange-400 rounded-full"></View>
//           <View className="flex-1">
//             <Text className="text-white font-bold text-lg">Food</Text>
//             <Text className="text-gray-400 text-sm">Tracking ID: #COU90845</Text>
//           </View>
//           <Text className="text-gray-400">⋮</Text>
//         </View>
//       </View>

//       {/* Delivery Person Info */}
//       <View className="mx-4 mb-4">
//         <View className="flex-row justify-between items-start mb-4">
//           <View className="flex-row gap-3">
//             <Image
//               source={{
//                 uri: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/placeholder-user-xpqEd24g8I0IzBQc9PqTqYCM6M9mJm.jpg',
//               }}
//               className="w-12 h-12 rounded-full bg-gray-300"
//             />
//             <View>
//               <Text className="font-bold text-black">Ayawari Malafakumo B.</Text>
//               <Text className="text-gray-500 text-sm">12 Omerji Street Salvation Ministries</Text>
//             </View>
//           </View>
//           <View className="text-right">
//             <Text className="font-bold text-primary">₦1,800.00</Text>
//             <Text className="text-gray-500 text-sm">8.2 km</Text>
//           </View>
//         </View>

//         {/* Timeline */}
//         <View className="gap-4">
//           <View className="flex-row gap-3">
//             <View className="items-center gap-2">
//               <View className="w-4 h-4 bg-primary rounded-full"></View>
//               <View className="w-1 h-12 bg-primary"></View>
//             </View>
//             <View>
//               <Text className="font-semibold text-black">Assigned to rider</Text>
//               <Text className="text-gray-500 text-sm">Ignatius Ajuru University of Education</Text>
//               <Text className="text-gray-400 text-xs mt-1">5:45pm</Text>
//             </View>
//           </View>

//           <View className="flex-row gap-3">
//             <View className="items-center">
//               <View className="w-4 h-4 bg-primary rounded-full"></View>
//             </View>
//             <View>
//               <Text className="font-semibold text-black">Rider enroute to pickup location</Text>
//               <Text className="text-gray-500 text-sm">Ignatius Ajuru University of Education</Text>
//               <Text className="text-gray-400 text-xs mt-1">6:05pm</Text>
//             </View>
//           </View>
//         </View>
//       </View>

//       {/* Button */}
//       <TouchableOpacity className="mx-4 mb-4 bg-primary py-4 rounded-full">
//         <Text className="text-center text-white font-bold text-lg">Arrived Pickup Location</Text>
//       </TouchableOpacity>

//       {/* Bottom Navigation */}
//       <View className="flex-row justify-around items-center border-t border-gray-200 py-4 mb-4">
//         <TouchableOpacity className="items-center">
//           <View className="w-6 h-6 bg-gray-400 rounded"></View>
//         </TouchableOpacity>
//         <TouchableOpacity className="items-center">
//           <View className="w-6 h-6 bg-gray-400 rounded"></View>
//         </TouchableOpacity>
//         <TouchableOpacity className="items-center">
//           <View className="w-6 h-6 bg-gray-400 rounded"></View>
//         </TouchableOpacity>
//         <TouchableOpacity className="items-center">
//           <View className="w-6 h-6 bg-gray-400 rounded"></View>
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// }





import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';



// Fixed pickup and dropoff locations
const PICKUP = { lat: 4.8200, lng: 7.0450 };   // near Alice
const DROPOFF = { lat: 4.8000, lng: 7.0700 }; // east side

export default function MapScreen() {
  const webViewRef = useRef(null);
  const [hideBalance, setHideBalance] = useState(false);
  const bottomSheetRef = useRef(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState(null); // optional – user's actual device location
  const [driverLocation, setDriverLocation] = useState(null);
  const [tripInfo, setTripInfo] = useState({
    toPickup: null,   // { distance, eta }
    toDropoff: null,  // { distance, eta }
    totalEta: null,
  });
  const [loading, setLoading] = useState(true);

  console.log(tripInfo, "trip info");

  // Request device location (optional – just for showing "You" marker)
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location to see your position on the map.');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setDeviceLocation({ lat: latitude, lng: longitude });

      // Watch for location changes
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setDeviceLocation({ lat: latitude, lng: longitude });
        }
      );

      setLoading(false);
      return () => subscription.remove();
    })();
  }, []);

  // Simulate driver movement (random walk) every 30 seconds
  useEffect(() => {
    if (!PICKUP) return;

    // Start driver near pickup
    const initialDriver = {
      lat: PICKUP.lat + 0.01,
      lng: PICKUP.lng + 0.01,
    };
    setDriverLocation(initialDriver);

    const interval = setInterval(() => {
      setDriverLocation(prev => {
        if (!prev) return initialDriver;
        const newLat = prev.lat + (Math.random() - 0.5) * 0.005;
        const newLng = prev.lng + (Math.random() - 0.5) * 0.005;
        const newLocation = { lat: newLat, lng: newLng };
        if (webViewReady && webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'driverLocation',
            location: newLocation,
          }));
        }
        return newLocation;
      });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [webViewReady]);

  // Send initial data to WebView when ready
  useEffect(() => {
    if (webViewReady && webViewRef.current) {
      console.log('📤 Sending deviceLocation to WebView', deviceLocation);
      if (deviceLocation) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'deviceLocation',
          location: deviceLocation,
        }));
      }
      console.log('📤 Sending pickupDropoff to WebView', { pickup: PICKUP, dropoff: DROPOFF });
      webViewRef.current.postMessage(JSON.stringify({
        type: 'pickupDropoff',
        pickup: PICKUP,
        dropoff: DROPOFF,
      }));
    }
  }, [webViewReady, deviceLocation]);

  // Send driver location updates
  useEffect(() => {
    if (webViewReady && driverLocation && webViewRef.current) {
      console.log('📤 Sending driverLocation to WebView', driverLocation);
      webViewRef.current.postMessage(JSON.stringify({
        type: 'driverLocation',
        location: driverLocation,
      }));
    }
  }, [webViewReady, driverLocation]);

  // Handle messages from WebView (route info)
  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📩 Received from WebView:', data);
      if (data.type === 'ready') {
        console.log('✅ WebView ready');
        setWebViewReady(true);
      } else if (data.type === 'tripRoutes') {
        console.log('✅ Received tripRoutes:', data);
        setTripInfo({
          toPickup: data.toPickup,
          toDropoff: data.toDropoff,
          totalEta: (data.toPickup?.eta || 0) + (data.toDropoff?.eta || 0),
        });
      } else if (data.type === 'log') {
        console.log('WebView log:', data.message);
      } else if (data.type === 'error') {
        console.error('WebView error:', data.message);
      }
    } catch (error) {
      console.error('Failed to parse WebView message', error);
    }
  };

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>Ride Tracker</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://unpkg.com/@mapbox/polyline@1.2.0/polyline.min.js"></script>
    <style>
      body { margin: 0; padding: 0; overflow: hidden; }
      #map { height: 100vh; width: 100vw; }
      .legend {
        position: absolute;
        bottom: 16px;
        right: 16px;
        background: white;
        padding: 10px 14px;
        border-radius: 8px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.25);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 13px;
        z-index: 1000;
        line-height: 1.5;
      }
      .legend-item {
        display: flex;
        align-items: center;
        margin: 6px 0;
      }
      .legend-color {
        width: 24px;
        height: 4px;
        margin-right: 10px;
        border-radius: 2px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div id="legend" class="legend"></div>

    <script>
      function log(msg) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: msg }));
      }

      let map;
      let driverMarker, pickupMarker, dropoffMarker, deviceMarker;
      let driverLatLng = null;
      let pickupLatLng = null;
      let dropoffLatLng = null;
      let deviceLatLng = null;
      let routeToPickupLayer = null;
      let routeToDropoffLayer = null;

      map = L.map('map').setView([4.8156, 7.0498], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      log('Map initialized');

      // Icons
      const driverIcon = L.divIcon({
        html: '<div style="background:#22c55e;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.4);"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const pickupIcon = L.divIcon({
        html: '<div style="background:#3b82f6;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.4);"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const dropoffIcon = L.divIcon({
        html: '<div style="background:#ef4444;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.4);"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const youIcon = L.divIcon({
        html: '<div style="background:#6b7280;width:18px;height:18px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      function updateMap() {
        log('updateMap called');
        if (driverLatLng) {
          if (!driverMarker) driverMarker = L.marker(driverLatLng, { icon: driverIcon }).addTo(map).bindPopup('Driver');
          else driverMarker.setLatLng(driverLatLng);
        }
        if (pickupLatLng) {
          if (!pickupMarker) pickupMarker = L.marker(pickupLatLng, { icon: pickupIcon }).addTo(map).bindPopup('Pickup');
          else pickupMarker.setLatLng(pickupLatLng);
        }
        if (dropoffLatLng) {
          if (!dropoffMarker) dropoffMarker = L.marker(dropoffLatLng, { icon: dropoffIcon }).addTo(map).bindPopup('Drop-off');
          else dropoffMarker.setLatLng(dropoffLatLng);
        }
        if (deviceLatLng) {
          if (!deviceMarker) deviceMarker = L.marker(deviceLatLng, { icon: youIcon }).addTo(map).bindPopup('You');
          else deviceMarker.setLatLng(deviceLatLng);
        }
        if (driverLatLng) map.setView(driverLatLng, 15);
        else if (pickupLatLng) map.setView(pickupLatLng, 14);
        calculateRoutes();
        updateLegend();
      }
 
      function updateLegend() {
        const el = document.getElementById('legend');
        if (!el) return;
        let html = '';
        if (driverLatLng) html += '<div class="legend-item"><div class="legend-color" style="background:#22c55e"></div>Driver</div>';
        if (pickupLatLng) html += '<div class="legend-item"><div class="legend-color" style="background:#3b82f6"></div>Pickup</div>';
        if (dropoffLatLng) html += '<div class="legend-item"><div class="legend-color" style="background:#ef4444"></div>Drop-off</div>';
        if (deviceLatLng) html += '<div class="legend-item"><div class="legend-color" style="background:#6b7280"></div>You</div>';
        el.innerHTML = html || '<div>No locations yet</div>';
      }

      async function calculateRoutes() {
        log('calculateRoutes called');
        if (!driverLatLng || !pickupLatLng || !dropoffLatLng) {
          log('Missing locations: driver=' + !!driverLatLng + ' pickup=' + !!pickupLatLng + ' dropoff=' + !!dropoffLatLng);
          return;
        }

        const base = 'https://valhalla1.openstreetmap.de';
        try {
          const r1 = await getRoute(base, [driverLatLng.lng, driverLatLng.lat], [pickupLatLng.lng, pickupLatLng.lat]);
          const r2 = await getRoute(base, [pickupLatLng.lng, pickupLatLng.lat], [dropoffLatLng.lng, dropoffLatLng.lat]);

          log('Route 1 (driver→pickup): distance=' + (r1?.distance || 'null') + ' km, eta=' + (r1?.time || 'null') + ' min');
          log('Route 2 (pickup→dropoff): distance=' + (r2?.distance || 'null') + ' km, eta=' + (r2?.time || 'null') + ' min');

          // Remove old layers
          if (routeToPickupLayer) map.removeLayer(routeToPickupLayer);
          if (routeToDropoffLayer) map.removeLayer(routeToDropoffLayer);

          // Draw driver → pickup line (use shape if available, else straight line)
          if (r1?.shape && r1.shape.length > 0) {
            routeToPickupLayer = L.polyline(r1.shape, { color: '#22c55e', weight: 6, opacity: 0.85 }).addTo(map);
          } else {
            // Fallback: straight line from driver to pickup
            const straightLine = [[driverLatLng.lat, driverLatLng.lng], [pickupLatLng.lat, pickupLatLng.lng]];
            routeToPickupLayer = L.polyline(straightLine, { color: '#22c55e', weight: 4, opacity: 0.7, dashArray: '5, 10' }).addTo(map);
          }

          // Draw pickup → dropoff line (use shape if available, else straight line)
          if (r2?.shape && r2.shape.length > 0) {
            routeToDropoffLayer = L.polyline(r2.shape, { color: '#ef4444', weight: 6, opacity: 0.85 }).addTo(map);
          } else {
            const straightLine = [[pickupLatLng.lat, pickupLatLng.lng], [dropoffLatLng.lat, dropoffLatLng.lng]];
            routeToDropoffLayer = L.polyline(straightLine, { color: '#ef4444', weight: 4, opacity: 0.7, dashArray: '5, 10' }).addTo(map);
          }

          const payload = {
            type: 'tripRoutes',
            toPickup: r1 ? { distance: r1.distance, eta: r1.time } : null,
            toDropoff: r2 ? { distance: r2.distance, eta: r2.time } : null,
          };
          log('Sending tripRoutes: ' + JSON.stringify(payload));
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        } catch (err) {
          log('Error in calculateRoutes: ' + err.message);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.message }));
        }
      }

      async function getRoute(baseUrl, from, to) {
        const body = {
          locations: [
            { lat: from[1], lon: from[0] },
            { lat: to[1],   lon: to[0] }
          ],
          costing: 'auto',
          directions_options: { units: 'kilometers' }
        };
        try {
          log('Fetching route from ' + JSON.stringify(from) + ' to ' + JSON.stringify(to));
          const response = await fetch(baseUrl + '/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (!response.ok) throw new Error('HTTP ' + response.status);
          const data = await response.json();
          if (!data.trip?.routes?.[0]) throw new Error('No route in response');
          const route = data.trip.routes[0];
          const leg = route.legs?.[0];
          let shape = null;
          if (leg?.shape && typeof polyline !== 'undefined') {
            shape = polyline.decode(leg.shape).map(([lat, lon]) => [lat, lon]);
          }
          const distance = (route.summary.length / 1000).toFixed(1);
          const time = Math.round(route.summary.time / 60);
          log('Route fetched: distance=' + distance + ' km, time=' + time + ' min');
          return { distance, time, shape };
        } catch (err) {
          log('Route fetch error: ' + err.message + ' -> using straight line');
          const dist = straightDistance(from[1], from[0], to[1], to[0]);
          const time = Math.round(dist / 40 * 60);
          return { distance: dist.toFixed(1), time, shape: null };
        }
      }

      function straightDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      }

      // Listen for messages from React Native – use window, not document
      window.addEventListener('message', function(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'Received: ' + e.data }));
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'deviceLocation') {
            deviceLatLng = { lat: msg.location.lat, lng: msg.location.lng };
            updateMap();
          } else if (msg.type === 'pickupDropoff') {
            pickupLatLng = { lat: msg.pickup.lat, lng: msg.pickup.lng };
            dropoffLatLng = { lat: msg.dropoff.lat, lng: msg.dropoff.lng };
            updateMap();
          } else if (msg.type === 'driverLocation') {
            driverLatLng = { lat: msg.location.lat, lng: msg.location.lng };
            updateMap();
          }
        } catch (err) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Parse error: ' + err.message }));
        }
      });

      // Send ready message after a short delay to ensure listener is attached
      setTimeout(() => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
      }, 100);
    </script>
  </body>
  </html>
`;

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.map}
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
      />
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['20%', '50%']}
        enablePanDownToClose={false}
        index={0}
        backgroundStyle={styles.bottomSheetBackground}
      >
        <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-row gap-3 flex-1">
              <Image
                source={{
                  uri: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/placeholder-user-xpqEd24g8I0IzBQc9PqTqYCM6M9mJm.jpg',
                }}
                className="w-12 h-12 rounded-full bg-gray-300"
              />
              <View className="flex-1">
                <Text className="font-bold text-black">Ayawari Malafakumo B.</Text>
                <Text className="text-gray-500 text-sm">12 Omerji Street Salvation Ministries</Text>
              </View>
            </View>
            <View className="text-right">
              <Text className="font-bold text-black">₦1,800.00</Text>
              <Text className="text-gray-500 text-sm">8.2 km</Text>
            </View>
          </View>

          {/* Balance Card */}
          <View className="mx-4 mb-4 bg-black rounded-2xl p-6">
            <Text className="text-gray-400 text-sm mb-2">Available Balance</Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-white font-bold text-3xl">
                {hideBalance ? '****' : '₦143,400.00'}
              </Text>
              <TouchableOpacity onPress={() => setHideBalance(!hideBalance)}>
               
                <View className="bg-white rounded-full p-2 flex-row items-center gap-1">
                   <Text className='text-xs'>Hide</Text>
                  {hideBalance ? (
                    <Feather name="eye-off" size={20} color="#000" />
                  ) : (
                    <Feather name="eye" size={20} color="#000" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

     {/* Go Online/Offline Button */}
      <TouchableOpacity className="mx-4 mb-4 bg-blue-700 py-4 rounded-full flex-row justify-center items-center gap-2">
        <Text className="text-white font-bold text-lg">Go offline</Text>
        <View className="bg-white rounded-full p-1">
          <Text className="text-primary">{'>>>'}</Text>
        </View>
      </TouchableOpacity>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Trip Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>To pickup:</Text>
              {tripInfo.toPickup ? (
                <Text style={styles.value}>
                  {tripInfo.toPickup.distance} km · {tripInfo.toPickup.eta} min
                </Text>
              ) : (
                <Text style={styles.value}>Calculating...</Text>
              )}
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>To dropoff:</Text>
              {tripInfo.toDropoff ? (
                <Text style={styles.value}>
                  {tripInfo.toDropoff.distance} km · {tripInfo.toDropoff.eta} min
                </Text>
              ) : (
                <Text style={styles.value}>Calculating...</Text>
              )}
            </View>
            <View style={[styles.row, styles.totalRow]}>
              <Text style={styles.label}>Total ETA:</Text>
              <Text style={styles.totalValue}>
                {tripInfo.totalEta ? `${tripInfo.totalEta} min` : '--'}
              </Text>
            </View>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bottomSheetBackground: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomSheetContent: { padding: 16 },
  infoCard: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 14, fontWeight: '500', color: '#333' },
  totalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#4285F4' },
});