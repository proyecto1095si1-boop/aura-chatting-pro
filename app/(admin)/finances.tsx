import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function AdminFinances() {
  const [premiumUsers, setPremiumUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPremium() {
      try {
        const q = query(collection(db, 'profiles'), where('subscription', 'in', ['gold', 'elite']));
        const querySnapshot = await getDocs(q);

        const subscribers = querySnapshot.docs.map((docSnap) => {
           const u = docSnap.data();
           return {
             id: docSnap.id,
             user: u.name || 'Usuario',
             email: u.email || 'Sin email',
             type: u.subscription === 'elite' ? 'Suscripción Premium' : 'Suscripción Golden',
             date: new Date().toISOString().split('T')[0],
             status: 'Activo'
           };
        });
        
        setPremiumUsers(subscribers);
      } catch (e: any) {
        console.warn("Error fetching premium users (Firestore)", e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPremium();
  }, []);

  return (
    <ScreenContainer edges={['left', 'right']} containerClassName="bg-[#0A0A0A]">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Finanzas y Suscripciones</Text>
          <Text style={styles.subtitle}>Supervisa los ingresos generados por los usuarios.</Text>
        </View>

        {/* Resumen Rápid */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.summaryContainer}>
          <LinearGradient
            colors={['#FFD700', '#FF8C00'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryLabel}>Suscriptores Golden</Text>
            <Text style={styles.summaryValue}>{premiumUsers.filter(u => u.type.includes('Golden')).length}</Text>
          </LinearGradient>
          <LinearGradient
            colors={['#8A2BE2', '#4FC3F7'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryLabel}>Suscriptores Premium</Text>
            <Text style={styles.summaryValue}>{premiumUsers.filter(u => u.type.includes('Premium')).length}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Lista de Transacciones */}
        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Suscriptores Activos (Últimas actualiz.)</Text>
        </View>
        
        {loading ? (
          <ActivityIndicator color="#FFD700" size="large" style={{ marginTop: 20 }} />
        ) : premiumUsers.length === 0 ? (
          <Text style={{color: '#8A8A8A', textAlign: 'center', marginTop: 20}}>No hay usuarios con suscripciones activas.</Text>
        ) : (
          <View style={styles.list}>
            {premiumUsers.map((tx, idx) => (
              <Animated.View key={tx.id} entering={FadeInDown.delay(100 + idx * 50).duration(400)} style={styles.txCard}>
                <View style={styles.txIconContainer}>
                  <Text style={styles.txIcon}>{tx.type.includes('Premium') ? '💎' : '👑'}</Text>
                </View>
                <View style={[styles.txInfo, { flex: 1 }]}>
                  <Text style={styles.txUser}>{tx.user} <Text style={styles.txEmail}>({tx.email})</Text></Text>
                  <Text style={styles.txType}>{tx.type}</Text>
                </View>
                <View style={styles.txAmountContainer}>
                   <Text style={[styles.txStatus, { color: '#4CAF50', fontWeight: 'bold' }]}>{tx.status}</Text>
                   <Text style={styles.txDate}>{tx.date}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        )}
        <View style={{height: 48}} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#8A8A8A',
    fontSize: 14,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    gap: 8,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  transactionsHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  txCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  txIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIcon: {
    fontSize: 24,
  },
  txInfo: {
    flex: 1,
    gap: 4,
  },
  txUser: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  txEmail: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: 'normal',
  },
  txType: {
    color: '#4FC3F7',
    fontSize: 13,
    fontWeight: '600',
  },
  txDate: {
    color: '#8A8A8A',
    fontSize: 11,
  },
  txAmountContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  txStatus: {
    color: '#8A8A8A',
    fontSize: 10,
    textTransform: 'uppercase',
  },
});
