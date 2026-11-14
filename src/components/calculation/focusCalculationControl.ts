/** Keep the next calculation control visible in whichever panel contains it. */
export const focusCalculationControl = (control: HTMLElement) => {
  control.focus({ preventScroll: true });
  if (control.ownerDocument.activeElement === control) {
    control.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
};
