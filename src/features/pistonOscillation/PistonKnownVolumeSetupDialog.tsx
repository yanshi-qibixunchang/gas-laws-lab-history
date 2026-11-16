import { useId, useRef } from 'react';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';
import { pistonKnownVolumeCopy } from './pistonKnownVolumeCopy.ts';
import './PistonOscillationFreeSetupDialog.css';

export const PistonKnownVolumeSetupDialog = ({ open, language, onCancel, onConfirm }: {
  open: boolean; language: 'zh-CN' | 'zh-TW' | 'en'; onCancel: () => void; onConfirm: () => void;
}) => {
  const descriptionId = useId();
  const startRef = useRef<HTMLButtonElement>(null);
  if (!open) return null;
  const copy = pistonKnownVolumeCopy[language];
  return <PromptDialogShell title={copy.title} subtitle={copy.subtitle} variant="task" role="dialog"
    ariaDescribedBy={descriptionId} dismiss={{ closeButton: false, escape: true, backdrop: false }}
    onRequestClose={onCancel} initialFocusRef={startRef}
    overlayClassName="studio-settings-overlay studio-piston-free-setup-overlay"
    dialogClassName="studio-settings-window studio-piston-free-setup-window"
    headerClassName="studio-settings-header studio-piston-free-setup-header"
    overlayData={{ 'data-piston-known-volume-setup': 'true' }}>
    <div className="studio-settings-body studio-piston-free-setup-body">
      <p id={descriptionId} className="studio-piston-free-setup-description">{copy.description}</p>
      <section className="studio-piston-free-setup-section">
        <header><div><strong>{copy.conditions}</strong><span>{copy.plan}</span></div></header>
      </section>
    </div>
    <footer className="studio-piston-free-setup-actions">
      <button type="button" className="studio-piston-free-setup-cancel" onClick={onCancel}>{copy.cancel}</button>
      <button ref={startRef} type="button" className="studio-piston-free-setup-confirm"
        data-piston-known-volume-confirm="true" onClick={onConfirm}>{copy.start}</button>
    </footer>
  </PromptDialogShell>;
};
