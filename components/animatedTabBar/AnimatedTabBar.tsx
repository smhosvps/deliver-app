import React from "react";
import { View, StyleSheet } from "react-native";
import { useLinkBuilder } from "@react-navigation/native";
import { PlatformPressable } from "@react-navigation/elements";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const HomeIcon = (props: any) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" {...props}>
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"
      stroke={props.color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12h6v10"
      stroke={props.color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DeliveriesIcon = (props: any) => (
  // BICYCLE SVG FOR DELIVERIES ICON
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" {...props}>
    <Path
      d="M5.5 18L9 9L12 14L15 8L18.5 17"
      stroke={props.color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10 5.5C10 6.32843 9.32843 7 8.5 7C7.67157 7 7 6.32843 7 5.5C7 4.67157 7.67157 4 8.5 4C9.32843 4 10 4.67157 10 5.5Z"
      stroke={props.color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 5L17 5"
      stroke={props.color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="6.5" cy="17.5" r="3.5" stroke={props.color} strokeWidth={2} />
    <Circle cx="17.5" cy="17.5" r="3.5" stroke={props.color} strokeWidth={2} />
  </Svg>
);

const WalletIcon = (props: any) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" {...props}>
    <Rect
      x={2}
      y={7}
      width={20}
      height={14}
      rx={2}
      ry={2}
      stroke={props.color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 7V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14M17 14h-5M20 11H8"
      stroke={props.color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ProfileIcon = (props: any) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" {...props}>
    <Path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
      stroke={props.color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TabBarIcon = ({ isFocused, icon: Icon, color }: any) => {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 1.2 : 1);
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Icon color={color} />
    </Animated.View>
  );
};

export function MyTabBar({ state, descriptors, navigation }: any) {
  const { buildHref } = useLinkBuilder();

  const icon: any = {
    index: HomeIcon,
    deliveries: DeliveriesIcon,
    earnings: WalletIcon,  // Changed from 'wallet' to 'earnings'
    profile: ProfileIcon,
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabbar}>
        {state.routes.map((route: any, index: any) => {
          const { options } = descriptors[route.key] || {};
          const label =
            options?.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options?.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const IconComponent = icon[route.name];

          return (
            <PlatformPressable
              key={route.key}
              href={buildHref(route.name)}
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel}
              testID={options?.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabbarItem}
            >
              <View
                style={[
                  styles.tabBarButton,
                  isFocused && styles.tabBarButtonFocused,
                ]}
              >
                <TabBarIcon
                  isFocused={isFocused}
                  icon={IconComponent}
                  color={isFocused ? "#fafafa" : "#6B7280"}
                />
                {isFocused && (
                  <Animated.Text
                    style={[
                      styles.label,
                      isFocused && styles.labelFocused,
                    ]}
                  >
                    {label}
                  </Animated.Text>
                )}
              </View>
            </PlatformPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  tabbar: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    padding: 13,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    shadowOpacity: 0.2,
    elevation: 1,
  },
  tabbarItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 17,
  },
  tabBarButton: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
    overflow: "hidden",
  },
  tabBarButtonFocused: {
    backgroundColor: "#1969fe",
  },
  label: {
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
    color: "#6B7280",
  },
  labelFocused: {
    color: "#fafafa",
    fontWeight: "bold",
  },
  shield: {
    position: "absolute",
    top: 0,
    left: "60%",
    transform: [{ translateX: -16 }],
  },
});