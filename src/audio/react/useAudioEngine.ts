import { useContext } from 'react';
import { AudioEngineContext } from './AudioProvider.tsx';

export const useAudioEngine = () => {
  const context = useContext(AudioEngineContext);
  if (!context) throw new Error('useAudioEngine must be used within AudioProvider.');
  return context;
};
