import { memo, useCallback, useRef, useState } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { apothecary } from '@/theme/apothecary';
import { s } from '@/theme/scale';
import { Icon, type IconName } from '../Icon';
import { useTapHandler } from '../hooks/useTapHandler';
import { SettingRow } from './SettingRow';
import {
  MENU_GAP,
  MENU_MARGIN,
  MENU_WIDTH,
  TIP_WIDTH,
  styles,
} from './SettingSelect.styles';

export interface SelectOption {
  id: string;
  label: string;
  /** Behind an `i`, not printed under the label. Omit and no `i` is drawn. */
  detail?: string;
}

/** A measured rectangle in window coordinates, as `measureInWindow` gives it. */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A floating layer's resolved position, in window coordinates.
 *
 * The menu is placed by its right edge and the note by its left, and that is a
 * real difference rather than a stylistic one: a menu hangs off the control it
 * belongs to, so its right edge is the fixed point, while a note points at one
 * glyph and wants to sit centred under it.
 */
interface Placement {
  top: number;
  right?: number;
  left?: number;
}

/**
 * A settings row that names its current value and opens a menu to change it.
 *
 * It replaced a segmented control, and the reason is width rather than taste.
 * Three side-by-side buttons cannot share a row with a label, so the control
 * had to sit on its own line underneath — which made one row twice the height
 * of every other row in the drawer.
 *
 * The menu **floats**; it does not unfold in place. Expanding inline was tried
 * first and it moves the page: every row below jumps down, the section the row
 * belongs to doubles in height, and choosing an option shoves everything back.
 * A menu pinned under the chevron leaves the drawer exactly where it was, so
 * the only thing that changes on screen is the thing you are changing.
 *
 * It renders inside a `Modal` rather than absolutely inside the drawer, and
 * that is not decoration: the rows live in a `ScrollView`, which clips its
 * children and scrolls them. Positioned there, a menu would be cut off at the
 * section edge and would slide away under a scroll. A modal draws in its own
 * window above all of it — and it is one modal for both layers, so the tooltip
 * below can sit above the menu rather than behind it.
 *
 * `onChange` may decline: mode changes here raise a confirmation and only
 * apply if the player agrees. So this closes on selection but never assumes
 * the value moved — the caller owns `value`, and the tick follows it.
 */
