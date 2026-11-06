import React, { forwardRef, type ReactNode } from 'react';
import { Image, Text, View, type ViewStyle } from 'react-native';
import Svg, { Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';
import {
  POSTER_COLORS,
  RATIO_ASPECT,
  phoneWithDashes,
  type PosterContent,
  type PosterTemplateDef,
} from '../poster/templates';
import { PhotoFrame } from './poster/PhotoFrame';
import { BrandHeader, Caption, OrderFooter } from './poster/parts';

interface LayoutProps {
  W: number;
  H: number;
  c: PosterContent;
  t: PosterTemplateDef;
}

const at = (left: number, top: number, extra: ViewStyle = {}): ViewStyle => ({
  position: 'absolute',
  left,
  top,
  ...extra,
});

function Line({ W, left, top, width, height }: { W: number; left: number; top: number; width?: number; height?: number }) {
  const thickness = Math.max(1.5, W * 0.003);
  return (
    <View
      style={at(left, top, {
        width: width ?? thickness,
        height: height ?? thickness,
        backgroundColor: POSTER_COLORS.red,
      })}
    />
  );
}

function BottomFooter({ bottom, children }: { bottom: number; children: ReactNode }) {
  return <View style={{ position: 'absolute', left: 0, right: 0, bottom }}>{children}</View>;
}

// ------------------------------------------------------------------ 9:16 Grid 4 foto
function StoryGrid({ W, c, t }: LayoutProps) {
  const s = W * 0.42;
  const xs = [W * 0.05, W * 0.53];
  const ys = [W * 0.59, W * 1.05];
  return (
    <>
      <View style={at(0, W * 0.035, { width: W })}>
        <BrandHeader W={W} brand={c.brand} subtitle={c.subtitle} since={c.since} logoUri={c.logoUri} />
      </View>
      {[0, 1, 2, 3].map((i) => {
        const x = xs[i % 2];
        const row = Math.floor(i / 2);
        const captionTop = row === 0 ? ys[0] - W * 0.125 : ys[1] + s + W * 0.015;
        return (
          <React.Fragment key={i}>
            <View
              style={at(x, captionTop, {
                width: s,
                height: W * 0.11,
                justifyContent: row === 0 ? 'flex-end' : 'flex-start',
              })}
            >
              <Caption W={W} text={c.slots[i]?.caption ?? ''} width={s} />
            </View>
            <PhotoFrame uri={c.slots[i]?.uri} shape={t.shapes[i]} width={s} style={at(x, ys[row])} />
          </React.Fragment>
        );
      })}
      <BottomFooter bottom={W * 0.06}>
        <OrderFooter W={W} text={c.orderText} phone={c.phone} />
      </BottomFooter>
    </>
  );
}

// ------------------------------------------------------------------ 9:16 3 foto bulat
function StoryCircles({ W, c, t }: LayoutProps) {
  const d = W * 0.5;
  const spots = [
    { x: W * 0.03, y: W * 0.1 },
    { x: W * 0.47, y: W * 0.58 },
    { x: W * 0.03, y: W * 1.06 },
  ];
  return (
    <>
      <View style={at(W * 0.52, W * 0.05, { width: W * 0.46 })}>
        <BrandHeader W={W} brand={c.brand} subtitle={c.subtitle} since={c.since} logoUri={c.logoUri} widthFactor={0.46} />
      </View>
      {spots.map((p, i) => (
        <PhotoFrame key={i} uri={c.slots[i]?.uri} shape={t.shapes[i]} width={d} ring style={at(p.x, p.y)} />
      ))}

      <Line W={W} left={W * 0.075} top={W * 0.57} height={W * 0.2} />
      <View style={at(W * 0.11, W * 0.63)}>
        <Caption W={W} text={c.slots[0]?.caption ?? ''} width={W * 0.36} align="left" size={0.042} />
      </View>

      <Line W={W} left={W * 0.895} top={W * 1.05} height={W * 0.2} />
      <View style={at(W * 0.5, W * 1.1)}>
        <Caption W={W} text={c.slots[1]?.caption ?? ''} width={W * 0.37} align="right" size={0.042} />
      </View>

      <Line W={W} left={W * 0.54} top={W * 1.37} width={W * 0.33} />
      <View style={at(W * 0.56, W * 1.4)}>
        <Caption W={W} text={c.slots[2]?.caption ?? ''} width={W * 0.37} align="left" size={0.042} />
      </View>

      <BottomFooter bottom={W * 0.06}>
        <OrderFooter W={W} text={c.orderText} phone={c.phone} />
      </BottomFooter>
    </>
  );
}

// ------------------------------------------------------------------ 9:16 judul vertikal
function StoryVertical({ W, c, t }: LayoutProps) {
  const boxW = W * 0.2;
  const boxH = W * 0.52;
  const word = (c.subtitle.trim() || 'MENU').toUpperCase();
  const fs = W * Math.min(0.18, 0.7 / Math.max(word.length, 1));
  return (
    <>
      <View style={at(W * 0.04, W * 0.04, { width: W * 0.45 })}>
        <BrandHeader W={W} brand={c.brand} subtitle="" since={c.since} logoUri={c.logoUri} widthFactor={0.45} />
      </View>

      <View style={at(W * 0.02, W * 0.3, { width: boxW, height: boxH })}>
        <View
          style={at((boxW - boxH) / 2, (boxH - boxW) / 2, {
            width: boxH,
            height: boxW,
            justifyContent: 'center',
            transform: [{ rotate: '90deg' }],
          })}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: fs,
              lineHeight: fs * 1.05,
              textAlign: 'center',
              color: POSTER_COLORS.ink,
              textShadowColor: '#e4aaaa',
              textShadowOffset: { width: W * 0.009, height: W * 0.009 },
              textShadowRadius: 0,
            }}
          >
            {word}
          </Text>
        </View>
      </View>

      <View style={at(W * 0.46, W * 0.34, { width: W * 0.5, height: W * 0.16, justifyContent: 'flex-end' })}>
        <Caption W={W} text={c.slots[0]?.caption ?? ''} width={W * 0.5} align="right" size={0.05} />
      </View>
      <PhotoFrame uri={c.slots[0]?.uri} shape={t.shapes[0]} width={W * 0.49} style={at(W * 0.49, W * 0.52)} />

      <View style={at(W * 0.06, W * 0.86, { width: W * 0.42, height: W * 0.13, justifyContent: 'flex-end' })}>
        <Caption W={W} text={c.slots[1]?.caption ?? ''} width={W * 0.42} align="left" size={0.05} />
      </View>
      <PhotoFrame uri={c.slots[1]?.uri} shape={t.shapes[1]} width={W * 0.55} style={at(W * 0.03, W * 1.01)} />

      <View style={at(W * 0.6, W * 1.26, { width: W * 0.36 })}>
        <OrderFooter W={W * 0.8} text={c.orderText} phone={c.phone} align="right" />
      </View>
      <View
        style={at(W * 0.62, W * 1.57, {
          width: W * 0.34,
          height: W * 0.08,
          borderRadius: W * 0.04,
          backgroundColor: '#d4560a',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: W * 0.034, color: '#ffffff' }}>Order Now</Text>
      </View>
    </>
  );
}

