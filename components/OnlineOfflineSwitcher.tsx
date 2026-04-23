// // components/OnlineOfflineSwitcher.tsx
// import React, { useRef, useEffect } from 'react';
// import {
//   View,
//   Text,
//   Animated,
//   PanResponder,
//   LayoutChangeEvent,
//   StyleSheet,
//   TouchableOpacity,
// } from 'react-native';

// const SLIDER_WIDTH = 26;
// const SLIDER_HEIGHT = 26;
// const SLIDER_MARGIN = 10;

// type OnlineOfflineToggleProps = {
//   isOnline: boolean;
//   onToggle: () => void;
//   disabled?: boolean;
// };

// export const OnlineOfflineToggle: React.FC<OnlineOfflineToggleProps> = ({
//   isOnline,
//   onToggle,
//   disabled = false,
// }) => {
//   const leftPosition = useRef(new Animated.Value(0)).current;
//   const containerWidth = useRef(0);
//   const maxLeft = useRef(0);

//   const onLayout = (event: LayoutChangeEvent) => {
//     const { width } = event.nativeEvent.layout;
//     containerWidth.current = width;
//     maxLeft.current = width - SLIDER_WIDTH - SLIDER_MARGIN * 2;

//     // Set initial position based on current state
//     const initialLeft = isOnline
//       ? maxLeft.current + SLIDER_MARGIN   // Online → Knob on the RIGHT
//       : SLIDER_MARGIN;                    // Offline → Knob on the LEFT

//     leftPosition.setValue(initialLeft);
//   };

//   useEffect(() => {
//     if (containerWidth.current === 0) return;

//     const targetLeft = isOnline
//       ? maxLeft.current + SLIDER_MARGIN   // Online → Right
//       : SLIDER_MARGIN;                    // Offline → Left

//     Animated.spring(leftPosition, {
//       toValue: targetLeft,
//       useNativeDriver: false,
//       speed: 12,
//       bounciness: 8,
//     }).start();
//   }, [isOnline]);

//   // Pan responder for dragging the knob
//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => !disabled,
//       onPanResponderGrant: () => {
//         // No need to store startLeft anymore since we calculate based on isOnline
//       },
//       onPanResponderMove: (_, gestureState) => {
//         if (disabled) return;

//         let newLeft = leftPosition._value + gestureState.dx; // Use current animated value

//         const minLeft = SLIDER_MARGIN;
//         const maxLeftBound = maxLeft.current + SLIDER_MARGIN;

//         if (newLeft < minLeft) newLeft = minLeft;
//         if (newLeft > maxLeftBound) newLeft = maxLeftBound;

//         leftPosition.setValue(newLeft);
//       },
//       onPanResponderRelease: (_, gestureState) => {
//         if (disabled) return;

//         const threshold = maxLeft.current / 2;
//         const shouldToggle = isOnline
//           ? gestureState.dx < -threshold   // Dragging left while online
//           : gestureState.dx > threshold;   // Dragging right while offline

//         if (shouldToggle) {
//           onToggle();
//         } else {
//           // Snap back to current position
//           const targetLeft = isOnline
//             ? maxLeft.current + SLIDER_MARGIN
//             : SLIDER_MARGIN;

//           Animated.spring(leftPosition, {
//             toValue: targetLeft,
//             useNativeDriver: false,
//             speed: 12,
//             bounciness: 8,
//           }).start();
//         }
//       },
//     })
//   ).current;

//   const handleKnobPress = () => {
//     if (disabled) return;
//     onToggle();
//   };

//   const label = isOnline ? 'Go offline' : 'Go online';

//   // Determine which arrow to show based on current state
//   const arrow = isOnline ? '◀' : '▶';   // Online: left arrow | Offline: right arrow

//   return (
//     <View className="w-full">
//       <View
//         className={`rounded-full h-[45] justify-center relative w-full  ${isOnline ? "bg-[#1969fe]" : "bg-blue-100"}`}
//         onLayout={onLayout}
//       >
//         <Text className={`text-[16px] font-semibold text-center ${isOnline ? "text-white" : "text-[#1969fe]"}`}>
//           {label}
//         </Text>

//         <Animated.View
//           style={[
//             styles.sliderKnob,
//             { left: leftPosition },
//           ]}
//         >

//           {/* click on go online */}

//           {isOnline ?
//             <TouchableOpacity onPress={goOffline}>
//               <Text>Go offline</Text>
//             </TouchableOpacity>
//             :
//             <TouchableOpacity onPress={goOnline}>
//               <Text>Go online</Text>
//             </TouchableOpacity>

//           }











//           <TouchableOpacity
//             activeOpacity={0.7}
//             onPress={handleKnobPress}
//             disabled={disabled}
//             style={styles.knobTouchable}
//             {...panResponder.panHandlers}
//           >
//             <View className={`flex-row items-center justify-center w-full h-full ${isOnline ? "bg-white rounded-full" : "bg-[#1969fe] rounded-full"}`}>
//               <Text className={`text-xl font-bold  ${isOnline ? "text-[#1969fe]" : "text-white"}`}>
//                 {arrow}
//               </Text>
//             </View>
//           </TouchableOpacity>
//         </Animated.View>
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   sliderKnob: {
//     position: 'absolute',
//     top: SLIDER_MARGIN,
//     width: SLIDER_WIDTH,
//     height: SLIDER_HEIGHT,
//   },
//   knobTouchable: {
//     flex: 1,
//     borderRadius: 100,
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 3,
//   },
// });



// components/OnlineOfflineSwitcher.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

type OnlineOfflineToggleProps = {
  isOnline: boolean;
  onToggle: () => void;
  disabled?: boolean;
  isUpdating: boolean;
};

export const OnlineOfflineToggle: React.FC<OnlineOfflineToggleProps> = ({
  isOnline,
  onToggle,
  disabled = false,
  isUpdating,
}) => {
  const label = isOnline ? 'Go Offline' : 'Go Online';
  const bgColor = isOnline ? 'bg-blue-100' : ' bg-[#1969fe]';
  const textColor = isOnline ? 'text-[#1969fe]' : 'text-white';

  return (
    <View className="w-full">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggle}
        disabled={disabled || isUpdating}
        className={`rounded-full h-[45] justify-center items-center w-full ${bgColor}`}
      >
        {isUpdating ? (
          <ActivityIndicator color={isOnline ? '#ffffff' : '#1969fe'} size="small" />
        ) : (
          <Text className={`text-[16px] font-semibold ${textColor}`}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};