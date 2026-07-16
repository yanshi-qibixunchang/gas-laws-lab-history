import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createExitPersistenceCoordinator } = require('../../electron/exitPersistenceCoordinator.cjs') as {
  createExitPersistenceCoordinator: (options: {
    dialog: { showMessageBox: () => Promise<{ response: number }> };
    timeoutMs?: number;
    shouldBypassClose?: () => boolean;
  }) => {
    approveWindowsForExit: (
      windows: FakeWindow[],
      approvalTimeoutMs?: number,
    ) => (reason?: string, resume?: boolean) => void;
    bindWindow: (
      window: FakeWindow,
      options?: {
        beforeApprovedClose?: (context: { reason: string; discarded: boolean }) => Promise<void>;
      },
    ) => (reason?: string) => Promise<{ status: string; message?: string }>;
    handleRendererResult: (
      event: { sender: { id: number } },
      payload: { requestId: string; saved: boolean; message?: string },
    ) => { status: string };
    prepareWindowsForExit: (windows: FakeWindow[], reason: string) => Promise<{ proceed: boolean }>;
    requestWindowClose: (window: FakeWindow, reason?: string) => Promise<{ status: string }>;
    resumeWindowsAfterExitCancellation: (windows: FakeWindow[], reason?: string) => void;
  };
};

type ExitRequest = { requestId: string; reason: string };
type ResumeRequest = { reason: string };

class FakeWindow extends EventEmitter {
  readonly id: number;
  readonly webContents: {
    id: number;
    send: (channel: string, payload: ExitRequest) => void;
  };
  readonly sentRequests: ExitRequest[] = [];
  readonly resumeRequests: ResumeRequest[] = [];
  destroyed = false;
  closeCalls = 0;
  onRequest: ((request: ExitRequest) => void) | null = null;

  constructor(id: number) {
    super();
    this.id = id;
    this.webContents = {
      id: id + 100,
      send: (channel, payload) => {
        if (channel === 'hsl-lifecycle:prepare-exit') {
          this.sentRequests.push(payload);
          this.onRequest?.(payload);
          return;
        }
        assert.equal(channel, 'hsl-lifecycle:resume-after-exit-cancel');
        this.resumeRequests.push(payload);
      },
    };
  }

  isDestroyed() {
    return this.destroyed;
  }

