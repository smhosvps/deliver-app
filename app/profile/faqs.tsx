import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetFaqsQuery } from "@/redux/features/faq/faqApi";
import RenderHtml from "react-native-render-html";
import { Ionicons, Feather,} from "@expo/vector-icons";

// Category icons mapping
const categoryIcons: { [key: string]: JSX.Element } = {
  account: <Feather name="user" size={20} color="#3b82f6" />,
  delivery: <Feather name="truck" size={20} color="#3b82f6" />,
  payment: <Feather name="credit-card" size={20} color="#3b82f6" />,
  security: <Feather name="shield" size={20} color="#3b82f6" />,
  general: <Feather name="help-circle" size={20} color="#3b82f6" />,
};

// Default icon for unknown categories
const defaultIcon = <Feather name="message-circle" size={20} color="#3b82f6" />;

export default function FAQsScreen() {
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const { data, isLoading, isError, refetch } = useGetFaqsQuery({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Process FAQs from backend
  const faqs =
    data?.faqs?.map((faq: any) => ({
      id: faq._id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "general",
    })) || [];

  // Group FAQs by category
  const groupedFaqs = faqs.reduce((groups: any, faq: any) => {
    const category = faq.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(faq);
    return groups;
  }, {});

  // Format category name for display
  const formatCategoryName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-600">Loading FAQs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-red-500 text-lg mb-4">Failed to load FAQs</Text>
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
      </View>

      <ScrollView
        className="flex-1"
        style={{ zIndex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-4"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#242526" />
            <Text className="text-lg font-normal text-[#242526] ml-1">Back</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">
            Frequently Asked Questions
          </Text>
          <Text className="text-gray-600 mt-2">
            Find quick answers to common questions about your account,
            deliveries, and payments.
          </Text>
        </View>

        <View className="px-4 py-6">
          {faqs.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Feather name="help-circle" size={64} color="#ccc" />
              <Text className="text-gray-500 text-lg mt-4">
                No FAQs available
              </Text>
            </View>
          ) : (
            // Render FAQs grouped by category
            Object.keys(groupedFaqs).map((category) => (
              <View key={category} className="mb-6">
                {/* Category Header */}
                <View className="flex-row items-center mb-3">
                  {categoryIcons[category] || defaultIcon}
                  <Text className="ml-2 text-lg font-semibold text-gray-800">
                    {formatCategoryName(category)}
                  </Text>
                </View>

                {/* Category FAQs */}
                <View className="bg-gray-50/80 rounded-xl overflow-hidden">
                  {groupedFaqs[category].map((faq: any, index: number) => (
                    <TouchableOpacity
                      key={faq.id}
                      onPress={() =>
                        setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)
                      }
                      className={`border-b border-gray-200 ${index === groupedFaqs[category].length - 1
                          ? "border-b-0"
                          : ""
                        }`}
                    >
                      <View className="p-4">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-gray-900 font-semibold flex-1 text-base pr-4">
                            {faq.question}
                          </Text>
                          <Feather
                            name="chevron-down"
                            size={20}
                            color="#666"
                            style={{
                              transform: [
                                {
                                  rotate:
                                    expandedFAQ === faq.id ? "180deg" : "0deg",
                                },
                              ],
                            }}
                          />
                        </View>
                        {expandedFAQ === faq.id && (
                          <View className="mt-3">
                            <RenderHtml
                              contentWidth={300}
                              source={{ html: faq.answer }}
                              tagsStyles={{
                                p: {
                                  color: "#666",
                                  fontSize: 14,
                                  lineHeight: 20,
                                },
                                a: { color: "#3b82f6" },
                                strong: { fontWeight: "600" },
                              }}
                            />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Need More Help Section */}
        <View className="px-4 pb-8">
          <View className="bg-blue-50/80 rounded-xl p-6 items-center">
            <Feather name="message-circle" size={32} color="#3b82f6" />
            <Text className="text-lg font-semibold text-gray-900 mt-3">
              Need More Help?
            </Text>
            <Text className="text-gray-600 text-center mt-2">
              Can't find what you're looking for? Contact our support team for
              assistance.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/profile/contact-support")}
              className="mt-4 bg-blue-500 px-6 py-3 rounded-full"
            >
              <Text className="text-white font-semibold">Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}