// ------------------------------------------------------------------ 9:16 1 foto utama, teks melengkung
function StoryHero({ W, H, c, t }: LayoutProps) {
  const d = W * 0.8;
  const top = W * 0.62;
  const cx = W / 2;
  const cy = top + d / 2;
  const r = d / 2 + W * 0.035;
  const text = c.slots[0]?.caption.trim() ?? '';
  const fs = Math.min(W * 0.085, (W * 2.1) / Math.max(text.length, 1));
  return (
    <>
      <View style={at(0, W * 0.035, { width: W })}>
        <BrandHeader W={W} brand={c.brand} subtitle={c.subtitle} since={c.since} logoUri={c.logoUri} />
      </View>
      <PhotoFrame uri={c.slots[0]?.uri} shape={t.shapes[0]} width={d} ring style={at(W * 0.1, top)} />
      {text ? (
        <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Defs>
            <Path id="arc" d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} />
          </Defs>
          <SvgText fill={POSTER_COLORS.red} fontFamily="KaushanScript_400Regular" fontSize={fs} textAnchor="middle">
            <TextPath href="#arc" startOffset="50%">
              {text}
            </TextPath>
          </SvgText>
        </Svg>
      ) : null}
      <BottomFooter bottom={W * 0.08}>
        <OrderFooter W={W} text={c.orderText} phone={c.phone} color={POSTER_COLORS.red} script />
      </BottomFooter>
    </>
  );
}

