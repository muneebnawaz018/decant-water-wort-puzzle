import { useCallback, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { useGameStore } from '@/state/gameStore';
import { Backdrop } from './chrome/Backdrop';
import { type NavDestination } from './chrome/NavBar';
import { Overlays } from './chrome/Overlays';
import { CompleteScreen } from './CompleteScreen';
import { DailyScreen } from './DailyScreen';
import { usePoppins } from './fonts';
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
  const [screen, setScreen] = useState<Screen>('splash');
  const fontsReady = usePoppins();

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
    return <View style={styles.blank} />;
  }

  return (
    <View style={styles.root}>
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

      <Overlays />
    </View>
  );
}
