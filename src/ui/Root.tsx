import { useCallback, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients } from '@/theme/colors';

import { useGameStore } from '@/state/gameStore';
import { Backdrop } from './chrome/Backdrop';
import { NavBar, type NavDestination } from './chrome/NavBar';
import { Overlays } from './chrome/Overlays';
import { CompleteScreen } from './CompleteScreen';
import { DailyScreen } from './DailyScreen';
import { usePoppins } from './fonts';
import { hideNativeSplash } from './nativeSplash';
import { GameScreen } from './GameScreen';
import { HomeScreen } from './HomeScreen';
import { ScreenTransition } from './ScreenTransition';
import { SettingsScreen } from './SettingsScreen';
import { ShopScreen } from './ShopScreen';
import { SplashScreen } from './SplashScreen';
import { StagesScreen } from './StagesScreen';
import { StatsScreen } from './StatsScreen';
import { styles } from './styles/Root.styles';

type Screen = 'splash' | 'home' | 'game' | 'complete' | NavDestination;

/**
 * Where the bottom bar is shown.
 *
 * Everywhere except the three screens that own the whole display: the splash,
 * the board — where a stray tap on a nav item mid-pour would be a lost move —
 * and the win screen, which has its own two buttons and a home icon.
 */
const WITH_NAV: ReadonlySet<Screen> = new Set<Screen>([
  'home',
  'stages',
  'settings',
  'daily',
  'shop',
  'stats',
]);

/** Screens deeper than home slide in; returning home crossfades. */
const FORWARD: ReadonlySet<Screen> = new Set<Screen>([
  'game',
  'stages',
  'settings',
  'daily',
  'shop',
  'stats',
]);

/**
 * Screens are mounted one at a time rather than stacked. An unmounted screen
 * cannot re-render, animate, or hold a Skia surface — which is the cheapest
 * possible answer to "don't burn GPU on things nobody is looking at".
 *
 * The backdrop is the exception: it sits outside the transition so it survives
 * navigation. Remounting it would restart the mote drift and pay for a fresh
 * Skia surface every time the player opened a menu.
 */
export function Root() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('splash');
  const fontsReady = usePoppins();
  const handedOff = useRef(false);

  // The native splash stays up until there is a real frame to replace it with.
  // `onLayout` fires once this tree has been measured, which is the closest
  // signal React gives to "something is actually on screen" — hiding any
  // earlier shows the background colour for a beat and reads as a stutter.
  const onFirstLayout = useCallback(() => {
    if (handedOff.current) return;
    handedOff.current = true;
    hideNativeSplash();
  }, []);

  const showHome = useCallback(() => setScreen('home'), []);
  const showGame = useCallback(() => setScreen('game'), []);
  const showStages = useCallback(() => setScreen('stages'), []);
  const showComplete = useCallback(() => setScreen('complete'), []);
  const navigate = useCallback((destination: NavDestination) => setScreen(destination), []);

  const replay = useCallback(() => {
    useGameStore.getState().restart();
    setScreen('game');
  }, []);

  const nextLevel = useCallback(() => {
    useGameStore.getState().nextLevel();
    setScreen('game');
  }, []);

  // Poppins carries the whole visual identity; rendering a frame in the system
  // font would flash and then reflow every screen once the real face landed.
  if (!fontsReady) {
    // No `onLayout` here on purpose: the native splash covers this frame, and
    // handing off to a blank view would flash the ground colour before the
    // fonts land.
    return <View style={styles.blank} />;
  }

  return (
    <View style={styles.root} onLayout={onFirstLayout}>
      <Backdrop width={width} height={height} still={screen === 'game'} />

      {screen === 'splash' ? (
        <SplashScreen onDone={showHome} />
      ) : (
        <ScreenTransition
          transitionKey={screen}
          direction={FORWARD.has(screen) ? 'forward' : 'fade'}
        >
          {screen === 'home' ? (
            <HomeScreen onPlay={showGame} onNavigate={navigate} />
          ) : null}

          {screen === 'stages' ? (
            <StagesScreen onBack={showHome} onPick={showGame} />
          ) : null}

          {screen === 'settings' ? <SettingsScreen onClose={showHome} /> : null}

          {screen === 'daily' ? (
            <DailyScreen onBack={showHome} onPlayBonus={showGame} />
          ) : null}

          {screen === 'shop' ? <ShopScreen onBack={showHome} /> : null}

          {screen === 'stats' ? <StatsScreen onBack={showHome} /> : null}

          {screen === 'game' ? (
            <GameScreen
              width={width}
              height={height}
              onExit={showStages}
              onSolved={showComplete}
            />
          ) : null}

          {screen === 'complete' ? (
            <CompleteScreen onHome={showHome} onReplay={replay} onNext={nextLevel} />
          ) : null}
        </ScreenTransition>
      )}

      {WITH_NAV.has(screen) ? (
        <View style={[styles.navSlot, { paddingBottom: insets.bottom + 10 }]}>
          {/* Content scrolls *under* a floating bar. An opaque bar hides it
              once it is behind, but the moment of sliding into the edge still
              reads as a glitch — so it fades out into the ground first. */}
          <LinearGradient
            colors={gradients.navFade}
            style={styles.navFade}
            pointerEvents="none"
          />
          {/* Mounted here rather than inside each screen: one gradient, one
              entrance, and navigating never restarts it. `active` is the
              current screen, so the bar always says where you are. */}
          <NavBar
            onNavigate={navigate}
            active={screen === 'home' ? undefined : (screen as NavDestination)}
          />
        </View>
      ) : null}

      <Overlays />
    </View>
  );
}
