import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding-layout';
import { useAuth } from '@/lib/auth-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { uploadToFirebaseStorage } from '@/lib/storage-service';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue, withDelay } from 'react-native-reanimated';
import { useEffect } from 'react';

export default function OnboardingVerification() {
  const { t } = useTranslation();
  const { user, updateProfile, completeOnboarding } = useAuth();
  const [selfie, setSelfie] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const floatValue = useSharedValue(0);

  useEffect(() => {
    floatValue.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2500 }),
        withTiming(0, { duration: 2500 })
      ),
      -10
    );
  }, []);

  const animatedBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatValue.value }],
  }));

  const [showSkipModal, setShowSkipModal] = useState(false);

  const handleTakeSelfie = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        if (Platform.OS === 'web') {
           window.alert(t('verification.camera_permission_error', 'Se requieren permisos de cámara para la verificación.'));
        } else {
           Alert.alert(t('common.error'), t('verification.camera_permission_error', 'Se requieren permisos de cámara para la verificación.'));
        }
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.8,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelfie(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Camera error:", error);
      if (Platform.OS === 'web') {
        window.alert(t('verification.camera_launch_error', 'No se pudo abrir la cámara. Asegúrate de dar permisos en el navegador.'));
      } else {
        Alert.alert(t('common.error'), t('verification.camera_launch_error', 'No se pudo abrir la cámara.'));
      }
    }
  };

  const handleNext = async () => {
    if (!selfie) {
       if (Platform.OS === 'web') {
         window.alert(t('verification.mandatory_error', 'La verificación es obligatoria para garantizar la seguridad de la comunidad.'));
       } else {
         Alert.alert(t('common.info'), t('verification.mandatory_error', 'La verificación es obligatoria para garantizar la seguridad de la comunidad.'));
       }
       return;
    }

    try {
      setLoading(true);
      const selfieUrl = await uploadToFirebaseStorage(user?.uid || 'guest', selfie, `selfie_${Date.now()}.jpg`, 'verifications');
      
      await updateProfile({ 
        verificationStatus: 'pending',
        verificationSelfieUrl: selfieUrl
      });

      await addDoc(collection(db, 'verifications'), {
        userId: user?.uid,
        userName: user?.name,
        profilePhoto: user?.photos[0] || '',
        selfieUrl,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      await completeOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      console.error("Verification upload error:", error);
      if (Platform.OS === 'web') {
        window.alert(t('verification.upload_error', 'Hubo un problema al subir tu solicitud.'));
      } else {
        Alert.alert(t('common.error'), t('verification.upload_error', 'Hubo un problema al subir tu solicitud.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmSkipAction = async () => {
    setShowSkipModal(false);
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <OnboardingLayout
      step={10}
      totalSteps={10}
      title={t('onboarding.verification.title', 'Verifica tu Identidad')}
      subtitle={t('onboarding.verification.subtitle', 'Captura una selfie en tiempo real para obtener tu badge oficial.')}
      onNext={handleNext}
      nextLabel={loading ? t('common.loading') : (selfie ? t('common.complete') : t('common.next'))}
      scrollable
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🤔 {t('verification.why_title', '¿Por qué verificar?')}</Text>
          <Text style={styles.cardText}>
            • {t('verification.reason_1', 'Generas más confianza con tus matches.')}{"\n"}
            • {t('verification.reason_2', 'Acceso prioritario en el descubrimiento.')}{"\n"}
            • {t('verification.reason_3', 'Comunidad libre de perfiles falsos.')}
          </Text>
        </View>

        <View style={styles.bubbleWrapper}>
          <Animated.View 
            entering={FadeIn.duration(1000)}
            style={[styles.previewContainer, animatedBubbleStyle]}
          >
            <LinearGradient
              colors={['#FF2D78', '#FF6B35', '#FBBC05']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBorder}
            >
              <View style={styles.innerBubble}>
                {selfie ? (
                  <Image source={{ uri: selfie }} style={styles.preview} contentFit="cover" />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderIcon}>📸</Text>
                  </View>
                )}
                
                {!selfie && (
                   <View style={styles.faceGuide} />
                )}
              </View>
            </LinearGradient>
          </Animated.View>
          <View style={styles.glowEffect} />
        </View>

        <Pressable 
          onPress={handleTakeSelfie} 
          disabled={loading}
          style={({ pressed }) => [styles.selfieBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.selfieBtnText}>
            {selfie ? t('verification.retake_btn', 'Tomar de nuevo') : t('verification.capture_btn', 'Tomar Selfie')}
          </Text>
        </Pressable>

        {loading && (
          <ActivityIndicator color="#FF2D78" style={{ marginTop: 20 }} />
        )}

        <Pressable onPress={() => setShowSkipModal(true)} style={styles.skipBtn}>
           <Text style={styles.skipText}>{t('common.skip_step', 'Omitir por ahora')}</Text>
        </Pressable>
      </View>

      {/* Modern Skip Confirmation Modal */}
      <Modal
        visible={showSkipModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSkipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={FadeInUp.springify()} 
            style={styles.modalContent}
          >
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>⚠️</Text>
            </View>
            <Text style={styles.modalTitle}>{t('verification.skip_title', '¿Omitir verificación?')}</Text>
            <Text style={styles.modalDescription}>
              {t('verification.skip_desc', 'Sin verificar, tu perfil generará menos confianza y no tendrás el badge de seguridad oficial.')}
            </Text>
            
            <View style={styles.modalActions}>
              <Pressable 
                onPress={() => setShowSkipModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </Pressable>
              
              <Pressable 
                onPress={confirmSkipAction}
                style={styles.modalConfirmBtn}
              >
                <LinearGradient
                  colors={['#FF2D78', '#FF6B35'] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalConfirmGradient}
                >
                  <Text style={styles.modalConfirmText}>{t('common.skip')}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 24,
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardText: {
    color: '#8A8A8A',
    fontSize: 14,
    lineHeight: 22,
  },
  bubbleWrapper: {
    padding: 10,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    width: 250,
    height: 250,
    borderRadius: 125,
    overflow: 'hidden',
    zIndex: 2,
  },
  gradientBorder: {
    flex: 1,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerBubble: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 125,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  faceGuide: {
    position: 'absolute',
    width: '80%',
    height: '85%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    borderRadius: 100,
  },
  glowEffect: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FF2D78',
    opacity: 0.1,
    zIndex: 1,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 60,
  },
  selfieBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    marginTop: 8,
  },
  selfieBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    marginTop: 10,
    padding: 10,
  },
  skipText: {
    color: '#8A8A8A',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  // Custom Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#161616',
    borderRadius: 32,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalIcon: {
    fontSize: 40,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    color: '#8A8A8A',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
