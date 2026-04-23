// components/NotificationBadge.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGetUserNotificationsQuery } from '@/redux/features/notificationsApi/notificationApi';

type NotificationBadgeProps = {
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

export default function NotificationBadge({ onRefresh, isRefreshing }: NotificationBadgeProps) {
  const router = useRouter();
  const { data, refetch } = useGetUserNotificationsQuery();

  const unreadCount = data?.unreadCount || 0;

  const handlePress = () => {
    router.push('/notification/notification');
  };

  const handleLongPress = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      refetch();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      className="relative p-2"
    >
      <Ionicons name="notifications-outline" size={24} color="#374151" />
      {unreadCount > 0 && (
        <View className="absolute top-1 right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
          <Text className="text-white text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
      {isRefreshing && (
        <View className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
          <View className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
        </View>
      )}
    </TouchableOpacity>
  );
}