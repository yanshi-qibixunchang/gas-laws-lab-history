import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../../index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const pistonFocusInteractionPreviewEnabled = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('pistonFocusInteractionPreview') === '1';
const pistonAcquisitionPreviewEnabled = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('pistonAcquisitionPreview') === '1';
const pistonSoftwareCameraCalibrationEnabled = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('pistonCameraCalibration') === '1';
const productIntroCapture = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('productIntroCapture')
  : null;

if (pistonSoftwareCameraCalibrationEnabled) {
  void import('../features/pistonOscillation/PistonOscillationSoftwareCameraCalibrationPage.tsx')
    .then((module) => {
      root.render(
        <React.StrictMode>
          <module.PistonOscillationSoftwareCameraCalibrationPage />
        </React.StrictMode>,
      );
    });
} else if (pistonAcquisitionPreviewEnabled) {
  void import('../features/pistonOscillation/PistonOscillationFocusInteractionPreviewPage.tsx')
    .then((module) => {
      root.render(
        <React.StrictMode>
          <module.PistonOscillationFocusInteractionPreviewPage acquisitionPreview />
        </React.StrictMode>,
      );
    });
} else if (pistonFocusInteractionPreviewEnabled) {
  void import('../features/pistonOscillation/PistonOscillationFocusInteractionPreviewPage.tsx')
    .then((module) => {
      root.render(
        <React.StrictMode>
          <module.PistonOscillationFocusInteractionPreviewPage />
        </React.StrictMode>,
      );
    });
} else if (productIntroCapture === 'guide') {
  void import('../features/onboarding/ProductIntroGuideVideoCapturePage.tsx').then((module) => {
    root.render(<module.ProductIntroGuideVideoCapturePage />);
  });
} else if (productIntroCapture === 'outcome') {
  void import('../features/onboarding/ProductIntroOutcomeVideoCapturePage.tsx').then((module) => {
    root.render(<module.ProductIntroOutcomeVideoCapturePage />);
  });
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
