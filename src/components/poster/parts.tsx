import React from 'react';
import { Image, Text, View } from 'react-native';
import { POSTER_COLORS, phoneWithDashes } from '../../poster/templates';

interface BrandProps {
  W: number;
  brand: string;
  subtitle: string;
  showSubtitle?: boolean;
  logoUri?: string;
  compact?: boolean;
}

/** BrandMark bergaya editorial: nama toko tulisan kuas gelap + subjudul marun berjarak huruf lebar (atau logo PNG). */
export function BrandHeader({
  W,
  brand,
  subtitle,
  showSubtitle = true,
  logoUri,
  compact = false,
}: BrandProps) {
  const name = brand.trim() || 'Toko Mama';
  const baseFs = compact ? W * 0.088 : W * 0.165;
  const maxByLen = (compact ? W * 1.15 : W * 2.15) / Math.max(name.length, 4);
  const fs = Math.min(baseFs, maxByLen);
  const align = compact ? 'flex-start' : 'center';
  const textAlign = compact ? 'left' : 'center';

  if (logoUri) {
    return (
      <View style={{ alignItems: align }}>
        <Image
          source={{ uri: logoUri }}
          style={{
            width: compact ? W * 0.28 : W * 0.56,
            height: compact ? W * 0.11 : W * 0.19,
          }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={{ alignItems: align }}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          fontFamily: 'KaushanScript_400Regular',
          fontSize: fs,
          lineHeight: fs * 1.12,
          color: POSTER_COLORS.ink,
          textAlign,
        }}
      >
        {name}
      </Text>
      {showSubtitle && subtitle.trim() ? (
        <Text
          numberOfLines={1}
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: compact ? W * 0.018 : W * 0.025,
            letterSpacing: compact ? W * 0.005 : W * 0.011,
            marginTop: compact ? W * 0.008 : W * 0.012,
            color: POSTER_COLORS.red,
            textAlign,
          }}
        >
          {subtitle.trim().toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

interface OrderBarProps {
  W: number;
  text: string;
  phone: string;
  showCta?: boolean;
  showWhatsappBadge?: boolean;
  compact?: boolean;
}

/** OrderBar bergaya editorial: garis tipis atas-bawah, badge bulat marun "WA", ajakan kiri, nomor kanan. */
export function OrderFooter({
  W,
  text,
  phone,
  showCta = true,
  showWhatsappBadge = true,
  compact = false,
}: OrderBarProps) {
  const dashed = phone.trim() ? phoneWithDashes(phone) : '0812-XXXX-XXXX';
  const dotSize = compact ? W * 0.05 : W * 0.056;
  return (
    <View
      style={{
        height: compact ? W * 0.088 : W * 0.098,
        borderTopWidth: Math.max(1, W * 0.0024),
        borderBottomWidth: Math.max(1, W * 0.0024),
        borderColor: POSTER_COLORS.rule,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: W * 0.015,
        gap: W * 0.02,
      }}
    >
      {showWhatsappBadge ? (
        <View
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: POSTER_COLORS.red,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: W * 0.018,
              color: '#ffffff',
            }}
          >
            WA
          </Text>
        </View>
      ) : null}

      {showCta && text.trim() ? (
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            fontFamily: 'DMSans_600SemiBold',
            fontSize: W * 0.019,
            letterSpacing: W * 0.0022,
            color: '#6f655c',
          }}
        >
          {text.trim().toUpperCase()}
        </Text>
      ) : null}

      <Text
        numberOfLines={1}
        style={{
          marginLeft: 'auto',
          fontFamily: 'DMSans_700Bold',
          fontSize: W * 0.025,
          letterSpacing: W * 0.001,
          color: POSTER_COLORS.ink,
        }}
      >
        {dashed}
      </Text>
    </View>
  );
}