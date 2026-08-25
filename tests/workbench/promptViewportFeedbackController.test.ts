import assert from 'node:assert/strict';
import {
  createPromptViewportFeedbackMessage,
  PROMPT_VIEWPORT_FEEDBACK_PRIORITY,
  resolvePromptViewportFeedbackAdvance,
  resolvePromptViewportFeedbackClear,
  resolvePromptViewportFeedbackShow,
  type PromptViewportFeedbackMessage,
  type PromptViewportFeedbackQueueState,
} from '../../src/components/prompts/promptViewportFeedbackController.ts';
import {
  PROMPT_TOAST_DURATION_MS,
  type PromptFeedbackKind,
} from '../../src/components/prompts/promptFeedbackPolicy.ts';

type TestSource = 'guide' | 'guide-blocked' | 'pressure';
type TestMessage = PromptViewportFeedbackMessage<TestSource>;

const createMessage = (
  id: string,
  kind: PromptFeedbackKind,
  source: TestSource = 'guide',
  now = 100,
  priority?: number,
): TestMessage => createPromptViewportFeedbackMessage(id, kind, {
  id,
  now,
  priority,
  source,
});

assert.deepEqual(
  PROMPT_VIEWPORT_FEEDBACK_PRIORITY,
  { info: 0, success: 0, warning: 1, danger: 2 },
  'viewport feedback should preserve all four formal levels while escalating warning and danger',
);

{
  const message = createPromptViewportFeedbackMessage('Height confirmed', 'success', {
    id: 'confirmed',
    now: 1_234,
    source: 'guide' as const,
  });
  assert.deepEqual(message, {
    id: 'confirmed',
    text: 'Height confirmed',
    kind: 'success',
    priority: PROMPT_VIEWPORT_FEEDBACK_PRIORITY.success,
    source: 'guide',
    createdAt: 1_234,
    durationMs: PROMPT_TOAST_DURATION_MS.short,
  });

  const customized = createPromptViewportFeedbackMessage('Persistent warning', 'warning', {
    id: 'customized',
    now: 2_000,
    priority: 9,
    source: 'pressure' as const,
    durationMs: PROMPT_TOAST_DURATION_MS.extended,
  });
  assert.equal(customized.priority, 9, 'callers should be able to raise a domain-specific priority');
  assert.equal(
    customized.durationMs,
    PROMPT_TOAST_DURATION_MS.extended,
    'callers should be able to select a longer shared feedback duration',
  );
}

{
  const empty: PromptViewportFeedbackQueueState<TestMessage> = { current: null, pending: null };
  const first = createMessage('first', 'info');
  const shown = resolvePromptViewportFeedbackShow(empty, first);
  assert.deepEqual(shown, {
    current: first,
    pending: null,
    changed: true,
    shouldRestartTimer: true,
  }, 'the first viewport message should enter immediately and start its timer');
}

{
  const current = createMessage('current-info', 'info');
  const queuedWarning = createMessage('queued-warning', 'warning', 'guide-blocked', 200);
  const warningQueued = resolvePromptViewportFeedbackShow(
    { current, pending: null },
    queuedWarning,
  );
  assert.deepEqual(warningQueued, {
    current,
    pending: queuedWarning,
    changed: true,
    shouldRestartTimer: false,
  }, 'non-interrupting feedback should not replace the message currently leaving the viewport');

  const lowerPriority = createMessage('later-info', 'info', 'guide', 300);
  assert.deepEqual(
    resolvePromptViewportFeedbackShow(warningQueued, lowerPriority),
    { ...warningQueued, changed: false, shouldRestartTimer: false },
    'a lower-priority arrival should not displace the pending warning',
  );

  const latestWarning = createMessage('latest-warning', 'warning', 'guide-blocked', 400);
  assert.deepEqual(
    resolvePromptViewportFeedbackShow(warningQueued, latestWarning),
    {
      current,
      pending: latestWarning,
      changed: true,
      shouldRestartTimer: false,
    },
    'the latest equal-priority message should replace a stale pending message',
  );

  const danger = createMessage('danger', 'danger', 'pressure', 500);
  assert.deepEqual(
    resolvePromptViewportFeedbackShow(warningQueued, danger),
    {
      current,
      pending: danger,
      changed: true,
      shouldRestartTimer: false,
    },
    'danger should take the single pending slot ahead of a warning',
  );

  const currentDanger = createMessage('current-danger', 'danger', 'pressure', 600);
  const dangerState = { current: currentDanger, pending: null };
  assert.deepEqual(
    resolvePromptViewportFeedbackShow(dangerState, lowerPriority),
    {
      ...dangerState,
      changed: false,
      shouldRestartTimer: false,
    },
    'ordinary feedback should not queue behind an active danger message',
  );
}

