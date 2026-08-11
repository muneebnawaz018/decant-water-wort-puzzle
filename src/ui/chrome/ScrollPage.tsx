import { memo, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { overlay } from '@/state/overlayStore';
import { useScreenPadding } from '../hooks/useScreenPadding';
import { CoinPill } from './CoinPill';
import { ChromeIconButton, ScreenHeader } from './ScreenHeader';
import { styles } from './styles/ScrollPage.styles';

interface ScrollPageProps {
  title: string;
  /** Omitted on the nav bar's own destinations — see `ScreenHeader`. */
  onBack?: () => void;
  /** Rendered at the right end of the header, beside the drawer handle. */
  trailing?: ReactNode;
  children: ReactNode;
}

/**
 * The shape every screen below Home shares (spec §4): safe-area top, a header,
 * then a scrolling body that clears the home indicator.
 *
 * Settings, Shop, Stats and Daily were each repeating this by hand, down to the
 * same `insets.bottom + 30`. One component means a change to the page frame is
 * a change in one place, and a screen becomes only its own content.
 */
export const ScrollPage = memo(function ScrollPage({
  title,
  onBack,
  trailing,
  children,
}: ScrollPageProps) {
  const padding = useScreenPadding();

  return (
    // `sides` on the frame rather than on the scroll content, so the header and
    // the body are inset together and a cutout cannot clip one but not the
    // other.
    <View style={[styles.root, padding.top, padding.sides]}>
      {/*
        Every page carries the drawer handle, not just Home.

        Settings stopped being a place you navigate to when it became a drawer,
        and a handle that only exists on Home would put it back — you would
        leave the shop, go home, open settings, and come back. A detour has to
        be available from wherever you are, or it is a destination again.
      */}
      <ScreenHeader
        title={title}
        onBack={onBack}
        leading={<CoinPill />}
        trailing={
          <>
            {trailing}
            <ChromeIconButton icon="menu" onPress={overlay.drawer} label="Settings" />
          </>
        }
      />

      <ScrollView
        style={styles.page}
        // The nav bar floats over every screen below Home, so the last card
        // has to be scrollable clear of it.
        contentContainerStyle={[styles.content, padding.scrollTailWithNav]}
        showsVerticalScrollIndicator={false}
        /*
          A tap on a button with the keyboard up presses the button.

          React Native defaults this to `never`, which spends the first tap
          dismissing the keyboard and swallows it — so a button under an open
          keyboard needs pressing twice, and the first press looks broken.
          `handled` gives the tap to whatever child handles it and still
          dismisses the keyboard on a tap that lands on nothing.
        */
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
});
