import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetUserQuery } from '@/redux/api/apiSlice';
import { useUpdateWorkingHoursMutation } from '@/redux/features/deliveryPartnerApi /deliveryPartnerApi';

// Time selection component for custom modal
const TimePickerModal = ({
  visible,
  onClose,
  onSelect,
  currentTime,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (time: string) => void;
  currentTime: string;
  title: string;
}) => {
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  // Parse current time when modal opens
  useEffect(() => {
    if (visible && currentTime) {
      const [hours, minutes] = currentTime.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;

      setSelectedHour(hour12);
      setSelectedMinute(minutes);
      setSelectedPeriod(period);
    }
  }, [visible, currentTime]);

  // Generate hours (1-12)
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);

  // Generate minutes (0, 5, 10, ... 55)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleConfirm = () => {
    // Convert to 24-hour format for storage
    let hour24 = selectedHour;
    if (selectedPeriod === 'PM' && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedPeriod === 'AM' && selectedHour === 12) {
      hour24 = 0;
    }

    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onSelect(timeString);
    onClose();
  };

  const formatDisplayTime = (hour: number, minute: number, period: string) => {
    return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl">
          {/* Modal Header */}
          <View className="p-4 border-b border-gray-200">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-semibold text-gray-900">{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Current Time Display */}
          <View className="p-4 bg-blue-50 mx-4 mt-4 rounded-xl">
            <Text className="text-sm text-blue-600 text-center">
              Selected: {formatDisplayTime(selectedHour, selectedMinute, selectedPeriod)}
            </Text>
          </View>

          {/* Time Selection */}
          <View className="p-4">
            {/* Hours Row */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Hour</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    onPress={() => setSelectedHour(hour)}
                    className={`px-5 py-3 rounded-xl ${selectedHour === hour ? 'bg-[#1969fe]' : 'bg-gray-100'
                      }`}
                  >
                    <Text className={`font-medium ${selectedHour === hour ? 'text-white' : 'text-gray-700'
                      }`}>
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Minutes Row */}
            <Text className="text-sm font-medium text-gray-700 mb-2 mt-2">Minute</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {minutes.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    onPress={() => setSelectedMinute(minute)}
                    className={`px-5 py-3 rounded-xl ${selectedMinute === minute ? 'bg-[#1969fe]' : 'bg-gray-100'
                      }`}
                  >
                    <Text className={`font-medium ${selectedMinute === minute ? 'text-white' : 'text-gray-700'
                      }`}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* AM/PM Selection */}
            <Text className="text-sm font-medium text-gray-700 mb-2 mt-2">Period</Text>
            <View className="flex-row gap-3">
              {(['AM', 'PM'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  onPress={() => setSelectedPeriod(period)}
                  className={`flex-1 py-3 rounded-xl ${selectedPeriod === period ? 'bg-[#1969fe]' : 'bg-gray-100'
                    }`}
                >
                  <Text className={`text-center font-medium ${selectedPeriod === period ? 'text-white' : 'text-gray-700'
                    }`}>
                    {period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Confirm Button */}
          <View className="p-4 border-t border-gray-200 my-4">
            <TouchableOpacity
              className="bg-[#1969fe] py-4 rounded-full"
              onPress={handleConfirm}
            >
              <Text className="text-white text-center font-semibold text-base">
                Confirm Time
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function WorkingHoursPage() {
  const router = useRouter();
  const { data: dataDriver, isLoading: loadingUser, refetch } = useGetUserQuery();
  const [updateWorkingHours, { isLoading: isUpdating }] = useUpdateWorkingHoursMutation();

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  // Set initial values from user data
  useEffect(() => {
    if (dataDriver?.user?.deliveryPartnerInfo?.workingHours) {
      const hours = dataDriver.user.deliveryPartnerInfo.workingHours;
      setStartTime(hours.start || '09:00');
      setEndTime(hours.end || '18:00');
    }
  }, [dataDriver]);

  const formatTimeForDisplay = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const parseTimeToDate = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const validateTimes = () => {
    const start = parseTimeToDate(startTime);
    const end = parseTimeToDate(endTime);

    if (end <= start) {
      Alert.alert('Invalid Hours', 'End time must be after start time');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateTimes()) return;

    try {
      const response = await updateWorkingHours({
        start: startTime,
        end: endTime,
        timezone: 'Africa/Lagos',
      }).unwrap();

      await refetch();

      Alert.alert(
        'Success',
        response.message || 'Working hours updated successfully',
        [{ text: 'OK' }]
      );

      setTimeout(() => router.back(), 1000);
    } catch (error: any) {
      console.error('Update working hours error:', error);

      let errorMessage = 'Failed to update working hours';
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.status === 403) {
        errorMessage = 'You must be a delivery partner to update working hours';
      } else if (error?.status === 401) {
        errorMessage = 'Please login again';
      }

      Alert.alert('Error', errorMessage);
    }
  };

  const calculateHoursDifference = () => {
    const start = parseTimeToDate(startTime);
    const end = parseTimeToDate(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours.toFixed(1);
  };

  if (loadingUser) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1969fe" />
          <Text className="mt-4 text-gray-600">Loading your settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <View className="px-4 py-4 ">
        <View className="justify-between flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-4"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#242526" />
            <Text className="text-lg font-normal text-[#242526] ml-1">Back</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-2xl font-bold text-gray-900">
          Working Hours
        </Text>
        <Text className="text-gray-600 mt-2">
          Set your availability for deliveries
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Current Schedule Card */}
        <View className="mx-4 mt-6">
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <View className="bg-blue-50 px-4 py-3 border-b border-blue-100">
              <Text className="text-sm font-medium text-blue-800">Current Schedule</Text>
            </View>

            <View className="p-4">
              <View className="flex-row justify-between items-center mb-4">
                <View className="items-center flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Start Time</Text>
                  <View className="bg-gray-50 px-4 py-2 rounded-xl">
                    <Text className="text-lg font-bold text-gray-800">
                      {formatTimeForDisplay(startTime)}
                    </Text>
                  </View>
                </View>
                <View className="px-3">
                  <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />
                </View>
                <View className="items-center flex-1">
                  <Text className="text-xs text-gray-500 mb-1">End Time</Text>
                  <View className="bg-gray-50 px-4 py-2 rounded-xl">
                    <Text className="text-lg font-bold text-gray-800">
                      {formatTimeForDisplay(endTime)}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row justify-between items-center bg-gray-50 p-3 rounded-xl">
                <View className="flex-row items-center">
                  <Ionicons name="hourglass-outline" size={18} color="#1969fe" />
                  <Text className="text-sm text-gray-600 ml-2">Total Hours</Text>
                </View>
                <Text className="text-base font-semibold text-gray-800">
                  {calculateHoursDifference()} hours/day
                </Text>
              </View>

              {/* Timezone Display - Fixed to Africa/Lagos */}
              <View className="mt-3 flex-row items-center justify-between bg-green-50 p-3 rounded-xl">
                <View className="flex-row items-center">
                  <View className="bg-green-100 p-1.5 rounded-full mr-2">
                    <Ionicons name="globe-outline" size={14} color="#059669" />
                  </View>
                  <Text className="text-sm text-gray-600">Timezone</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-sm font-semibold text-green-700 mr-1">Africa/Lagos (WAT)</Text>
                  <View className="bg-green-200 px-2 py-0.5 rounded-full">
                    <Text className="text-xs text-green-800">Fixed</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Time Selection */}
        <View className="mx-4 mt-6">
          <Text className="text-sm font-medium text-gray-700 mb-3 ml-1">Set Working Hours</Text>

          <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Start Time */}
            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border-b border-gray-100"
              onPress={() => setShowStartModal(true)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="sunny" size={20} color="#059669" />
                </View>
                <View>
                  <Text className="text-sm text-gray-500">Start Time</Text>
                  <Text className="text-base font-semibold text-gray-800">
                    {formatTimeForDisplay(startTime)}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* End Time */}
            <TouchableOpacity
              className="flex-row items-center justify-between p-4"
              onPress={() => setShowEndModal(true)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="moon" size={20} color="#D97706" />
                </View>
                <View>
                  <Text className="text-sm text-gray-500">End Time</Text>
                  <Text className="text-base font-semibold text-gray-800">
                    {formatTimeForDisplay(endTime)}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Note */}
        <View className="mx-4 my-6">
          <View className="flex-row items-center">
            <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
            <Text className="text-xs text-gray-400 ml-1 flex-1">
              Your working hours help us match you with deliveries during your available times. Timezone is fixed to Africa/Lagos (WAT).
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Custom Time Picker Modals */}
      <TimePickerModal
        visible={showStartModal}
        onClose={() => setShowStartModal(false)}
        onSelect={setStartTime}
        currentTime={startTime}
        title="Select Start Time"
      />

      <TimePickerModal
        visible={showEndModal}
        onClose={() => setShowEndModal(false)}
        onSelect={setEndTime}
        currentTime={endTime}
        title="Select End Time"
      />

      {/* Save Button */}
      <View className="p-4 bg-white border-t border-gray-200">
        <TouchableOpacity
          className={`p-4 rounded-full items-center ${isUpdating ? 'bg-gray-300' : 'bg-[#1969fe]'
            }`}
          onPress={handleSave}
          disabled={isUpdating}
          activeOpacity={0.7}
        >
          {isUpdating ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-white text-base font-semibold ml-2">Saving...</Text>
            </View>
          ) : (
            <Text className="text-white text-base font-semibold">Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}