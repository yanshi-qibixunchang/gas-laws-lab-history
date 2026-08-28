import { useEffect } from 'react';
import type {
  WorkbenchLanguagePreference,
  WorkbenchResolvedTheme,
} from './workbenchGeneralSettings.ts';
import { getWorkbenchAppBrandName } from './workbenchBrand.ts';
import { WorkbenchWindowControls } from './WorkbenchWindowControls.tsx';

const RENDER_ERROR_COPY: Record<WorkbenchLanguagePreference, {
  eyebrow: string;
  processingTitle: string;
  calculationTitle: string;
  outerTitle: string;
  body: string;
  retry: string;
  returnToInstrument: string;
}> = {
  'zh-CN': {
    eyebrow: '显示恢复',
    processingTitle: '数据处理区域暂时无法显示',
    calculationTitle: '计算区域暂时无法显示',
    outerTitle: '工作台主体暂时无法显示',
    body: '已保存的实验数据仍然保留。可以重试显示，或先返回仪器继续检查。',
    retry: '重试显示',
    returnToInstrument: '返回仪器',
  },
  'zh-TW': {
    eyebrow: '顯示恢復',
    processingTitle: '資料處理區域暫時無法顯示',
    calculationTitle: '計算區域暫時無法顯示',
    outerTitle: '工作台主體暫時無法顯示',
    body: '已儲存的實驗資料仍然保留。可以重試顯示，或先返回儀器繼續檢查。',
    retry: '重試顯示',
    returnToInstrument: '返回儀器',
  },
  en: {
    eyebrow: 'Display recovery',
    processingTitle: 'The data-processing area could not be displayed',
    calculationTitle: 'The calculation area could not be displayed',
    outerTitle: 'The workbench could not be displayed',
    body: 'Saved experiment data is still retained. Retry the view or return to the instrument.',
    retry: 'Retry display',
    returnToInstrument: 'Return to instrument',
  },
};

export interface WorkbenchContentRenderErrorFallbackProps {
  area: 'data-processing' | 'calculation';
  language: WorkbenchLanguagePreference;
  error: Error;
  onRetry: () => void;
  onReturnToInstrument: () => void;
}

export const WorkbenchContentRenderErrorFallback = ({
  area,
  language,
  error,
  onRetry,
  onReturnToInstrument,
}: WorkbenchContentRenderErrorFallbackProps) => {
  const copy = RENDER_ERROR_COPY[language];
  return (
    <section
      className={`studio-render-error studio-render-error-${area}`}
      data-workbench-content-render-error={area}
      role="alert"
    >
      <span>{copy.eyebrow}</span>
      <h2>{area === 'data-processing' ? copy.processingTitle : copy.calculationTitle}</h2>
      <p>{copy.body}</p>
      <details>
        <summary>{error.name}</summary>
        <code>{error.message}</code>
      </details>
      <div className="studio-render-error-actions">
        <button type="button" onClick={onRetry}>{copy.retry}</button>
        <button type="button" onClick={onReturnToInstrument}>
          {copy.returnToInstrument}
        </button>
      </div>
    </section>
  );
};

export interface WorkbenchOuterRenderErrorFallbackProps {
  language: WorkbenchLanguagePreference;
  theme: WorkbenchResolvedTheme;
  error: Error;
  onRetry: () => void;
}

export const WorkbenchOuterRenderErrorFallback = ({
  language,
  theme,
  error,
  onRetry,
}: WorkbenchOuterRenderErrorFallbackProps) => {
  const copy = RENDER_ERROR_COPY[language];
  useEffect(() => {
    const desktopWindowBridge = window.hardSphereLabWindow;
    const unsubscribe = desktopWindowBridge?.onPrepareExit?.((request) => {
      void desktopWindowBridge.reportPersistenceResult({
        requestId: request.requestId,
        saved: true,
      });
    });
    return () => unsubscribe?.();
  }, []);
  return (
    <div
      className={`studio-workbench studio-theme-${theme}`}
      data-workbench-outer-render-error="true"
    >
      <div className="studio-shell studio-shell-render-error">
        <header className="studio-menu">
          <div className="studio-titlebar-brand" aria-label={getWorkbenchAppBrandName(language)}>
            <span className="studio-brand-mark" aria-hidden="true">
              <img src="favicon.png" alt="" />
            </span>
            <span>{getWorkbenchAppBrandName(language)}</span>
          </div>
          <div className="studio-titlebar-drag-fill" aria-hidden="true" />
          <WorkbenchWindowControls language={language} />
        </header>
        <main className="studio-render-error-outer-body">
          <section className="studio-render-error" role="alert">
            <span>{copy.eyebrow}</span>
            <h2>{copy.outerTitle}</h2>
            <p>{copy.body}</p>
            <details>
              <summary>{error.name}</summary>
              <code>{error.message}</code>
            </details>
            <div className="studio-render-error-actions">
              <button type="button" onClick={onRetry}>{copy.retry}</button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
