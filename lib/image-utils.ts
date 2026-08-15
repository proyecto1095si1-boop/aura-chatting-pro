/**
 * Safely resolves an image source for expo-image.
 * Prevents "str.startsWith is not a function" crashes on Web by ensuring 
 * we don't over-wrap already resolved assets or invalid types.
 * expo-image on web sometimes crashes when passing an object { uri: '...' } 
 * if it tries to treat it as a thumbhash string.
 */
export function getSafeSource(photo: any, fallback: any = require('@/assets/images/icon.png')) {
  try {
    if (!photo) return fallback;

    // 1. If it's a local asset number (Native)
    if (typeof photo === 'number') {
      return photo;
    }

    // 2. If it's a string (expected URL or resolved asset path)
    if (typeof photo === 'string' && photo.trim() !== '') {
      // EXTREMELY IMPORTANT: Return the string directly, do NOT wrap in { uri: photo }
      // This is the most common cause of the "str.startsWith" crash on Web
      return photo;
    }

    // 3. If it's already an object
    if (typeof photo === 'object' && photo !== null) {
      // If it has a uri property which is a string, return the string
      if (typeof photo.uri === 'string' && photo.uri.trim() !== '') {
        return photo.uri;
      }
      
      // If it's an object with a "default" property (ESM require on Web)
      if (photo.default && typeof photo.default === 'string') {
        return photo.default;
      }

      // If it's an object with URI but we already checked it, or other properties, 
      // check if it's an empty-ish object
      if (Object.keys(photo).length === 0) return fallback;
      
      // If it's a valid expo-image source object, return it but maybe it's risky?
      // For now, if it has 'uri' we returned the string above.
      return photo;
    }

    return fallback;
  } catch (e) {
    console.warn('[getSafeSource] Error resolving source:', e);
    return fallback;
  }
}

