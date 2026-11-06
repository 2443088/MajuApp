import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Txt } from './ui';

export function Splash({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 1100, useNativeDriver: false }).start();
  }, [progress]);

  useEffect(() => {
    if (visible) return;
    Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, opacity]);

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, { opacity, backgroundColor: '#dc2626', zIndex: 50 }]}
    >
      <View className="flex-1 items-center justify-center">
        <View
          className="items-center justify-center rounded-[36px] bg-white"
          style={{ width: 125, height: 125, transform: [{ rotate: '-4deg' }], elevation: 10 }}
        >
          <View
            className="absolute rounded bg-red-600"
            style={{ width: 3, height: 72, right: 24, top: -17, transform: [{ rotate: '17deg' }] }}
          />
          <View
            className="absolute rounded bg-red-600"
            style={{ width: 3, height: 72, right: 15, top: -15, transform: [{ rotate: '17deg' }] }}
          />
          <Txt className="font-script text-[58px] text-red-600">MJ</Txt>
        </View>
        <Txt className="mt-6 text-[30px] font-dm-bold text-white">MJ</Txt>
        <Txt className="mt-1 text-base text-white/85">Mama Jualan</Txt>
      </View>
      <View className="absolute bottom-[70px] h-[3px] w-[82px] self-center overflow-hidden rounded-sm bg-white/20">
        <Animated.View
          style={{
            height: '100%',
            backgroundColor: '#ffffff',
            width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>
    </Animated.View>
  );
}
