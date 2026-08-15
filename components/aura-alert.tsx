import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface AuraAlertProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'default' | 'danger' | 'success';
}

export function AuraAlert({ 
  visible, 
  title, 
  message, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar', 
  onConfirm, 
  onCancel,
  type = 'default' 
}: AuraAlertProps) {
  if (!visible) return null;

  const getColors = () => {
    switch (type) {
      case 'danger': return ['#FF2D78', '#FF6B35'];
      case 'success': return ['#00E676', '#00C853'];
      default: return ['#FF2D78', '#FF6B35'];
    }
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(200)} 
      exiting={FadeOut.duration(200)} 
      style={styles.overlay}
    >
      <Pressable style={styles.backdrop} onPress={onCancel} />
      
      <Animated.View 
        entering={ZoomIn.springify().damping(15)} 
        exiting={ZoomOut.duration(200)}
        style={styles.alertContainer}
      >
        <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <LinearGradient colors={getColors()} style={styles.iconGradient}>
              <Ionicons 
                name={type === 'danger' ? 'alert-circle' : type === 'success' ? 'checkmark-circle' : 'cart-outline'} 
                size={32} 
                color="#FFF" 
              />
            </LinearGradient>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <Pressable 
              style={({ pressed }) => [styles.btn, styles.cancelBtn, pressed && { opacity: 0.7 }]} 
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>

            <Pressable 
              style={({ pressed }) => [styles.btn, pressed && { transform: [{ scale: 0.98 }] }]} 
              onPress={onConfirm}
            >
              <LinearGradient colors={getColors()} style={styles.confirmGradient}>
                <Text style={styles.confirmText}>{confirmText}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  alertContainer: {
    width: width * 0.85,
    maxWidth: 340,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF2D78',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  message: {
    color: '#8A8A8A',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: {
    color: '#8A8A8A',
    fontWeight: '700',
    fontSize: 15,
  },
  confirmGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 15,
  },
});
