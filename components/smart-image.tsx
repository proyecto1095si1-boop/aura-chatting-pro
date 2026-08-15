import React from 'react';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { getSafeSource } from '@/lib/image-utils';

const IS_WEB = Platform.OS === 'web';

export interface SmartImageProps extends Omit<ImageProps, 'source'> {
  source: any;
  showUrlDebug?: boolean;
}

/**
 * A wrapper around expo-image that handles web-specific CORS issues
 * by falling back to native <img> tags on web.
 */
export function SmartImage({ source, style, showUrlDebug, ...props }: SmartImageProps) {
  const safeSource = getSafeSource(source);
  
  if (IS_WEB && typeof safeSource === 'string' && safeSource.startsWith('http')) {
    return (
      <View style={[style, { overflow: 'hidden', position: 'relative', backgroundColor: '#000' }]}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .smart-img-web {
            animation: fadeIn 0.4s ease-in-out;
            transition: opacity 0.3s ease-in-out;
          }
        `}} />
        <img 
          key={safeSource}
          src={safeSource} 
          className="smart-img-web"
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: (props.contentFit as any) || 'cover',
            display: 'block'
          }} 
          alt="Profile"
          decoding="async"
          loading="eager"
          onError={(e: any) => {
             console.warn("SmartImage load error on web:", safeSource);
             e.target.src = 'https://via.placeholder.com/400?text=Error';
          }}
        />
        {showUrlDebug && (
          <View style={{ position: 'absolute', top: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 2, zIndex: 100 }}>
            <Text style={{ color: 'white', fontSize: 8 }}>{safeSource.substring(0, 30)}...</Text>
          </View>
        )}
      </View>
    );
  }

  // Fallback to local assets or native expo-image
  return (
    <Image
      source={safeSource}
      style={style}
      {...props}
    />
  );
}
