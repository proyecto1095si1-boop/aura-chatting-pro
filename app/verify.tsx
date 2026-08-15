import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/lib/auth-context';
import { db, storage } from '@/lib/firebase';
import { uploadToFirebaseStorage } from '@/lib/storage-service';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const POSE_IMAGE = require('../assets/images/verification_pose.png');

export default function VerificationScreen() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const [selfie, setSelfie] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const takeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('stories.permission_denied', 'Permission denied'), t('verification.camera_permission', 'We need access to the camera to verify you.'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelfie(result.assets[0].uri);
      setStep(2);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleResetVerification = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile({
        verificationStatus: 'none',
        verificationPhotoUrl: null
      });
      setStep(1);
      setSelfie(null);
    } catch (e) {
      console.error("Error resetting verification:", e);
    } finally {
      setLoading(false);
    }
  };

  const submitVerification = async () => {
    if (!selfie || !user) {
      console.warn("[Verification] Missing selfie or user:", { hasSelfie: !!selfie, hasUser: !!user });
      return;
    }

    console.log("[Verification] Starting submission process...");
    setLoading(true);
    try {
      // 1. Upload to Storage
      console.log("[Verification] 1. Uploading photo to Storage...");
      const fileName = `verification_${user.uid}_${Date.now()}.jpg`;
      const publicUrl = await uploadToFirebaseStorage(user.uid, selfie, fileName, 'verifications');
      console.log("[Verification] 1. Success! Photo URL:", publicUrl);

      // 2. Create Verification Request in Firestore (Admin visible)
      console.log("[Verification] 2. Creating Firestore document in 'verifications'...");
      const requestRef = await addDoc(collection(db, 'verifications'), {
        userId: user.uid,
        userName: user.name,
        profilePhoto: user.photos?.[0] || '',
        selfieUrl: publicUrl,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      console.log("[Verification] 2. Success! Request ID:", requestRef.id);

      // 3. Update User Profile
      console.log("[Verification] 3. Updating user profile status...");
      await updateProfile({
        verificationStatus: 'pending',
        verificationPhotoUrl: publicUrl
      });
      console.log("[Verification] 3. Success! Profile updated.");

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('verification.pending'), t('verification.pending_desc'));
      router.back();
    } catch (error: any) {
      console.error("[Verification] CRITICAL ERROR during submission:", error);
      Alert.alert(t('verification.error_title', 'Verification Error'), error.message || t('verification.error_message', 'Could not process the verification. Please try again.'));
    } finally {
      setLoading(false);
      console.log("[Verification] Process finished.");
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('verification.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {user?.verificationStatus === 'pending' ? (
          <Animated.View entering={FadeInDown} style={styles.stateCard}>
            <View style={styles.iconCirclePending}>
              <Ionicons name="time" size={40} color="#FFD700" />
            </View>
            <Text style={styles.stateTitle}>{t('verification.pending')}</Text>
            <Text style={styles.stateDesc}>{t('verification.pending_desc')}</Text>
            
            <View style={styles.pendingActions}>
              <Pressable style={styles.backHomeBtn} onPress={() => router.back()}>
                <Text style={styles.backHomeText}>{t('common.close', 'Close')}</Text>
              </Pressable>
              
              <Pressable 
                style={styles.resetBtn} 
                onPress={handleResetVerification}
                disabled={loading}
              >
                {loading ? <ActivityIndicator size="small" color="#FF2D78" /> : (
                  <Text style={styles.resetText}>{t('verification.retry', 'Retry / Upload another')}</Text>
                )}
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInDown} style={styles.guideCard}>
              <Text style={styles.stepTitle}>{t('verification.step1_title')}</Text>
              <Text style={styles.stepDesc}>{t('verification.step1_desc')}</Text>
              
              <View style={styles.poseContainer}>
                <Image source={POSE_IMAGE} style={styles.poseImage} contentFit="contain" />
                <View style={styles.poseBadge}>
                  <Text style={styles.poseBadgeText}>{t('verification.reference', 'Reference')}</Text>
                </View>
              </View>
            </Animated.View>

            {selfie ? (
              <Animated.View entering={ZoomIn} style={styles.previewCard}>
                <Text style={styles.previewTitle}>{t('verification.your_selfie', 'Your Selfie')}</Text>
                <Image source={{ uri: selfie }} style={styles.previewImage} />
                <View style={styles.previewActions}>
                  <Pressable onPress={() => setSelfie(null)} style={styles.retakeBtn}>
                    <Text style={styles.retakeText}>{t('verification.retake', 'Retake')}</Text>
                  </Pressable>
                  <Pressable 
                    onPress={submitVerification} 
                    style={styles.submitBtn}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <LinearGradient colors={['#FF2D78', '#FF6B35']} style={styles.submitGradient}>
                        <Text style={styles.submitText}>{t('verification.submit')}</Text>
                      </LinearGradient>
                    )}
                  </Pressable>
                </View>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInUp.delay(200)} style={styles.actionSection}>
                <Pressable onPress={takeSelfie} style={styles.mainActionBtn}>
                  <LinearGradient colors={['#FF2D78', '#FF6B35']} style={styles.mainActionGradient}>
                    <Ionicons name="camera" size={24} color="#FFF" />
                    <Text style={styles.mainActionText}>{t('verification.take_photo')}</Text>
                  </LinearGradient>
                </Pressable>
                <Text style={styles.privacyNote}>
                  {t('verification.privacy_note', 'This photo will not be visible on your profile. It will only be used to verify your identity.')}
                </Text>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#FFF',
    fontSize: 24,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  guideCard: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  stepTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  stepDesc: {
    color: '#8A8A8A',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  poseContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  poseImage: {
    width: '100%',
    height: '100%',
  },
  poseBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 45, 120, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  poseBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  mainActionBtn: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  mainActionGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mainActionText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  privacyNote: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 40,
  },
  previewCard: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FF2D78',
  },
  previewTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 400,
    borderRadius: 16,
    marginBottom: 20,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeText: {
    color: '#FFF',
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  submitGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFF',
    fontWeight: '700',
  },
  stateCard: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 40,
  },
  iconCirclePending: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stateTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  stateDesc: {
    color: '#8A8A8A',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  pendingActions: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  resetText: {
    color: '#FF2D78',
    fontWeight: '700',
    fontSize: 14,
  },
  backHomeBtn: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backHomeText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  }
});
