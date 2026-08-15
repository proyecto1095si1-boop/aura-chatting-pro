const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const axios = require('axios');
const { TRANSLATIONS, DOUBLE_DATE_TRANSLATIONS } = require('./translations');

admin.initializeApp();

function getDoubleT(lang) {
  return DOUBLE_DATE_TRANSLATIONS[lang] || DOUBLE_DATE_TRANSLATIONS.en;
}

function getT(lang) {
  return TRANSLATIONS[lang] || TRANSLATIONS.en;
}

/**
 * Notificación de Nuevo Mensaje (V2)
 */
exports.onNewMessage = onDocumentCreated('matches/{matchId}/messages/{messageId}', async (event) => {
    const messageData = event.data.data();
    if (!messageData) return null;
    
    const matchId = event.params.matchId;

    const matchDoc = await admin.firestore().collection('matches').doc(matchId).get();
    if (!matchDoc.exists) return null;

    const matchData = matchDoc.data();
    const participants = matchData.participants || [];
    const senderId = messageData.senderId || messageData.author;
    
    const isDoubleDate = matchData.isDoubleDate || false;

    // Notificar a todos los participantes EXCEPTO al que envió el mensaje
    const recipients = participants.filter(id => id !== senderId);
    
    for (const recipientId of recipients) {
      try {
        const userDoc = await admin.firestore().collection('profiles').doc(recipientId).get();
        if (!userDoc.exists) continue;

        const userData = userDoc.data();
        const pushToken = userData.pushToken;
        const lang = userData.language || 'en';
        const t = getT(lang);

        if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
          continue;
        }

        let senderName = 'Alguien';
        try {
          const senderDoc = await admin.firestore().collection('profiles').doc(senderId).get();
          if (senderDoc.exists) {
            senderName = senderDoc.data().name || 'Alguien';
          }
        } catch (e) { /* ignore */ }

        const title = isDoubleDate ? `👥 ${senderName} (Grupo)` : senderName;
        const messagePreview = messageData.text ? messageData.text.substring(0, 80) : t.photo;
        
        await axios.post('https://exp.host/--/api/v2/push/send', {
          to: pushToken,
          sound: 'default',
          title: title,
          body: messagePreview,
          data: { matchId, type: 'message' },
          badge: 1,
          priority: 'high',
          channelId: 'messages',
        });
      } catch (error) {
        console.error('Error enviando notificación a', recipientId, ':', error.message);
      }
    }
    return null;
});

/**
 * Notificación de Nuevo Match (V2)
 */
exports.onNewMatch = onDocumentCreated('matches/{matchId}', async (event) => {
    const matchData = event.data.data();
    if (!matchData) return null;
    
    const participants = matchData.participants || [];
    const matchId = event.params.matchId;
    const isDoubleDate = matchData.isDoubleDate || false;

    for (const userId of participants) {
      const userDoc = await admin.firestore().collection('profiles').doc(userId).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();
      const pushToken = userData.pushToken;
      const lang = userData.language || 'en';
      
      if (!pushToken || !pushToken.startsWith('ExponentPushToken')) continue;

      let title, body;
      
      if (isDoubleDate) {
        const dt = getDoubleT(lang);
        title = dt.match_title;
        body = dt.match_body;
      } else {
        const t = getT(lang);
        const otherId = participants.find(id => id !== userId);
        const otherDoc = await admin.firestore().collection('profiles').doc(otherId).get();
        const otherName = otherDoc.exists ? (otherDoc.data().name || 'Alguien') : 'Alguien';
        title = t.match_title;
        body = t.match_body(otherName);
      }

      try {
        await axios.post('https://exp.host/--/api/v2/push/send', {
          to: pushToken,
          sound: 'default',
          title: title,
          body: body,
          data: { matchId, type: 'match' },
          badge: 1,
          priority: 'high',
          channelId: 'matches',
        });
      } catch (e) {
        console.error('Error enviando match notification:', e.message);
      }
    }
    return null;
});

/**
 * Notificación de Invitación Cita Doble
 */
exports.onDoubleDateInvite = onDocumentCreated('double_date_invites/{inviteId}', async (event) => {
  const data = event.data.data();
  if (!data || data.status !== 'pending') return null;

  const recipientId = data.to;
  const fromName = data.fromName || 'Un amigo';

  try {
    const userDoc = await admin.firestore().collection('profiles').doc(recipientId).get();
    if (!userDoc.exists) return null;

    const userData = userDoc.data();
    const pushToken = userData.pushToken;
    const lang = userData.language || 'en';
    const dt = getDoubleT(lang);

    if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return null;

    await axios.post('https://exp.host/--/api/v2/push/send', {
      to: pushToken,
      sound: 'default',
      title: dt.invite_title,
      body: dt.invite_body(fromName),
      data: { type: 'double_date_invite' },
      priority: 'high',
    });
  } catch (error) {
    console.error('Error enviando invitación double date:', error.message);
  }
  return null;
});

