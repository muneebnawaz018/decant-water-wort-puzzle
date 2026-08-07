import { useCallback, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients } from '@/theme/colors';
import { s } from '@/theme/scale';

import { useGameStore } from '@/state/gameStore';
import { useOverlayStore } from '@/state/overlayStore';
import { useAndroidBack } from './hooks/useAndroidBack';
import { Backdrop } from './chrome/Backdrop';
import { NavBar, type NavDestination } from './chrome/NavBar';
import { Overlays } from './chrome/Overlays';
import { CompleteScreen } from './CompleteScreen';
import { confirmExitLevel } from './confirmExitLevel';
import { DailyScreen } from './DailyScreen';
import { usePoppins } from './fonts';
import { hideNativeSplash } from './nativeSplash';
import { GameScreen } from './GameScreen';
import { useNotifications } from './hooks/useNotifications';
import { HomeScreen } from './HomeScreen';
import { ScreenTransition } from './ScreenTransition';
import { SettingsDrawer } from './chrome/SettingsDrawer';
import { ShopScreen } from './ShopScreen';
import { SplashScreen } from './SplashScreen';
import { StagesScreen } from './StagesScreen';
import { StatsScreen } from './StatsScreen';
import { styles } from './styles/Root.styles';

type Screen = 'splash' | 'home' | 'game' | 'complete' | NavDestination;

/**
 * Where the bottom bar is shown.
 *
 * Everywhere except the two screens that own the whole display: the splash, and
 * the board — where a stray tap on a nav item mid-pour would be a lost move.
 *
 * The win screen used to be excluded too, on the grounds that it has its own
 * two buttons and a home icon. In practice it is the most common place to want
 * to go somewhere else — you have just been paid coins, so the shop and the
 * daily track are exactly what is on your mind — and hiding the bar there made
 * it the one screen you had to back out of first.
 */
const WITH_NAV: ReadonlySet<Screen> = new Set<Screen>([
  'home',
  'complete',
  'stages',
  'daily',
  'shop',
  'stats',
]);

/** Screens deeper than home slide in; returning home crossfades. */
const FORWARD: ReadonlySet<Screen> = new Set<Screen>([
  'game',
  'stages',
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
  useNotifications();
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
  /** Both ways off the board confirm first once it has been played on. */
  const exitGame = useCallback(() => confirmExitLevel(showStages), [showStages]);
  const showComplete = useCallback(() => setScreen('complete'), []);
  const navigate = useCallback((destination: NavDestination) => setScreen(destination), []);

  /**
   * Android's back press, screen by screen.
   *
   * An open modal takes it first — dismissing the thing in front of you is what
   * back means everywhere else on the platform, and a dialog that survives it
   * feels stuck. The splash swallows it rather than letting a press during the
   * two-second intro close the app.
   *
   * Every screen below home returns home, which is what its own back button
   * does, so the two cannot disagree. The board goes through the same exit
   * control its header button does, so a half-solved level asks before it is
   * left either way — the position is saved, but a back press forty moves in
   * is nearly always a mis-tap and nothing on screen says so.
   */
  const handleBack = useCallback(() => {
    if (useOverlayStore.getState().modal !== null) {
      useOverlayStore.getState().closeModal();
      return true;
    }
    // The drawer takes it after a modal and before any screen: it is the
    // frontmost surface, and back means "dismiss what is in front of me".
    if (useOverlayStore.getState().drawer) {
      useOverlayStore.getState().closeDrawer();
      return true;
    }
    if (screen === 'home') return false;
    if (screen === 'splash') return true;
    if (screen === 'game') {
      exitGame();
      return true;
    }
    setScreen('home');
    return true;
  }, [screen, exitGame]);

  useAndroidBack(handleBack);

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

          {screen === 'daily' ? (
            <DailyScreen onBack={showHome} onPlayBonus={showGame} />
          ) : null}

          {screen === 'shop' ? <ShopScreen onBack={showHome} /> : null}

          {screen === 'stats' ? <StatsScreen onBack={showHome} /> : null}

          {screen === 'game' ? (
            <GameScreen
              width={width}
              height={height}
              onExit={exitGame}
              onSolved={showComplete}
            />
          ) : null}

          {screen === 'complete' ? (
            <CompleteScreen onHome={showHome} onReplay={replay} onNext={nextLevel} />
          ) : null}
        </ScreenTransition>
      )}

      {WITH_NAV.has(screen) ? (
        <View style={[styles.navSlot, { paddingBottom: insets.bottom + s(10) }]}>
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
            onHome={showHome}
            windowWidth={width}
            sideInset={insets.left + insets.right}
            active={
              screen === 'home' || screen === 'complete'
                ? undefined
                : (screen as NavDestination)
            }
          />
        </View>
      ) : null}

      {/* Above the nav bar and the screens, below the modal. Settings is a
          detour over whatever you were doing, so nothing under it unmounts. */}
      <SettingsDrawer />

      <Overlays />
    </View>
  );
}