{
  const current = createMessage('current-info', 'info');
  const pending = createMessage('pending-warning', 'warning', 'guide-blocked', 200);
  const danger = createMessage('interrupting-danger', 'danger', 'pressure', 300);
  assert.deepEqual(
    resolvePromptViewportFeedbackShow({ current, pending }, danger, { interrupt: true }),
    {
      current: danger,
      pending: null,
      changed: true,
      shouldRestartTimer: true,
    },
    'an interrupt should replace lower-priority current feedback and discard stale pending work',
  );

  const warning = createMessage('blocked-warning', 'warning', 'guide-blocked', 400);
  const dangerState = { current: danger, pending: null };
  assert.deepEqual(
    resolvePromptViewportFeedbackShow(dangerState, warning, { interrupt: true }),
    {
      ...dangerState,
      changed: false,
      shouldRestartTimer: false,
    },
    'an interrupt must not demote an active danger message',
  );

  const replacementWarning = createMessage('replacement-warning', 'warning', 'guide-blocked', 500);
  assert.deepEqual(
    resolvePromptViewportFeedbackShow(
      { current: warning, pending: current },
      replacementWarning,
      { interrupt: true },
    ),
    {
      current: replacementWarning,
      pending: null,
      changed: true,
      shouldRestartTimer: true,
    },
    'an equal-priority interrupt should show the newest instruction immediately',
  );
}

{
  const current = createMessage('current', 'info', 'guide', 100);
  const pending = createMessage('pending', 'warning', 'guide-blocked', 200);
  assert.deepEqual(
    resolvePromptViewportFeedbackAdvance({ current, pending }, 900),
    {
      current: { ...pending, createdAt: 900 },
      pending: null,
      shouldContinueTimer: true,
    },
    'advancing should promote the pending message and give it a fresh visible lifetime',
  );
  assert.deepEqual(
    resolvePromptViewportFeedbackAdvance({ current, pending: null }, 900),
    { current: null, pending: null, shouldContinueTimer: false },
    'advancing the final message should leave no timer running',
  );
}

{
  const blocked = createMessage('blocked', 'warning', 'guide-blocked', 100);
  const pressure = createMessage('pressure', 'danger', 'pressure', 200);
  const clearBlocked = (message: TestMessage | null) => message?.source === 'guide-blocked';

  assert.deepEqual(
    resolvePromptViewportFeedbackClear(
      { current: blocked, pending: pressure },
      clearBlocked,
      1_000,
    ),
    {
      current: { ...pressure, createdAt: 1_000 },
      pending: null,
      changed: true,
      shouldRestartTimer: true,
    },
    'clearing the current source should promote an unrelated pending message with a fresh timer',
  );

  assert.deepEqual(
    resolvePromptViewportFeedbackClear(
      { current: pressure, pending: blocked },
      clearBlocked,
      1_000,
    ),
    {
      current: pressure,
      pending: null,
      changed: true,
      shouldRestartTimer: false,
    },
    'clearing only a pending source should preserve the visible message and its timer',
  );

  const untouched = { current: pressure, pending: null };
  assert.deepEqual(
    resolvePromptViewportFeedbackClear(untouched, clearBlocked, 1_000),
    {
      ...untouched,
      changed: false,
      shouldRestartTimer: false,
    },
    'clearing an absent source should be a no-op',
  );

  assert.deepEqual(
    resolvePromptViewportFeedbackClear(
      { current: blocked, pending: blocked },
      clearBlocked,
      1_000,
    ),
    {
      current: null,
      pending: null,
      changed: true,
      shouldRestartTimer: false,
    },
    'clearing every matching message should empty the queue without restarting a timer',
  );
}

console.log('promptViewportFeedbackController tests passed');
