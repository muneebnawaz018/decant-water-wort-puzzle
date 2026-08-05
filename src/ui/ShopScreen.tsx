import { memo, useCallback } from 'react';
import { Text, View } from 'react-native';

import { overlay } from '@/state/overlayStore';
import { colours } from '@/theme/colors';
import { CoinPill } from './chrome/CoinPill';
import { GlossButton } from './chrome/GlossButton';
import { Panel } from './chrome/Panel';
import { ScrollPage } from './chrome/ScrollPage';
import { SoonBadge } from './chrome/SoonBadge';
import { SoonOverlay } from './chrome/SoonOverlay';
import { SettingGroup } from './chrome/SettingRow';
import { styles } from './styles/ShopScreen.styles';

/**
 * Vial skins. Cosmetic only — spec §4.7 is explicit that nothing here may
 * affect play, and the swatches are drawn from the liquid palette rather than
 * shipped as art.
 *
 * Marked "Soon" until the board actually renders one. A shop that takes coins
 * for something invisible is worse than a shop that says it is not ready.
 */
const SKINS = [
  {
    id: 'skin.ocean',
    name: 'Ocean glass',
    swatch: [colours.aqua, colours.teal, colours.blueberry],
  },
  {
    id: 'skin.sunset',
    name: 'Sunset glass',
    swatch: [colours.coral, colours.mango, colours.tangerine],
  },
  {
    id: 'skin.berry',
    name: 'Berry glass',
    swatch: [colours.plum, colours.rose, colours.grape],
  },
  {
    id: 'skin.meadow',
    name: 'Meadow glass',
    swatch: [colours.lime, colours.teal, colours.aqua],
  },
] as const;

const SKIN_PRICE = 200;

export const ShopScreen = memo(function ShopScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScrollPage title="Shop" onBack={onBack} trailing={<CoinPill />}>
      <Text style={styles.groupTitle}>Vial skins</Text>
      <View style={styles.grid}>
        {SKINS.map((skin) => (
          <SkinTile key={skin.id} {...skin} />
        ))}
      </View>

      <SettingGroup title="Extras">
        <ExtraRow label="Remove ads forever" price="$2.99" />
        <ExtraRow label="Coin pack · 1000" price="$1.99" last />
      </SettingGroup>
    </ScrollPage>
  );
});

const SkinTile = memo(function SkinTile({
  name,
  swatch,
}: {
  name: string;
  swatch: readonly string[];
}) {
  // Nothing reads `owned` yet — the renderer paints from the palette, not from
  // a skin — so a purchase here would take 200 coins and change nothing on
  // screen. Until the board honours a skin, this previews and does not sell.
  const preview = useCallback(() => {
    overlay.toast(`${name} arrives in a later update`);
  }, [name]);

  return (
    <View style={styles.tileSlot}>
      <Panel contentStyle={styles.tile}>
        <View style={styles.preview}>
          {/* Over the swatches only. Veiling the whole card buried the skin's
              name and muddied the colours, which are the one thing worth
              previewing. */}
          <SoonOverlay />
          {swatch.map((colour) => (
            <View
              key={colour}
              style={[styles.swatch, { backgroundColor: colour, shadowColor: colour }]}
            />
          ))}
        </View>
        <Text style={styles.tileName}>{name}</Text>
        <GlossButton
          label={`${SKIN_PRICE} coins`}
          variant="ghost"
          onPress={preview}
          compact
          style={styles.buy}
        />
      </Panel>
    </View>
  );
});

const ExtraRow = memo(function ExtraRow({
  label,
  price,
  last = false,
}: {
  label: string;
  price: string;
  last?: boolean;
}) {
  const buy = useCallback(() => {
    // Real-money purchases need a store SDK; spec §10 puts that in phase 2.
    overlay.toast('Purchases arrive in a later update');
  }, []);

  return (
    <View style={[styles.extra, !last && styles.extraDivider]}>
      <Text style={styles.extraLabel}>{label}</Text>
      <SoonBadge />
      <GlossButton
        label={price}
        variant="ghost"
        onPress={buy}
        compact
        style={styles.extraBuy}
      />
    </View>
  );
});
