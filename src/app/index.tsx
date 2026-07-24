import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../../index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const productIntroCapture = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('productIntroCapture')
  : null;

if (productIntroCapture === 'guide') {
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