export const SettingSelect = memo(function SettingSelect({
  icon,
  label,
  options,
  value,
  onChange,
  divider = true,
}: {
  icon: IconName;
  label: string;
  options: readonly SelectOption[];
  value: string;
  onChange: (id: string) => void;
  divider?: boolean;
}) {
  const [anchor, setAnchor] = useState<Placement | null>(null);
  // `id` is carried so the `i` that opened the note can recognise its own and
  // close it, rather than re-opening what is already on screen.
  const [tip, setTip] = useState<(Placement & { id: string; text: string }) | null>(null);
  const { width, height } = useWindowDimensions();
  const mark = useRef<View>(null);

  /** Right-aligned to whatever opened it, and kept inside both screen edges. */
  const alignRight = useCallback(
    (rect: Rect, boxWidth: number): number =>
      Math.min(
        Math.max(MENU_MARGIN, width - (rect.x + rect.w)),
        width - boxWidth - MENU_MARGIN
      ),
    [width]
  );

  /**
   * Centred on whatever opened it, and kept inside both screen edges.
   *
   * The clamp is why this returns a `left` rather than a `marginLeft` on a
   * centred box: an `i` near the panel edge would centre a 208dp note half off
   * screen, and a box that has been nudged back in is no longer centred on
   * anything. Left edge and a clamp says both things at once.
   */
  const alignCentre = useCallback(
    (rect: Rect, boxWidth: number): number =>
      Math.min(
        Math.max(MENU_MARGIN, rect.x + rect.w / 2 - boxWidth / 2),
        width - boxWidth - MENU_MARGIN
      ),
    [width]
  );

  const open = useCallback(() => {
    // Measured at press rather than on layout: the drawer slides in, and a
    // position read while it was still moving would pin the menu to where the
    // chevron used to be.
    mark.current?.measureInWindow((x, y, w, h) => {
      setTip(null);
      setAnchor({
        right: alignRight({ x, y, w, h }, MENU_WIDTH),
        // Clamped so a row near the bottom of a long drawer cannot push the
        // menu off screen. `height` is the window, not the panel.
        top: Math.min(y + h + MENU_GAP, height - MENU_MARGIN - options.length * s(44)),
      });
    });
  }, [alignRight, height, options.length]);

  /**
   * A press outside takes one layer, not both.
   *
   * With a note open, the note is the thing in front of you, so it is what a
   * press away from it dismisses — the menu behind is still the list you were
   * reading about, and closing it too would mean re-opening it to carry on
   * choosing. A second press closes the menu.
   */
  const dismiss = useCallback(() => {
    if (tip) {
      setTip(null);
      return;
    }
    setAnchor(null);
  }, [tip]);

  /** Both layers at once, for a selection that ends the interaction. */
  const closeAll = useCallback(() => {
    setAnchor(null);
    setTip(null);
  }, []);

  const choose = useCallback(
    (id: string) => {
      closeAll();
      if (id !== value) onChange(id);
    },
    [closeAll, onChange, value]
  );

  /**
   * The explanation, as a note beside the `i` that raised it.
   *
   * A dialog was tried and is the wrong weight: a modal takes the whole screen,
   * dims everything, and has to be dismissed with a button — for one sentence
   * about one option. It also has to close the menu to appear, so answering
   * "what is Hard?" cost the player the list they were choosing from.
   *
   * A note leaves the menu open and up, so the sentence and the option it
   * describes are on screen together, and the next tap anywhere puts it away.
   */
  const explain = useCallback(
    (option: SelectOption, rect: Rect) => {
      setTip((showing) =>
        // The same `i` again puts its note away. A glyph that only ever opens
        // gives the player no way back except pressing somewhere else, and the
        // thing they would press first is the control they just used.
        showing?.id === option.id
          ? null
          : {
              id: option.id,
              text: option.detail ?? '',
              left: alignCentre(rect, TIP_WIDTH),
              top: Math.min(rect.y + rect.h + MENU_GAP, height - MENU_MARGIN - s(76)),
            }
      );
    },
    [alignCentre, height]
  );

  const selected = options.find((option) => option.id === value);

  return (
    <>
      <SettingRow
        icon={icon}
        label={label}
        onPress={open}
        divider={divider}
        chevron={false}
      >
        <Text style={styles.value} numberOfLines={1}>
          {selected?.label ?? value}
        </Text>
        <View ref={mark} collapsable={false}>
          <Icon name="expand" size={s(18)} color={apothecary.inkMuted} />
        </View>
      </SettingRow>

      <Modal
        visible={anchor !== null}
        transparent
        animationType="none"
        onRequestClose={dismiss}
      >
        {/* Pressing away closes, and is deliberately not wrapped in a tap
            handler — dismissing by pressing outside is the one press in the app
            that should feel like nothing happened. */}
        <Pressable style={styles.backdrop} onPress={dismiss}>
          {anchor ? (
            <Animated.View
              entering={FadeIn.duration(120)}
              style={[styles.menu, { top: anchor.top, right: anchor.right }]}
            >
              {options.map((option) => (
                <Option
                  key={option.id}
                  option={option}
                  on={option.id === value}
                  onPress={choose}
                  onExplain={explain}
                />
              ))}
            </Animated.View>
          ) : null}

          {/* After the menu in the tree, so it draws over it — the `i` for the
              last option sits close enough that a note placed under it would
              otherwise be hidden by the menu's own edge. */}
          {tip ? (
            <Animated.View
              entering={FadeIn.duration(120)}
              style={[styles.tip, { top: tip.top, left: tip.left }]}
              pointerEvents="none"
            >
              <Text style={styles.tipText}>{tip.text}</Text>
            </Animated.View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
});

const Option = memo(function Option({
  option,
  on,
  onPress,
  onExplain,
}: {
  option: SelectOption;
  on: boolean;
  onPress: (id: string) => void;
  onExplain: (option: SelectOption, rect: Rect) => void;
}) {
  const info = useRef<View>(null);

  const choose = useCallback(() => onPress(option.id), [onPress, option.id]);
  // Silent, like the rest of the chrome: vibration means something happened on
  // the board, and a menu that buzzes back is the noise that made the setting
  // feel broken.
  const handlePress = useTapHandler(choose);

  const explain = useTapHandler(
    useCallback(() => {
      // Measured here rather than kept by the parent: the note is pinned to
      // this glyph, and only this component knows where its own glyph landed.
      info.current?.measureInWindow((x, y, w, h) => onExplain(option, { x, y, w, h }));
    }, [onExplain, option])
  );

  return (
    <View style={styles.option}>
      <Pressable
        onPress={handlePress}
        // The option you are already on is not a control. Disabling it keeps
        // the press silent, rather than greying it and still taking the tap.
        disabled={on}
        style={styles.optionPress}
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        accessibilityLabel={option.label}
      >
        <Text style={[styles.optionLabel, on && styles.optionLabelOn]} numberOfLines={1}>
          {option.label}
        </Text>
      </Pressable>

      {/* Against the last letter of the name, not out at the edge — it belongs
          to the word it explains, and the right edge belongs to the tick. */}
      {option.detail ? (
        <Pressable
          ref={info}
          collapsable={false}
          onPress={explain}
          // Its own control, and a small one, so the target is grown with
          // `hitSlop` rather than padding, which would make the row taller.
          hitSlop={s(10)}
          accessibilityRole="button"
          accessibilityLabel={`About ${option.label}`}
        >
          <Icon name="info" size={s(14)} color={apothecary.inkMuted} />
        </Pressable>
      ) : null}

      {/* Selects as well, so the empty middle of the row is not dead space. */}
      <Pressable
        onPress={handlePress}
        disabled={on}
        style={styles.optionRest}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <View style={styles.tick}>
          {on ? <Icon name="check" size={s(14)} color={apothecary.goldLight} /> : null}
        </View>
      </Pressable>
    </View>
  );
});
