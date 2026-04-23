import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RequestCard = ({ index }: { index: number }) => {
  return (
    <View className="mx-4 mb-4 bg-white border border-gray-200 rounded-2xl p-4">
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

      {/* Timeline */}
      <View className="mb-6">
        <View className="flex-row gap-3 mb-4">
          <View className="items-center gap-3">
            <View className="w-4 h-4 bg-primary rounded-full"></View>
            <View className="w-0.5 h-12 bg-primary"></View>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-black">Pickup</Text>
            <Text className="text-gray-500 text-sm">Ignatius Ajuru University of Education</Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="items-center">
            <View className="w-4 h-4 bg-primary rounded-full"></View>
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-black">Dropoff</Text>
            <Text className="text-gray-500 text-sm">12 Omerji Street Salvation Ministries</Text>
          </View>
        </View>
      </View>

      {/* Buttons */}
      <View className="flex-row gap-3">
        <TouchableOpacity className="flex-1 bg-gray-100 py-3 rounded-full">
          <Text className="text-center text-black font-semibold">Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-primary py-3 rounded-full">
          <Text className="text-center text-white font-bold">Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function RequestsScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Cancel All Button */}
      <View className="m-4 mb-4">
        <TouchableOpacity className="bg-red-100 rounded-full py-2 px-4 flex-row items-center gap-2 w-40">
          <Ionicons name="close" size={24} color="#DC2626" />
          <Text className="text-red-600 font-semibold">Cancel all requests</Text>
        </TouchableOpacity>
      </View>

      {/* Request Cards */}
      {[0, 1, 2].map((index) => (
        <RequestCard key={index} index={index} />
      ))}

      <View className="h-6" />
    </ScrollView>
  );
}
