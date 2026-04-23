// components/SkeletonLoader.tsx
import React from 'react';
import { View } from 'react-native';

export default function SkeletonLoader() {
  return (
    <View className="flex-1 bg-white px-4">
      {/* Header Skeleton */}
      <View className="flex-row justify-between items-center py-3">
        <View className="flex-row items-center gap-3">
          <View className="w-14 h-14 rounded-full bg-gray-200" />
          <View>
            <View className="w-24 h-3 bg-gray-200 rounded mb-2" />
            <View className="w-32 h-4 bg-gray-200 rounded" />
          </View>
        </View>
        <View className="w-8 h-8 bg-gray-200 rounded-full" />
      </View>

      {/* Title Section Skeleton */}
      <View className="mt-3 mb-6">
        <View className="w-64 h-7 bg-gray-200 rounded mb-2" />
        <View className="w-full h-12 bg-gray-200 rounded" />
      </View>

      {/* Stats Cards Skeleton */}
      {[1, 2, 3].map((item) => (
        <View key={item} className="bg-gray-100 rounded-2xl p-4 mb-4">
          <View className="w-32 h-4 bg-gray-200 rounded mb-3" />
          <View className="w-40 h-8 bg-gray-200 rounded mb-3" />
          <View className="flex-row justify-between">
            <View className="w-20 h-12 bg-gray-200 rounded" />
            <View className="w-20 h-12 bg-gray-200 rounded" />
          </View>
        </View>
      ))}
    </View>
  );
}