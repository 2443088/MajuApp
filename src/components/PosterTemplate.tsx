import React, { forwardRef, type ReactNode } from 'react';
import { Image, Text, View } from 'react-native';
import {
  POSTER_COLORS,
  RATIO_ASPECT,
  type PosterContent,
  type PosterSlot,
  type PosterTemplateDef,
} from '../poster/templates';
import { BrandHeader, OrderFooter } from './poster/parts';

interface LayoutProps {
  W: number;
  H: number;
  c: PosterContent;
}

function DoubleFrame({ W }: { W: number }) {
  const outerInset = W * 0.032;
  const innerInset = W * 0.043;
  const borderW = Math.max(1, W * 0.0025);
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: outerInset,
          right: outerInset,
          top: outerInset,
          bottom: outerInset,
          borderWidth: borderW,
          borderColor: POSTER_COLORS.red,
          zIndex: 5,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: innerInset,
          right: innerInset,
          top: innerInset,
          bottom: innerInset,
          borderWidth: borderW,
          borderColor: POSTER_COLORS.red,
          opacity: 0.74,
          zIndex: 5,
        }}
      />
    </>
  );
}

function FoodPhotoBox({
  W,
  slot,
  index,
  showNumber,
  aspectRatio = 1,
  radius = W * 0.022,
}: {
  W: number;
  slot?: PosterSlot;
  index: number;
  showNumber: boolean;
  aspectRatio?: number;
  radius?: number;
}) {
  const badgeSize = W * 0.06;
  return (
    <View
      style={{
        width: '100%',
        aspectRatio,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: POSTER_COLORS.cardBg,
      }}
    >
      {slot?.uri ? (
        <Image source={{ uri: slot.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: W * 0.09,
              height: W * 0.09,
              borderRadius: W * 0.045,
              backgroundColor: '#e2d8cc',
            }}
          />
        </View>
      )}
      {showNumber ? (
        <View
          style={{
            position: 'absolute',
            top: W * 0.018,
            left: W * 0.018,
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: 'rgba(255, 253, 249, 0.92)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'serif',
              fontWeight: '700',
              fontSize: W * 0.022,
              color: POSTER_COLORS.red,
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function StoryHeader({ W, c }: { W: number; c: PosterContent }) {
  return (
    <View style={{ alignItems: 'center' }}>
      {c.showTopNote && c.topNote.trim() ? (
        <Text
          numberOfLines={1}
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: W * 0.019,
            letterSpacing: W * 0.006,
            color: POSTER_COLORS.eyebrow,
            marginBottom: W * 0.035,
            textAlign: 'center',
          }}
        >
          {c.topNote.trim().toUpperCase()}
        </Text>
      ) : null}

      <BrandHeader
        W={W}
        brand={c.brand}
        subtitle={c.subtitle}
        showSubtitle={c.showSubtitle}
        logoUri={c.logoUri}
      />

      {c.showDivider && c.dividerTagline.trim() ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: W * 0.022,
            marginTop: W * 0.036,
            width: W * 0.62,
          }}
        >
          <View style={{ flex: 1, height: Math.max(1, W * 0.0022), backgroundColor: '#bcae9f' }} />
          <Text
            numberOfLines={1}
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: W * 0.017,
              letterSpacing: W * 0.0035,
              color: POSTER_COLORS.eyebrow,
              flexShrink: 1,
            }}
          >
            {c.dividerTagline.trim().toUpperCase()}
          </Text>
          <View style={{ flex: 1, height: Math.max(1, W * 0.0022), backgroundColor: '#bcae9f' }} />
        </View>
      ) : null}
    </View>
  );
}

