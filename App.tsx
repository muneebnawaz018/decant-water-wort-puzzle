import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ui } from '@/theme/colors';
import { Root } from '@/ui/Root';
import { styles } from './App.styles';

/**
 * Paint the window itself, at module scope.
 *
 * `backgroundColor` in app.config.ts covers the launch, but the native root
 * view can still be repainted at runtime — a reload in dev, a config change on
 * Android. Setting it here means the colour behind React is never the platform
 * default white, whatever happens later.
 */
void SystemUI.setBackgroundColorAsync(ui.groundDeep);

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Root />
        {/*
         * Fullscreen: the status bar is hidden for the whole session, on both
         * platforms. The board and the chrome are drawn edge to edge and a
         * clock over the parchment-dark ground reads as an intrusion, not as
         * system UI. `style` still matters — Android restores the bar on a
         * swipe-down, and it should come back light rather than dark-on-dark.
         */}
        <StatusBar style="light" hidden />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