// ------------------------------------------------------------------ 3:4 promo merah
function FeedPromo({ W, c, t }: LayoutProps) {
  const d = W * 0.7;
  const title = (c.title.trim() || 'MENU SPESIAL').toUpperCase();
  const name = (c.slots[0]?.caption ?? '').trim().toUpperCase();
  const dot = Math.max(2, W * 0.007);
  const circleTop = W * 0.43;
  return (
    <>
      <View style={at(W * 0.06, W * 0.06, { width: W * 0.88, alignItems: 'center' })}>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: W * 0.088,
            lineHeight: W * 0.088 * 1.02,
            color: '#ffffff',
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
      </View>
      {name ? (
        <View style={at(0, W * 0.3, { width: W, alignItems: 'center' })}>
          <View
            style={{
              backgroundColor: '#000000',
              paddingHorizontal: W * 0.04,
              paddingVertical: W * 0.014,
              borderTopWidth: dot,
              borderBottomWidth: dot,
              borderStyle: 'dotted',
              borderColor: '#ffffff',
              maxWidth: W * 0.8,
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ fontFamily: 'DMSans_400Regular', fontSize: W * 0.052, letterSpacing: W * 0.002, color: '#ffffff' }}
            >
              {name}
            </Text>
          </View>
        </View>
      ) : null}
      <View
        style={at(W * 0.15 + W * 0.018, circleTop + W * 0.035, {
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: 'rgba(0,0,0,0.22)',
        })}
      />
      <PhotoFrame uri={c.slots[0]?.uri} shape={t.shapes[0]} width={d} style={at(W * 0.15, circleTop)} />
      <View style={at(0, circleTop + d + W * 0.045, { width: W, alignItems: 'center' })}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: W * 0.062, letterSpacing: W * 0.002, color: '#ffffff' }}>
          {(c.orderText.trim() || 'ORDER NOW').toUpperCase()}
        </Text>
        {c.phone ? (
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: W * 0.036,
              color: 'rgba(255,255,255,0.85)',
              marginTop: W * 0.008,
            }}
          >
            {phoneWithDashes(c.phone)}
          </Text>
        ) : null}
      </View>
    </>
  );
}

// ------------------------------------------------------------------ 3:4 empat foto beda bentuk
function FeedQuad({ W, c, t }: LayoutProps) {
  const s = W * 0.32;
  const xs = [W * 0.12, W * 0.56];
  const ys = [W * 0.33, W * 0.73];
  return (
    <>
      <View style={at(0, W * 0.025, { width: W })}>
        <BrandHeader W={W} brand={c.brand} subtitle={c.subtitle} since={c.since} logoUri={c.logoUri} widthFactor={0.7} />
      </View>
      {[0, 1, 2, 3].map((i) => {
        const x = xs[i % 2];
        const y = ys[Math.floor(i / 2)];
        return (
          <React.Fragment key={i}>
            <PhotoFrame uri={c.slots[i]?.uri} shape={t.shapes[i]} width={s} style={at(x, y)} />
            <View style={at(x - W * 0.02, y + s + W * 0.01, { width: s + W * 0.04, height: W * 0.075 })}>
              <Caption W={W} text={c.slots[i]?.caption ?? ''} width={s + W * 0.04} size={0.04} />
            </View>
          </React.Fragment>
        );
      })}
      <BottomFooter bottom={W * 0.04}>
        <OrderFooter W={W * 0.9} text={c.orderText} phone={c.phone} />
      </BottomFooter>
    </>
  );
}

