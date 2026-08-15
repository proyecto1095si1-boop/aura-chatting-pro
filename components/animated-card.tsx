import React, { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface AnimatedCardProps extends ViewProps {
  delay?: number;
  children: React.ReactNode;
}

export function AnimatedCard({ delay = 0, children, style, ...props }: AnimatedCardProps) {
  const translateY = useSharedValue(40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 10, mass: 1, overshootClamping: true })
    );
    opacity.value = withDelay(delay, withSpring(1, { damping: 10, mass: 1 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}
