import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Platform } from 'react-native';

let ImageManipulator: any = null;
try {
  ImageManipulator = require('expo-image-manipulator');
} catch (e) {
  console.warn('[Storage] expo-image-manipulator not available');
}

/**
 * Utilidad pública para subir fotos al bucket de Firebase Storage con COMPRESIÓN
 * Con fallback para web donde ImageManipulator puede fallar
 */
export const uploadToFirebaseStorage = async (
  userId: string,
  localUri: string,
  fileName: string,
  folder: string = 'users'
): Promise<string> => {
  console.log(`[Storage] Starting upload for user=${userId}, file=${fileName}`);
  console.log(`[Storage] Source URI: ${localUri?.substring(0, 80)}...`);
  
  try {
    let uploadUri = localUri;

    // Try compression, but fall back to raw upload if it fails (common on web)
    if (ImageManipulator?.manipulateAsync) {
      try {
        const compressedImage = await ImageManipulator.manipulateAsync(
          localUri,
          [{ resize: { width: 800 } }], // Reducido de 1080 a 800 para ahorrar espacio
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } // Calidad al 60%
        );
        uploadUri = compressedImage.uri;
        console.log('[Storage] Image compressed successfully');
      } catch (manipError: any) {
        console.warn('[Storage] Image manipulation failed, uploading raw:', manipError.message);
        // Continue with the original URI
      }
    }

    console.log('[Storage] Fetching blob from URI...');
    const response = await fetch(uploadUri);
    const blob = await response.blob();
    console.log(`[Storage] Blob created: ${blob.size} bytes, type: ${blob.type}`);

    const storageRef = ref(storage, `${folder}/${userId}/${fileName}`);
    console.log('[Storage] Uploading to Firebase Storage...');
    await uploadBytes(storageRef, blob);
    console.log('[Storage] Upload complete, getting download URL...');
    const downloadURL = await getDownloadURL(storageRef);
    
    // Safety check: Ensure we didn't get back a local blob (should never happen with getDownloadURL)
    if (!downloadURL.startsWith('http')) {
      throw new Error(`Invalid download URL generated: ${downloadURL}`);
    }

    console.log('[Storage] Download URL obtained:', downloadURL.substring(0, 60) + '...');
    return downloadURL;
  } catch (error: any) {
    console.error('[Storage] FULL UPLOAD ERROR:', error);
    
    let userFriendlyMessage = error.message;
    if (error.code === 'storage/unauthorized') {
      userFriendlyMessage = "No tienes permiso para subir archivos. Revisa las reglas de Firebase Storage.";
    } else if (error.message?.includes('CORS')) {
      userFriendlyMessage = "Error de CORS detectado. Debes configurar CORS en tu bucket de Firebase Storage vía gsutil.";
    } else if (error.code === 'storage/retry-limit-exceeded') {
      userFriendlyMessage = "La subida tardó demasiado. Revisa tu conexión a internet.";
    }

    throw new Error(userFriendlyMessage);
  }
};

/**
 * Utilidad para borrar archivos de Firebase Storage
 * @param url URL de descarga pública del archivo
 */
export const deleteFromFirebaseStorage = async (url: string): Promise<void> => {
  if (!url || !url.includes('firebasestorage')) return;
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (error: any) {
    console.error('Error deleting from Firebase Storage:', error);
    // No lanzamos error para no bloquear la eliminación en Firestore si el archivo ya no existe
  }
};
