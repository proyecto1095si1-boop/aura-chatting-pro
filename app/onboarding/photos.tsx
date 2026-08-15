import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { OnboardingLayout } from '@/components/onboarding-layout';
import { useAuth } from '@/lib/auth-context';
import * as ImagePicker from 'expo-image-picker';
import { uploadToFirebaseStorage } from '@/lib/storage-service';

const MAX_PHOTOS = 9;
const MIN_PHOTOS = 3;

import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';
import { InstagramPhotoEditor } from '@/components/photo-editor/InstagramPhotoEditor';

export default function OnboardingPhotos() {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const { updateProfile, user } = useAuth();
  
  // Editor State
  const [editingPhoto, setEditingPhoto] = useState<{ 
    uri: string; 
    width: number; 
    height: number; 
    index: number 
  } | null>(null);

  const pickPhoto = async (index: number) => {
    if (!user?.uid) {
      console.error('[Photos] No user UID available for upload');
      if (Platform.OS === 'web') {
        window.alert(t('common.error_session', 'Error: Session not found. Try reloading the page.'));
      } else {
        Alert.alert(t('common.error'), t('common.error_session_app', 'Session not found. Try closing and opening the app.'));
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, // Desactivamos el editor nativo destructivo
      quality: 1, // Calidad máxima para el editor
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setEditingPhoto({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        index
      });
    }
  };

  const onEditingComplete = async (croppedUri: string) => {
    if (!user?.uid || editingPhoto === null) return;
    
    const index = editingPhoto.index;
    setEditingPhoto(null); // Cerrar editor

    // OPTIMISTIC UPDATE: Mostrar foto local al instante para evitar parpadeos negros y lag
    setPhotos(prev => {
      const next = [...prev];
      while (next.length <= index) {
        next.push('');
      }
      next[index] = croppedUri;
      return next;
    });

    setUploadingCount(prev => prev + 1);
    
    const fileName = `photo_${index + 1}_${Date.now()}.jpg`;
    
    // Subir en segundo plano sin bloquear el UI thread
    uploadToFirebaseStorage(user.uid, croppedUri, fileName)
      .then(publicUrl => {
        setPhotos(prev => {
          const next = [...prev];
          if (next[index] === croppedUri) {
            next[index] = publicUrl;
          }
          return next;
        });
      })
      .catch((e: any) => {
        console.error('[Photos] Upload failed:', e);
        Alert.alert(t('common.error'), t('onboarding.photos.upload_error', 'Could not upload photo: ') + e.message);
        // Revertir optimismo
        setPhotos(prev => {
          const next = [...prev];
          if (next[index] === croppedUri) {
            next[index] = '';
          }
          return next;
        });
      })
      .finally(() => {
        setUploadingCount(prev => prev - 1);
      });
  };

  const removePhoto = async (index: number) => {
    const urlToRemove = photos[index];
    if (urlToRemove) {
      // Async deletion from storage without blocking UI update
      import('@/lib/storage-service').then(m => m.deleteFromFirebaseStorage(urlToRemove));
    }

    setPhotos(prev => {
      const next = [...prev];
      if (index < next.length) {
        next[index] = ''; // Keep slot index stability
      }
      return next;
    });
  };

  const handleNext = async () => {
    // Filter actual URLs and remove empty indices before saving
    const finalPhotos = photos.filter(p => !!p && p.trim() !== '');
    if (finalPhotos.length < MIN_PHOTOS) {
       Alert.alert(t('onboarding.photos.missing_title', 'Missing Photos'), t('onboarding.photos.missing_message', 'You must upload at least {{min}} photos to continue.', { min: MIN_PHOTOS }));
       return;
    }
    await updateProfile({ photos: finalPhotos });
    router.push('/onboarding/interests' as any);
  };

  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => i);

  return (
    <OnboardingLayout
      step={6}
      totalSteps={10}
      title={t('onboarding.photos.title')}
      subtitle={t('onboarding.photos.subtitle', { min: MIN_PHOTOS })}
      onNext={handleNext}
      nextDisabled={photos.filter(p => !!p).length < MIN_PHOTOS || uploadingCount > 0}
      nextLabel={uploadingCount > 0 ? t('onboarding.photos.uploading', 'Uploading Photo...') : t('onboarding.photos.continue_btn', { count: photos.filter(p => !!p).length, min: MIN_PHOTOS })}
    >
      <View style={styles.grid}>
        {slots.map((i) => (
          <View key={i} style={styles.slot}>
            {photos[i] ? (
              <Pressable
                style={styles.photoContainer}
                onLongPress={() => removePhoto(i)}
              >
                <Image
                  source={{ uri: photos[i] }}
                  style={styles.photo}
                  contentFit="cover"
                />
                {i === 0 && (
                  <View style={styles.mainBadge}>
                    <Text style={styles.mainBadgeText}>{t('onboarding.photos.main')}</Text>
                  </View>
                )}
                <Pressable
                  style={styles.removeButton}
                  onPress={() => removePhoto(i)}
                >
                  <Text style={styles.removeIcon}>×</Text>
                </Pressable>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.emptySlot, i < MIN_PHOTOS && styles.requiredSlot]}
                onPress={() => pickPhoto(i)}
              >
                <Text style={styles.plusIcon}>+</Text>
                {i < MIN_PHOTOS && (
                  <Text style={styles.requiredText}>{t('onboarding.photos.required')}</Text>
                )}
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <Text style={styles.hint}>
        {t('onboarding.photos.hint')}
      </Text>

      {/* Instagram-style Photo Editor Modal */}
      <Modal 
        visible={!!editingPhoto} 
        animationType="slide" 
        transparent={false}
      >
        {editingPhoto && (
          <InstagramPhotoEditor
            imageUri={editingPhoto.uri}
            imageWidth={editingPhoto.width}
            imageHeight={editingPhoto.height}
            onCancel={() => setEditingPhoto(null)}
            onComplete={onEditingComplete}
          />
        )}
      </Modal>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  slot: {
    width: '31%',
    aspectRatio: 3 / 4,
  },
  photoContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photo: {
    flex: 1,
  },
  mainBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 45, 120, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mainBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  emptySlot: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  requiredSlot: {
    borderColor: '#FF2D78',
    borderStyle: 'dashed',
  },
  plusIcon: {
    color: '#8A8A8A',
    fontSize: 28,
    fontWeight: '300',
  },
  requiredText: {
    color: '#FF2D78',
    fontSize: 9,
    fontWeight: '600',
  },
  hint: {
    color: '#8A8A8A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
});
