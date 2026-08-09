import { memo, useCallback, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

import { SkinPreview } from '@/render/SkinPreview';
import { overlay } from '@/state/overlayStore';
import { useSettingsStore } from '@/state/settingsStore';
import { SKINS, type Skin } from '@/theme/skins';
import { GlossButton } from './chrome/GlossButton';
import { Panel } from './chrome/Panel';
import { ScrollPage } from './chrome/ScrollPage';
import { SoonBadge } from './chrome/SoonBadge';
import { SettingGroup } from './chrome/SettingRow';
import { section } from './chrome/styles/section.styles';
import { PREVIEW_HEIGHT, styles } from './styles/ShopScreen.styles';
import { PRODUCTS } from '@/game/economy';

/**
 * The shop, spec §4.7. Cosmetic only — nothing here may affect play.
 *
 * What it sells is the **shape of the glass**, not its colour. The four
 * "Ocean / Sunset / Berry / Meadow glass" entries this replaces were palettes,
 * and a palette is the one cosmetic this game cannot sell: board colours are
 * chosen for separation and pinned by a test that fails if any two come within
 * ΔE 30, the colourblind glyphs are index-aligned to that same order, and a
 * purchase that repaints them puts an accessibility guarantee behind a paywall.
 * A silhouette touches none of it.
 *
 * **One vessel, and nothing for sale.** Three more shapes used to sit here, two
 * of them veiled as "coming soon" — see `theme/skins.ts` for why they went.
 * The remaining tile is not decoration: it is the glass the board is drawn in,
 * and showing it is what makes the section mean something the day a second
 * shape lands.
 */
export const ShopScreen = memo(function ShopScreen() {
  const equipped = useSettingsStore((state) => state.skin);

  return (
    <ScrollPage title="Shop">
      <Text style={section.title}>Vial skins</Text>
      <View style={styles.grid}>
        {SKINS.map((skin) => (
          <SkinTile
            key={skin.id}
            skin={skin}
            equipped={skin.id === equipped}
            solo={SKINS.length === 1}
          />
        ))}
      </View>

      <SettingGroup title="Extras">
        <ExtraRow label="Remove ads forever" price={PRODUCTS.removeAdsPrice} />
        <ExtraRow
          label={`Coin pack · ${PRODUCTS.coinPackSize.toLocaleString()}`}
          price={PRODUCTS.coinPackPrice}
          last
        />
      </SettingGroup>
    </ScrollPage>
  );
});

const SkinTile = memo(function SkinTile({
  skin,
  equipped,
  solo,
}: {
  skin: Skin;
  equipped: boolean;
  /** The only vessel in the catalogue, so the card takes the whole row. */
  solo: boolean;
}) {
  // Skia draws to a sized surface, so the preview cannot be a flex child that
  // works out its own width. The card measures itself once and hands the
  // number down.
  const [width, setWidth] = useState(0);
  const measure = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const press = useCallback(() => {
    useSettingsStore.getState().set('skin', skin.id);
    overlay.toast(`${skin.name} equipped`);
  }, [skin]);

  return (
    <View style={[styles.tileSlot, solo && styles.tileSlotSolo]}>
      <Panel contentStyle={styles.tile}>
        <View style={styles.preview} onLayout={measure}>
          <SkinPreview vessel={skin.vessel} width={width} height={PREVIEW_HEIGHT} />
        </View>

        <Text style={styles.tileName}>{skin.name}</Text>
        <Text style={styles.tileBlurb} numberOfLines={1}>
          {skin.blurb}
        </Text>

        {/*
          The state of the thing rather than a price. "Equipped" is disabled on
          purpose — a button that is already what it says takes a press and does
          nothing, and a dead control is silent for free because a disabled
          `Pressable` never fires `onPress`.
        */}
        <GlossButton
          label={equipped ? 'Equipped' : 'Equip'}
          variant={equipped ? 'primary' : 'ghost'}
          onPress={press}
          disabled={equipped}
          on={equipped}
          size="compact"
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
        size="compact"
        style={styles.extraBuy}
      />
    </View>
  );
});
