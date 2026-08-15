import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  Pressable, 
  Text, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InstagramPhotoEditorProps {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  onComplete: (croppedUri: string) => void;
  onCancel: () => void;
}

/**
 * Instagram-style Photo Editor
 * Features: Pinch-to-zoom, Pan, 1:1 and 4:5 Aspect Ratio toggle.
 */
export const InstagramPhotoEditor: React.FC<InstagramPhotoEditorProps> = ({
  imageUri,
  imageWidth,
  imageHeight,
  onComplete,
  onCancel,
}) => {
  const [aspectRatio, setAspectRatio] = useState<1 | 0.8>(1); // 1 = Square, 0.8 = 4:5 Portrait
  const [isProcessing, setIsProcessing] = useState(false);

  // Viewport dimensions
  const viewportWidth = SCREEN_WIDTH;
  const viewportHeight = viewportWidth / aspectRatio;

  // Shared values for gestures
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const savedTranslationX = useSharedValue(0);
  const savedTranslationY = useSharedValue(0);

  // Initial setup: Scale image to fill viewport
  const baseScale = useMemo(() => {
    const scaleToFitWidth = viewportWidth / imageWidth;
    const scaleToFitHeight = viewportHeight / imageHeight;
    return Math.max(scaleToFitWidth, scaleToFitHeight);
  }, [imageWidth, imageHeight, viewportWidth, viewportHeight]);

  const displayedImageWidth = imageWidth * baseScale;
  const displayedImageHeight = imageHeight * baseScale;

  // Gestures
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(savedScale.value * e.scale, 0.8);
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
      }
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translationX.value = savedTranslationX.value + e.translationX;
      translationY.value = savedTranslationY.value + e.translationY;
    })
    .onEnd(() => {
      // Calculate bounds to prevent white space
      const currentScale = scale.value;
      const scaledWidth = displayedImageWidth * currentScale;
      const scaledHeight = displayedImageHeight * currentScale;

      const maxTx = Math.max(0, (scaledWidth - viewportWidth) / 2);
      const maxTy = Math.max(0, (scaledHeight - viewportHeight) / 2);

      if (Math.abs(translationX.value) > maxTx) {
        translationX.value = withSpring(translationX.value > 0 ? maxTx : -maxTx);
      }
      if (Math.abs(translationY.value) > maxTy) {
        translationY.value = withSpring(translationY.value > 0 ? maxTy : -maxTy);
      }

      savedTranslationX.value = translationX.value;
      savedTranslationY.value = translationY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      { scale: scale.value },
    ],
  }));

  const handleToggleAspectRatio = () => {
    setAspectRatio(prev => prev === 1 ? 0.8 : 1);
    // Reset positions to keep it safe
    translationX.value = withSpring(0);
    translationY.value = withSpring(0);
    scale.value = withSpring(1);
    savedTranslationX.value = 0;
    savedTranslationY.value = 0;
    savedScale.value = 1;
  };

  const handleNext = async () => {
    try {
      setIsProcessing(true);
      
      // Math for cropping
      const currentScale = scale.value;
      const totalScale = baseScale * currentScale;
      
      // Calculate origin relative to the center of the image
      // Visual center of image is at translationX, translationY
      // Viewport center is at 0, 0 (relative to container)
      
      const scaledW = imageWidth * totalScale;
      const scaledH = imageHeight * totalScale;

      // Crop area in scaled pixels
      const cropX = (scaledW / 2 - viewportWidth / 2 - translationX.value) / totalScale;
      const cropY = (scaledH / 2 - viewportHeight / 2 - translationY.value) / totalScale;
      const cropW = viewportWidth / totalScale;
      const cropH = viewportHeight / totalScale;

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.max(0, cropX),
              originY: Math.max(0, cropY),
              width: cropW,
              height: cropH,
            },
          },
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      onComplete(result.uri);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.headerButton}>
          <Ionicons name="close" size={28} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Editar Foto</Text>
        <Pressable onPress={handleNext} disabled={isProcessing} style={styles.headerButton}>
          {isProcessing ? (
            <ActivityIndicator color="#FF2D78" />
          ) : (
            <Text style={styles.nextText}>Siguiente</Text>
          )}
        </Pressable>
      </View>

      {/* Editor Area */}
      <View style={[styles.viewportContainer, { height: viewportHeight }]}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.imageWrapper, animatedStyle]}>
            <Image
              source={{ uri: imageUri }}
              style={{ width: displayedImageWidth, height: displayedImageHeight }}
              contentMode="cover"
            />
          </Animated.View>
        </GestureDetector>
        
        {/* Aspect Ratio Toggle Button Overlay */}
        <Pressable 
          onPress={handleToggleAspectRatio}
          style={styles.aspectRatioButton}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)']}
            style={styles.aspectRatioGradient}
          >
            <Ionicons 
              name={aspectRatio === 1 ? "scan-outline" : "square-outline"} 
              size={20} 
              color="#FFF" 
            />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Footer / Instructions */}
      <View style={styles.footer}>
        <Text style={styles.instructionText}>
          Pellizca para hacer zoom y arrastra para acomodar
        </Text>
        <View style={styles.ratioLabels}>
          <View style={[styles.ratioIndicator, aspectRatio === 1 && styles.activeRatio]}>
            <Text style={[styles.ratioText, aspectRatio === 1 && styles.activeRatioText]}>1:1</Text>
          </View>
          <View style={[styles.ratioIndicator, aspectRatio === 0.8 && styles.activeRatio]}>
            <Text style={[styles.ratioText, aspectRatio === 0.8 && styles.activeRatioText]}>4:5</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  headerButton: {
    width: 80,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  nextText: {
    color: '#FF2D78',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  viewportContainer: {
    width: SCREEN_WIDTH,
    overflow: 'hidden',
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  aspectRatioButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  aspectRatioGradient: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    color: '#8A8A8A',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  ratioLabels: {
    flexDirection: 'row',
    gap: 12,
  },
  ratioIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  activeRatio: {
    borderColor: '#FF2D78',
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
  },
  ratioText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '700',
  },
  activeRatioText: {
    color: '#FF2D78',
  }
});
