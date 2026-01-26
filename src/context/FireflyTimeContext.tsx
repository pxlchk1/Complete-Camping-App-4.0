import React, { createContext, useContext } from 'react';
import { useSharedValue, useFrameCallback, SharedValue } from 'react-native-reanimated';

const FireflyTimeContext = createContext<SharedValue<number> | null>(null);

export function FireflyTimeProvider({ children }: { children: React.ReactNode }) {
  const t = useSharedValue(0);

  // Use useFrameCallback for smooth 60fps animation that works with native views
  useFrameCallback(() => {
    t.value = t.value + 0.015; // Slowed down from 0.025 to 0.015
  });

  return (
    <FireflyTimeContext.Provider value={t}>
      {children}
    </FireflyTimeContext.Provider>
  );
}

export function useFireflyTime() {
  const context = useContext(FireflyTimeContext);
  if (!context) {
    throw new Error('useFireflyTime must be used within FireflyTimeProvider');
  }
  return context;
}
