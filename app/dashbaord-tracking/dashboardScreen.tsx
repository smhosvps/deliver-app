import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const [hideBalance, setHideBalance] = useState(false);

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Map Area */}
      <View className="h-80 bg-gray-200 relative mb-4">
        <Image
          source={{
            uri: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/iPhone%2016%20-%20124-TUB0kllk0oIj7GwHN80qYpnG8s69zl.png',
          }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>

      {/* User Profile Card */}
      <View className="mx-4 mb-4 flex-row justify-between items-center pb-4 border-b border-gray-200">
        <View className="flex-row gap-3 items-center">
          <Image
            source={{
              uri: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/placeholder-user-xpqEd24g8I0IzBQc9PqTqYCM6M9mJm.jpg',
            }}
            className="w-12 h-12 rounded-full bg-gray-300"
          />
          <View>
            <Text className="font-bold text-black">Martini Biaq</Text>
            <Text className="text-green-500 text-sm">Online</Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={24} color="#000" />
      </View>

      {/* Balance Card */}
      <View className="mx-4 mb-4 bg-black rounded-2xl p-6">
        <Text className="text-gray-400 text-sm mb-2">Available Balance</Text>
        <View className="flex-row justify-between items-center">
          <Text className="text-white font-bold text-3xl">
            {hideBalance ? '****' : '₦143,400.00'}
          </Text>
          <TouchableOpacity onPress={() => setHideBalance(!hideBalance)}>
            <View className="bg-white rounded-full p-2">
              {hideBalance ? (
                <Ionicons name="eye-off" size={20} color="#000" />
              ) : (
                <Ionicons name="eye" size={20} color="#000" />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Go Online/Offline Button */}
      <TouchableOpacity className="mx-4 mb-4 bg-primary py-4 rounded-full flex-row justify-center items-center gap-2">
        <Text className="text-white font-bold text-lg">Go offline</Text>
        <View className="bg-white rounded-full p-1">
          <Text className="text-primary">{'>>>'}</Text>
        </View>
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <View className="flex-row justify-around items-center border-t border-gray-200 py-4 mb-4">
        <TouchableOpacity className="items-center bg-primary rounded-full px-6 py-2">
          <Text className="text-white font-bold">🏠 Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <View className="w-6 h-6 bg-gray-400 rounded"></View>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <View className="w-6 h-6 bg-gray-400 rounded"></View>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <View className="w-6 h-6 bg-gray-400 rounded"></View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}