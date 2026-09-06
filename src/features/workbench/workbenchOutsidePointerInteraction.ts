export interface WorkbenchOutsidePointerPorts {
  subscribe: (handler: (target: Node) => void) => () => void;
  contains: (target: Node) => boolean;
  onOutside: () => void;
}

/** Listener ownership is explicit so outside clicks and teardown can be tested without React. */
export const attachWorkbenchOutsidePointerInteraction = (ports: WorkbenchOutsidePointerPorts) => (
  ports.subscribe((target) => {
    if (ports.contains(target)) return;
    ports.onOutside();
  })
);
