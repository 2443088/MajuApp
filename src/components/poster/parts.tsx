import React from 'react';
import { Image, Text, View } from 'react-native';
import { POSTER_COLORS, phoneWithDashes } from '../../poster/templates';

interface BrandProps {
  W: number;
  brand: string;
  subtitle: string;
  since: string;
  /** Logo kustom yang dipilih pengguna (opsional). */
  logoUri?: string;
  /** 'list' = subtitle merah bergaya tulisan tangan, seperti template daftar menu. */
  variant?: 'default' | 'list';
  align?: 'center' | 'right';
  /** Lebar kotak header sebagai pecahan lebar poster (0-1); ukuran huruf menyesuaikan. */
  widthFactor?: number;
}

/** Nama toko bergaya kuas dengan bayangan merah (atau gambar logo), subjudul, dan baris kecil. */
export function BrandHeader({ W, brand, subtitle, since, logoUri, variant = 'default', align = 'center', widthFactor = 1 }: BrandProps) {
  const name = brand.trim() || 'Toko Mama';
  const scale = 0.55 + 0.45 * widthFactor;
  const fs = W * Math.min((variant === 'list' ? 0.15 : 0.19) * scale, (1.55 * widthFactor) / Math.max(name.length, 1));
  const offset = W * 0.007;
  const textAlign = align;
  const alignItems = align === 'center' ? 'center' : 'flex-end';

  if (logoUri) {
    const logoH = W * (variant === 'list' ? 0.22 : 0.16) * widthFactor;
    const logoW = W * 0.7 * widthFactor;
    return (
      <View style={{ width: '100%', alignItems }}>
        <Image source={{ uri: logoUri }} style={{ width: logoW, height: logoH }} resizeMode="contain" />
        {subtitle.trim() ? (
          variant === 'list' ? (
            <Text
              style={{
                fontFamily: 'KaushanScript_400Regular',
                fontSize: W * 0.065 * scale,
                marginTop: -W * 0.01,
                color: POSTER_COLORS.red,
                textAlign,
              }}
            >
              {subtitle}
            </Text>
          ) : (
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: W * 0.055 * scale,
                letterSpacing: W * 0.008 * scale,
                marginTop: W * 0.008,
                color: POSTER_COLORS.ink,
                textAlign,
              }}
            >
              {subtitle.toUpperCase()}
            </Text>
          )
        ) : null}
        {since.trim() ? (
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: W * 0.022,
              letterSpacing: W * 0.007,
              marginTop: W * 0.008,
              color: '#444444',
              textAlign,
            }}
          >
            {since.toUpperCase()}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ width: '100%', alignItems }}>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: 'KaushanScript_400Regular',
          fontSize: fs,
          lineHeight: fs * 1.25,
          color: POSTER_COLORS.ink,
          textAlign,
          textShadowColor: POSTER_COLORS.red,
          textShadowOffset: { width: offset, height: offset },
          textShadowRadius: 0,
        }}
      >
        {name}
      </Text>
      {subtitle.trim() ? (
        variant === 'list' ? (
          <Text
            style={{
              fontFamily: 'KaushanScript_400Regular',
              fontSize: W * 0.07 * scale,
              marginTop: -W * 0.02,
              color: POSTER_COLORS.red,
              textAlign,
            }}
          >
            {subtitle}
          </Text>
        ) : (
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: W * 0.072 * scale,
              letterSpacing: W * 0.012 * scale,
              marginTop: -W * 0.015,
              color: POSTER_COLORS.ink,
              textAlign,
              textShadowColor: POSTER_COLORS.red,
              textShadowOffset: { width: offset * 0.7, height: offset * 0.7 },
              textShadowRadius: 0,
            }}
          >
            {subtitle.toUpperCase()}
          </Text>
        )
      ) : null}
      {since.trim() ? (
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: W * 0.022,
            letterSpacing: W * 0.007,
            marginTop: W * 0.012,
            color: '#444444',
            textAlign,
          }}
        >
          {since.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

interface FooterProps {
  W: number;
  text: string;
  phone: string;
  color?: string;
  /** Pakai huruf tulisan tangan (Kaushan) alih-alih tebal kapital. */
  script?: boolean;
  align?: 'center' | 'right';
}

export function OrderFooter({ W, text, phone, color = POSTER_COLORS.red, script = false, align = 'center' }: FooterProps) {
  const dashed = phone ? phoneWithDashes(phone) : '';
  return (
    <View style={{ alignItems: align === 'center' ? 'center' : 'flex-end' }}>
      {text.trim() ? (
        <Text
          style={{
            fontFamily: script ? 'KaushanScript_400Regular' : 'DMSans_700Bold',
            fontSize: W * (script ? 0.052 : 0.043),
            letterSpacing: script ? 1 : W * 0.002,
            color,
            textAlign: align,
          }}
        >
          {script ? text : text.toUpperCase()}
        </Text>
      ) : null}
      {dashed ? (
        <Text
          style={{
            fontFamily: script ? 'KaushanScript_400Regular' : 'DMSans_700Bold',
            fontSize: W * (script ? 0.046 : 0.047),
            letterSpacing: script ? W * 0.005 : W * 0.002,
            color,
            textAlign: align,
          }}
        >
          {dashed}
        </Text>
      ) : null}
    </View>
  );
}

interface CaptionProps {
  W: number;
  text: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  color?: string;
  size?: number;
  lines?: number;
}

export function Caption({ W, text, width, align = 'center', color = POSTER_COLORS.ink, size = 0.047, lines = 2 }: CaptionProps) {
  if (!text.trim()) return <View style={{ width }} />;
  return (
    <Text
      numberOfLines={lines}
      adjustsFontSizeToFit
      style={{
        width,
        fontFamily: 'DMSans_400Regular',
        fontSize: W * size,
        lineHeight: W * size * 1.22,
        color,
        textAlign: align,
      }}
    >
      {text}
    </Text>
  );
}
