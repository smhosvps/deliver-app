import React, { useEffect, useRef } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  Text,
  View,
} from 'react-native';

const SLIDER_WIDTH = 92;
const SLIDER_MARGIN = 12;
const SWIPE_THRESHOLD = 0.4; // 40% of travel distance

type ChevronProps = {
  containerClassName: string;
  animated: Animated.Value;
  inputRange: number[];
  outputRange: string[];
};

const Chevron = ({ containerClassName, animated, inputRange, outputRange }: ChevronProps) => {
  const chevronColor = animated.interpolate({
    inputRange,
    outputRange,
  });

  return (
    <View className={containerClassName}>
      <Animated.View
        className="absolute top-5 h-[14px] w-[3px] rounded-sm rotate-[35deg]"
        style={{ backgroundColor: chevronColor }}
      />
      <Animated.View
        className="absolute top-[30px] h-[14px] w-[3px] rounded-sm rotate-[-35deg]"
        style={{ backgroundColor: chevronColor }}
      />
    </View>
  );
};

type SwipeButtonProps = {
  isOnline?: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

const SwipeButton = ({ isOnline = false, onToggle, disabled = false }: SwipeButtonProps) => {
  const online = Boolean(isOnline);

  const distance = useRef(0);
  const layoutReady = useRef(false);
  const initialized = useRef(false); // 👈 track if initial position is set
  const startX = useRef(0);
  const chevronColorAnim = useRef(new Animated.Value(0)).current;
  const translationX = useRef(new Animated.Value(0)).current;

  // Shimmer animation
  const shimmer = () => {
    Animated.timing(chevronColorAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start(() => {
      chevronColorAnim.setValue(0);
      shimmer();
    });
  };

  useEffect(() => {
    shimmer();
  }, []);

  // Update knob position when online changes (after layout is ready)
  useEffect(() => {
    if (!layoutReady.current) return;

    const targetX = online ? 0 : -distance.current;

    if (!initialized.current) {
      // First time: set position instantly (no animation delay)
      translationX.setValue(targetX);
      initialized.current = true;
      console.log(`🎯 Initial position set: online=${online}, targetX=${targetX}`);
    } else {
      // Subsequent changes: animate smoothly
      console.log(`🔄 State changed: online=${online}, targetX=${targetX}, distance=${distance.current}`);
      Animated.spring(translationX, {
        toValue: targetX,
        useNativeDriver: false,
        speed: 12,
        bounciness: 8,
      }).start();
    }
  }, [online, layoutReady]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    distance.current = width - SLIDER_WIDTH - SLIDER_MARGIN * 2;
    layoutReady.current = true;
    // Initial position will be set by the useEffect above
    console.log(`📐 Layout: width=${width}, distance=${distance.current}, online=${online}`);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onStartShouldSetPanResponderCapture: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponderCapture: () => !disabled,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        // Read the actual animated value (works even if animation is in progress)
        startX.current = (translationX as any)._value;
        console.log(`👆 Grant: startX=${startX.current}, online=${online}, distance=${distance.current}`);
      },

      onPanResponderMove: (_, gestureState) => {
        if (disabled) return;
        let newX = startX.current + gestureState.dx;
        newX = Math.min(0, Math.max(-distance.current, newX));
        translationX.setValue(newX);
      },

      onPanResponderRelease: (_, gestureState) => {
        if (disabled) {
          console.log(`⛔ Release ignored (disabled)`);
          return;
        }

        const deltaX = gestureState.dx;
        const thresholdDistance = distance.current * SWIPE_THRESHOLD;

        console.log(`🎯 Release: deltaX=${deltaX}, threshold=${thresholdDistance}, online=${online}`);

        let shouldToggle = false;
        if (online) {
          // Currently online → swipe left (negative deltaX) to go offline
          if (deltaX <= -thresholdDistance) {
            shouldToggle = true;
            console.log(`✅ Online → Offline triggered`);
          } else {
            console.log(`❌ Online → Offline failed: deltaX=${deltaX} > -${thresholdDistance}`);
          }
        } else {
          // Currently offline → swipe right (positive deltaX) to go online
          if (deltaX >= thresholdDistance) {
            shouldToggle = true;
            console.log(`✅ Offline → Online triggered`);
          } else {
            console.log(`❌ Offline → Online failed: deltaX=${deltaX} < ${thresholdDistance}`);
          }
        }

        if (shouldToggle) {
          console.log(`🔄 Calling onToggle()...`);
          onToggle();
        } else {
          console.log(`↩️ Snapping back to ${online ? 'right' : 'left'}`);
          const targetX = online ? 0 : -distance.current;
          Animated.spring(translationX, {
            toValue: targetX,
            useNativeDriver: false,
            speed: 12,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const buttonText = online ? 'Go offline' : 'Go online';

  return (
    <View
      className="relative h-[88px] flex items-center justify-center bg-[#2D6844] rounded-[44px]"
      onLayout={onLayout}
    >
      <Text className="text-white text-[22px] font-semibold">{buttonText}</Text>

      <Animated.View
        className="absolute top-3 right-3 w-[92px] h-16 bg-white rounded-[32px]"
        style={{ transform: [{ translateX: translationX }] }}
        {...panResponder.panHandlers}
      >
        <Chevron
          containerClassName="absolute left-[25px]"
          animated={chevronColorAnim}
          inputRange={[0, 0.2, 0.7, 1]}
          outputRange={['#2C472A', '#000000', '#6fb268', '#2C472A']}
        />
        <Chevron
          containerClassName="absolute left-[43px]"
          animated={chevronColorAnim}
          inputRange={[0, 0.1, 0.6, 1.0]}
          outputRange={['#162415', '#000000', '#6fb268', '#162415']}
        />
        <Chevron
          containerClassName="absolute left-[61px]"
          animated={chevronColorAnim}
          inputRange={[0, 0.5, 1]}
          outputRange={['#000000', '#6fb268', '#000000']}
        />
      </Animated.View>
    </View>
  );
};

export default SwipeButton;