import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, Modal, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { Image } from 'expo-image';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDoc, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_WIDTH = width / COLUMN_COUNT - 12;

export default function AdminStoriesModeration() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'stories'), 
      where('active', '==', true)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStories(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching stories for admin:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const [showBanMenu, setShowBanMenu] = useState(false);

  const handleDelete = async (storyId: string) => {
    console.log("[AdminStories] Deleting story:", storyId);
    
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm("¿Estás seguro de que quieres eliminar esta historia?")
      : true; // If not web, the native Alert will handle it (but I'll use a custom one for consistency)

    if (confirmDelete) {
      try {
        // We do a 'Soft Delete' (active: false) first to ensure immediate removal in the UI filter
        // and then try to delete the document permanently.
        await updateDoc(doc(db, 'stories', storyId), { active: false });
        await deleteDoc(doc(db, 'stories', storyId));
        
        console.log("[AdminStories] Story deleted successfully from Firestore");
        setIsViewerOpen(false);
        if (Platform.OS === 'web') window.alert("¡Éxito! La historia ha sido eliminada y ya no será visible para nadie.");
        else Alert.alert("Éxito", "Historia eliminada correctamente.");
      } catch (e: any) {
        console.error("[AdminStories] Delete failed:", e);
        if (Platform.OS === 'web') window.alert("Error: No tienes permisos de administrador en las reglas de Firebase o hubo un problema de red.");
        else Alert.alert("Error", "No se pudo eliminar. Verifica tus permisos de administrador.");
      }
    }
  };

  const applyBan = async (userId: string, duration: string) => {
    console.log("[AdminStories] Applying ban:", duration, "to", userId);
    let banDate: Date | null = null;
    if (duration === '1 Hora') {
      banDate = new Date();
      banDate.setHours(banDate.getHours() + 1);
    } else if (duration === '1 Día') {
      banDate = new Date();
      banDate.setDate(banDate.getDate() + 1);
    } else if (duration === '1 Semana') {
      banDate = new Date();
      banDate.setDate(banDate.getDate() + 7);
    } else if (duration === 'Permanente') {
      banDate = new Date(2099, 0, 1);
    }

    try {
      await updateDoc(doc(db, 'profiles', userId), {
        banned: true,
        banReason: 'Inappropriate content in Aura Stories',
        banExpiresAt: banDate ? banDate.toISOString() : null
      });
      setIsViewerOpen(false);
      setShowBanMenu(false);
      if (Platform.OS === 'web') alert(`Usuario baneado por ${duration}.`);
      else Alert.alert("Éxito", `Usuario baneado por ${duration}.`);
    } catch (e: any) {
      Alert.alert("Error", "No se pudo banear: " + e.message);
    }
  };

  const handleBanUser = () => {
    setShowBanMenu(true);
  };

  const renderItem = ({ item }: { item: any }) => (
    <Pressable 
      style={styles.storyThumbnail} 
      onPress={() => {
        setSelectedStory(item);
        setIsViewerOpen(true);
      }}
    >
      <Image source={{ uri: item.mediaUrl }} style={styles.thumbImage} />
      <View style={styles.thumbOverlay}>
        <Text style={styles.thumbUser} numberOfLines={1}>{item.userName}</Text>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer edges={['left', 'right']} containerClassName="bg-[#0A0A0A]">
      <View style={styles.header}>
        <Text style={styles.title}>Moderación de Historias</Text>
        <Text style={styles.subtitle}>Supervisa el contenido de Aura Stories en tiempo real.</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#8A2BE2" size="large" />
        </View>
      ) : (
        <FlatList
          data={stories}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay historias activas actualmente.</Text>
          }
        />
      )}

      {/* Story Viewer Overlay (Anonymous) */}
      {isViewerOpen && selectedStory && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 10000 }}>
          <View style={styles.viewerOverlay}>
            <View style={styles.viewerContent}>
              {/* Header */}
              <View style={styles.viewerHeader}>
                <View style={styles.userInfo}>
                  <Image source={{ uri: selectedStory.userPhoto }} style={styles.userAvatar} />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.userName}>{selectedStory.userName}</Text>
                      <View style={styles.inlineBadge}>
                        <Ionicons name="eye-off" size={10} color="#8A2BE2" />
                        <Text style={styles.inlineBadgeText}>ANÓNIMO</Text>
                      </View>
                    </View>
                    <Text style={styles.storyTime}>
                      {selectedStory.createdAt?.toDate ? selectedStory.createdAt.toDate().toLocaleString() : 'Reciente'}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => setIsViewerOpen(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={32} color="#FFF" />
                </Pressable>
              </View>

              {/* Media */}
              <View style={styles.mediaContainer}>
                <Image 
                  source={{ uri: selectedStory.mediaUrl }} 
                  style={styles.fullMedia} 
                  contentFit="cover" 
                />
              </View>

              {/* Actions - ABSOLUTE POSITIONED TO ENSURE CLICKS */}
              <View style={styles.footerActions}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  style={[styles.footerBtn, { backgroundColor: '#B71C1C' }]}
                  onPress={() => {
                    console.log("!!! ADMIN: Delete Story Triggered");
                    handleDelete(selectedStory.id);
                  }}
                >
                  <Ionicons name="trash" size={20} color="#FFF" />
                  <Text style={styles.footerBtnText}>Eliminar Historia</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.7}
                  style={[styles.footerBtn, { backgroundColor: '#1A1A1A' }]}
                  onPress={() => {
                    console.log("Ban pressed");
                    handleBanUser();
                  }}
                >
                  <Ionicons name="hand-right" size={20} color="#FFF" />
                  <Text style={styles.footerBtnText}>Banear Usuario</Text>
                </TouchableOpacity>
              </View>

              {/* Custom Ban Menu Overlay */}
              {showBanMenu && (
                <View style={styles.banMenuOverlay}>
                  <View style={styles.banMenuContent}>
                    <Text style={styles.banMenuTitle}>Duración del Baneo</Text>
                    <Text style={styles.banMenuSub}>Selecciona cuánto tiempo suspender a {selectedStory.userName}</Text>
                    
                    <View style={styles.banOptions}>
                      {['1 Hora', '1 Día', '1 Semana', 'Permanente'].map((opt) => (
                        <TouchableOpacity 
                          key={opt} 
                          style={styles.banOptBtn} 
                          onPress={() => applyBan(selectedStory.userId, opt)}
                        >
                          <Text style={[styles.banOptText, opt === 'Permanente' && { color: '#FF3B30' }]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                      
                      <TouchableOpacity 
                        style={[styles.banOptBtn, { borderTopWidth: 1, borderTopColor: '#333', marginTop: 10 }]} 
                        onPress={() => setShowBanMenu(false)}
                      >
                        <Text style={{ color: '#8A8A8A', fontWeight: 'bold' }}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    gap: 4,
  },
  title: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#8A8A8A', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid: {
    padding: 8,
  },
  storyThumbnail: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.5,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#161616',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  thumbUser: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  
  // Viewer
  viewerOverlay: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  viewerContent: {
    width: '100%',
    height: '100%',
    maxWidth: 500,
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    zIndex: 100,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#8A2BE2',
  },
  userName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  storyTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  closeBtn: {
    padding: 10,
    zIndex: 110,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  fullMedia: {
    width: '100%',
    height: '100%',
  },
  footerActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderTopWidth: 1,
    borderTopColor: '#222',
    zIndex: 1000,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
  },
  footerBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Ban Menu
  banMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  banMenuContent: {
    width: '80%',
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  banMenuTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  banMenuSub: {
    color: '#8A8A8A',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  banOptions: {
    gap: 4,
  },
  banOptBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  banOptText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  inlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.3)',
  },
  inlineBadgeText: {
    color: '#8A2BE2',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
