import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { audioCatalog } from '../catalog/audioCatalog.ts';
import { AudioEngine } from '../core/audioEngine.ts';
import { DEFAULT_AUDIO_SETTINGS, normalizeAudioSettings } from '../core/audioSettings.ts';
import type { AudioSettings } from '../core/audioTypes.ts';

interface AudioContextValue {
  engine: AudioEngine;
  settings: AudioSettings;
  updateSettings: (settings: AudioSettings) => void;
}

export const AudioEngineContext = createContext<AudioContextValue | null>(null);

interface AudioProviderProps {
  children: ReactNode;
  initialSettings?: AudioSettings;
}

export const AudioProvider = ({ children, initialSettings = DEFAULT_AUDIO_SETTINGS }: AudioProviderProps) => {
  const [settings, setSettings] = useState(() => normalizeAudioSettings(initialSettings));
  const [engine] = useState(() => new AudioEngine(audioCatalog, normalizeAudioSettings(initialSettings)));
  const destroyTimerRef = useRef<number | null>(null);

  const updateSettings = useCallback((nextSettings: AudioSettings) => {
    const normalized = normalizeAudioSettings(nextSettings);
    setSettings(normalized);
    engine.setSettings(normalized);
  }, [engine]);

  useEffect(() => {
    void engine.preload();
  }, [engine]);

  useEffect(() => {
    let listenersActive = true;
    const removeUnlockListeners = () => {
      if (!listenersActive) return;
      listenersActive = false;
      window.removeEventListener('pointerdown', handleUnlock, true);
      window.removeEventListener('keydown', handleUnlock, true);
      window.removeEventListener('touchstart', handleUnlock, true);
    };
    const handleUnlock = () => {
      void engine.unlock().then((unlocked) => {
        if (unlocked) removeUnlockListeners();
      });
    };

    window.addEventListener('pointerdown', handleUnlock, true);
    window.addEventListener('keydown', handleUnlock, true);
    window.addEventListener('touchstart', handleUnlock, true);
    return removeUnlockListeners;
  }, [engine]);

  useEffect(() => {
    if (destroyTimerRef.current !== null) {
      window.clearTimeout(destroyTimerRef.current);
      destroyTimerRef.current = null;
    }
    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) {
        engine.stopAll(0);
        return;
      }
      if (destroyTimerRef.current !== null) {
        window.clearTimeout(destroyTimerRef.current);
        destroyTimerRef.current = null;
      }
      void engine.destroy();
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      destroyTimerRef.current = window.setTimeout(() => {
        destroyTimerRef.current = null;
        void engine.destroy();
      }, 0);
    };
  }, [engine]);

  const value = useMemo<AudioContextValue>(() => ({
    engine,
    settings,
    updateSettings,
  }), [engine, settings, updateSettings]);

  return (
    <AudioEngineContext.Provider value={value}>
      {children}
    </AudioEngineContext.Provider>
  );
};
