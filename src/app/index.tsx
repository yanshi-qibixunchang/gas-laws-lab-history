import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../../index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const pistonHosePreviewEnabled = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('pistonHosePreview') === '1';
const pistonModelSizePreviewEnabled = import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('pistonModelSizePreview') === '1';
const productIntroCapture = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('productIntroCapture')
  : null;

if (pistonModelSizePreviewEnabled) {
  void import('../features/pistonOscillation/PistonOscillationModelSizePreviewPage.tsx')
    .then((module) => {
      root.render(
        <React.StrictMode>
          <module.PistonOscillationModelSizePreviewPage />
        </React.StrictMode>,
      );
    });
} else if (pistonHosePreviewEnabled) {
  void import('../features/pistonOscillation/PistonOscillationHoseDirectionPreviewPage.tsx')
    .then((module) => {
      root.render(
        <React.StrictMode>
          <module.PistonOscillationHoseDirectionPreviewPage />
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
