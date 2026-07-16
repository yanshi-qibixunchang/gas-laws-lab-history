const DEFAULT_EXIT_PERSISTENCE_TIMEOUT_MS = 12_000;
const DEFAULT_EXIT_APPROVAL_TIMEOUT_MS = 10_000;

const createExitPersistenceCoordinator = ({
  dialog,
  timeoutMs = DEFAULT_EXIT_PERSISTENCE_TIMEOUT_MS,
  shouldBypassClose = () => false,
}) => {
  let nextRequestIndex = 1;
  const pendingRequests = new Map();
  const windowStates = new WeakMap();

  const settlePendingRequest = (requestId, result) => {
    const pending = pendingRequests.get(requestId);
    if (!pending) return false;
    pendingRequests.delete(requestId);
    clearTimeout(pending.timerId);
    pending.resolve(result);
    return true;
  };

  const cancelWindowRequests = (windowId) => {
    for (const [requestId, pending] of pendingRequests) {
      if (pending.windowId === windowId) {
        settlePendingRequest(requestId, {
          saved: false,
          errorKind: 'renderer-closed',
          message: 'The workspace window closed before persistence completed.',
        });
      }
    }
  };

  const resumeWindowAfterExitCancellation = (window, reason = 'exit-cancelled') => {
    if (!window || window.isDestroyed()) return false;
    try {
      window.webContents.send('hsl-lifecycle:resume-after-exit-cancel', { reason });
      return true;
    } catch {
      return false;
    }
  };

  const resumeWindowsAfterExitCancellation = (windows, reason = 'exit-cancelled') => {
    windows.forEach((window) => {
      resumeWindowAfterExitCancellation(window, reason);
    });
  };

  const requestWindowPersistence = (window, reason) => new Promise((resolve) => {
    if (!window || window.isDestroyed()) {
      resolve({ saved: true, errorKind: null, message: '' });
      return;
    }
    const requestId = `exit-${window.id}-${Date.now()}-${nextRequestIndex++}`;
    const timerId = setTimeout(() => {
      settlePendingRequest(requestId, {
        saved: false,
        errorKind: 'timeout',
        message: `Workspace persistence did not finish within ${timeoutMs} ms.`,
      });
    }, timeoutMs);
    pendingRequests.set(requestId, {
      windowId: window.id,
      webContentsId: window.webContents.id,
      timerId,
      resolve,
    });
    try {
      window.webContents.send('hsl-lifecycle:prepare-exit', { requestId, reason });
    } catch (error) {
      settlePendingRequest(requestId, {
        saved: false,
        errorKind: 'send-failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  const handleRendererResult = (event, payload) => {
    const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
    const pending = pendingRequests.get(requestId);
    if (!pending || pending.webContentsId !== event.sender.id) return { status: 'ignored' };
    settlePendingRequest(requestId, {
      saved: payload.saved === true,
      errorKind: payload.saved === true ? null : 'save-failed',
      message: typeof payload.message === 'string' ? payload.message : '',
    });
    return { status: 'accepted' };
  };

  const ensureWindowPersistence = async (window, reason) => {
    while (window && !window.isDestroyed()) {
      const result = await requestWindowPersistence(window, reason);
      if (result.saved) return { proceed: true, discarded: false };
      const detail = result.message || 'The workspace could not be saved.';
      let response;
      try {
        ({ response } = await dialog.showMessageBox(window, {
          type: 'warning',
          title: 'Workspace save did not complete',
          message: 'The app kept this window open because its latest workspace state was not safely persisted.',
          detail,
          buttons: ['Retry save', 'Cancel close', 'Close without saving'],
          defaultId: 0,
          cancelId: 1,
          noLink: true,
        }));
      } catch {
        return { proceed: false, discarded: false };
      }
      if (response === 0) continue;
      if (response === 2) return { proceed: true, discarded: true };
      return { proceed: false, discarded: false };
    }
    return { proceed: true, discarded: false };
  };

  const bindWindow = (window, { beforeApprovedClose } = {}) => {
    const state = {
      approved: false,
      approvalTimerId: null,
      closePromise: null,
    };
    const clearApproval = () => {
      state.approved = false;
      if (state.approvalTimerId !== null) {
        clearTimeout(state.approvalTimerId);
        state.approvalTimerId = null;
      }
    };
    const approveNextClose = (approvalTimeoutMs = DEFAULT_EXIT_APPROVAL_TIMEOUT_MS) => {
      clearApproval();
      state.approved = true;
      state.approvalTimerId = setTimeout(clearApproval, approvalTimeoutMs);
    };
    const requestClose = (reason = 'window-close') => {
      if (!window || window.isDestroyed()) return Promise.resolve({ status: 'closed' });
      if (state.closePromise) return state.closePromise;
      state.closePromise = (async () => {
        const persistence = await ensureWindowPersistence(window, reason);
        if (!persistence.proceed || window.isDestroyed()) {
          if (!persistence.proceed) {
            resumeWindowAfterExitCancellation(window, 'window-close-cancelled');
          }
          return { status: persistence.proceed ? 'closed' : 'cancelled' };
        }
        if (typeof beforeApprovedClose === 'function') {
          try {
            await beforeApprovedClose({ reason, discarded: persistence.discarded });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            resumeWindowAfterExitCancellation(window, 'window-close-finalization-failed');
            try {
              await dialog.showMessageBox(window, {
                type: 'error',
                title: 'Window close did not complete',
                message: 'The app kept this window open because its persistent window record could not be updated.',
                detail: message,
                buttons: ['OK'],
                defaultId: 0,
                cancelId: 0,
                noLink: true,
              });
            } catch {
              // Keeping the window open is the safety boundary even if the error dialog itself fails.
            }
            return { status: 'error', message };
          }
        }
        if (window.isDestroyed()) return { status: 'closed' };
        approveNextClose();
        window.close();
        return { status: persistence.discarded ? 'discarded' : 'closed' };
      })().finally(() => {
        state.closePromise = null;
      });
      return state.closePromise;
    };
    windowStates.set(window, { state, requestClose, approveNextClose, clearApproval });
    window.on('close', (event) => {
      if (state.approved) {
        clearApproval();
        return;
      }
      if (shouldBypassClose()) return;
      event.preventDefault();
      void requestClose('window-close');
    });
    window.once('closed', () => {
      clearApproval();
      cancelWindowRequests(window.id);
    });
    return requestClose;
  };

  const requestWindowClose = (window, reason = 'custom-close') => {
    const controller = windowStates.get(window);
    if (!controller) return Promise.resolve({ status: 'error' });
    return controller.requestClose(reason);
  };

  const prepareWindowsForExit = async (windows, reason) => {
    for (const window of windows) {
      if (!window || window.isDestroyed()) continue;
      const persistence = await ensureWindowPersistence(window, reason);
      if (!persistence.proceed) {
        resumeWindowsAfterExitCancellation(windows, 'app-exit-cancelled');
        return { proceed: false, discarded: false };
      }
    }
    return { proceed: true, discarded: false };
  };

  const approveWindowsForExit = (
    windows,
    approvalTimeoutMs = DEFAULT_EXIT_APPROVAL_TIMEOUT_MS,
  ) => {
    const approvedControllers = windows.flatMap((window) => {
      if (!window || window.isDestroyed()) return [];
      const controller = windowStates.get(window);
      if (!controller) return [];
      controller.approveNextClose(approvalTimeoutMs);
      return [{ window, controller }];
    });
    let active = true;
    return (reason = 'app-exit-aborted', resume = true) => {
      if (!active) return;
      active = false;
      approvedControllers.forEach(({ controller }) => controller.clearApproval());
      if (resume) {
        resumeWindowsAfterExitCancellation(
          approvedControllers.map(({ window }) => window),
          reason,
        );
      }
    };
  };

  return {
    approveWindowsForExit,
    bindWindow,
    handleRendererResult,
    prepareWindowsForExit,
    requestWindowClose,
    requestWindowPersistence,
    resumeWindowsAfterExitCancellation,
  };
};

module.exports = {
  DEFAULT_EXIT_PERSISTENCE_TIMEOUT_MS,
  DEFAULT_EXIT_APPROVAL_TIMEOUT_MS,
  createExitPersistenceCoordinator,
};
