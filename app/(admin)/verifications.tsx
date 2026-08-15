import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { Image } from 'expo-image';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import Animated, { FadeInDown, FadeInUp, Layout, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Modal } from 'react-native';

export default function AdminVerifications() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Image Viewer State
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Profile Viewer State
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'verifications'), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(fetched);
    } catch (e) {
      console.error("Error fetching verifications", e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (requestId: string, userId: string, approve: boolean) => {
    try {
      const userRef = doc(db, 'profiles', userId);
      const requestRef = doc(db, 'verifications', requestId);

      if (approve) {
        await updateDoc(userRef, {
          verificationStatus: 'verified',
          verified: true
        });
        Alert.alert('Éxito', 'Perfil verificado correctamente.');
      } else {
        await updateDoc(userRef, {
          verificationStatus: 'none',
          verified: false,
          verificationPhotoUrl: null
        });
        Alert.alert('Rechazado', 'La verificación ha sido rechazada.');
      }

      // Mark request as handled (delete it)
      await deleteDoc(requestRef);
      setRequests(requests.filter(r => r.id !== requestId));
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(approve ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      }

    } catch (e) {
      console.error("Verification action failed:", e);
      Alert.alert('Error', 'No se pudo completar la acción.');
    }
  };

  const handleViewProfile = async (userId: string) => {
    try {
      setLoadingProfile(true);
      setProfileModalVisible(true);
      const userDoc = await getDoc(doc(db, 'profiles', userId));
      if (userDoc.exists()) {
        setSelectedProfile({ id: userDoc.id, ...userDoc.data() });
      } else {
        Alert.alert("Error", "El perfil ya no existe en la base de datos.");
        setProfileModalVisible(false);
      }
    } catch (e) {
      console.error("Error fetching profile", e);
      Alert.alert("Error", "No se pudo obtener la información del perfil.");
      setProfileModalVisible(false);
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <ScreenContainer edges={['left', 'right']} containerClassName="bg-[#0A0A0A]">
      <View style={styles.header}>
        <Animated.View entering={FadeInUp}>
          <Text style={styles.title}>Central de Verificaciones</Text>
          <Text style={styles.subtitle}>Compara detenidamente la selfie enviada con la foto de perfil principal del usuario.</Text>
        </Animated.View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8A2BE2" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={styles.emptyText}>No hay solicitudes pendientes.</Text>
            </View>
          ) : (
            requests.map((request, idx) => (
              <Animated.View 
                key={request.id} 
                layout={Layout.springify()}
                entering={FadeInDown.delay(idx * 150).duration(500)} 
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.userName}>{request.userName}</Text>
                    <Text style={styles.userId}>ID: {request.userId}</Text>
                  </View>
                  <Pressable onPress={() => handleViewProfile(request.userId)} style={styles.viewProfileBtn}>
                    <Ionicons name="person-outline" size={16} color="#FF2D78" />
                    <Text style={styles.viewProfileText}>Ver Perfil</Text>
                  </Pressable>
                </View>

                <View style={styles.comparisonContainer}>
                  <Pressable style={styles.imageWrapper} onPress={() => setFullScreenImage(request.profilePhoto)}>
                    <View style={styles.imageLabelTag}><Text style={styles.imageLabelText}>Foto de Perfil</Text></View>
                    <Image source={{ uri: request.profilePhoto }} style={styles.image} contentFit="cover" />
                  </Pressable>
                  
                  <View style={styles.vsContainer}>
                    <LinearGradient colors={['#FF2D78', '#FF6B35']} style={styles.vsGradient}>
                      <Text style={styles.vsText}>VS</Text>
                    </LinearGradient>
                  </View>

                  <Pressable style={styles.imageWrapper} onPress={() => setFullScreenImage(request.selfieUrl)}>
                    <View style={[styles.imageLabelTag, {backgroundColor: '#4CAF50'}]}><Text style={styles.imageLabelText}>Selfie Real</Text></View>
                    <Image source={{ uri: request.selfieUrl }} style={styles.image} contentFit="cover" />
                  </Pressable>
                </View>
                
                <View style={styles.actions}>
                  <Pressable  
                    onPress={() => handleAction(request.id, request.userId, false)} 
                    style={({ pressed }) => [styles.actionBtn, styles.rejectBtn, pressed && { opacity: 0.8 }]}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF3B30" />
                    <Text style={[styles.actionText, {color: '#FF3B30'}]}>Rechazar Falso</Text>
                  </Pressable>
                  
                  <Pressable 
                    onPress={() => handleAction(request.id, request.userId, true)} 
                    style={({ pressed }) => [styles.actionBtn, styles.approveBtn, pressed && { opacity: 0.9 }]}
                  >
                    <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.approveGradient}>
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      <Text style={styles.approveText}>Aprobar Perfil</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </Animated.View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Profile Viewer Modal */}
      {profileModalVisible && (
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => {setProfileModalVisible(false); setSelectedProfile(null);}} />
          <Animated.View entering={SlideInDown.duration(300).springify().damping(20)} exiting={SlideOutDown} style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Información del Perfil</Text>
              <Pressable onPress={() => {setProfileModalVisible(false); setSelectedProfile(null);}} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color="#FFF" />
              </Pressable>
            </View>

            {loadingProfile ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#FF2D78" />
                <Text style={{color: '#8A8A8A', marginTop: 10}}>Obteniendo datos...</Text>
              </View>
            ) : selectedProfile ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                
                <View style={styles.profileSection}>
                  <Text style={styles.profileName}>{selectedProfile.name}, {selectedProfile.age}</Text>
                  <Text style={styles.profileSub}>{selectedProfile.gender === 'male' ? 'Hombre' : selectedProfile.gender === 'female' ? 'Mujer' : selectedProfile.gender} • {selectedProfile.location?.city || 'Sin ubicación'}</Text>
                  {selectedProfile.bio && (
                    <Text style={styles.profileBio}>"{selectedProfile.bio}"</Text>
                  )}
                </View>

                {selectedProfile.interests && selectedProfile.interests.length > 0 && (
                   <View style={styles.profileSection}>
                     <Text style={styles.sectionLabel}>Intereses</Text>
                     <View style={styles.tagsContainer}>
                       {selectedProfile.interests.map((int: string, i: number) => (
                         <View key={i} style={styles.tag}><Text style={styles.tagText}>{int}</Text></View>
                       ))}
                     </View>
                   </View>
                )}

                <View style={styles.profileSection}>
                  <Text style={styles.sectionLabel}>Galería de Fotos ({selectedProfile.photos?.length || 0})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                    {selectedProfile.photos?.map((photo: string, index: number) => (
                      <Pressable key={index} style={styles.galleryImageWrapper} onPress={() => setFullScreenImage(photo)}>
                         <Image source={{uri: photo}} style={styles.galleryImage} contentFit="cover" />
                         <Text style={styles.galleryIndex}>{index + 1}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={{height: 20}} />
              </ScrollView>
            ) : null}
          </Animated.View>
        </View>
      )}

      {/* Full Screen Image Viewer Modal */}
      {fullScreenImage && (
        <Modal transparent visible={true} animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
          <View style={styles.fullScreenOverlay}>
            <Pressable style={styles.fullScreenBackdrop} onPress={() => setFullScreenImage(null)} />
            <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImage} contentFit="contain" />
            <Pressable style={styles.fullScreenCloseBtn} onPress={() => setFullScreenImage(null)}>
              <Ionicons name="close" size={32} color="#FFF" />
            </Pressable>
          </View>
        </Modal>
      )}

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 24, paddingTop: 30, gap: 10 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: '#8A8A8A', fontSize: 15, lineHeight: 22 },
  list: { padding: 20, gap: 24 },
  card: {
    backgroundColor: '#111',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingBottom: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  badgePending: {
    backgroundColor: 'rgba(255, 171, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 171, 0, 0.3)',
  },
  badgePendingText: {
    color: '#FFAB00',
    fontSize: 12,
    fontWeight: '700',
  },
  comparisonContainer: {
    flexDirection: 'row',
    height: 280,
    position: 'relative',
    backgroundColor: '#050505',
  },
  imageWrapper: {
    flex: 1,
    position: 'relative',
  },
  imageLabelTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  imageLabelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  vsContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    zIndex: 20,
  },
  vsGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#111',
  },
  vsText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  userId: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  rejectBtn: { 
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  approveBtn: { 
    backgroundColor: '#4CAF50',
  },
  approveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionText: { fontSize: 15, fontWeight: '700' },
  approveText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    gap: 16,
    backgroundColor: '#111',
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { color: '#AAA', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 120, 0.3)',
  },
  viewProfileText: {
    color: '#FF2D78',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '80%',
    width: '100%',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#161616',
  },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { padding: 24, gap: 24 },
  profileSection: { gap: 12 },
  profileName: { color: '#FFF', fontSize: 28, fontWeight: '900' },
  profileSub: { color: '#AAA', fontSize: 16, fontWeight: '500' },
  profileBio: { color: '#FFF', fontSize: 16, lineHeight: 24, fontStyle: 'italic', opacity: 0.9, marginTop: 8 },
  sectionLabel: { color: '#FF2D78', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#222', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  tagText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  galleryScroll: { gap: 12 },
  galleryImageWrapper: { width: 140, height: 180, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  galleryImage: { width: '100%', height: '100%' },
  galleryIndex: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, fontSize: 10, fontWeight: 'bold' },
  
  // Full screen viewer styles
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  fullScreenBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  fullScreenCloseBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
});
