import React, { useState, useEffect } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  Alert 
} from 'react-native';
import { useRewardedAd, TestIds } from 'react-native-google-mobile-ads';

/**
 * MÓDULO 2: Bonificado (Pantalla de Likes)
 * Test ID: ca-app-pub-3940256099942544/5224354917
 */

const REWARDED_UNIT_ID = __DEV__ 
  ? TestIds.REWARDED 
  : 'ca-app-pub-3940256099942544/5224354917';

const RewardedLikesButton = () => {
  const [isFetching, setIsFetching] = useState(false);

  const { isLoaded, isClosed, load, show, reward } = useRewardedAd(REWARDED_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });

  // Pre-carga inicial
  useEffect(() => {
    load();
  }, [load]);

  // Recargar cuando se cierra
  useEffect(() => {
    if (isClosed) {
      load();
    }
  }, [isClosed, load]);

  // Capturar el evento de recompensa
  useEffect(() => {
    if (reward) {
      handleRewardEarned();
    }
  }, [reward]);

  const handleRewardEarned = async () => {
    try {
      setIsFetching(true);
      await fetchLikesFromFirestore();
      Alert.alert("Éxito", "Likes cargados correctamente.");
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar los likes.");
    } finally {
      setIsFetching(false);
    }
  };

  const fetchLikesFromFirestore = async () => {
    // Función asíncrona simulada para la carga de datos
    console.log("Iniciando fetchLikesFromFirestore...");
    return new Promise((resolve) => setTimeout(resolve, 2000));
  };

  const onPress = () => {
    if (isLoaded) {
      show();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, (!isLoaded || isFetching) && styles.disabled]}
      onPress={onPress}
      disabled={!isLoaded || isFetching}
    >
      {isFetching ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>
          {isLoaded ? "Ver a quién le gustas" : "Cargando anuncio..."}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#8A2BE2',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabled: {
    backgroundColor: '#A9A9A9',
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default RewardedLikesButton;
