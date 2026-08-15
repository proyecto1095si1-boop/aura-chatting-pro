import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { Image } from 'expo-image';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { auth, app, db } from '@/lib/firebase';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'reports'));
      const querySnapshot = await getDocs(q);
      const fetchedReports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })).filter(r => r.status !== 'resolved');
      
      // Sort by creation date if available
      fetchedReports.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setReports(fetchedReports);
    } catch (e) {
      console.error("Error fetching reports", e);
      // Removed mock fallback. Returns empty list if collection absent or no permissions
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleResolve = async (reportId: string, reportedUserId: string, actionType: string) => {
    console.log(`[Moderation] Handling report ${reportId} against user ${reportedUserId} with action ${actionType}`);
    
    if (!reportedUserId || reportedUserId === 'N/A') {
      console.warn("[Moderation] Cannot take action: reportedUserId is missing.");
      Alert.alert('Atención', 'Este reporte no tiene un ID de usuario válido para sancionar.');
      
      // Still allow marking as resolved (Ignorar) if needed
      if (actionType === 'Ignorar') {
         try {
           await updateDoc(doc(db, 'reports', reportId), { status: 'resolved', resolution: 'Ignorar' });
           setReports(reports.filter(r => r.id !== reportId));
         } catch (err) { console.error(err); }
      }
      return;
    }

    try {
      const userRef = doc(db, 'profiles', reportedUserId);
      const reportRef = doc(db, 'reports', reportId);
      
      let banDate: Date | null = null;
      let reason = 'Violación de políticas de comunidad';

      if (actionType === 'Aviso') {
         // Potential future feature: Send notification
         Alert.alert('Acción', 'Se ha registrado un aviso para el usuario.');
      } else if (actionType === '1 Hora') {
          banDate = new Date();
          banDate.setHours(banDate.getHours() + 1);
      } else if (actionType === '1 Día') {
          banDate = new Date();
          banDate.setDate(banDate.getDate() + 1);
      } else if (actionType === '1 Semana') {
          banDate = new Date();
          banDate.setDate(banDate.getDate() + 7);
      } else if (actionType === 'Permanente') {
          banDate = new Date(2099, 0, 1); 
      }

      if (banDate) {
        console.log(`[Moderation] Applying ban until ${banDate.toISOString()}`);
        await updateDoc(userRef, {
          banExpiresAt: banDate.toISOString(),
          banReason: reason,
          banned: true
        });
        Alert.alert('Éxito', `Usuario suspendido hasta ${banDate.toLocaleString()}`);
      }

      // Mark report as resolved
      await updateDoc(reportRef, {
        status: 'resolved',
        resolution: actionType,
        resolvedAt: new Date().toISOString(),
        resolvedBy: auth.currentUser?.email || 'admin'
      });
      
      setReports(reports.filter(r => r.id !== reportId));

    } catch (e: any) {
      console.error("Moderation action failed:", e);
      Alert.alert('Error', 'No se pudo completar la acción: ' + (e.message || 'Error de conexión'));
    }
  };

  return (
    <ScreenContainer edges={['left', 'right']} containerClassName="bg-[#0A0A0A]">
      <View style={styles.header}>
        <Text style={styles.title}>Centro de Moderación</Text>
        <Text style={styles.subtitle}>Supervisa los reportes de los usuarios y toma acciones.</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8A2BE2" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {reports.length === 0 ? (
            <Text style={styles.emptyText}>No hay reportes pendientes. ¡Todo en orden! 🎉</Text>
          ) : (
            reports.map((report, idx) => {
              const isDeletionRequest = report.type === 'account_deletion';
              const isUserProblem = report.type === 'user_problem';
              const isAppeal = report.type === 'appeal';
              
              return (
                <Animated.View key={report.id} entering={FadeInDown.delay(idx * 100).duration(400)} style={[
                  styles.reportCard,
                  isDeletionRequest && { borderColor: '#B71C1C', borderWidth: 2 },
                  isUserProblem && { borderColor: '#1E88E5', borderWidth: 2 },
                  isAppeal && { borderColor: '#4CAF50', borderWidth: 2 }
                ]}>
                  {!isDeletionRequest && !isUserProblem && !isAppeal && <Image source={{ uri: report.evidencePhoto }} style={styles.evidenceImage} />}
                  
                  <View style={styles.reportInfo}>
                    <Text style={[
                      styles.reportReason, 
                      isDeletionRequest && { color: '#FF2D78' },
                      isUserProblem && { color: '#2196F3' },
                      isAppeal && { color: '#4CAF50' }
                    ]}>
                      {isDeletionRequest ? '⚠️ SOLICITUD DE BORRADO' : 
                       isUserProblem ? `🛠️ PROBLEMA: ${report.category}` :
                       isAppeal ? '⚖️ RECLAMO DE BANEO' :
                       `Motivo: ${report.reason}`}
                    </Text>
                    
                    {isDeletionRequest ? (
                      <View style={{ gap: 4 }}>
                        <Text style={styles.reportUsers}>
                          Usuario: <Text style={styles.targetUser}>{report.reporterName}</Text>
                        </Text>
                        <Text style={styles.reportUsers}>
                          ID: <Text style={{ color: '#8A8A8A', fontSize: 10 }}>{report.reporterId}</Text>
                        </Text>
                        <Text style={{ color: '#FFD700', fontSize: 12, marginTop: 4, fontWeight: 'bold' }}>
                          Plazo de 7 días iniciado. Borrado definitivo solicitado.
                        </Text>
                      </View>
                    ) : isUserProblem ? (
                      <View style={{ gap: 4, marginTop: 4 }}>
                        <Text style={styles.reportUsers}>
                          Remitente: <Text style={styles.targetUser}>{report.reporterName}</Text>
                        </Text>
                        <Text style={styles.reportUsers}>
                          ID Remitente: <Text style={{ color: '#8A8A8A', fontSize: 10 }}>{report.reporterId}</Text>
                        </Text>
                        <View style={{ backgroundColor: '#161616', padding: 12, borderRadius: 8, marginTop: 6 }}>
                          <Text style={{ color: '#E0E0E0', fontSize: 14 }}>{report.description}</Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.reportUsers}>
                          Reportado por: <Text style={styles.targetUser}>{report.reporterName || report.reporterId || report.reportedBy || 'Anónimo'}</Text>
                        </Text>
                        <Text style={styles.reportUsers}>
                          ID Reportante: <Text style={{ color: '#8A8A8A', fontSize: 11 }}>{report.reporterId || 'N/A'}</Text>
                        </Text>
                        
                        <View style={{ height: 1, backgroundColor: '#222', marginVertical: 8 }} />

                        <Text style={styles.reportUsers}>
                          Denunciado: <Text style={styles.badUser}>{report.reportedUserName || 'Sin nombre'}</Text>
                        </Text>
                        <Text style={styles.reportUsers}>
                          ID Denunciado: <Text style={{ color: '#FF6B35', fontSize: 11, fontWeight: 'bold' }}>{report.reportedUserId || 'N/A'}</Text>
                        </Text>
                        <View style={{ backgroundColor: '#000', padding: 12, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#333' }}>
                           <Text style={{ color: '#E0E0E0', fontSize: 13, fontStyle: 'italic' }}>
                              "{report.description || 'Sin comentarios adicionales.'}"
                           </Text>
                        </View>
                      </>
                    )}
                  </View>

                  <View style={[styles.actions, { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
                    {isDeletionRequest ? (
                      <>
                        <Pressable 
                          onPress={() => {
                            Alert.alert(
                              "Confirmar Borrado Total",
                              "¿Estás seguro? Esta acción borrará el documento del perfil de forma permanente e irreversible.",
                              [
                                { text: "Cancelar", style: "cancel" },
                                { 
                                  text: "BORRAR TODO", 
                                  style: "destructive", 
                                  onPress: async () => {
                                    try {
                                      await deleteDoc(doc(db, 'profiles', report.reporterId));
                                      await updateDoc(doc(db, 'reports', report.id), { status: 'resolved', resolvedAt: new Date().toISOString() });
                                      setReports(reports.filter(r => r.id !== report.id));
                                      Alert.alert("Éxito", "Cuenta eliminada correctamente.");
                                    } catch (e) {
                                      Alert.alert("Error", "No se pudo borrar la cuenta.");
                                    }
                                  }
                                }
                              ]
                            );
                          }} 
                          style={[styles.actionBtn, { backgroundColor: '#B71C1C', flex: 2 }]}
                        >
                          <Text style={styles.actionText}>🗑️ EJECUTAR BORRADO DEFINITIVO</Text>
                        </Pressable>
                        <Pressable 
                          onPress={() => handleResolve(report.id, report.reporterId, 'Ignorar')} 
                          style={[styles.actionBtn, { backgroundColor: '#2A2A2A', flex: 1 }]}
                        >
                          <Text style={styles.actionText}>Cerrar Ticket</Text>
                        </Pressable>
                      </>
                    ) : isAppeal ? (
                      <>
                        <Pressable 
                          onPress={async () => {
                            try {
                              const userRef = doc(db, 'profiles', report.reportedUserId);
                              await updateDoc(userRef, {
                                banned: false,
                                banExpiresAt: null,
                                banReason: null
                              });
                              await updateDoc(doc(db, 'reports', report.id), { status: 'resolved', resolvedAt: new Date().toISOString() });
                              setReports(reports.filter(r => r.id !== report.id));
                              Alert.alert("Éxito", "Suspensión levantada correctamente.");
                            } catch (e) {
                              Alert.alert("Error", "No se pudo levantar el baneo.");
                            }
                          }} 
                          style={[styles.actionBtn, { backgroundColor: '#4CAF50', width: '60%' }]}
                        >
                          <Text style={styles.actionText}>✅ QUITAR SUSPENSIÓN</Text>
                        </Pressable>
                        <Pressable 
                          onPress={() => handleResolve(report.id, report.reportedUserId, 'Ignorar')} 
                          style={[styles.actionBtn, { backgroundColor: '#2A2A2A', width: '35%' }]}
                        >
                          <Text style={styles.actionText}>Mantener Ban</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Pressable onPress={() => handleResolve(report.id, report.reportedUserId, 'Ignorar')} style={[styles.actionBtn, { backgroundColor: '#2A2A2A', width: '30%' }]}>
                          <Text style={styles.actionText}>Ignorar</Text>
                        </Pressable>
                        <Pressable onPress={() => handleResolve(report.id, report.reportedUserId, '1 Hora')} style={[styles.actionBtn, { backgroundColor: '#FF8C00', width: '30%' }]}>
                          <Text style={styles.actionText}>1 Hora</Text>
                        </Pressable>
                        <Pressable onPress={() => handleResolve(report.id, report.reportedUserId, '1 Día')} style={[styles.actionBtn, { backgroundColor: '#D84315', width: '30%' }]}>
                          <Text style={styles.actionText}>1 Día</Text>
                        </Pressable>
                        <Pressable onPress={() => handleResolve(report.id, report.reportedUserId, '1 Semana')} style={[styles.actionBtn, { backgroundColor: '#C62828', width: '45%' }]}>
                          <Text style={styles.actionText}>1 Semana</Text>
                        </Pressable>
                        <Pressable onPress={() => handleResolve(report.id, report.reportedUserId, 'Permanente')} style={[styles.actionBtn, { backgroundColor: '#B71C1C', width: '45%' }]}>
                          <Text style={styles.actionText}>🛑 Ban Permanente</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </Animated.View>
              );
            })
          )}
          <View style={{height: 40}} />
        </ScrollView>
      )}
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
  list: {
    padding: 20,
    gap: 20,
  },
  emptyText: {
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  reportCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  evidenceImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#2A2A2A',
  },
  reportInfo: {
    padding: 16,
    gap: 8,
  },
  reportReason: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reportUsers: {
    color: '#8A8A8A',
    fontSize: 14,
  },
  targetUser: {
    color: '#4FC3F7',
    fontWeight: '600',
  },
  badUser: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
