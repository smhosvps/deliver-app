
import { Text } from "react-native";
import { PlatformPressable } from "@react-navigation/elements"

export default function TabBarButton({
  onPress,
  onLongPress,
  isFocused,
  label,
  testID,
  href,
  accessibilityLabel,
  IconComponent,
  colors,
  styles
}: any) {
  return (
    <PlatformPressable
      href={href}
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles}
    >
      {IconComponent && (
        <IconComponent color={isFocused ? "#0078fc" : "#0078fc"} />
      )}
      <Text
        style={[
          styles.label,
          { color: isFocused ? "#0078fc" : "#0078fc" },
        ]}
      >
        {label}
      </Text>
    </PlatformPressable>
  );
}