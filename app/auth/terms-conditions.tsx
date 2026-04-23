import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons"; // replaced lucide-react-native
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetAllPrivacyQuery } from "@/redux/features/privacyApi/privacyApi";
import RenderHtml from "react-native-render-html";

export default function TermsConditions() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useGetAllPrivacyQuery({});
  console.log(data, "data");

  // Filter to get only terms & conditions (type === "privacy" with title "Terms")
  const termsData = data?.privacy?.find(
    (item: any) => item.type === "terms of use"
  );

  console.log(termsData, "data");

  // Parse HTML content into sections (optional - you can also render the full HTML)
  const termsContent = termsData?.detail || "";

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-600">
            Loading Terms & Conditions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !termsData) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-4">
          <Feather name="alert-circle" size={48} color="#ef4444" />
          <Text className="text-red-500 text-lg mt-4 mb-4 text-center">
            {!termsData
              ? "Terms & Conditions not found"
              : "Failed to load Terms & Conditions"}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
   
      <View className="flex-1" style={{ zIndex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold ml-3">Terms & Conditions</Text>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-4 py-4"
          showsVerticalScrollIndicator={false}
        >
          {/* Last Updated */}
          <View className="mb-4 flex-row items-center">
            <Text className="text-xs text-gray-500">
              Last Updated:{" "}
              {new Date(termsData.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>

          {/* Subtitle */}
          <Text className="text-sm text-gray-600 mb-6 leading-5 bg-blue-50/50 p-4 rounded-lg">
            By creating an account and using this app, you agree to these Terms
            & Conditions. Please read them carefully before using our services.
          </Text>

          {/* HTML Content */}
          <View className="mb-2">
            <RenderHtml
              contentWidth={350}
              source={{ html: termsContent }}
              tagsStyles={{
                body: { color: "#374151", fontSize: 14, lineHeight: 22 },
                h1: {
                  fontSize: 20,
                  fontWeight: "bold",
                  color: "#111827",
                  marginTop: 20,
                  marginBottom: 10,
                },
                h2: {
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#111827",
                  marginTop: 16,
                  marginBottom: 8,
                },
                h3: {
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#111827",
                  marginTop: 14,
                  marginBottom: 6,
                },
                p: { marginBottom: 12, color: "#4B5563", lineHeight: 22 },
                strong: { fontWeight: "700", color: "#111827" },
                ul: { marginBottom: 12, paddingLeft: 20 },
                li: { marginBottom: 6, color: "#4B5563", lineHeight: 20 },
                a: { color: "#3b82f6", textDecorationLine: "underline" },
              }}
            />
          </View>

          {/* Important Notice */}
          <View className="bg-amber-50/80 p-4 rounded-lg mb-8 border border-amber-100">
            <View className="flex-row items-center mb-2">
              <Feather name="alert-circle" size={20} color="#d97706" />
              <Text className="font-semibold text-amber-800 ml-2">
                Important Notice
              </Text>
            </View>
            <Text className="text-sm text-amber-700 leading-5">
              These terms are governed by the laws of Nigeria. Any disputes
              shall be resolved in Nigerian courts. By using this service, you
              consent to the collection and processing of your data as described
              in our Privacy Policy.
            </Text>
          </View>

          {/* Bottom spacing */}
          <View className="h-8" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}