/**
 * Notificación Global (V2)
 */
exports.onGlobalBroadcast = onDocumentUpdated('system_settings/push_broadcast', async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();

    if (!newData || !oldData || newData.sentAt === oldData.sentAt) return null;

    const templateId = newData.templateId;
    
    console.log('Iniciando envío global de notificaciones push...');
    
    const stream = admin.firestore().collection('profiles')
      .where('pushToken', '>=', 'ExponentPushToken')
      .stream();

    let chunk = [];
    const activePromises = new Set();
    const maxConcurrency = 30;

    const sendChunk = (pushChunk) => {
      const p = axios.post('https://exp.host/--/api/v2/push/send', pushChunk)
        .catch(e => console.error('Error en broadcast chunk:', e.message))
        .finally(() => {
          activePromises.delete(p);
        });
      activePromises.add(p);
      return p;
    };

    await new Promise((resolve, reject) => {
      stream.on('data', (doc) => {
        const userData = doc.data();
        if (!userData || !userData.pushToken || !userData.pushToken.startsWith('ExponentPushToken')) return;

        const lang = userData.language || 'en';
        const t = getT(lang);

        chunk.push({
          to: userData.pushToken,
          sound: 'default',
          title: t.broadcast_title,
          body: t.broadcast_body,
          data: { type: 'system', templateId },
        });

        if (chunk.length >= 100) {
          const currentChunk = chunk;
          chunk = [];
          sendChunk(currentChunk);

          if (activePromises.size >= maxConcurrency) {
            stream.pause();
            Promise.race(activePromises).then(() => {
              stream.resume();
            });
          }
        }
      });

      stream.on('error', (err) => {
        console.error('Error streaming users for global broadcast:', err);
        reject(err);
      });

      stream.on('end', async () => {
        if (chunk.length > 0) {
          sendChunk(chunk);
        }
        await Promise.all(activePromises);
        resolve();
      });
    });

    console.log('Envío global de notificaciones completado con éxito.');
    return null;
});

/**
 * Limpieza de Almacenamiento (Purga de imágenes destruidas)
 * Se activa cuando se actualiza 'system_settings/storage_cleanup'
 */
exports.cleanupEphemeralImages = onDocumentUpdated('system_settings/storage_cleanup', async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();

    // Solo disparar si el trigger cambió (ej. cambiar triggerAt a la fecha actual)
    if (!newData || !oldData || newData.triggerAt === oldData.triggerAt) return null;

    console.log('Iniciando purga de archivos efímeros destruidos...');
    
    let filesDeleted = 0;
    
    // Consulta de grupo de colecciones (Collection Group Query) de mensajes
    const messagesSnap = await admin.firestore().collectionGroup('messages')
      .where('isEphemeral', '==', true)
      .where('destroyed', '==', true)
      .where('fullyDeleted', '==', false)
      .limit(500)
      .get();

    for (const msgDoc of messagesSnap.docs) {
      const msgData = msgDoc.data();
      if (msgData.imageUrl) {
        try {
          const bucket = admin.storage().bucket();
          // Extraer el path del archivo de la URL de Firebase Storage
          const urlParts = msgData.imageUrl.split('/o/');
          if (urlParts.length > 1) {
            const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
            await bucket.file(filePath).delete();
            
            // Marcar como purgado definitivamente
            await msgDoc.ref.update({
              imageUrl: '',
              fullyDeleted: true
            });
            filesDeleted++;
          } else {
            // Si la URL no tiene el formato esperado pero existe, marcamos como fullyDeleted para no ciclar
            await msgDoc.ref.update({
              fullyDeleted: true
            });
          }
        } catch (e) {
          console.error(`Error borrando archivo ${msgData.imageUrl}:`, e);
          // Si el archivo no existe en Storage (código de error 404), igual marcamos como fullyDeleted
          if (e.code === 404) {
            await msgDoc.ref.update({
              fullyDeleted: true
            });
          }
        }
      } else {
        // Si no tiene imageUrl pero coincide con los filtros, lo marcamos para no procesar de nuevo
        await msgDoc.ref.update({
          fullyDeleted: true
        });
      }
    }

    console.log(`Limpieza completada. Archivos purgados en este lote: ${filesDeleted}`);
    return null;
});

/**
 * Borrado automático en Storage cuando una historia se elimina en Firestore (manual o por 24h TTL)
 */
exports.onStoryDelete = onDocumentDeleted('stories/{storyId}', async (event) => {
    const storyData = event.data.data();
    if (!storyData || !storyData.imageUrl) return null;
    
    try {
      const bucket = admin.storage().bucket();
      const urlParts = storyData.imageUrl.split('/o/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
        await bucket.file(filePath).delete();
        console.log(`Storage file deleted for story ${event.params.storyId}: ${filePath}`);
      }
    } catch (e) {
      console.error(`Error deleting story image for story ${event.params.storyId}:`, e);
    }
    return null;
});
