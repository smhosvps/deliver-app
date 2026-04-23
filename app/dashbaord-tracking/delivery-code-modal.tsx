import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DeliveryCodeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [code, setCode] = useState(['', '', '', '', '']);

  const handleCodeChange = (index: number, value: string) => {
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-3xl mx-4 mb-20 p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-black">Enter Delivery Code</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <Text className="text-gray-600 text-sm mb-6">
            Ask the receiver for their 4/6-digit delivery code and enter it below to confirm this delivery.
          </Text>

          <View className="flex-row justify-between mb-6">
            {code.map((digit, index) => (
              <TextInput
                key={index}
                className="w-16 h-16 border-2 border-gray-300 rounded-lg text-center text-lg font-bold"
                keyboardType="numeric"
                maxLength={1}
                value={digit}
                onChangeText={(value) => handleCodeChange(index, value)}
              />
            ))}
          </View>

          <TouchableOpacity
            className="bg-gray-300 py-4 rounded-full"
            disabled
          >
            <Text className="text-center text-gray-500 font-semibold">Confirm Delivery</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}