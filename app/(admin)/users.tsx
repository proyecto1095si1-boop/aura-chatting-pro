import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, Modal, FlatList, Platform } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where, orderBy, limit, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { useAuth } from '@/lib/auth-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'chats' | 'reports'>('info');
  const [userMatches, setUserMatches] = useState<any[]>([]);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  
  // Ban States
  const [showBanOptions, setShowBanOptions] = useState(false);
  const [banDuration, setBanDuration] = useState<number | 'perm'>(7);
  const [banReason, setBanReason] = useState<string>('Incumplimiento de Términos');
  const [customReason, setCustomReason] = useState('');
  const [reasonStep, setReasonStep] = useState(false);
  
  // Subscription States
  const [showSubOptions, setShowSubOptions] = useState(false);

  const BAN_REASONS = [
    'Acoso / Hostigamiento',
    'Spam / Publicidad',
    'Perfil Falso / Catfishing',
    'Lenguaje Ofensivo / Odio',
    'Contenido Sexual Inapropiado',
    'Estafa / Fraude',
    'Menor de Edad',
    'Suplantación de Identidad',
    'Comportamiento Agresivo',
    'Incumplimiento de Términos',
    'Otro (Manual)'
  ];

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'profiles'));
      const fetchedUsers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((u: any) => u.role !== 'admin'); // Don't show other admins/self
      setUsers(fetchedUsers || []);
    } catch (e: any) {
      console.error("Error fetching users", e);
      Alert.alert("Error Firestore", "No se pudieron obtener los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUserMatches = async (userId: string) => {
    try {
      setLoadingMatches(true);
      // Removed orderBy to avoid index requirement
      const q = query(
        collection(db, 'matches'),
        where('participants', 'array-contains', userId),
        limit(20)
      );
      const snap = await getDocs(q);
      const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in memory
      const sortedMatches = matches.sort((a, b) => {
        const timeA = a.lastMessageTime?.seconds || 0;
        const timeB = b.lastMessageTime?.seconds || 0;
        return timeB - timeA;
      });
      setUserMatches(sortedMatches);
    } catch (e) {
      console.error("Error fetching matches", e);
    } finally {
      setLoadingMatches(false);
    }
  };

  const fetchUserReports = async (userId: string) => {
    try {
      // Query 1: Reports AGAINST this user
      const q1 = query(
        collection(db, 'reports'),
        where('reportedUserId', '==', userId)
      );
      
      // Query 2: Reports MADE BY this user
      const q2 = query(
        collection(db, 'reports'),
        where('reporterId', '==', userId)
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const reportsAgainst = snap1.docs.map(d => ({ id: d.id, ...d.data(), type: 'received' }));
      const reportsBy = snap2.docs.map(d => ({ id: d.id, ...d.data(), type: 'made' }));
      
      const allReports = [...reportsAgainst, ...reportsBy];

      // Sort in memory
      const sortedReports = allReports.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setUserReports(sortedReports);
    } catch (e) {
      console.error("Error fetching user reports", e);
    }
  };

  const handleApplyBan = async () => {
    if (Platform.OS === 'web') console.log("handleApplyBan triggered");
    
    if (!selectedUser) {
       if (Platform.OS === 'web') window.alert("Error interno: No se ha seleccionado usuario.");
       return;
    }

    const finalReason = banReason === 'Otro (Manual)' ? customReason : banReason;
    
    if (!finalReason || finalReason.trim() === '') {
       Alert.alert("Atención", "Debes seleccionar o escribir un motivo para la sanción.");
       return;
    }

    try {
      console.log(`[Admin] Calculating ban expiry for duration: ${banDuration}`);
      
      let expiry = null;
      const days = banDuration === 'perm' ? 36500 : Number(banDuration);
      expiry = new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toISOString();

      console.log(`[Admin] Attempting Firestore update for user: ${selectedUser.id}`);

      // 1. DATABASE UPDATE FIRST
      await updateDoc(doc(db, 'profiles', selectedUser.id), { 
        banned: true,
        banExpiresAt: expiry,
        banReason: finalReason
      });

      console.log("[Admin] Firestore update successful");

      // 2. UPDATE UI
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, banned: true, banReason: finalReason, banExpiresAt: expiry } : u));
      setSelectedUser(prev => prev ? { ...prev, banned: true, banReason: finalReason, banExpiresAt: expiry } : null);
      
      setShowBanOptions(false);
      setReasonStep(false);
      
      if (Platform.OS === 'web') window.alert("¡Sanción aplicada con éxito!");
      else Alert.alert('Éxito', `Usuario sancionado correctamente.`);
      
    } catch (e: any) {
      console.error("[Admin] Ban action failed:", e);
      const msg = e.message || 'Error desconocido';
      if (Platform.OS === 'web') window.alert("Error de Permisos/Firestore: " + msg);
      else Alert.alert('Error', 'No se pudo aplicar el baneo: ' + msg);
    }
  };

  const handleToggleBan = async (userId: string, currentBanStatus: boolean) => {
    if (!currentBanStatus) {
       setShowBanOptions(true);
       setReasonStep(false);
    } else {
      // Lift ban
      try {
        console.log(`[Admin] Lifting ban for user: ${userId}`);
        
        // 1. DATABASE UPDATE
        await updateDoc(doc(db, 'profiles', userId), { 
          banned: false, 
          banExpiresAt: null,
          banReason: null 
        });

        console.log("[Admin] Ban lifted successfully in Firestore");

        // 2. UPDATE UI
        setUsers(users.map(u => u.id === userId ? { ...u, banned: false, banExpiresAt: null, banReason: null } : u));
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, banned: false, banExpiresAt: null, banReason: null });
        }
        
        if (Platform.OS === 'web') window.alert("Usuario desbloqueado.");
        else Alert.alert('Éxito', 'El baneo ha sido levantado.');
      } catch (e: any) {
        console.error("[Admin] Unban failed:", e);
        Alert.alert('Error', 'No se pudo levantar el baneo: ' + e.message);
      }
    }
  };

  const handleVerify = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'profiles', userId), { verified: true, verificationStatus: 'verified' });
      setUsers(users.map(u => u.id === userId ? { ...u, verified: true } : u));
      if (selectedUser?.id === userId) setSelectedUser({ ...selectedUser, verified: true });
      Alert.alert('Éxito', 'Insignia azul otorgada');
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo verificar la cuenta.');
    }
  };

  const handleGiveSub = async (plan: 'free' | 'plus' | 'gold' | 'elite') => {
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, 'profiles', selectedUser.id), { 
        subscription: plan,
        // Si es free, limpiamos el origen para que Google Play pueda gestionarlo
        // Si es cualquier otro plan, lo marcamos como regalo del admin para protegerlo
        subscriptionSource: plan === 'free' ? null : 'admin',
        updatedAt: serverTimestamp()
      });
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, subscription: plan } : u));
      setSelectedUser({ ...selectedUser, subscription: plan });
      setShowSubOptions(false);
      const msg = plan === 'free' 
        ? 'Suscripción revocada. El usuario vuelve al plan gratuito.' 
        : `Usuario actualizado a ${plan.toUpperCase()} (permanente hasta que lo revoques)`;
      Alert.alert('Éxito', msg);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo actualizar la suscripción.');
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedUser) return;

    const executeDelete = async () => {
      try {
        if (Platform.OS === 'web') console.log("Borrando usuario y fotos...");
        // 1. Borrar todas las fotos del Storage
        if (selectedUser.photos && Array.isArray(selectedUser.photos)) {
          for (const photoUrl of selectedUser.photos) {
            if (photoUrl && photoUrl.includes('firebasestorage')) {
              try {
                const photoRef = ref(storage, photoUrl);
                await deleteObject(photoRef);
                console.log(`[Admin] Foto borrada: ${photoUrl}`);
              } catch (err) {
                console.log(`[Admin] Ignorando foto no encontrada o error: ${photoUrl}`);
              }
            }
          }
        }

        // 2. Borrar documento base de Firestore
        await deleteDoc(doc(db, 'profiles', selectedUser.id));
        console.log("[Admin] Documento de perfil eliminado");

        // 3. Actualizar UI
        setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
        setModalVisible(false);
        setSelectedUser(null);
        
        if (Platform.OS === 'web') window.alert("Usuario y sus fotos eliminados con éxito.");
        else Alert.alert('Éxito', `Cuenta de usuario y fotos destruidas.`);
      } catch (e: any) {
        console.error("[Admin] Delete profile failed:", e);
        if (Platform.OS === 'web') window.alert("Error borrando cuenta: " + e.message);
        else Alert.alert('Error', 'No se pudo eliminar la cuenta: ' + e.message);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`¿Estás absolutamente seguro de que quieres eliminar la cuenta de ${selectedUser.name || selectedUser.email}? Esta acción borrará permanentemente sus datos y todas sus fotos.`);
      if (confirmed) {
        await executeDelete();
      }
    } else {
      Alert.alert(
        "Eliminación Total y Definitiva",
        `¿Estás absolutamente seguro de que quieres eliminar la cuenta de ${selectedUser.name || selectedUser.email}? Esta acción borrará permanentemente sus datos y todas sus fotos.`,
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Sí, Eliminar Todo 🔥", 
            style: "destructive",
            onPress: executeDelete
          }
        ]
      );
    }
  };

  const openUserDetail = (user: any) => {
    setSelectedUser(user);
    setActiveTab('info');
    setModalVisible(true);
    fetchUserMatches(user.id);
    fetchUserReports(user.id);
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScreenContainer edges={['left', 'right']} containerClassName="bg-[#0A0A0A]">
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Usuarios</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o email..."
          placeholderTextColor="#8A8A8A"
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.statsRow}>
           <View style={styles.statBox}>
              <Text style={styles.statNumber}>{users.length}</Text>
              <Text style={styles.statLabel}>Total Reales</Text>
           </View>
           <View style={styles.statBox}>
              <Text style={styles.statNumber}>{users.filter(u => u.verified).length}</Text>
              <Text style={styles.statLabel}>Verificados ✓</Text>
           </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8A2BE2" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filteredUsers.map((user, idx) => (
            <Animated.View key={user.id} entering={FadeInDown.delay(idx * 50).duration(400)}>
              <Pressable onPress={() => openUserDetail(user)} style={styles.userCard}>
                <Image source={{ uri: user.photos?.[0] || 'https://via.placeholder.com/150' }} style={styles.avatar} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {user.name || 'Sin Nombre'} {user.verified ? '✓' : ''}
                  </Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.badges}>
                    <Text style={styles.planBadge}>{user.subscription || 'free'}</Text>
                    {user.banned && <Text style={styles.bannedBadge}>Baneado</Text>}
                  </View>
                </View>
                <Text style={{color: '#8A2BE2', fontSize: 20}}>›</Text>
              </Pressable>
            </Animated.View>
          ))}
          <View style={{height: 40}} />
        </ScrollView>
      )}

      {/* User Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Pressable 
                onPress={() => {
                  if (showBanOptions) {
                    setShowBanOptions(false);
                    setReasonStep(false);
                  } else if (showSubOptions) {
                    setShowSubOptions(false);
                  } else {
                    setModalVisible(false);
                  }
                }} 
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
              <Text style={styles.modalTitle}>
                {showBanOptions ? 'Configurar Sanción' : showSubOptions ? 'Otorgar suscripción' : 'Detalles del Usuario'}
              </Text>
              <View style={{width: 40}} />
            </View>

            {selectedUser && (
              <>
                {/* Tabs (Hidden if in Mode) */}
                {!showBanOptions && !showSubOptions && (
                  <View style={styles.tabsRow}>
                    <Pressable onPress={() => setActiveTab('info')} style={[styles.tab, activeTab === 'info' && styles.tabActive]}>
                      <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Información</Text>
                    </Pressable>
                    <Pressable onPress={() => setActiveTab('chats')} style={[styles.tab, activeTab === 'chats' && styles.tabActive]}>
                      <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>Chats</Text>
                    </Pressable>
                    <Pressable onPress={() => setActiveTab('reports')} style={[styles.tab, activeTab === 'reports' && styles.tabActive]}>
                      <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>Denuncias</Text>
                    </Pressable>
                  </View>
                )}

                <ScrollView style={styles.modalBody}>
                  {showBanOptions ? (
                    // INTEGRATED BAN INTERFACE
                    <View style={{ paddingBottom: 40 }}>
                       {!reasonStep ? (
                          <>
                             <Text style={styles.sectionTitle}>1. Selecciona Duración</Text>
                             <View style={styles.banTimeGrid}>
                                {[
                                  { label: '24 Horas', val: 1 },
                                  { label: '2 Días', val: 2 },
                                  { label: '7 Días', val: 7 },
                                  { label: '30 Días', val: 30 },
                                  { label: '60 Días', val: 60 },
                                  { label: '90 Días', val: 90 },
                                  { label: 'PERMANENTE', val: 'perm' },
                                ].map(t => (
                                   <Pressable 
                                     key={t.label} 
                                     style={[styles.timeBtn, banDuration === t.val && styles.timeBtnActive]}
                                     onPress={() => setBanDuration(t.val as any)}
                                   >
                                      <Text style={[styles.timeBtnText, banDuration === t.val && styles.timeBtnTextActive]}>{t.label}</Text>
                                   </Pressable>
                                ))}
                             </View>
                             <Pressable style={styles.nextBtn} onPress={() => setReasonStep(true)}>
                                <Text style={styles.nextBtnText}>Siguiente: Motivo ›</Text>
                             </Pressable>
                          </>
                       ) : (
                          <>
                             <Text style={styles.sectionTitle}>2. Motivo del Baneo</Text>
                             <View style={{ gap: 8 }}>
                                {BAN_REASONS.map(r => (
                                   <Pressable 
                                     key={r} 
                                     style={[styles.reasonItem, banReason === r && styles.reasonItemActive]}
                                     onPress={() => setBanReason(r)}
                                   >
                                      <View style={[styles.radio, banReason === r && styles.radioActive]} />
                                      <Text style={[styles.reasonItemText, banReason === r && styles.reasonItemTextActive]}>{r}</Text>
                                   </Pressable>
                                ))}
                             </View>

                             {banReason === 'Otro (Manual)' && (
                                <TextInput 
                                   style={styles.customReasonInput}
                                   placeholder="Escribe el motivo detallado..."
                                   placeholderTextColor="#666"
                                   value={customReason}
                                   onChangeText={setCustomReason}
                                   multiline
                                />
                             )}

                             <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                                <Pressable style={[styles.nextBtn, { flex: 1, backgroundColor: '#333' }]} onPress={() => setReasonStep(false)}>
                                   <Text style={styles.nextBtnText}>‹ Volver</Text>
                                </Pressable>
                                <Pressable style={[styles.nextBtn, { flex: 2, backgroundColor: '#FF3B30' }]} onPress={handleApplyBan}>
                                   <Text style={styles.nextBtnText}>Aplicar Sanción 🔥</Text>
                                </Pressable>
                             </View>
                          </>
                       )}
                    </View>
                  ) : showSubOptions ? (
                    // GIFT SUBSCRIPTION INTERFACE
                    <View style={{ gap: 16 }}>
                      <Text style={styles.sectionTitle}>Selecciona un Plan para {selectedUser.name}</Text>
                      {[
                        { id: 'plus', label: 'Aura Plus', colors: ['#4FC3F7', '#29B6F6'], desc: 'Likes ilimitados y Rewind' },
                        { id: 'gold', label: 'Aura Gold', colors: ['#FFD700', '#FF8C00'], desc: 'Ver quién te dio like' },
                        { id: 'elite', label: 'Aura Elite', colors: ['#FF2D78', '#FF6B35'], desc: 'Prioridad y Mensajes directos' },
                        { id: 'free', label: 'Básico (Gratis)', colors: ['#333', '#444'], desc: 'Remover suscripción actual' },
                      ].map(plan => (
                        <Pressable key={plan.id} onPress={() => handleGiveSub(plan.id as any)}>
                          <LinearGradient
                            colors={plan.colors as any}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.planGiftCard}
                          >
                             <View>
                               <Text style={styles.planGiftTitle}>{plan.label}</Text>
                               <Text style={styles.planGiftDesc}>{plan.desc}</Text>
                             </View>
                             <Text style={styles.planGiftIcon}>🎁</Text>
                          </LinearGradient>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <>
                      {activeTab === 'info' && (
                        <Animated.View entering={FadeInUp}>
                          <View style={styles.infoCard}>
                            <Image source={{ uri: selectedUser.photos?.[0] }} style={styles.largeAvatar} />
                            <Text style={styles.detailName}>{selectedUser.name}, {selectedUser.age}</Text>
                            <Text style={styles.detailEmail}>{selectedUser.email}</Text>
                            
                            <View style={styles.detailGrid}>
                              <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Suscripción</Text>
                                <Text style={[styles.detailValue, {color: '#FFD700'}]}>{selectedUser.subscription?.toUpperCase() || 'FREE'}</Text>
                              </View>
                              <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Verificado</Text>
                                <Text style={[styles.detailValue, {color: selectedUser.verified ? '#4FC3F7' : '#8A8A8A'}]}>
                                  {selectedUser.verified ? 'SÍ ✓' : 'NO'}
                                </Text>
                              </View>
                              <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Estado</Text>
                                <Text style={[styles.detailValue, {color: selectedUser.banned ? '#FF3B30' : '#4CAF50'}]}>
                                  {selectedUser.banned ? 'BANEADO' : 'ACTIVO'}
                                </Text>
                              </View>
                              <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Rol</Text>
                                <Text style={styles.detailValue}>{selectedUser.role?.toUpperCase() || 'USER'}</Text>
                              </View>
                            </View>

                            {selectedUser.banned && (
                               <View style={styles.banInfoBanner}>
                                  <Text style={styles.banBannerText}>⚠️ ESTE USUARIO ESTÁ BANEADO</Text>
                                  <Text style={styles.banBannerSub}>Motivo: {selectedUser.banReason || 'No especificado'}</Text>
                                  <Pressable onPress={() => handleToggleBan(selectedUser.id, true)} style={styles.unbanInlineBtn}>
                                     <Text style={styles.unbanInlineText}>Quitar Baneo ahora</Text>
                                  </Pressable>
                               </View>
                            )}

                            <View style={styles.modalActions}>
                              <Pressable onPress={() => handleVerify(selectedUser.id)} style={[styles.modalActionBtn, {backgroundColor: '#1DA1F2'}]}>
                                <Text style={styles.modalActionText}>Otorgar Verificación</Text>
                              </Pressable>
                              <Pressable onPress={() => handleToggleBan(selectedUser.id, selectedUser.banned)} style={[styles.modalActionBtn, {backgroundColor: selectedUser.banned ? '#4CAF50' : '#FF3B30'}]}>
                                <Text style={styles.modalActionText}>{selectedUser.banned ? 'Levantar Baneo (Luz Verde)' : 'Gestionar Sanción 🔥'}</Text>
                              </Pressable>
                              <Pressable onPress={() => setShowSubOptions(true)} style={[styles.modalActionBtn, {backgroundColor: '#FFD700'}]}>
                                <Text style={[styles.modalActionText, { color: '#000' }]}>Otorgar Suscripción 🎁</Text>
                              </Pressable>
                              <Pressable onPress={handleDeleteProfile} style={[styles.modalActionBtn, {backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#FF3B30'}]}>
                                <Text style={[styles.modalActionText, { color: '#FF3B30' }]}>Eliminar Cuenta y Fotos 🗑️</Text>
                              </Pressable>
                              <Pressable 
                                onPress={async () => {
                                  if (!currentUser?.uid || !selectedUser?.id) return;
                                  
                                  // Use real admin UID for the match, but mark as support
                                  const matchId = [selectedUser.id, currentUser.uid].sort().join('_');
                                  
                                  try {
                                    // Pre-create the match document to ensure it exists and is marked as support
                                    await setDoc(doc(db, 'matches', matchId), {
                                      participants: [selectedUser.id, currentUser.uid],
                                      createdAt: serverTimestamp(),
                                      isSupport: true,
                                      isOfficial: true,
                                      lastMessage: 'Chat de soporte iniciado.',
                                      lastMessageTime: serverTimestamp(),
                                      unreadCount: 0
                                    }, { merge: true });

                                    router.push(`/chat/${matchId}` as any);
                                    setModalVisible(false);
                                  } catch (e) {
                                    console.error("Error creating support match:", e);
                                    Alert.alert("Error", "No se pudo iniciar el chat de soporte.");
                                  }
                                }} 
                                style={[styles.modalActionBtn, {backgroundColor: '#007AFF'}]}
                              >
                                <Text style={styles.modalActionText}>Enviar Mensaje Soporte</Text>
                              </Pressable>
                            </View>
                          </View>
                        </Animated.View>
                      )}

                      {activeTab === 'chats' && (
                        <Animated.View entering={FadeInUp}>
                          <Text style={styles.sectionTitle}>Conversaciones Privadas</Text>
                          {loadingMatches ? (
                            <ActivityIndicator color="#8A2BE2" />
                          ) : userMatches.length > 0 ? (
                            userMatches.map(match => (
                              <Pressable 
                                key={match.id} 
                                style={styles.matchItem}
                                onPress={() => {
                                  router.push(`/chat/${match.id}` as any);
                                  setModalVisible(false);
                                }}
                              >
                                <View style={styles.matchIcon}>
                                  <Text style={{fontSize: 20}}>💬</Text>
                                </View>
                                <View style={{flex: 1}}>
                                  <Text style={styles.matchIdText}>Chat ID: {match.id}</Text>
                                  <Text style={styles.matchLastMsg} numberOfLines={1}>{match.lastMessage}</Text>
                                </View>
                                <Text style={styles.matchArrow}>👁️</Text>
                              </Pressable>
                            ))
                          ) : (
                            <Text style={styles.emptyText}>No hay chats activos actualmente.</Text>
                          )}
                        </Animated.View>
                      )}

                      {activeTab === 'reports' && (
                        <Animated.View entering={FadeInUp}>
                          <Text style={styles.sectionTitle}>Historial de Denuncias</Text>
                          {userReports.length > 0 ? (
                            userReports.map(report => (
                              <View key={report.id} style={[styles.reportCard, { marginBottom: 12, borderColor: report.type === 'received' ? '#FF3B3040' : '#8A2BE240' }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                  <Text style={styles.reportTitle}>Motivo: {report.reason}</Text>
                                  <View style={[styles.typeBadge, { backgroundColor: report.type === 'received' ? '#FF3B3020' : '#8A2BE220' }]}>
                                    <Text style={[styles.typeBadgeText, { color: report.type === 'received' ? '#FF3B30' : '#8A2BE2' }]}>
                                      {report.type === 'received' ? 'RECIBIDA' : 'REALIZADA'}
                                    </Text>
                                  </View>
                                </View>
                                <View style={{ backgroundColor: '#000', padding: 12, borderRadius: 8, marginVertical: 8 }}>
                                  <Text style={[styles.reportText, { color: '#FFF' }]}>"{report.description || 'Sin descripción'}"</Text>
                                </View>
                                <Text style={styles.reportText}>
                                  {report.type === 'received' ? 'Denunciante: ' : 'Denunciado: '} 
                                  <Text style={{ color: '#FF2D78' }}>
                                    {report.type === 'received' ? (report.reporterId || 'Anónimo') : (report.reportedUserId || 'N/A')}
                                  </Text>
                                </Text>
                                <Text style={styles.reportText}>Resolución: {report.resolution || 'Pendiente'}</Text>
                                <Text style={styles.reportText}>Fecha: {new Date(report.resolvedAt || report.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</Text>
                                
                                {report.status === 'resolved' && (
                                  <View style={[styles.resolutionBadge, { backgroundColor: '#4CAF5020' }]}>
                                    <Text style={[styles.resolutionText, { color: '#4CAF50' }]}>
                                      Acción: {report.resolution}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            ))
                          ) : (
                            <Text style={styles.emptyText}>No hay reportes para este usuario.</Text>
                          )}
                        </Animated.View>
                      )}
                    </>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, gap: 12 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  searchInput: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 12, color: '#fff', padding: 14, fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  statBox: { flex: 1, backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  statNumber: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#8A8A8A', fontSize: 12, marginTop: 4, textTransform: 'uppercase' },
  list: { padding: 20, gap: 16 },
  userCard: { backgroundColor: '#161616', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2A2A2A', flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2A2A2A' },
  userInfo: { flex: 1, gap: 4 },
  userName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userEmail: { color: '#8A8A8A', fontSize: 13 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 4 },
  planBadge: { backgroundColor: '#8A2BE220', color: '#8A2BE2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  bannedBadge: { backgroundColor: '#FF3B3020', color: '#FF3B30', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0A0A0A', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '90%', width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E1E1E', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#8A8A8A', fontSize: 18 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#8A2BE2' },
  tabText: { color: '#8A8A8A', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#8A2BE2' },
  modalBody: { flex: 1, padding: 20 },
  infoCard: { alignItems: 'center', gap: 12 },
  largeAvatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 8, borderWidth: 2, borderColor: '#8A2BE2' },
  detailName: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  detailEmail: { color: '#8A8A8A', fontSize: 14 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24, width: '100%' },
  detailItem: { width: '47%', backgroundColor: '#161616', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#2A2A2A' },
  detailLabel: { color: '#8A8A8A', fontSize: 10, marginBottom: 4, textTransform: 'uppercase' },
  detailValue: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  modalActions: { width: '100%', gap: 12, marginTop: 32 },
  modalActionBtn: { width: '100%', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  modalActionText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  
  // Chats Tab
  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  matchItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', padding: 16, borderRadius: 16, marginBottom: 12, gap: 12, borderWidth: 1, borderColor: '#2A2A2A' },
  matchIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  matchIdText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  matchLastMsg: { color: '#8A8A8A', fontSize: 12, marginTop: 2 },
  matchArrow: { fontSize: 18, color: '#8A8A8A' },
  emptyText: { color: '#8A8A8A', textAlign: 'center', marginTop: 40 },

  // Reports Tab
  reportCard: { backgroundColor: '#161616', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#2A2A2A' },
  reportTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  reportText: { color: '#8A8A8A', fontSize: 14, lineHeight: 20 },
  resolutionBadge: { backgroundColor: '#4CAF5020', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 16 },
  resolutionText: { color: '#4CAF50', fontSize: 12, fontWeight: '700' },
  
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '800' },
  
  // New Ban Styles
  banTimeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  timeBtn: { width: '47%', padding: 16, backgroundColor: '#161616', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', alignItems: 'center' },
  timeBtnActive: { borderColor: '#8A2BE2', backgroundColor: '#8A2BE220' },
  timeBtnText: { color: '#8A8A8A', fontWeight: 'bold' },
  timeBtnTextActive: { color: '#8A2BE2' },
  nextBtn: { backgroundColor: '#8A2BE2', padding: 18, borderRadius: 30, alignItems: 'center', marginTop: 24 },
  nextBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  reasonItem: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#161616', borderRadius: 12, marginBottom: 4, gap: 12 },
  reasonItemActive: { backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#333' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#444' },
  radioActive: { borderColor: '#FF3B30', backgroundColor: '#FF3B30' },
  reasonItemText: { color: '#8A8A8A', fontSize: 14 },
  reasonItemTextActive: { color: '#FFF', fontWeight: 'bold' },
  customReasonInput: { backgroundColor: '#000', color: '#FFF', padding: 16, borderRadius: 12, marginTop: 12, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#333' },
  
  // Ban Banner
  banInfoBanner: { width: '100%', backgroundColor: '#FF3B3020', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FF3B30', marginTop: 20, alignItems: 'center' },
  banBannerText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 13 },
  banBannerSub: { color: '#8A8A8A', fontSize: 11, marginTop: 4 },
  unbanInlineBtn: { marginTop: 12, backgroundColor: '#FF3B30', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  unbanInlineText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  
  // Gift Subscription Styles
  planGiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
    marginBottom: 4,
  },
  planGiftTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  planGiftDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  planGiftIcon: {
    fontSize: 24,
  },
});
