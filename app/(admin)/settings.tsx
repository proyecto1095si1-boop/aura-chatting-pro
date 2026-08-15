import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const PUSH_TEMPLATES = [
  { id: 'PROMO_WEEKEND', label: 'Promo Fin de Semana', icon: '🎉' },
  { id: 'NEW_MATCH', label: 'Animar a buscar Matches', icon: '❤️' },
  { id: 'WARNING_RULES', label: 'Recordatorio Normas', icon: '⚠️' },
  { id: 'MAINTENANCE_SOON', label: 'Mantenimiento en breve', icon: '🔧' },
  { id: 'DISCOUNT_50', label: 'Descuento 50% Limitado', icon: '💎' },
  { id: 'UPDATE_AVAILABLE', label: 'Actualización App', icon: '🚀' },
  { id: 'ACCOUNT_VERIFIED', label: 'Beneficios Verificados', icon: '🛡️' },
  { id: 'POPULAR_PROFILE', label: 'Perfil Popular', icon: '🔥' },
  { id: 'GIFT_LIKES', label: 'Regalo: +10 Likes', icon: '🎁' },
  { id: 'INACTIVE_USER', label: 'Te extrañamos (Inactivos)', icon: '👀' },
];
import { ScreenContainer } from '@/components/screen-container';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function AdminSettings() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [freeLikesLimit, setFreeLikesLimit] = useState('10');
  const [boostDuration, setBoostDuration] = useState('30');
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const docSnap = await getDoc(doc(db, 'system_settings', 'core'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMaintenanceMode(data.maintenanceMode ?? false);
          setFreeLikesLimit(String(data.freeLikesLimit ?? 10));
          setBoostDuration(String(data.boostDuration ?? 30));
          if (data.bannedWords && Array.isArray(data.bannedWords)) {
            setBannedWords(data.bannedWords);
          } else {
            // Default list if empty
            setBannedWords(['onlyfans', 'crypto', 'cripto', 'whatsapp', 'wa.me', 'telegram', 'fansly', 'escort', 'prepago', 'pago']);
          }
        }
      } catch (e) {
        console.warn("Error loading settings:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system_settings', 'core'), {
        maintenanceMode,
        freeLikesLimit: parseInt(freeLikesLimit, 10),
        boostDuration: parseInt(boostDuration, 10),
        bannedWords: bannedWords,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      Alert.alert('Éxito', 'Ajustes de sistema y Auto-Moderador guardados en vivo.');
    } catch (e) {
      Alert.alert('Error', 'No se pudieron guardar los ajustes.');
    } finally {
      setSaving(false);
    }
  };

  const addWord = () => {
    const word = newWord.trim().toLowerCase();
    if (word && !bannedWords.includes(word)) {
      setBannedWords([...bannedWords, word]);
      setNewWord('');
    }
  };

  const removeWord = (wordToRemove: string) => {
    setBannedWords(bannedWords.filter(w => w !== wordToRemove));
  };

  const handleSendPush = async () => {
    if (!selectedTemplate) {
      Alert.alert('Error', 'Selecciona una plantilla de la lista.');
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'system_settings', 'push_broadcast'), {
        templateId: selectedTemplate,
        sentAt: new Date().toISOString(),
        senderId: 'admin'
      });
      Alert.alert('Enviado', `Notificación global [${selectedTemplate}] disparada con éxito.`);
      setSelectedTemplate(null);
    } catch (e) {
      Alert.alert('Error', 'No se pudo disparar la notificación.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
     return <View style={styles.container}><ActivityIndicator color="#FF2D78" /></View>;
  }

  return (
    <ScreenContainer edges={['left', 'right']} containerClassName="bg-[#0A0A0A]">
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ajustes y Sistema</Text>
          <Text style={styles.subtitle}>Modifica parámetros en vivo sin actualizar la app.</Text>
        </View>

        {/* Global Settings */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Variables del Sistema</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.label}>Límites de "Me Gusta" Diarios</Text>
            <TextInput
              style={styles.numberInput}
              value={freeLikesLimit}
              onChangeText={setFreeLikesLimit}
              keyboardType="number-pad"
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.label}>Duración del Boost (minutos)</Text>
            <TextInput
              style={styles.numberInput}
              value={boostDuration}
              onChangeText={setBoostDuration}
              keyboardType="number-pad"
            />
          </View>

          <Pressable style={styles.saveBtn} onPress={handleSaveSettings} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar Ajustes</Text>}
          </Pressable>
        </Animated.View>

        {/* Auto-Moderator */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Auto-Moderador (Anti-Spam)</Text>
          <Text style={styles.subtitle}>Palabras que activan el bloqueo automático en el chat.</Text>
          
          <View style={styles.addWordRow}>
            <TextInput
              style={styles.addWordInput}
              value={newWord}
              onChangeText={setNewWord}
              placeholder="Nueva palabra..."
              placeholderTextColor="#666"
              onSubmitEditing={addWord}
            />
            <Pressable style={styles.addWordBtn} onPress={addWord}>
              <Text style={styles.addWordBtnText}>Añadir +</Text>
            </Pressable>
          </View>

          <View style={styles.chipsContainer}>
            {bannedWords.map(word => (
              <View key={word} style={styles.chip}>
                <Text style={styles.chipText}>{word}</Text>
                <Pressable onPress={() => removeWord(word)} style={styles.chipClose}>
                  <Text style={styles.chipCloseText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable style={[styles.saveBtn, {backgroundColor: '#FF3B30'}]} onPress={handleSaveSettings} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar Lista Anti-Spam</Text>}
          </Pressable>
        </Animated.View>

        {/* Maintenance Mode */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.card}>
          <View style={styles.maintenanceRow}>
            <View style={styles.maintenanceInfo}>
              <Text style={styles.cardTitle}>Modo Mantenimiento</Text>
              <Text style={styles.maintenanceDesc}>Apaga la app temporalmente. Solo tú (el admin) podrás entrar.</Text>
            </View>
            <Switch
              value={maintenanceMode}
              onValueChange={async (val) => {
                setMaintenanceMode(val);
                try {
                  await setDoc(doc(db, 'system_settings', 'core'), {
                    maintenanceMode: val,
                    updatedAt: new Date().toISOString()
                  }, { merge: true });
                } catch (e) {
                  Alert.alert('Error', 'No se pudo actualizar el modo mantenimiento.');
                  setMaintenanceMode(!val);
                }
              }}
              trackColor={{ false: '#3A3A3C', true: '#FF3B30' }}
              thumbColor={maintenanceMode ? '#FFFFFF' : '#8A8A8A'}
              style={{ transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] }}
            />
          </View>
        </Animated.View>

        {/* Push Notifications */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Push Templates Multilenguaje</Text>
          <Text style={styles.subtitle}>Selecciona una plantilla para enviar. La app del usuario la traducirá (es/en) y rellenará.</Text>
          <View style={styles.templateGrid}>
             {PUSH_TEMPLATES.map(tpl => (
                <Pressable 
                  key={tpl.id} 
                  style={[styles.templateBtn, selectedTemplate === tpl.id && styles.templateBtnActive]}
                  onPress={() => setSelectedTemplate(tpl.id)}
                >
                   <Text style={[styles.templateIcon, selectedTemplate === tpl.id && {opacity: 1}]}>{tpl.icon}</Text>
                   <Text style={[styles.templateLabel, selectedTemplate === tpl.id && styles.templateLabelActive]}>
                     {tpl.label}
                   </Text>
                </Pressable>
             ))}
          </View>
          <Pressable style={[styles.sendPushBtn, !selectedTemplate && { opacity: 0.5 }]} onPress={handleSendPush}>
            <Text style={styles.sendPushBtnText}>📢 Disparar Notificación Global</Text>
          </Pressable>
        </Animated.View>

        {/* Storage Cleanup */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Optimización de Almacenamiento</Text>
          <Text style={styles.subtitle}>Borra permanentemente de los servidores todas las fotos temporales que ya han sido destruidas.</Text>
          
          <Pressable 
            style={[styles.saveBtn, { backgroundColor: '#FF8C00' }]} 
            onPress={async () => {
              Alert.alert(
                "Confirmar Purga",
                "¿Estás seguro de que quieres borrar físicamente todas las fotos temporales ya vistas? Esta acción no se puede deshacer.",
                [
                  { text: "Cancelar", style: "cancel" },
                  { 
                    text: "Sí, Purgar Storage", 
                    onPress: async () => {
                      setSaving(true);
                      try {
                        await setDoc(doc(db, 'system_settings', 'storage_cleanup'), {
                          triggerAt: new Date().toISOString(),
                          triggeredBy: 'admin'
                        });
                        Alert.alert('Éxito', 'Proceso de limpieza iniciado en segundo plano.');
                      } catch (e) {
                        Alert.alert('Error', 'No se pudo iniciar la limpieza.');
                      } finally {
                        setSaving(false);
                      }
                    }
                  }
                ]
              );
            }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>🔥 Purgar Fotos Destruidas</Text>}
          </Pressable>
        </Animated.View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  header: {
    gap: 8,
    marginBottom: 8,
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
  card: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 16,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  label: {
    color: '#8A8A8A',
    fontSize: 16,
    flex: 1,
  },
  numberInput: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#4FC3F7',
    color: '#4FC3F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 80,
  },
  saveBtn: {
    backgroundColor: '#8A2BE2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  maintenanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  maintenanceInfo: {
    flex: 1,
    paddingRight: 16,
  },
  maintenanceDesc: {
    color: '#8A8A8A',
    fontSize: 14,
    marginTop: 4,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  templateBtn: {
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 8,
  },
  templateBtnActive: {
    borderColor: '#FF2D78',
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
  },
  templateIcon: {
    fontSize: 16,
    opacity: 0.7,
  },
  templateLabel: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  templateLabelActive: {
    color: '#FF2D78',
  },
  sendPushBtn: {
    backgroundColor: '#FF2D78',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  sendPushBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addWordRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  addWordInput: {
    flex: 1,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
    color: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  addWordBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addWordBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 6,
  },
  chipText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  chipClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCloseText: {
    color: '#FF3B30',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
