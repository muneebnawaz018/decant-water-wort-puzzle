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
import { SoonOverlay } from './chrome/SoonOverlay';
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
 * Two ship unlocked and two are locked. The free pair is what makes the feature
 * real on a fresh install: with one default there is nothing to switch between,
 * so the first thing the shop would ever do is ask for money for a control the
 * player has never seen work.
 */
export const ShopScreen = memo(function ShopScreen() {
  const equipped = useSettingsStore((state) => state.skin);

  return (
    <ScrollPage title="Shop">
      <Text style={section.title}>Vial skins</Text>
      <View style={styles.grid}>
        {SKINS.map((skin) => (
          <SkinTile key={skin.id} skin={skin} equipped={skin.id === equipped} />
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
}: {
  skin: Skin;
  equipped: boolean;
}) {
  // Skia draws to a sized surface, so the preview cannot be a flex child that
  // works out its own width. The card measures itself once and hands the
  // number down.
  const [width, setWidth] = useState(0);
  const measure = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const locked = skin.price !== null;

  const press = useCallback(() => {
    if (skin.price !== null) {
      // Locked skins are previews, not purchases. Nothing spends `owned` yet,
      // so a Buy here would take the coins and equip nothing.
      overlay.toast(`${skin.name} arrives in a later update`);
      return;
    }
    useSettingsStore.getState().set('skin', skin.id);
    overlay.toast(`${skin.name} equipped`);
  }, [skin]);

  return (
    <View style={styles.tileSlot}>
      <Panel contentStyle={styles.tile}>
        <View style={styles.preview} onLayout={measure}>
          {/* Over the artwork only. Veiling the whole card buried the name and
              the price, which are the part worth reading on a locked row. */}
          {locked ? <SoonOverlay /> : null}
          <SkinPreview vessel={skin.vessel} width={width} height={PREVIEW_HEIGHT} />
        </View>

        <Text style={styles.tileName}>{skin.name}</Text>
        <Text style={styles.tileBlurb} numberOfLines={1}>
          {skin.blurb}
        </Text>

        {/*
          The free skins carry the state of the thing rather than a price.
          "Equipped" is disabled on purpose — a button that is already what it
          says takes a press and does nothing, and a dead control is silent for
          free because a disabled `Pressable` never fires `onPress`.
        */}
        <GlossButton
          label={
            locked
              ? `${skin.price!.toLocaleString()} coins`
              : equipped
                ? 'Equipped'
                : 'Equip'
          }
          variant={equipped ? 'primary' : 'ghost'}
          onPress={press}
          disabled={equipped}
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
