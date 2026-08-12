import { memo, useCallback, useMemo, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

import { SkinPreview } from '@/render/SkinPreview';
import { useEconomyStore } from '@/state/economyStore';
import { overlay } from '@/state/overlayStore';
import { furthestAcrossModes, loadProgress } from '@/state/progress';
import { useSettingsStore } from '@/state/settingsStore';
import { skinAccess, SKINS, type Skin } from '@/theme/skins';
import { GlossButton } from './chrome/GlossButton';
import { Panel } from './chrome/Panel';
import { ScrollPage } from './chrome/ScrollPage';
import { SoonBadge } from './chrome/SoonBadge';
import { SettingGroup } from './chrome/SettingRow';
import { section } from './chrome/styles/section.styles';
import { PREVIEW_HEIGHT, styles } from './styles/ShopScreen.styles';
import { PRODUCTS, SKIN_PRICES } from '@/game/economy';

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
 * The catalogue is `docs/05-skins.md`'s slice one: the default, a free ladder
 * that unlocks by level, and one coin skin. Every tile shows its true state —
 * equippable, locked behind a level, or priced — and every control delivers
 * what it says. The "coming soon" veils that used to stand here taught the
 * player to ignore the shop, which is why nothing wears one now.
 */
export const ShopScreen = memo(function ShopScreen() {
  const equipped = useSettingsStore((state) => state.skin);
  // Purchases land here, so the tile flips from priced to equippable the
  // moment `buy` succeeds.
  const owned = useEconomyStore((state) => state.owned);
  // Read once per visit: the frontier cannot advance while the shop is open —
  // there is no board behind it — so subscribing would buy re-renders for a
  // value that cannot change.
  const furthest = useMemo(() => furthestAcrossModes(loadProgress()), []);

  return (
    <ScrollPage title="Shop">
      <Text style={section.title}>Vial skins</Text>
      <View style={styles.grid}>
        {SKINS.map((skin) => (
          <SkinTile
            key={skin.id}
            skin={skin}
            equipped={skin.id === equipped}
            furthest={furthest}
            owned={owned}
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
  furthest,
  owned,
}: {
  skin: Skin;
  equipped: boolean;
  furthest: number;
  owned: readonly string[];
}) {
  // Skia draws to a sized surface, so the preview cannot be a flex child that
  // works out its own width. The card measures itself once and hands the
  // number down.
  const [width, setWidth] = useState(0);
  const measure = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  const access = skinAccess(skin, furthest, owned);
  const price = SKIN_PRICES[skin.id];

  const equip = useCallback(() => {
    useSettingsStore.getState().set('skin', skin.id);
    overlay.toast(`${skin.name} equipped`);
  }, [skin]);

  /**
   * Buying is a confirm, not a tap — 1,500 coins is days of play, and the one
   * press that spends it should never be a mis-tap. The modal quotes the
   * price; the balance check happens on confirm, so the answer to "can I
   * afford it" is computed at the moment the coins actually move.
   */
  const buy = useCallback(() => {
    if (price === undefined) return;
    overlay.modal({
      title: skin.name,
      body: `Buy this vessel for ${price.toLocaleString()} coins? It stays yours forever.`,
      confirmLabel: 'Buy',
      onConfirm: () => {
        const store = useEconomyStore.getState();
        if (!store.buy(skin.id, price)) {
          overlay.toast(
            `Not enough coins — ${store.coins.toLocaleString()} of ${price.toLocaleString()}`
          );
          return;
        }
        // Bought is worn, immediately. A purchase that changes nothing on
        // screen is the failure the old shop was cut down to avoid.
        useSettingsStore.getState().set('skin', skin.id);
        overlay.toast(`${skin.name} equipped`);
      },
    });
  }, [skin, price]);

  /*
    One button, three truths. Each state's control does exactly what it says:
    "Equip" equips, the price buys, and the level row is genuinely disabled —
    a locked control that takes a press and does nothing reads as a broken
    game, and a disabled `Pressable` is silent for free.
  */
  const button =
    access.state === 'locked' ? (
      <GlossButton
        label={`Level ${access.level}`}
        variant="ghost"
        onPress={equip}
        disabled
        size="compact"
        style={styles.buy}
      />
    ) : access.state === 'forSale' ? (
      <GlossButton
        label={`${(price ?? 0).toLocaleString()} coins`}
        variant="neutral"
        onPress={buy}
        size="compact"
        style={styles.buy}
      />
    ) : (
      <GlossButton
        label={equipped ? 'Equipped' : 'Equip'}
        variant={equipped ? 'primary' : 'ghost'}
        onPress={equip}
        disabled={equipped}
        on={equipped}
        size="compact"
        style={styles.buy}
      />
    );

  return (
    <View style={styles.tileSlot}>
      <Panel contentStyle={styles.tile}>
        <View style={styles.preview} onLayout={measure}>
          <SkinPreview vessel={skin.vessel} width={width} height={PREVIEW_HEIGHT} />
        </View>

        <Text style={styles.tileName}>{skin.name}</Text>
        <Text style={styles.tileBlurb} numberOfLines={1}>
          {skin.blurb}
        </Text>

        {button}
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
