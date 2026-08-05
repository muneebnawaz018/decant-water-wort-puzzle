import { memo, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { useScreenPadding } from '../hooks/useScreenPadding';
import { ScreenHeader } from './ScreenHeader';
import { styles } from './styles/ScrollPage.styles';

interface ScrollPageProps {
  title: string;
  onBack: () => void;
  /** Rendered at the right end of the header — a coin pill, usually. */
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
      <ScreenHeader title={title} onBack={onBack} trailing={trailing} />

      <ScrollView
        style={styles.page}
        // The nav bar floats over every screen below Home, so the last card
        // has to be scrollable clear of it.
        contentContainerStyle={[styles.content, padding.scrollTailWithNav]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
});
