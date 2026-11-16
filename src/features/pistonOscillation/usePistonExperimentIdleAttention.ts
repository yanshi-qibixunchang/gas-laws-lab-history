import { useEffect, useState } from 'react';
import { createPistonExperimentIdleAttention } from './pistonExperimentIdleAttention.ts';

export const usePistonExperimentIdleAttention = (enabled: boolean, context: string) => {
  const [attention, setAttention] = useState(false);
  useEffect(() => {
    const reminder = createPistonExperimentIdleAttention({
      schedule: (callback, delay) => window.setTimeout(callback, delay),
      cancel: handle => window.clearTimeout(handle as number), onChange: setAttention,
    });
    const updateAvailability = () => reminder.setEnabled(enabled && document.hasFocus()
      && document.visibilityState !== 'hidden' && !document.querySelector('[aria-modal="true"]'));
    const activity = () => { updateAvailability(); reminder.activity(); };
    const events = ['pointermove', 'pointerdown', 'keydown', 'input', 'change', 'wheel', 'scroll'] as const;
    events.forEach(event => document.addEventListener(event, activity, { capture: true, passive: true }));
    window.addEventListener('focus', updateAvailability);
    window.addEventListener('blur', updateAvailability);
    document.addEventListener('visibilitychange', updateAvailability);
    const observer = new MutationObserver(updateAvailability);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal'] });
    updateAvailability();
    return () => {
      reminder.dispose(); observer.disconnect();
      events.forEach(event => document.removeEventListener(event, activity, true));
      window.removeEventListener('focus', updateAvailability);
      window.removeEventListener('blur', updateAvailability);
      document.removeEventListener('visibilitychange', updateAvailability);
    };
  }, [enabled, context]);
  return attention;
};
