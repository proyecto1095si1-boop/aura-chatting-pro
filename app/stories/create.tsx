import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToFirebaseStorage } from '@/lib/storage-service';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

export default function CreateStoryScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('stories.permission_denied', 'Permission denied'), t('stories.gallery_permission', 'We need access to your gallery to upload stories.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('stories.permission_denied', 'Permission denied'), t('stories.camera_permission', 'We need access to your camera to upload stories.'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!image || !user) return;

    setUploading(true);
    try {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const fileName = `story_${Date.now()}.jpg`;
      const mediaUrl = await uploadToFirebaseStorage(user.uid, image, fileName, 'stories');

      const teamId = user.doubleDate?.status === 'linked' 
        ? [user.uid, user.doubleDate.partnerId].sort().join('_') 
        : null;

      await addDoc(collection(db, 'stories'), {
        userId: user.uid,
        userName: user.name,
        userPhoto: user.photos[0] || '',
        teamId: teamId,
        mediaUrl: mediaUrl,
        createdAt: serverTimestamp(),
        active: true,
        views: [],
        likes: []
      });

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (Platform.OS === 'web') window.alert(t('stories.published', 'Story published!'));
      else Alert.alert(t('common.success'), t('stories.published_desc', 'Your story has been published.'));
      
      router.back();
    } catch (error: any) {
      console.error("Story upload failed:", error);
      Alert.alert(t('common.error'), t('stories.upload_error', 'Could not upload story: ') + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScreenContainer edges={['top']} containerClassName="bg-[#0A0A0A]">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </Pressable>
        <Text style={styles.title}>{t('stories.new_story', 'New Story')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {image ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image }} style={styles.preview} contentFit="cover" />
            <Pressable style={styles.removeBtn} onPress={() => setImage(null)}>
              <Ionicons name="close-circle" size={32} color="#FFF" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.iconCircle}>
              <Ionicons name="camera" size={40} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={styles.emptyText}>{t('stories.share_moment', 'Share a special moment')}</Text>
            <View style={styles.optionsRow}>
              <Pressable style={styles.optionBtn} onPress={takePhoto}>
                <LinearGradient colors={['#FF2D78', '#FF6B35']} style={styles.optionIcon}>
                  <Ionicons name="camera" size={24} color="#FFF" />
                </LinearGradient>
                <Text style={styles.optionLabel}>{t('stories.camera', 'Camera')}</Text>
              </Pressable>
              <Pressable style={styles.optionBtn} onPress={pickImage}>
                <LinearGradient colors={['#333', '#111']} style={styles.optionIcon}>
                  <Ionicons name="images" size={24} color="#FFF" />
                </LinearGradient>
                <Text style={styles.optionLabel}>{t('stories.gallery', 'Gallery')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {image && (
          <Pressable 
            style={({ pressed }) => [styles.publishBtn, (pressed || uploading) && { opacity: 0.8 }]} 
            onPress={handleUpload}
            disabled={uploading}
          >
            <LinearGradient 
              colors={['#FF2D78', '#FF6B35']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 0 }} 
              style={styles.publishGradient}
            >
              {uploading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color="#FFF" />
                  <Text style={styles.publishText}>{t('stories.publish', 'Publish Story')}</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
        <Text style={styles.hint}>{t('stories.disappear_hint', 'Stories disappear after 24 hours')}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  previewContainer: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
    marginVertical: 20,
    position: 'relative',
  },
  preview: {
    flex: 1,
  },
  removeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    gap: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyText: {
    color: '#8A8A8A',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 20,
  },
  optionBtn: {
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  optionLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 16,
  },
  publishBtn: {
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  publishGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  publishText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  hint: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
