import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients } from '@/theme/colors';

import { showLevelInterstitial } from '@/ads/interstitial';
import { track } from '@/analytics';
import { primeSounds } from '@/audio/sounds';
import { useGameStore } from '@/state/gameStore';
import { useNavStore, type NavDestination } from '@/state/navStore';
import { useOverlayStore } from '@/state/overlayStore';
import { useAndroidBack } from './hooks/useAndroidBack';
import { Backdrop } from './chrome/Backdrop';
import { NavBar } from './chrome/NavBar';
import { NAV_OFFSET } from './chrome/NavBar.styles';
import { Overlays } from './chrome/Overlays';
import { CompleteScreen } from './CompleteScreen';
import { confirmExitLevel } from './confirmExitLevel';
import { DailyScreen } from './DailyScreen';
import { usePoppins } from './fonts';
import { hideNativeSplash } from './nativeSplash';
import { GameScreen } from './GameScreen';
import { useNotifications } from './hooks/useNotifications';
import { useAds } from './hooks/useAds';
import { useVisitStreak } from './hooks/useVisitStreak';
import { HomeScreen } from './HomeScreen';
import { ScreenTransition } from './ScreenTransition';
import { SettingsDrawer } from './chrome/SettingsDrawer';
import { ShopScreen } from './ShopScreen';
import { SplashScreen } from './SplashScreen';
import { StagesScreen } from './StagesScreen';
import { StatsScreen } from './StatsScreen';
import { styles } from './Root.styles';

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
  useVisitStreak();
  useAds();
  const handedOff = useRef(false);

  // The native splash stays up until there is a real frame to replace it with.
  // `onLayout` fires once this tree has been measured, which is the closest
  // signal React gives to "something is actually on screen" — hiding any
  // earlier shows the background colour for a beat and reads as a stutter.
  const onFirstLayout = useCallback(() => {
    if (handedOff.current) return;
    handedOff.current = true;
    hideNativeSplash();
    // Here rather than at the board, and rather than at import. Players load
    // their files asynchronously — and in development have to be fetched off
    // Metro to disk first — so one built at the moment it is first needed
    // plays nothing. This is the earliest point safely off the launch path.
    // Not awaited: nothing on screen depends on it, and a failure leaves the
    // game silent rather than broken.
    void primeSounds();
  }, []);

  const showHome = useCallback(() => setScreen('home'), []);

  /**
   * Where leaving the board goes back to: whichever screen opened it.
   *
   * A ref rather than state, because nothing renders from it — and changing it
   * must not re-render the board, which is the most expensive tree in the app.
   *
   * It used to be hardcoded to Stages, which was right for a level tile and
   * wrong everywhere else: Home's Continue card and the Rewards screen's bonus
   * row both dropped you on a screen you had not been to. "Back" that lands
   * somewhere you were never is worse than no back button, because it silently
   * moves you.
   */
  const gameOrigin = useRef<Screen>('home');

  /**
   * Whether the board on screen was opened as the daily brew.
   *
   * Paired with the store's own `bonus` flag by the effect below, which is the
   * only way to notice that the store is no longer the one this screen was
   * opened against.
   */
  const openedBonus = useRef(false);

  const showGame = useCallback((from: Screen, bonusBoard = false) => {
    gameOrigin.current = from;
    openedBonus.current = bonusBoard;
    setScreen('game');
  }, []);

  // One per entry point, so each screen hands over where it is rather than
  // taking a router. Bound here because a screen must not be able to claim it
  // was opened from somewhere it was not.
  // Home's Continue offers the record's level, so opening it has to load that
  // level — the board behind the win screen is the one just finished.
  const playFromHome = useCallback(() => {
    useGameStore.getState().resumeCurrent();
    showGame('home');
  }, [showGame]);
  const playFromStages = useCallback(() => showGame('stages'), [showGame]);
  /**
   * The bonus puzzle, which is a different board rather than a different route.
   *
   * `loadBonus` refuses when today's has already been played, and this respects
   * that refusal rather than navigating anyway — the row that raises it is
   * already unpressable in that state, so reaching here means the day turned
   * between the render and the tap, and opening the board would show yesterday's
   * position under a title that says today.
   */
  const playFromDaily = useCallback(() => {
    if (!useGameStore.getState().loadBonus(Date.now())) return;
    showGame('daily', true);
  }, [showGame]);

  /** Both ways off the board confirm first once it has been played on. */
  const exitGame = useCallback(
    () =>
      confirmExitLevel(() => {
        const { level, history, solved, bonus } = useGameStore.getState();
        if (!solved) track('level_abandon', { level, moves: history.length, bonus });
        setScreen(gameOrigin.current);
      }),
    []
  );
  const showComplete = useCallback(() => setScreen('complete'), []);
  const navigate = useCallback((destination: NavDestination) => setScreen(destination), []);

  /**
   * Leaves the board if the store stopped holding the board it was opened for.
   *
   * **This is a Fast Refresh guard, and it cannot fire in a release build.**
   * `screen` is React state and `gameOrigin` is a ref, so both survive a
   * refresh; `gameStore` is module state, so editing it — or anything it
   * imports — builds a *new* store, which initialises to `bonus: false` on the
   * mode's current level. Root goes on rendering the board, so a brew in
   * progress silently became whatever level Continue points at, and pours from
   * then on were recorded against that level. Nothing persists `screen`, so a
   * cold start always begins at the splash and no shipped path can reach this.
   *
   * Worth holding anyway: it costs one comparison, and the invariant it states
   * — the board may only be mounted while the store agrees which board it is —
   * is the thing that was quietly untrue.
   *
   * Only the brew/level distinction is checked, because that is the one the
   * store cannot recover on its own. A level rebuilds from its own record and
   * its session; the brew is deliberately never saved.
   */
  const bonusBoard = useGameStore((state) => state.bonus);
  useEffect(() => {
    if (screen !== 'game' || openedBonus.current === bonusBoard) return;
    openedBonus.current = bonusBoard;
    setScreen(gameOrigin.current);
  }, [screen, bonusBoard]);

  /**
   * Requests raised by chrome that has no route of its own — currently the coin
   * pill's shop shortcut, which is drawn on every page frame.
   *
   * Cleared as it is taken, so the same destination can be asked for twice.
   * `Root` still decides what mounts; the store only carries the ask.
   */
  useEffect(
    () =>
      // Subscribed to, not selected. A selector would put the request in this
      // component's render and the screen change in an effect reacting to it,
      // which is a cascading render — and the store is an external system, so
      // the callback form is the one React actually wants here.
      useNavStore.subscribe((state) => {
        if (state.request === null) return;
        setScreen(state.request);
        useNavStore.getState().clear();
      }),
    []
  );

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

  /**
   * Leaving the win screen — the one moment doc §8 allows an unrequested ad.
   *
   * **The interstitial is placed here rather than in `CompleteScreen` because
   * of what is on screen at the time.** §9's rule is that no advert may appear
   * over a board, and this is the only point in the app where a level has
   * finished and the next thing has not started. The board is still mounted
   * behind the win screen, so firing on the win itself would break it.
   *
   * All three exits go through this, which is what makes the count exactly one
   * per completed level: whichever button is pressed, precisely one of them is.
   * `showLevelInterstitial` decides whether anything actually shows — most of
   * the time it returns without doing anything.
   *
   * Navigation waits for it, so the next screen is never revealed behind an
   * advert. Nothing is owed either way, so there is no outcome to branch on.
   *
   * **`catch` before `then`, and it is not decoration.** Every exit from the
   * win screen is behind this promise, so anything that escapes it does not
   * cost an advert — it costs Home, Replay and Next at once, and the only way
   * off the screen is killing the app. `showLevelInterstitial` is written not
   * to reject; this is the guarantee not depending on that staying true, since
   * the failure is invisible in every build where adverts happen to work.
   */
  const leaveComplete = useCallback((go: () => void) => {
    void showLevelInterstitial()
      .catch(() => undefined)
      .then(go);
  }, []);

  const replay = useCallback(() => {
    useGameStore.getState().restart();
    setScreen('game');
  }, []);

  const nextLevel = useCallback(() => {
    useGameStore.getState().nextLevel();
    setScreen('game');
  }, []);

  const completeHome = useCallback(
    () => leaveComplete(showHome),
    [leaveComplete, showHome]
  );
  const completeReplay = useCallback(() => leaveComplete(replay), [leaveComplete, replay]);
  const completeNext = useCallback(
    () => leaveComplete(nextLevel),
    [leaveComplete, nextLevel]
  );

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
            <HomeScreen onPlay={playFromHome} onNavigate={navigate} />
          ) : null}

          {screen === 'stages' ? <StagesScreen onPick={playFromStages} /> : null}

          {screen === 'daily' ? <DailyScreen onPlayBonus={playFromDaily} /> : null}

          {screen === 'shop' ? <ShopScreen /> : null}

          {screen === 'stats' ? <StatsScreen /> : null}

          {screen === 'game' ? (
            <GameScreen
              width={width}
              height={height}
              onExit={exitGame}
              onSolved={showComplete}
            />
          ) : null}

          {screen === 'complete' ? (
            <CompleteScreen
              onHome={completeHome}
              onReplay={completeReplay}
              onNext={completeNext}
            />
          ) : null}
        </ScreenTransition>
      )}

      {WITH_NAV.has(screen) ? (
        <View style={[styles.navSlot, { paddingBottom: insets.bottom + NAV_OFFSET }]}>
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
