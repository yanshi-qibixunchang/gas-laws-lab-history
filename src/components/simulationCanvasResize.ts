export const observeSimulationCanvasSize = (
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  redraw: () => void,
): (() => void) => {
  let frameId: number | null = null;
  let appliedPixelRatio: number | null = null;
  let resolutionQuery: MediaQueryList;
  let disposed = false;

  const updateSize = () => {
    frameId = null;
    if (disposed) return;

    const { width, height } = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // Canvas dimensions are integers; preserve the browser's truncation without
    // resetting the drawing buffer for an unchanged fractional CSS size.
    const pixelWidth = Math.floor(width * dpr);
    const pixelHeight = Math.floor(height * dpr);
    if (
      canvas.width === pixelWidth
      && canvas.height === pixelHeight
      && appliedPixelRatio === dpr
    ) return;

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    appliedPixelRatio = dpr;
    canvas.getContext('2d')?.scale(dpr, dpr);
    redraw();
  };

  const scheduleResize = () => {
    if (disposed || frameId !== null) return;
    frameId = window.requestAnimationFrame(updateSize);
  };

  const watchResolution = () => {
    resolutionQuery?.removeEventListener('change', handleResolutionChange);
    resolutionQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    resolutionQuery.addEventListener('change', handleResolutionChange);
  };
  const handleResolutionChange = () => {
    if (disposed) return;
    watchResolution();
    scheduleResize();
  };

  const observer = new ResizeObserver(scheduleResize);
  observer.observe(container);
  window.addEventListener('resize', scheduleResize);
  watchResolution();
  updateSize();

  return () => {
    disposed = true;
    observer.disconnect();
    window.removeEventListener('resize', scheduleResize);
    resolutionQuery.removeEventListener('change', handleResolutionChange);
    if (frameId !== null) window.cancelAnimationFrame(frameId);
  };
};