  close() {
    this.closeCalls += 1;
    const event = {
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    this.emit('close', event);
    if (!event.defaultPrevented) {
      this.destroyed = true;
      this.emit('closed');
    }
  }
}

const createCoordinator = (timeoutMs = 100) => createExitPersistenceCoordinator({
  timeoutMs,
  dialog: { showMessageBox: async () => ({ response: 1 }) },
});

{
  const coordinator = createCoordinator();
  const window = new FakeWindow(1);
  let closeFinalized = false;
  coordinator.bindWindow(window, {
    beforeApprovedClose: async ({ reason, discarded }) => {
      assert.equal(reason, 'custom-close');
      assert.equal(discarded, false);
      assert.equal(window.destroyed, false, 'close finalization must run before BrowserWindow destruction');
      closeFinalized = true;
    },
  });
  const closePromise = coordinator.requestWindowClose(window, 'custom-close');
  assert.equal(window.closeCalls, 0, 'custom close must wait for the renderer persistence acknowledgement');
  const request = window.sentRequests[0]!;
  setTimeout(() => {
    coordinator.handleRendererResult(
      { sender: { id: window.webContents.id } },
      { requestId: request.requestId, saved: true },
    );
  }, 5);
  assert.deepEqual(await closePromise, { status: 'closed' });
  assert.equal(closeFinalized, true, 'ordinary secondary-window close should finalize its registry record');
  assert.equal(window.closeCalls, 1, 'custom close should proceed only after delayed persistence succeeds');
  assert.equal(window.destroyed, true);
}

{
  const coordinator = createCoordinator();
  const window = new FakeWindow(2);
  coordinator.bindWindow(window);
  const altF4Event = {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  window.emit('close', altF4Event);
  assert.equal(altF4Event.defaultPrevented, true, 'Alt+F4 must be intercepted while persistence is pending');
  assert.equal(window.destroyed, false);
  const request = window.sentRequests[0]!;
  coordinator.handleRendererResult(
    { sender: { id: window.webContents.id } },
    { requestId: request.requestId, saved: true },
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(window.destroyed, true, 'Alt+F4 should resume after the acknowledged save');
}

{
  const coordinator = createCoordinator();
  const first = new FakeWindow(3);
  const second = new FakeWindow(4);
  coordinator.bindWindow(first);
  coordinator.bindWindow(second);
  for (const window of [first, second]) {
    window.onRequest = (request) => {
      setTimeout(() => coordinator.handleRendererResult(
        { sender: { id: window.webContents.id } },
        { requestId: request.requestId, saved: true },
      ), 5);
    };
  }
  const result = await coordinator.prepareWindowsForExit([first, second], 'update-install');
  assert.equal(result.proceed, true, 'update restart must await every open renderer save');
  assert.equal(first.destroyed, false);
  assert.equal(second.destroyed, false);
  assert.deepEqual(first.sentRequests.map((request) => request.reason), ['update-install']);
  assert.deepEqual(second.sentRequests.map((request) => request.reason), ['update-install']);
}

{
  const coordinator = createCoordinator(5);
  const window = new FakeWindow(5);
  let closeFinalizationCalls = 0;
  coordinator.bindWindow(window, {
    beforeApprovedClose: async () => {
      closeFinalizationCalls += 1;
    },
  });
  assert.deepEqual(
    await coordinator.requestWindowClose(window, 'custom-close'),
    { status: 'cancelled' },
    'a timeout must keep the window open unless the user explicitly chooses to discard',
  );
  assert.equal(window.destroyed, false);
  assert.equal(closeFinalizationCalls, 0, 'cancelled close must preserve the persistent window record');
  assert.deepEqual(
    window.resumeRequests,
    [{ reason: 'window-close-cancelled' }],
    'cancelling a failed close must explicitly resume the quiesced renderer',
  );
}

{
  let closeFinalizationCalls = 0;
  const coordinator = createExitPersistenceCoordinator({
    timeoutMs: 100,
    dialog: { showMessageBox: async () => ({ response: 2 }) },
  });
  const window = new FakeWindow(9);
  coordinator.bindWindow(window, {
    beforeApprovedClose: async ({ discarded }) => {
      assert.equal(discarded, true);
      closeFinalizationCalls += 1;
    },
  });
  window.onRequest = (request) => {
    coordinator.handleRendererResult(
      { sender: { id: window.webContents.id } },
      { requestId: request.requestId, saved: false, message: 'forced failure' },
    );
  };
  assert.deepEqual(await coordinator.requestWindowClose(window), { status: 'discarded' });
  assert.equal(closeFinalizationCalls, 1, 'close-without-saving must still unregister an ordinary secondary window');
  assert.equal(window.destroyed, true);
}

{
  const coordinator = createCoordinator();
  const window = new FakeWindow(10);
  coordinator.bindWindow(window, {
    beforeApprovedClose: async () => {
      throw new Error('registry write failed');
    },
  });
  window.onRequest = (request) => {
    coordinator.handleRendererResult(
      { sender: { id: window.webContents.id } },
      { requestId: request.requestId, saved: true },
    );
  };
  assert.deepEqual(
    await coordinator.requestWindowClose(window),
    { status: 'error', message: 'registry write failed' },
  );
  assert.equal(window.destroyed, false, 'registry failure must keep the secondary window open');
  assert.deepEqual(window.resumeRequests, [{ reason: 'window-close-finalization-failed' }]);
}

{
  const coordinator = createCoordinator();
  const window = new FakeWindow(11);
  let closeFinalizationCalls = 0;
  coordinator.bindWindow(window, {
    beforeApprovedClose: async () => {
      closeFinalizationCalls += 1;
    },
  });
  coordinator.approveWindowsForExit([window], 1_000);
  window.close();
  assert.equal(window.destroyed, true);
  assert.equal(
    closeFinalizationCalls,
    0,
    'a token-approved global exit must preserve secondary-window registry entries for restart restoration',
  );
}

{
  const coordinator = createCoordinator(20);
  const first = new FakeWindow(6);
  const second = new FakeWindow(7);
  coordinator.bindWindow(first);
  coordinator.bindWindow(second);
  first.onRequest = (request) => {
    coordinator.handleRendererResult(
      { sender: { id: first.webContents.id } },
      { requestId: request.requestId, saved: true },
    );
  };
  const result = await coordinator.prepareWindowsForExit([first, second], 'update-install');
  assert.equal(result.proceed, false);
  assert.deepEqual(first.resumeRequests, [{ reason: 'app-exit-cancelled' }]);
  assert.deepEqual(second.resumeRequests, [{ reason: 'app-exit-cancelled' }]);
}

{
  const coordinator = createExitPersistenceCoordinator({
    timeoutMs: 100,
    dialog: { showMessageBox: async () => { throw new Error('native dialog failed'); } },
  });
  const window = new FakeWindow(12);
  coordinator.bindWindow(window);
  window.onRequest = (request) => {
    coordinator.handleRendererResult(
      { sender: { id: window.webContents.id } },
      { requestId: request.requestId, saved: false, message: 'save failed' },
    );
  };
  assert.deepEqual(
    await coordinator.requestWindowClose(window),
    { status: 'cancelled' },
    'a rejected native warning dialog must safely cancel the close',
  );
  assert.equal(window.destroyed, false);
  assert.deepEqual(window.resumeRequests, [{ reason: 'window-close-cancelled' }]);
}

{
  const coordinator = createExitPersistenceCoordinator({
    timeoutMs: 100,
    dialog: { showMessageBox: async () => { throw new Error('native dialog failed'); } },
  });
  const first = new FakeWindow(13);
  const second = new FakeWindow(14);
  coordinator.bindWindow(first);
  coordinator.bindWindow(second);
  first.onRequest = (request) => {
    coordinator.handleRendererResult(
      { sender: { id: first.webContents.id } },
      { requestId: request.requestId, saved: true },
    );
  };
  second.onRequest = (request) => {
    coordinator.handleRendererResult(
      { sender: { id: second.webContents.id } },
      { requestId: request.requestId, saved: false, message: 'save failed' },
    );
  };
  assert.deepEqual(
    await coordinator.prepareWindowsForExit([first, second], 'update-install'),
    { proceed: false, discarded: false },
    'a rejected native warning dialog must cancel a global exit without stranding prepared windows',
  );
  assert.deepEqual(first.resumeRequests, [{ reason: 'app-exit-cancelled' }]);
  assert.deepEqual(second.resumeRequests, [{ reason: 'app-exit-cancelled' }]);
}

{
  const coordinator = createCoordinator();
  const window = new FakeWindow(8);
  coordinator.bindWindow(window);
  const revoke = coordinator.approveWindowsForExit([window], 1_000);
  revoke('update-install-failed');
  assert.deepEqual(window.resumeRequests, [{ reason: 'update-install-failed' }]);

  const closeEvent = {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  window.emit('close', closeEvent);
  assert.equal(
    closeEvent.defaultPrevented,
    true,
    'revoking an app-exit approval must make the next close pass through persistence again',
  );
  const request = window.sentRequests.at(-1)!;
  coordinator.handleRendererResult(
    { sender: { id: window.webContents.id } },
    { requestId: request.requestId, saved: true },
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(window.destroyed, true);
}

console.log('desktopExitPersistenceCoordinator tests passed');
