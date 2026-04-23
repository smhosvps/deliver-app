// app/index.tsx
import { useAuth } from "@/context/auth";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";


export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  // Show a splash/loading screen while checking token validity
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1a6cff" />
      </View>
    );
  }

  // No valid token → go to onboarding / login
  if (!isAuthenticated) {
    return <Redirect href="/auth/onboarding" />;
  }

  // Token is valid → go to main tabs (replaces history)
  return <Redirect href="/(tabs)" />;
}