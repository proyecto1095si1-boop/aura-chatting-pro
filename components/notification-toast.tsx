import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { 
  FadeInUp, 
  FadeOutUp, 
  withSpring, 
  useSharedValue, 
  useAnimatedStyle,
  runOnJS,
  withTiming
} from 'react-native-reanimated';
import { useNotifications } from '@/lib/notification-context';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export function NotificationToast() {
  const { lastNotification, clearNotification } = useNotifications();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-200);

  useEffect(() => {
    if (lastNotification) {
      translateY.value = withSpring(insets.top + 8, { 
        damping: 15,
        stiffness: 100 
      });
      
      const timer = setTimeout(() => {
        dismiss();
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [lastNotification]);

  const dismiss = () => {
    translateY.value = withTiming(-200, { duration: 400 }, (finished) => {
      if (finished) {
        runOnJS(clearNotification)();
      }
    });
  };

  const onPress = () => {
    if (lastNotification?.type === 'match' || lastNotification?.type === 'message') {
      if (lastNotification.id) {
         router.push(`/chat/${lastNotification.id}` as any);
      }
      dismiss();
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!lastNotification) return null;

  const isPremium = lastNotification.type === 'success' || lastNotification.type === 'system';

  return (
    <Animated.View 
      style={[styles.container, animatedStyle]}
      entering={FadeInUp.duration(500)}
      exiting={FadeOutUp.duration(400)}
    >
      <Pressable 
        style={({ pressed }) => [
          styles.toast,
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
        ]}
        onPress={onPress}
      >
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={isPremium ? ['rgba(255, 45, 120, 0.15)', 'rgba(0, 0, 0, 0.5)'] : ['rgba(255, 255, 255, 0.05)', 'rgba(0, 0, 0, 0.4)']}
            style={StyleSheet.absoluteFill}
          />
        </BlurView>

        <View style={styles.glowLine} />

        <View style={styles.content}>
          <View style={[
            styles.avatarContainer, 
            lastNotification.type === 'success' && styles.successBorder,
            lastNotification.type === 'system' && styles.systemBorder
          ]}>
            {isPremium ? (
              <LinearGradient
                colors={lastNotification.type === 'success' ? ['#00E676', '#00C853'] : ['#A855F7', '#4FC3F7']}
                style={StyleSheet.absoluteFill}
              >
                <View style={styles.centerIcon}>
                  <Ionicons 
                    name={lastNotification.type === 'success' ? "checkmark-done" : "flash"} 
                    size={22} 
                    color="#FFF" 
                  />
                </View>
              </LinearGradient>
            ) : (
              <Image 
                source={lastNotification.image ? { uri: lastNotification.image } : require('@/assets/images/icon.png')} 
                style={styles.avatar} 
                contentFit="cover"
              />
            )}
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>{lastNotification.title}</Text>
            <Text style={styles.message} numberOfLines={1}>{lastNotification.message}</Text>
          </View>

          <View style={styles.trailing}>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999999,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toast: {
    width: width - 32,
    maxWidth: 420,
    height: 76,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 20, 20, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 12px 32px rgba(0,0,0,0.5)' },
      default: { elevation: 12 }
    })
  },
  glowLine: {
    position: 'absolute',
    top: 0,
    left: 40,
    right: 40,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  successBorder: { borderColor: '#00E676' },
  systemBorder: { borderColor: '#A855F7' },
  avatar: {
    width: '100%',
    height: '100%',
  },
  centerIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  message: {
    color: '#A0A0A0',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  trailing: {
    width: 24,
    alignItems: 'flex-end',
  },
});