// ------------------------------------------------------------------ daftar menu (9:16 dan 3:4)
type MenuBlock =
  | {
      type: 'full';
      label: string;
      items: string[];
    }
  | {
      type: 'pair';
      leftLabel: string;
      leftItems: string[];
      rightLabel: string;
      rightItems: string[];
    };

function MenuList({ W, H, c }: LayoutProps) {
  const line = Math.max(1.5, W * 0.0035);

  // Logo / Header
  const hasLogo = Boolean(c.logoUri);
  const startTop = hasLogo ? W * 0.3 : c.subtitle?.trim() ? W * 0.32 : W * 0.26;

  // Footer check: jika orderText dan phone kosong, ruang bawah dihemat
  const hasFooter = Boolean(c.orderText?.trim() || c.phone?.trim());
  const bottomSpace = hasFooter ? W * 0.17 : W * 0.07;
  const availableH = H - startTop - bottomSpace;

  // Active sections
  const rawSections =
    c.sections && c.sections.length > 0
      ? c.sections.filter((s) => s.items.length > 0)
      : c.listItems.length > 0
        ? [{ label: '', items: c.listItems, layout: 'auto' as const }]
        : [];

  // Group into blocks
  const blocks: MenuBlock[] = [];
  let idx = 0;
  while (idx < rawSections.length) {
    const s = rawSections[idx];
    const layout = s.layout ?? 'auto';

    if (!s.label.trim()) {
      blocks.push({ type: 'full', label: '', items: s.items });
      idx++;
      continue;
    }

    if (layout === 'full') {
      blocks.push({ type: 'full', label: s.label, items: s.items });
      idx++;
      continue;
    }

    if (layout === 'half') {
      if (idx + 1 < rawSections.length && rawSections[idx + 1].label.trim()) {
        const nextS = rawSections[idx + 1];
        blocks.push({
          type: 'pair',
          leftLabel: s.label,
          leftItems: s.items,
          rightLabel: nextS.label,
          rightItems: nextS.items,
        });
        idx += 2;
        continue;
      } else {
        blocks.push({
          type: 'pair',
          leftLabel: s.label,
          leftItems: s.items,
          rightLabel: '',
          rightItems: [],
        });
        idx++;
        continue;
      }
    }

    // layout === 'auto'
    const canPair =
      s.items.length <= 6 &&
      idx + 1 < rawSections.length &&
      rawSections[idx + 1].label.trim().length > 0 &&
      (rawSections[idx + 1].layout ?? 'auto') !== 'full' &&
      rawSections[idx + 1].items.length <= 6;

    if (canPair) {
      const nextS = rawSections[idx + 1];
      blocks.push({
        type: 'pair',
        leftLabel: s.label,
        leftItems: s.items,
        rightLabel: nextS.label,
        rightItems: nextS.items,
      });
      idx += 2;
    } else {
      blocks.push({ type: 'full', label: s.label, items: s.items });
      idx++;
    }
  }

  // Calculate rows for scaling
  let totalUnits = 0;
  blocks.forEach((b) => {
    if (b.type === 'full') {
      const headerU = b.label.trim() ? 1.4 : 0;
      const rowsU = Math.ceil(b.items.length / 2);
      totalUnits += headerU + rowsU;
    } else {
      const headerU = 1.4;
      const rowsU = Math.max(b.leftItems.length, b.rightItems.length);
      totalUnits += headerU + rowsU;
    }
  });
  if (blocks.length > 1) {
    totalUnits += (blocks.length - 1) * 0.9;
  }

  const lh = Math.min(W * 0.065, Math.max(W * 0.026, availableH / Math.max(totalUnits, 10)));
  const fs = Math.min(lh * 0.62, W * 0.038);
  const headerFs = Math.min(lh * 0.76, W * 0.036);
  const dividerColor = '#e58c8c';
  const dividerThickness = Math.max(1.2, W * 0.0028);

  const colWidth = W * 0.385;
  const leftX = W * 0.09;
  const rightX = W * 0.525;
  const centerX = (W - dividerThickness) / 2;

  let currentTop = startTop;

  return (
    <>
      {/* Bingkai Ganda Luar */}
      <View
        style={at(W * 0.03, W * 0.03, {
          right: W * 0.03,
          bottom: W * 0.03,
          borderWidth: line,
          borderColor: POSTER_COLORS.red,
        })}
      />
      {/* Bingkai Ganda Dalam */}
      <View
        style={at(W * 0.048, W * 0.048, {
          right: W * 0.048,
          bottom: W * 0.048,
          borderWidth: line,
          borderColor: POSTER_COLORS.red,
        })}
      />

      {/* Logo Image atau Brand Header */}
      {c.logoUri ? (
        <View style={at(0, W * 0.065, { width: W, alignItems: 'center' })}>
          <Image
            source={{ uri: c.logoUri }}
            style={{ width: W * 0.65, height: W * 0.22 }}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={at(0, W * 0.08, { width: W })}>
          <BrandHeader W={W} brand={c.brand} subtitle={c.subtitle} since={c.since} variant="list" widthFactor={0.7} />
        </View>
      )}

      {/* Menu Blocks */}
      {blocks.length > 0 ? (
        blocks.map((block, bIdx) => {
          const blockTop = currentTop;

          if (block.type === 'full') {
            const hasHeader = Boolean(block.label.trim());
            const headerH = hasHeader ? lh * 1.35 : 0;
            const itemsTop = blockTop + headerH;
            const half = Math.ceil(block.items.length / 2);
            const leftList = block.items.slice(0, half);
            const rightList = block.items.slice(half);
            const itemRows = Math.max(leftList.length, rightList.length);
            const blockItemsH = itemRows * lh;

            currentTop = itemsTop + blockItemsH + lh * 0.9;

            return (
              <React.Fragment key={`full-${bIdx}`}>
                {hasHeader ? (
                  <View
                    style={at(0, blockTop, {
                      width: W,
                      height: headerH,
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: headerFs,
                        letterSpacing: W * 0.003,
                        color: '#111111',
                        textAlign: 'center',
                      }}
                    >
                      {block.label.toUpperCase()}
                    </Text>
                  </View>
                ) : null}

                {/* Kolom Kiri */}
                <View style={at(leftX, itemsTop, { width: colWidth })}>
                  {leftList.map((name, i) => (
                    <Text
                      key={`${name}-${i}`}
                      numberOfLines={1}
                      style={{
                        height: lh,
                        fontFamily: 'serif',
                        fontSize: fs,
                        lineHeight: lh,
                        color: '#333333',
                      }}
                    >
                      {name}
                    </Text>
                  ))}
                </View>

                {/* Kolom Kanan */}
                <View style={at(rightX, itemsTop, { width: colWidth })}>
                  {rightList.map((name, i) => (
                    <Text
                      key={`${name}-${i}`}
                      numberOfLines={1}
                      style={{
                        height: lh,
                        fontFamily: 'serif',
                        fontSize: fs,
                        lineHeight: lh,
                        color: '#333333',
                      }}
                    >
                      {name}
                    </Text>
                  ))}
                </View>

                {/* Garis Pembatas Vertikal Tengah */}
                {rightList.length > 0 ? (
                  <View
                    style={at(centerX, itemsTop, {
                      width: dividerThickness,
                      height: blockItemsH,
                      backgroundColor: dividerColor,
                    })}
                  />
                ) : null}
              </React.Fragment>
            );
          } else {
            // Block type === 'pair' (dua label bersandingan)
            const headerH = lh * 1.35;
            const itemsTop = blockTop + headerH;
            const itemRows = Math.max(block.leftItems.length, block.rightItems.length);
            const blockItemsH = itemRows * lh;

            currentTop = itemsTop + blockItemsH + lh * 0.9;

            return (
              <React.Fragment key={`pair-${bIdx}`}>
                {/* Header Kiri */}
                <View
                  style={at(leftX, blockTop, {
                    width: colWidth,
                    height: headerH,
                    alignItems: 'center',
                    justifyContent: 'center',
                  })}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: headerFs,
                      letterSpacing: W * 0.003,
                      color: '#111111',
                      textAlign: 'center',
                    }}
                  >
                    {block.leftLabel.toUpperCase()}
                  </Text>
                </View>

                {/* Header Kanan */}
                {block.rightLabel ? (
                  <View
                    style={at(rightX, blockTop, {
                      width: colWidth,
                      height: headerH,
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: 'DMSans_700Bold',
                        fontSize: headerFs,
                        letterSpacing: W * 0.003,
                        color: '#111111',
                        textAlign: 'center',
                      }}
                    >
                      {block.rightLabel.toUpperCase()}
                    </Text>
                  </View>
                ) : null}

                {/* Kolom Kiri */}
                <View style={at(leftX, itemsTop, { width: colWidth })}>
                  {block.leftItems.map((name, i) => (
                    <Text
                      key={`${name}-${i}`}
                      numberOfLines={1}
                      style={{
                        height: lh,
                        fontFamily: 'serif',
                        fontSize: fs,
                        lineHeight: lh,
                        color: '#333333',
                      }}
                    >
                      {name}
                    </Text>
                  ))}
                </View>

                {/* Kolom Kanan */}
                <View style={at(rightX, itemsTop, { width: colWidth })}>
                  {block.rightItems.map((name, i) => (
                    <Text
                      key={`${name}-${i}`}
                      numberOfLines={1}
                      style={{
                        height: lh,
                        fontFamily: 'serif',
                        fontSize: fs,
                        lineHeight: lh,
                        color: '#333333',
                      }}
                    >
                      {name}
                    </Text>
                  ))}
                </View>

                {/* Garis Pembatas Vertikal Tengah */}
                <View
                  style={at(centerX, blockTop + lh * 0.1, {
                    width: dividerThickness,
                    height: headerH + blockItemsH - lh * 0.1,
                    backgroundColor: dividerColor,
                  })}
                />
              </React.Fragment>
            );
          }
        })
      ) : (
        <View style={at(0, startTop, { width: W, alignItems: 'center' })}>
          <Text style={{ fontFamily: 'serif', fontSize: W * 0.04, color: '#aaaaaa' }}>Pilih menu untuk ditampilkan</Text>
        </View>
      )}

      {hasFooter ? (
        <BottomFooter bottom={W * 0.075}>
          <OrderFooter W={W * 0.85} text={c.orderText} phone={c.phone} />
        </BottomFooter>
      ) : null}
    </>
  );
}

