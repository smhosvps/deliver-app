import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetAllPrivacyQuery } from "@/redux/features/privacyApi/privacyApi";
import RenderHtml from "react-native-render-html";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

export default function PrivacyPolicy() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { data, isLoading, isError, refetch } = useGetAllPrivacyQuery({});

  useEffect(() => {
    setMounted(true);
  }, []);

  console.log(data, "data")

  // Filter to get only terms & conditions (type === "privacy" with title "Terms")
  const termsData = data?.privacy?.find(
    (item: any) => item.type === "privacy"
  );

  console.log(termsData, "data")

  // Parse HTML content into sections (optional - you can also render the full HTML)
  const termsContent = termsData?.detail || "";

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-600">
            Loading Privacy Policy...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !termsData) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-4">
          <MaterialIcons name="error-outline" size={48} color="#ef4444" />
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
      {/* Special Designed Background Elements - Without Circles */}
      <View className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        {/* Geometric Pattern - Soft Lines Only */}
        <View className="absolute top-0 left-0 w-full h-full">
          {/* Top left gradient line */}
          <View
            className="absolute top-20 -left-8 w-64 h-64"
            style={[
              {
                backgroundColor: "rgba(59, 130, 246, 0.03)",
                transform: [{ translateX: mounted ? 0 : -20 }],
                opacity: mounted ? 0.5 : 0,
                borderRadius: 100,
              },
            ]}
          />

          {/* Bottom right gradient line */}
          <View
            className="absolute bottom-20 -right-8 w-80 h-80"
            style={[
              {
                backgroundColor: "rgba(99, 102, 241, 0.03)",
                transform: [{ translateX: mounted ? 0 : 20 }],
                opacity: mounted ? 0.5 : 0,
                borderRadius: 100,
              },
            ]}
          />
        </View>

        {/* Floating Grid Pattern - Very Subtle */}
        <View className="absolute inset-0" style={{ opacity: 0.02 }}>
          <View
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </View>

        {/* Floating Icons - Very Subtle */}
        <View
          className="absolute top-32 left-12"
          style={[
            { opacity: mounted ? 0.1 : 0 },
            { transform: [{ translateY: mounted ? 0 : 10 }] },
          ]}
        >
        </View>

        <View
          className="absolute bottom-40 right-20"
          style={[
            { opacity: mounted ? 0.1 : 0 },
            { transform: [{ translateY: mounted ? 0 : 10 }] },
          ]}
        >
        </View>

        <View
          className="absolute top-1/2 left-10"
          style={[
            { opacity: mounted ? 0.1 : 0 },
            { transform: [{ translateY: mounted ? 0 : 10 }] },
          ]}
        >
        </View>

        <View
          className="absolute bottom-1/3 left-1/4"
          style={[
            { opacity: mounted ? 0.1 : 0 },
            { transform: [{ translateY: mounted ? 0 : 10 }] },
          ]}
        >
        </View>
      </View>

      <View className="flex-1" style={{ zIndex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-white/90 backdrop-blur-sm">
          <TouchableOpacity onPress={() => router.back()} className="gap-1">
            <Ionicons name="arrow-back-outline" size={24} color="#242526" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold ml-3">Privacy Policy</Text>
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
            By creating an account and using this app, you agree to these Privacy
            Policy. Please read them carefully before using our services.
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
              <MaterialIcons name="info-outline" size={20} color="#d97706" />
              <Text className="font-semibold text-amber-800 ml-2">
                Important Notice
              </Text>
            </View>
            <Text className="text-sm text-amber-700 leading-5">
              These Privacy are governed by the laws of Nigeria. Any disputes
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