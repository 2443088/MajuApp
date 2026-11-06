import React from 'react';
import { Image, View, type ViewStyle } from 'react-native';
import type { PhotoShape } from '../../poster/templates';

interface Props {
  uri?: string;
  shape: PhotoShape;
  width: number;
  height?: number;
  /** Cincin abu-abu tipis di tepi foto (seperti template referensi). */
  ring?: boolean;
  style?: ViewStyle;
}

function radiusFor(shape: PhotoShape, w: number): ViewStyle {
  switch (shape) {
    case 'circle':
      return { borderRadius: w / 2 };
    case 'squircle':
      return { borderRadius: w * 0.28 };
    case 'rounded':
      return { borderRadius: w * 0.12 };
    case 'leaf':
      return {
        borderTopLeftRadius: w * 0.5,
        borderBottomRightRadius: w * 0.5,
        borderTopRightRadius: w * 0.08,
        borderBottomLeftRadius: w * 0.08,
      };
    case 'arch':
      return {
        borderTopLeftRadius: w * 0.5,
        borderTopRightRadius: w * 0.5,
        borderBottomLeftRadius: w * 0.08,
        borderBottomRightRadius: w * 0.08,
      };
  }
}

/** Bingkai foto dengan bentuk tertentu. Tanpa foto: placeholder langit + bukit hijau. */
export function PhotoFrame({ uri, shape, width, height = width, ring = false, style }: Props) {
  return (
    <View
      style={[
        {
          width,
          height,
          overflow: 'hidden',
          backgroundColor: '#cfeafc',
          borderWidth: ring ? Math.max(2, width * 0.014) : 0,
          borderColor: '#dedada',
        },
        radiusFor(shape, width),
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <>
          <View
            style={{
              position: 'absolute',
              left: width * 0.14,
              top: height * 0.14,
              width: width * 0.36,
              height: height * 0.11,
              borderRadius: height * 0.06,
              backgroundColor: '#ffffff',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: -width * 0.2,
              bottom: -height * 0.34,
              width: width * 1.4,
              height: height * 0.62,
              borderRadius: width,
              backgroundColor: '#8aa500',
            }}
          />
        </>
      )}
    </View>
  );
}