interface Props {
  template: PosterTemplateDef;
  content: PosterContent;
  /** Lebar kanvas dalam dp; tinggi mengikuti rasio template. */
  width: number;
}

/**
 * Kanvas poster. Semua ukuran dihitung dari lebar (W) sehingga hasilnya sama di preview
 * maupun saat ditangkap view-shot. Ref mengarah ke View terluar. Tidak ada harga di template.
 */
export const PosterTemplate = forwardRef<React.ElementRef<typeof View>, Props>(function PosterTemplate({ template, content, width: W }, ref) {
  const H = W * RATIO_ASPECT[template.ratio];
  const props: LayoutProps = { W, H, c: content, t: template };
  const background =
    template.id === 'feed-promo' ? POSTER_COLORS.red : template.kind === 'list' ? '#ffffff' : POSTER_COLORS.paper;

  let layout: ReactNode;
  switch (template.id) {
    case 'story-grid':
      layout = <StoryGrid {...props} />;
      break;
    case 'story-circles':
      layout = <StoryCircles {...props} />;
      break;
    case 'story-vertical':
      layout = <StoryVertical {...props} />;
      break;
    case 'story-hero':
      layout = <StoryHero {...props} />;
      break;
    case 'feed-promo':
      layout = <FeedPromo {...props} />;
      break;
    case 'feed-quad':
      layout = <FeedQuad {...props} />;
      break;
    case 'story-list':
    case 'feed-list':
      layout = <MenuList {...props} />;
      break;
  }

  return (
    <View ref={ref} collapsable={false} style={{ width: W, height: H, backgroundColor: background, overflow: 'hidden' }}>
      {layout}
    </View>
  );
});
