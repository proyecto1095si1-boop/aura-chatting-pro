import React from 'react';
import { Text, TextProps } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientTextProps extends TextProps {
  colors?: readonly [string, string, ...string[]];
  style?: any;
}

export function GradientText({
  children,
  colors = ['#FF2D78', '#FF6B35'] as const,
  style,
  ...props
}: GradientTextProps) {
  return (
    <MaskedView maskElement={<Text style={style} {...props}>{children}</Text>}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={[style, { opacity: 0 }]} {...props}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
