import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGetLanguagesQuery, useUpdateLanguagesMutation } from '@/redux/features/user/userApi';

const languageOptions = ['English', 'Pidgin', 'Yoruba', 'Hausa', 'Igbo', 'French', 'Other'] as const;
type Language = (typeof languageOptions)[number];

export default function LanguagesScreen() {
  const router = useRouter();
  const { data: languagesData, isLoading, refetch } = useGetLanguagesQuery({});
  const [updateLanguages, { isLoading: isUpdating }] = useUpdateLanguagesMutation();

  const languages = languagesData?.languages || []; // extract languages array

  console.log(languages, "user langues"); // now logs the array

  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (languages && languages.length > 0) {
      setSelectedLanguages(languages as Language[]);
    }
  }, [languages]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to refresh languages. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleLanguage = (lang: Language) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const handleSave = async () => {
    try {
      await updateLanguages({ languages: selectedLanguages }).unwrap();
      Alert.alert('Success', 'Languages updated successfully');
      router.back();
    } catch (error: any) {
      console.error('Update languages error:', error);
      Alert.alert('Error', error?.data?.message || 'Failed to update languages');
    }
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#1969fe" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
          <Ionicons name="arrow-back-outline" size={24} color="#242526" />
          <Text className="text-lg font-normal text-[#242526] ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900">Languages</Text>
        <Text className="text-gray-600 mt-2">
          Select the languages you speak. This helps us match you with deliveries that need your language skills.
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4 mt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1969fe']} />
        }
      >
        <Text className="text-sm font-medium text-gray-700 mb-3">Select all that apply</Text>
        {languageOptions.map((lang) => (
          <TouchableOpacity
            key={lang}
            className={`flex-row items-center justify-between p-4 mb-3 rounded-xl border-2 ${
              selectedLanguages.includes(lang)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
            onPress={() => toggleLanguage(lang)}
          >
            <Text
              className={`text-base font-medium ${
                selectedLanguages.includes(lang) ? 'text-blue-700' : 'text-gray-800'
              }`}
            >
              {lang}
            </Text>
            {selectedLanguages.includes(lang) && (
              <Ionicons name="checkmark-circle" size={24} color="#1969fe" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="p-4 border-t border-gray-200">
        <TouchableOpacity
          className={`py-4 rounded-full items-center ${isUpdating ? 'bg-gray-300' : 'bg-blue-600'}`}
          onPress={handleSave}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-base font-semibold">Save Languages</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}