import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'primary';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
  icon?: string;
}

export function CustomAlert({ visible, title, message, buttons, onDismiss, icon }: CustomAlertProps) {
  if (!visible) return null;

  const handlePress = (btn: AlertButton) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (btn.onPress) btn.onPress();
    else if (onDismiss) onDismiss();
  };

  const renderButtons = () => {
    if (!buttons || buttons.length === 0) {
      return (
        <Pressable onPress={() => onDismiss?.()} style={styles.primaryButton}>
          <LinearGradient
            colors={['#FF2D78', '#FF6B35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBg}
          >
            <Text style={styles.primaryButtonText}>Aceptar</Text>
          </LinearGradient>
        </Pressable>
      );
    }

    // If 2 buttons, put them side by side
    if (buttons.length === 2) {
      return (
        <View style={styles.rowButtons}>
          {buttons.map((btn, index) => {
            if (btn.style === 'cancel') {
              return (
                <Pressable key={index} onPress={() => handlePress(btn)} style={[styles.flexButton, styles.cancelBtn]}>
                  <Text style={styles.cancelBtnText}>{btn.text}</Text>
                </Pressable>
              );
            }
            if (btn.style === 'destructive') {
              return (
                <Pressable key={index} onPress={() => handlePress(btn)} style={[styles.flexButton, styles.destructiveBtn]}>
                  <Text style={styles.destructiveBtnText}>{btn.text}</Text>
                </Pressable>
              );
            }
            // Primary / Default
            return (
              <Pressable key={index} onPress={() => handlePress(btn)} style={styles.flexButtonPrimary}>
                <LinearGradient
                  colors={['#FF2D78', '#FF6B35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientBg}
                >
                  <Text style={styles.primaryButtonText}>{btn.text}</Text>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>
      );
    }

    // Column stack for 1 or 3+ buttons
    return (
      <View style={styles.colButtons}>
        {buttons.map((btn, index) => {
          if (btn.style === 'cancel') {
            return (
              <Pressable key={index} onPress={() => handlePress(btn)} style={[styles.colButton, styles.cancelBtn]}>
                <Text style={styles.cancelBtnText}>{btn.text}</Text>
              </Pressable>
            );
          }
          if (btn.style === 'destructive') {
            return (
              <Pressable key={index} onPress={() => handlePress(btn)} style={[styles.colButton, styles.destructiveBtn]}>
                <Text style={styles.destructiveBtnText}>{btn.text}</Text>
              </Pressable>
            );
          }
          return (
            <Pressable key={index} onPress={() => handlePress(btn)} style={styles.colButtonPrimary}>
              <LinearGradient
                   colors={['#FF2D78', '#FF6B35']}
                   start={{ x: 0, y: 0 }}
                   end={{ x: 1, y: 0 }}
                   style={styles.gradientBg}
                 >
                   <Text style={styles.primaryButtonText}>{btn.text}</Text>
                 </LinearGradient>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={onDismiss} />
        </Animated.View>
        
        <Animated.View 
          entering={SlideInDown.duration(300).springify().damping(18)} 
          exiting={SlideOutDown.duration(200)} 
          style={styles.modalContainer}
        >
          {icon && (
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{icon}</Text>
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            {renderButtons()}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#161616',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1A0A12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF2D78',
  },
  icon: {
    fontSize: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    color: '#8A8A8A',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientBg: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  rowButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  flexButtonPrimary: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  flexButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  colButtons: {
    width: '100%',
    gap: 10,
  },
  colButtonPrimary: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  colButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtn: {
    backgroundColor: '#2A2A2A',
    borderColor: '#3A3A3A',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  destructiveBtn: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  destructiveBtnText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '700',
  }
});
