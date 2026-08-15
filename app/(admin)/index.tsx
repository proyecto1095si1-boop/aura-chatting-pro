import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { Pressable, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

function ActiveBroadcastsList() {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'broadcasts'),
      where('active', '==', true),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBroadcasts(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleDeactivate = async (id: string) => {
    try {
      await updateDoc(doc(db, 'broadcasts', id), { active: false });
      Alert.alert('Éxito', 'Anuncio desactivado correctamente.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo desactivar el anuncio.');
    }
  };

  if (loading) return <ActivityIndicator color="#FF2D78" />;
  if (broadcasts.length === 0) return <Text style={{ color: '#666', fontStyle: 'italic' }}>No hay anuncios activos actualmente.</Text>;

  return (
    <View style={{ gap: 12 }}>
      {broadcasts.map((b) => (
        <View key={b.id} style={styles.activeBroadcastItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeBroadcastTitle}>{b.title}</Text>
            <Text style={styles.activeBroadcastMsg} numberOfLines={1}>{b.message}</Text>
          </View>
          <Pressable 
            onPress={() => handleDeactivate(b.id)}
            style={({ pressed }) => [styles.deactivateBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.deactivateBtnText}>Desactivar</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const defaultData = {
  totalUsers: 0,
  activeToday: 0,
  matches: 0,
  revenue: 'Datos Privados',
  growth: [0, 0, 0, 0, 0, 0, 0],
  premiumPercentage: 0,
  goldenPercentage: 0,
};

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [stats, setStats] = useState(defaultData);
  
  // Broadcast State
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'promo' | 'alert'>('info');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'profiles'));
        
        let total = querySnapshot.size;
        let pCount = 0;
        let gCount = 0;

        querySnapshot.forEach((doc) => {
           const u = doc.data();
           if (u.subscription === 'elite') pCount++;
           if (u.subscription === 'gold') gCount++;
        });

        const pPerc = total > 0 ? Math.round((pCount / total) * 100) : 0;
        const gPerc = total > 0 ? Math.round((gCount / total) * 100) : 0;

        setStats({
          totalUsers: total,
          activeToday: Math.min(total, 5), // Simplification representation
          matches: 0, // Cleared
          revenue: 'Reservado (Play Console)',
          growth: [0, 0, 0, 0, 0, 0, total],
          premiumPercentage: pPerc,
          goldenPercentage: gPerc,
        });
      } catch (e: any) {
         console.warn("Failed to fetch dashboard stats from Firestore", e.message);
      }
    };
    fetchStats();
  }, []);

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert('Error', 'Debes escribir un título y un mensaje.');
      return;
    }
    
    setIsSending(true);
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      await addDoc(collection(db, 'broadcasts'), {
        title: broadcastTitle,
        message: broadcastMessage,
        type: broadcastType,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        active: true,
      });
      
      Alert.alert('¡Enviado!', 'El anuncio global ha sido publicado a todos los usuarios.');
      setBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo enviar el anuncio.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ScreenContainer edges={['left', 'right']} containerClassName="bg-[#0A0A0A]">
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Resumen Analítico</Text>
          <Pressable 
            onPress={async () => {
               try {
                 console.log("[Admin] Logging out...");
                 await logout();
                 // The layout guard will handle the redirect, but router.replace adds safety
                 router.replace('/auth/welcome');
               } catch (e) {
                 console.error("[Admin] Logout failed:", e);
               }
            }}
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.logoutText}>Cerrar Sesión 🚪</Text>
          </Pressable>
        </View>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.quickActions}>
          <Pressable style={styles.broadcastBtn} onPress={() => setBroadcastModal(true)}>
            <LinearGradient colors={['#FF2D78', '#FF6B35']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.broadcastGradient}>
              <Text style={styles.broadcastIcon}>📢</Text>
              <View>
                <Text style={styles.broadcastBtnText}>Enviar Anuncio Global</Text>
                <Text style={styles.broadcastBtnSub}>Notifica a todos los usuarios en tiempo real</Text>
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable style={[styles.broadcastBtn, { marginTop: 12 }]} onPress={() => router.push('/(admin)/stories' as any)}>
            <LinearGradient colors={['#8A2BE2', '#4B0082']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.broadcastGradient}>
              <Text style={styles.broadcastIcon}>🎬</Text>
              <View>
                <Text style={styles.broadcastBtnText}>Moderación de Historias</Text>
                <Text style={styles.broadcastBtnSub}>Vigila y elimina contenido inapropiado</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.kpiGrid}>
          {[
            { label: 'Usuarios Totales', value: stats.totalUsers.toLocaleString(), icon: '👥', color: '#8A2BE2' },
            { label: 'Activos Hoy', value: stats.activeToday.toLocaleString(), icon: '🔥', color: '#FF2D78' },
            { label: 'Matches (Hoy)', value: stats.matches.toLocaleString(), icon: '💖', color: '#FF6B35' },
            { label: 'Ingresos Mensuales', value: stats.revenue, icon: '💰', color: '#4CAF50' },
          ].map((kpi, idx) => (
            <View key={kpi.label} style={styles.kpiCard}>
              <View style={[styles.kpiIconWrapper, { backgroundColor: `${kpi.color}20` }]}>
                <Text style={styles.kpiIcon}>{kpi.icon}</Text>
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.chartSection}>
          <Text style={styles.chartTitle}>Crecimiento (Últimos 7 días)</Text>
          <View style={styles.barChart}>
            {stats.growth.map((height, i) => (
              <View key={i} style={styles.barColumn}>
                <View style={styles.barBackground}>
                  <LinearGradient
                    colors={['#8A2BE2', '#4B0082']}
                    style={[styles.barFill, { height: `${height}%` }]}
                  />
                </View>
                <Text style={styles.barLabel}>D{i+1}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.usersDistribution}>
          <Text style={styles.chartTitle}>Distribución de Planes Vivos</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Gratis ({100 - stats.premiumPercentage - stats.goldenPercentage}%)</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${100 - stats.premiumPercentage - stats.goldenPercentage}%`, backgroundColor: '#8A8A8A' }]} />
            </View>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Premium ({stats.premiumPercentage}%)</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${stats.premiumPercentage}%`, backgroundColor: '#FF2D78' }]} />
            </View>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Golden ({stats.goldenPercentage}%)</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${stats.goldenPercentage}%`, backgroundColor: '#FFD700' }]} />
            </View>
          </View>
        </Animated.View>
        
        <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.activeBroadcastsSection}>
          <Text style={styles.chartTitle}>Anuncios Activos</Text>
          <ActiveBroadcastsList />
        </Animated.View>
        
        <View style={{height: 40}} />
      </ScrollView>

      {/* Broadcast Modal */}
      <Modal visible={broadcastModal} transparent animationType="slide" onRequestClose={() => setBroadcastModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crear Anuncio Global</Text>
              <Pressable onPress={() => setBroadcastModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Tipo de Anuncio</Text>
              <View style={styles.typeSelector}>
                <Pressable style={[styles.typeBtn, broadcastType === 'info' && styles.typeBtnActive, broadcastType === 'info' && {borderColor: '#4FC3F7'}]} onPress={() => setBroadcastType('info')}>
                  <Text style={[styles.typeText, broadcastType === 'info' && {color: '#4FC3F7'}]}>ℹ️ Info</Text>
                </Pressable>
                <Pressable style={[styles.typeBtn, broadcastType === 'promo' && styles.typeBtnActive, broadcastType === 'promo' && {borderColor: '#FFD700'}]} onPress={() => setBroadcastType('promo')}>
                  <Text style={[styles.typeText, broadcastType === 'promo' && {color: '#FFD700'}]}>🎁 Promo</Text>
                </Pressable>
                <Pressable style={[styles.typeBtn, broadcastType === 'alert' && styles.typeBtnActive, broadcastType === 'alert' && {borderColor: '#FF3B30'}]} onPress={() => setBroadcastType('alert')}>
                  <Text style={[styles.typeText, broadcastType === 'alert' && {color: '#FF3B30'}]}>⚠️ Alerta</Text>
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Título</Text>
              <TextInput 
                style={styles.textInput} 
                placeholder="Ej. ¡Feliz San Valentín!" 
                placeholderTextColor="#666" 
                value={broadcastTitle} 
                onChangeText={setBroadcastTitle} 
                maxLength={40}
              />

              <Text style={styles.inputLabel}>Mensaje</Text>
              <TextInput 
                style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]} 
                placeholder="Escribe el mensaje que verán todos los usuarios..." 
                placeholderTextColor="#666" 
                multiline 
                value={broadcastMessage} 
                onChangeText={setBroadcastMessage} 
                maxLength={200}
              />

              <Pressable 
                style={[styles.sendBtn, (!broadcastTitle || !broadcastMessage || isSending) && {opacity: 0.5}]} 
                onPress={handleSendBroadcast}
                disabled={!broadcastTitle || !broadcastMessage || isSending}
              >
                <Text style={styles.sendBtnText}>{isSending ? 'Enviando...' : 'Publicar Anuncio Global 🚀'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 8,
  },
  kpiIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIcon: {
    fontSize: 20,
  },
  kpiValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  kpiLabel: {
    color: '#8A8A8A',
    fontSize: 12,
  },
  chartSection: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  chartTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  barChart: {
    flexDirection: 'row',
    height: 150,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 10,
  },
  barColumn: {
    alignItems: 'center',
    width: 30,
    gap: 8,
  },
  barBackground: {
    height: 110,
    width: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    color: '#8A8A8A',
    fontSize: 10,
  },
  usersDistribution: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 16,
  },
  progressRow: {
    gap: 6,
  },
  progressLabel: {
    color: '#fff',
    fontSize: 14,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  
  // Broadcast Styles
  quickActions: {
    marginBottom: 8,
  },
  broadcastBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  broadcastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  broadcastIcon: {
    fontSize: 32,
  },
  broadcastBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  broadcastBtnSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#222',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 8, backgroundColor: '#222', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#AAA', fontWeight: 'bold' },
  modalBody: { padding: 20, gap: 16 },
  inputLabel: { color: '#AAA', fontSize: 14, fontWeight: '600', marginBottom: -8 },
  textInput: { backgroundColor: '#000', color: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333', fontSize: 16 },
  typeSelector: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#000', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  typeBtnActive: { backgroundColor: '#222' },
  typeText: { color: '#888', fontWeight: 'bold' },
  sendBtn: { backgroundColor: '#FF2D78', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  sendBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  activeBroadcastsSection: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  activeBroadcastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  activeBroadcastTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  activeBroadcastMsg: {
    color: '#888',
    fontSize: 12,
  },
  deactivateBtn: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  deactivateBtnText: {
    color: '#FF3B30',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
