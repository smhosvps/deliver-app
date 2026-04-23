// components/ActivityItem.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { router } from 'expo-router';


interface ActivityItemProps {
  activity: any;
  getStatusColor: (status: string) => string;
  onPress?: (activity: any) => void;
}

export default function ActivityItem({ activity, getStatusColor, onPress }: ActivityItemProps) {
  const getIcon = () => {
    if (activity.type === 'delivery') {
      return <FontAwesome5 name="shipping-fast" size={20} color="#2196F3" />;
    }
    return <MaterialIcons name="notifications" size={20} color="#FF9800" />;
  };

  const getStatusBadge = () => {
    if (activity.type === 'delivery' && activity.status) {
      return (
        <View 
          className="px-2 py-1 rounded-full"
          style={{ backgroundColor: getStatusColor(activity.status) }}
        >
          <Text className="text-xs text-white font-inter-medium capitalize">
            {activity.status.replace('_', ' ')}
          </Text>
        </View>
      );
    }
    return null;
  };


    const navigateToTracking = (delivery: any) => {
      router.push({
        pathname: "/tracking-details/tracking-details",
        params: {
          deliveryId: delivery.id,
          status: delivery.status,
          deliveryCode: delivery.deliveryCode
        }
      });
    };
  

  return (
    <TouchableOpacity 
      className="flex-row items-start"
      // onPress={() => onPress?.(activity)}
      onPress={() => navigateToTracking(activity)}
      activeOpacity={0.7}
    >
      <View className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-3">
        {getIcon()}
      </View>
      
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-sm font-inter-semibold text-gray-900 flex-1 mr-2">
            {activity.title}
          </Text>
          {getStatusBadge()}
        </View>
        
        <Text className="text-xs font-inter-regular text-gray-500 mb-1">
          {activity.description}
        </Text>
        
        <Text className="text-xs font-inter-regular text-gray-400">
          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}