function StoryPhotosLayout({ W, c, count }: LayoutProps & { count: 1 | 2 | 3 | 4 }) {
  const items = c.slots.slice(0, count);

  const renderCard = (slot: PosterSlot, idx: number, widthStyle: { width: number | `${number}%` }, aspect = 1) => (
    <View key={idx} style={[{ alignItems: 'center' }, widthStyle]}>
      <FoodPhotoBox W={W} slot={slot} index={idx} showNumber={c.showItemNumbers} aspectRatio={aspect} />
      <Text
        numberOfLines={1}
        style={{
          marginTop: W * 0.022,
          fontFamily: 'serif',
          fontWeight: '700',
          fontSize: count === 1 ? W * 0.042 : W * 0.029,
          color: POSTER_COLORS.ink,
          textAlign: 'center',
        }}
      >
        {slot.caption.trim() || `Menu ${idx + 1}`}
      </Text>
      {slot.showDescription && slot.description.trim() ? (
        <Text
          numberOfLines={1}
          style={{
            marginTop: W * 0.009,
            fontFamily: 'DMSans_500Medium',
            fontSize: count === 1 ? W * 0.02 : W * 0.017,
            letterSpacing: W * 0.002,
            color: '#a19589',
            textAlign: 'center',
          }}
        >
          {slot.description.trim().toUpperCase()}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: W * 0.08,
        paddingTop: W * 0.075,
        paddingBottom: W * 0.072,
        justifyContent: 'space-between',
      }}
    >
      <StoryHeader W={W} c={c} />

      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: W * 0.025 }}>
        {count === 4 ? (
          <View style={{ gap: W * 0.042 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {renderCard(items[0], 0, { width: '47.5%' })}
              {renderCard(items[1], 1, { width: '47.5%' })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {renderCard(items[2], 2, { width: '47.5%' })}
              {renderCard(items[3], 3, { width: '47.5%' })}
            </View>
          </View>
        ) : null}

        {count === 3 ? (
          <View style={{ gap: W * 0.036, alignItems: 'center' }}>
            {renderCard(items[0], 0, { width: '56%' })}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              {renderCard(items[1], 1, { width: '47.5%' })}
              {renderCard(items[2], 2, { width: '47.5%' })}
            </View>
          </View>
        ) : null}

        {count === 2 ? (
          <View style={{ gap: W * 0.042, paddingHorizontal: W * 0.04 }}>
            {items.map((slot, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: W * 0.042 }}>
                <View style={{ width: '52%' }}>
                  <FoodPhotoBox W={W} slot={slot} index={idx} showNumber={c.showItemNumbers} aspectRatio={1.05} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={2}
                    style={{
                      fontFamily: 'serif',
                      fontWeight: '700',
                      fontSize: W * 0.035,
                      lineHeight: W * 0.043,
                      color: POSTER_COLORS.ink,
                    }}
                  >
                    {slot.caption.trim() || `Menu ${idx + 1}`}
                  </Text>
                  {slot.showDescription && slot.description.trim() ? (
                    <Text
                      numberOfLines={2}
                      style={{
                        marginTop: W * 0.014,
                        fontFamily: 'DMSans_500Medium',
                        fontSize: W * 0.018,
                        letterSpacing: W * 0.002,
                        color: '#a19589',
                      }}
                    >
                      {slot.description.trim().toUpperCase()}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {count === 1 ? (
          <View style={{ paddingHorizontal: W * 0.07 }}>
            {renderCard(items[0], 0, { width: '100%' }, 1.08)}
          </View>
        ) : null}
      </View>

      <OrderFooter
        W={W}
        text={c.orderText}
        phone={c.phone}
        showCta={c.showFooterCta}
        showWhatsappBadge={c.showWhatsappBadge}
      />
    </View>
  );
}

function FeedSingleLayout({ W, c }: LayoutProps) {
  const slot = c.slots[0];
  const stickerSize = W * 0.155;
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: W * 0.078,
        paddingTop: W * 0.072,
        paddingBottom: W * 0.068,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: W * 0.14 }}>
        <View style={{ flex: 1, paddingRight: W * 0.02 }}>
          <BrandHeader
            W={W}
            brand={c.brand}
            subtitle={c.subtitle}
            showSubtitle={c.showSubtitle}
            logoUri={c.logoUri}
            compact
          />
        </View>
        {c.showCategory && c.title.trim() ? (
          <View
            style={{
              backgroundColor: POSTER_COLORS.red,
              borderRadius: W * 0.05,
              paddingHorizontal: W * 0.034,
              paddingVertical: W * 0.017,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: W * 0.02,
                letterSpacing: W * 0.003,
                color: '#ffffff',
              }}
            >
              {c.title.trim().toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={{
          flex: 1,
          marginVertical: W * 0.02,
          borderRadius: W * 0.026,
          overflow: 'hidden',
          backgroundColor: POSTER_COLORS.cardBg,
        }}
      >
        {slot?.uri ? (
          <Image source={{ uri: slot.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: W * 0.16,
                height: W * 0.16,
                borderRadius: W * 0.08,
                backgroundColor: '#e2d8cc',
              }}
            />
          </View>
        )}

        {c.showFeedSticker && c.feedSticker.trim() ? (
          <View
            style={{
              position: 'absolute',
              right: W * 0.03,
              bottom: W * 0.03,
              width: stickerSize,
              height: stickerSize,
              borderRadius: stickerSize / 2,
              backgroundColor: POSTER_COLORS.red,
              alignItems: 'center',
              justifyContent: 'center',
              padding: W * 0.018,
              transform: [{ rotate: '-8deg' }],
            }}
          >
            <Text
              numberOfLines={3}
              adjustsFontSizeToFit
              style={{
                fontFamily: 'KaushanScript_400Regular',
                fontSize: W * 0.028,
                lineHeight: W * 0.03,
                color: '#ffffff',
                textAlign: 'center',
              }}
            >
              {c.feedSticker.trim()}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ alignItems: 'center', paddingTop: W * 0.018, paddingBottom: W * 0.025 }}>
        {c.showFeedLabel && c.feedLabel.trim() ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: W * 0.017,
              letterSpacing: W * 0.0055,
              color: '#a28f7f',
              marginBottom: W * 0.012,
            }}
          >
            {c.feedLabel.trim().toUpperCase()}
          </Text>
        ) : null}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            fontFamily: 'serif',
            fontWeight: '700',
            fontSize: W * 0.058,
            color: POSTER_COLORS.ink,
            textAlign: 'center',
          }}
        >
          {slot?.caption.trim() || 'Menu Spesial Hari Ini'}
        </Text>
        {slot?.showDescription && slot.description.trim() ? (
          <Text
            numberOfLines={1}
            style={{
              marginTop: W * 0.012,
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontSize: W * 0.024,
              color: POSTER_COLORS.muted,
              textAlign: 'center',
            }}
          >
            {slot.description.trim()}
          </Text>
        ) : null}
      </View>

      <OrderFooter
        W={W}
        text={c.orderText}
        phone={c.phone}
        showCta={c.showFooterCta}
        showWhatsappBadge={c.showWhatsappBadge}
        compact
      />
    </View>
  );
}

function StoryTextMenuLayout({ W, c }: LayoutProps) {
  const sections =
    c.sections && c.sections.length > 0
      ? c.sections.filter((s) => s.items.length > 0)
      : c.listItems.length > 0
        ? [{ label: 'MENU', items: c.listItems }]
        : [];

  const rows: { left?: (typeof sections)[0]; right?: (typeof sections)[0] }[] = [];
  for (let i = 0; i < sections.length; i += 2) {
    rows.push({ left: sections[i], right: sections[i + 1] });
  }

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const compactList = totalItems > 18 || rows.length > 2;
  const itemFs = compactList ? W * 0.022 : W * 0.025;
  const groupGap = compactList ? W * 0.013 : W * 0.02;

  const renderGroup = (sec?: (typeof sections)[0], isLeft?: boolean) => (
    <View
      style={{
        flex: 1,
        paddingVertical: compactList ? W * 0.022 : W * 0.032,
        paddingRight: isLeft ? W * 0.038 : W * 0.015,
        paddingLeft: isLeft ? W * 0.015 : W * 0.038,
        borderRightWidth: isLeft ? Math.max(1, W * 0.0025) : 0,
        borderColor: POSTER_COLORS.red,
      }}
    >
      {sec ? (
        <>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: W * 0.023,
              letterSpacing: W * 0.0038,
              color: POSTER_COLORS.red,
              marginBottom: compactList ? W * 0.018 : W * 0.026,
            }}
          >
            {(sec.label.trim() || 'LAINNYA').toUpperCase()}
          </Text>
          <View style={{ gap: groupGap }}>
            {sec.items.map((itemName, idx) => (
              <View key={`${itemName}-${idx}`} style={{ flexDirection: 'row', alignItems: 'baseline', gap: W * 0.018 }}>
                {c.showItemNumbers ? (
                  <Text
                    style={{
                      fontFamily: 'DMSans_600SemiBold',
                      fontSize: W * 0.017,
                      color: '#b1a499',
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </Text>
                ) : null}
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    fontFamily: 'serif',
                    fontWeight: '700',
                    fontSize: itemFs,
                    color: POSTER_COLORS.ink,
                  }}
                >
                  {itemName}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: W * 0.082,
        paddingTop: W * 0.082,
        paddingBottom: W * 0.072,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ alignItems: 'center' }}>
        {c.showTopNote && c.topNote.trim() ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: W * 0.019,
              letterSpacing: W * 0.006,
              color: POSTER_COLORS.eyebrow,
              marginBottom: W * 0.035,
              textAlign: 'center',
            }}
          >
            {c.topNote.trim().toUpperCase()}
          </Text>
        ) : null}

        <BrandHeader
          W={W}
          brand={c.brand}
          subtitle={c.subtitle}
          showSubtitle={c.showSubtitle}
          logoUri={c.logoUri}
        />

        {c.showTextIntro && c.textIntro.trim() ? (
          <Text
            numberOfLines={2}
            style={{
              marginTop: W * 0.034,
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontSize: W * 0.023,
              color: '#8f8175',
              textAlign: 'center',
            }}
          >
            {c.textIntro.trim()}
          </Text>
        ) : null}
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: W * 0.02 }}>
        {rows.length > 0 ? (
          rows.map((row, rIdx) => (
            <View
              key={rIdx}
              style={{
                flexDirection: 'row',
                borderBottomWidth: rIdx < rows.length - 1 ? Math.max(1, W * 0.0022) : 0,
                borderColor: POSTER_COLORS.divider,
              }}
            >
              {renderGroup(row.left, true)}
              {renderGroup(row.right, false)}
            </View>
          ))
        ) : (
          <Text style={{ fontFamily: 'serif', fontSize: W * 0.034, color: '#aaaaaa', textAlign: 'center' }}>
            Pilih menu untuk ditampilkan
          </Text>
        )}
      </View>

      <View>
        {c.showMenuNote && c.menuNote.trim() ? (
          <Text
            numberOfLines={1}
            style={{
              marginBottom: W * 0.026,
              fontFamily: 'DMSans_700Bold',
              fontSize: W * 0.017,
              letterSpacing: W * 0.0035,
              color: POSTER_COLORS.red,
              textAlign: 'center',
            }}
          >
            {c.menuNote.trim().toUpperCase()}
          </Text>
        ) : null}
        <OrderFooter
          W={W}
          text={c.orderText}
          phone={c.phone}
          showCta={c.showFooterCta}
          showWhatsappBadge={c.showWhatsappBadge}
        />
      </View>
    </View>
  );
}

interface Props {
  template: PosterTemplateDef;
  content: PosterContent;
  width: number;
}

export const PosterTemplate = forwardRef<React.ElementRef<typeof View>, Props>(function PosterTemplate(
  { template, content, width: W },
  ref,
) {
  const H = W * RATIO_ASPECT[template.ratio];
  const props: LayoutProps = { W, H, c: content };

  let layout: ReactNode;
  switch (template.id) {
    case 'story-4':
      layout = <StoryPhotosLayout {...props} count={4} />;
      break;
    case 'story-3':
      layout = <StoryPhotosLayout {...props} count={3} />;
      break;
    case 'story-2':
      layout = <StoryPhotosLayout {...props} count={2} />;
      break;
    case 'story-1':
      layout = <StoryPhotosLayout {...props} count={1} />;
      break;
    case 'feed-1':
      layout = <FeedSingleLayout {...props} />;
      break;
    case 'story-list':
      layout = <StoryTextMenuLayout {...props} />;
      break;
  }

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: W,
        height: H,
        backgroundColor: POSTER_COLORS.paper,
        overflow: 'hidden',
      }}
    >
      <DoubleFrame W={W} />
      {layout}
    </View>
  );
});