import { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons"; // 👈 import from vector icons
import LoginWithApple from "@/components/auth/LoginWithApple";
import LoginWithGoogle from "@/components/auth/LoginWithGoogle";

const { height } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();

  // Curtain animations
  const topCurtain = useRef(new Animated.Value(0)).current;
  const bottomCurtain = useRef(new Animated.Value(0)).current;

  // Logo animations
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Main content container (appears instantly after curtains close)
  const mainContentOpacity = useRef(new Animated.Value(0)).current;
  const mainContentTranslateY = useRef(new Animated.Value(20)).current;

  // New animated values for sequential reveal
  const topImageTranslateY = useRef(new Animated.Value(-50)).current; // slides from top

  // Combined fade + slide for heading and bottom section
  const headingOpacity = useRef(new Animated.Value(0)).current;
  const headingTranslateY = useRef(new Animated.Value(30)).current; // start from bottom
  const bottomSectionOpacity = useRef(new Animated.Value(0)).current;
  const bottomSectionTranslateY = useRef(new Animated.Value(30)).current; // start from bottom

  useEffect(() => {
    const animationSequence = async () => {
      // 1. Blue stable (curtains already closed)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 2. Open curtains slowly to reveal white background
      await new Promise((resolve) => {
        Animated.parallel([
          Animated.timing(topCurtain, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bottomCurtain, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(resolve);
      });

      // 3. Show logo and then fade it out
      await Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      await new Promise((resolve) => setTimeout(resolve, 2000)); // hold logo

      await Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // 4. Close curtains to reveal blue background again
      await new Promise((resolve) => {
        Animated.parallel([
          Animated.timing(topCurtain, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(bottomCurtain, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(resolve);
      });

      // 5. Make main content container visible instantly
      mainContentOpacity.setValue(1);
      mainContentTranslateY.setValue(0);

      // 6. Top image slides from top
      await new Promise((resolve) => {
        Animated.spring(topImageTranslateY, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }).start(resolve);
      });

      // 7. Heading and bottom section fade in + slide up together
      Animated.parallel([
        Animated.timing(headingOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(headingTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(bottomSectionOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(bottomSectionTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    };

    animationSequence();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#08204C" }}>
      {/* White background layer */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#FFFFFF",
          zIndex: 1,
        }}
      />

      {/* Top Curtain */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: height / 2,
          backgroundColor: "#08204C",
          transform: [
            {
              translateY: topCurtain.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -height / 2],
              }),
            },
          ],
          zIndex: 3,
        }}
      />

      {/* Bottom Curtain */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: height / 2,
          backgroundColor: "#08204C",
          transform: [
            {
              translateY: bottomCurtain.interpolate({
                inputRange: [0, 1],
                outputRange: [0, height / 2],
              }),
            },
          ],
          zIndex: 3,
        }}
      />

      {/* Logo */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          zIndex: 4,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <Image source={require("../../assets/images/logo-courries.png")} />
        </View>
      </Animated.View>

      {/* Main Content Container */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: mainContentOpacity,
          transform: [{ translateY: mainContentTranslateY }],
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingVertical: 60,
          zIndex: 5,
          backgroundColor: "#08204C",
        }}
      >
        {/* Top Image */}
        <Animated.View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            marginTop: 40,
            transform: [{ translateY: topImageTranslateY }],
          }}
        >
          <Image source={require("../../assets/images/frontloadericon.png")} />
        </Animated.View>

        {/* Content Section */}
        <View
          style={{
            width: "100%",
            alignItems: "center",
            gap: 24,
            marginBottom: 20,
          }}
        >
          {/* Heading with fade + slide up */}
          <Animated.Text
            style={{
              fontSize: 37,
              fontWeight: "700",
              color: "#FFFFFF",
              textAlign: "center",
              lineHeight: 40,
              marginBottom: 8,
              opacity: headingOpacity,
              transform: [{ translateY: headingTranslateY }],
            }}
          >
            Drive, Deliver and {"\n"}Earn Instantly.
          </Animated.Text>

          {/* Bottom section (buttons + legal) with fade + slide up */}
          <Animated.View
            style={{
              width: "100%",
              gap: 12,
              opacity: bottomSectionOpacity,
              transform: [{ translateY: bottomSectionTranslateY }],
            }}
          >

            <LoginWithGoogle />
            <LoginWithApple />

            <TouchableOpacity
              onPress={() => {
                router.push("/auth/verify-email");
              }}
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                paddingVertical: 16,
                borderRadius: 30,
                borderWidth: 2,
                borderColor: "rgba(255, 255, 255, 0.3)",
              }}
            >
              {/* 👇 replaced Mail icon with MaterialIcons */}
              <MaterialIcons name="mail" color="#FFFFFF" size={20} />
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "500",
                  fontSize: 16,
                  color: "#FFFFFF",
                }}
              >
                Continue with Email
              </Text>
            </TouchableOpacity>

            {/* Legal Text */}
            <Text
              style={{
                fontSize: 12,
                color: "rgba(255, 255, 255, 0.8)",
                textAlign: "center",
                lineHeight: 18,
                marginTop: 16,
                paddingHorizontal: 20,
              }}
            >
              By clicking Continue, you agree to our{" "}
              <TouchableOpacity
                onPress={() => router.push("/auth/terms-conditions")}
              >
                <Text
                  style={{
                    textDecorationLine: "underline",
                    fontWeight: "600",
                    fontSize: 12,
                    color: "rgba(255, 255, 255, 0.8)",
                  }}
                >
                  Terms & Conditions
                </Text>
              </TouchableOpacity>{" "}
              and{" "}
              <TouchableOpacity
                onPress={() => router.push("/auth/privacy-policy")}
              >
                <Text
                  style={{
                    textDecorationLine: "underline",
                    fontWeight: "600",
                    fontSize: 12,
                    color: "rgba(255, 255, 255, 0.8)",
                  }}
                >
                  Privacy Policy
                </Text>
              </TouchableOpacity>
              .
            </Text>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}