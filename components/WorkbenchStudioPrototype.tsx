import React, { useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  BarChart3,
  Beaker,
  BookOpen,
  ChevronDown,
  FilePlus2,
  FileText,
  FlaskConical,
  Gauge,
  History,
  Languages,
  Pause,
  Play,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Table2,
  Wrench,
} from 'lucide-react';
import './WorkbenchStudioPrototype.css';

type FileKind = 'standard' | 'ideal';
type PanelKey =
  | 'preview'
  | 'realtime'
  | 'finalStats'
  | 'dataTable'
  | 'experimentPoints'
  | 'verification'
  | 'history'
  | 'report';
type LogKind = 'info' | 'warning' | 'success' | 'error';
type TopMenu = 'new' | 'window' | 'settings' | 'help' | null;

interface WorkbenchFile {
  id: string;
  name: string;
  kind: FileKind;
  visiblePanels: PanelKey[];
}

interface ConsoleLog {
  id: number;
  time: string;
  kind: LogKind;
  message: string;
}

interface PanelDefinition {
  key: PanelKey;
  title: string;
  hint: string;
  icon: React.ReactNode;
  defaultVisible?: boolean;
}

interface ParameterRow {
  label: string;
  value: string;
  unit?: string;
}

const particles = [
  { left: '18%', top: '26%' },
  { left: '35%', top: '34%' },
  { left: '54%', top: '22%' },
  { left: '67%', top: '42%' },
  { left: '28%', top: '57%' },
  { left: '48%', top: '63%' },
  { left: '72%', top: '61%' },
  { left: '41%', top: '46%' },
];

const standardPanels: PanelDefinition[] = [
  { key: 'preview', title: '3D Preview', hint: 'Realtime molecular viewport', icon: <Activity size={13} />, defaultVisible: true },
  { key: 'realtime', title: 'Realtime Data / Charts', hint: 'Live temperature, pressure, speed traces', icon: <BarChart3 size={13} />, defaultVisible: true },
  { key: 'finalStats', title: 'Final Statistics', hint: 'Distribution fit and diagnostics', icon: <Gauge size={13} /> },
  { key: 'dataTable', title: 'Data Table', hint: 'Collected mock samples', icon: <Table2 size={13} /> },
  { key: 'report', title: 'Report Preview', hint: 'Built-in PDF report placeholder', icon: <FileText size={13} /> },
];

const idealPanels: PanelDefinition[] = [
  { key: 'preview', title: '3D Preview', hint: 'Realtime molecular viewport', icon: <Activity size={13} />, defaultVisible: true },
  { key: 'realtime', title: 'Realtime Data / Charts', hint: 'Live T, P, relation and chart traces', icon: <BarChart3 size={13} />, defaultVisible: true },
  { key: 'experimentPoints', title: 'Experiment Points', hint: 'P-T/P-V/P-N point table', icon: <Beaker size={13} /> },
  { key: 'verification', title: 'Verification Chart', hint: 'Linear fit and verdict mock', icon: <FlaskConical size={13} /> },
  { key: 'history', title: 'Success History', hint: 'Unlocked explanation after verification success', icon: <History size={13} /> },
  { key: 'report', title: 'Report Preview', hint: 'Built-in PDF report placeholder', icon: <FileText size={13} /> },
];

const initialFiles: WorkbenchFile[] = [
  {
    id: 'standard-001',
    name: 'Standard Simulation - 001',
    kind: 'standard',
    visiblePanels: ['preview', 'realtime'],
  },
  {
    id: 'ideal-001',
    name: 'Ideal Gas Simulation - 001',
    kind: 'ideal',
    visiblePanels: ['preview', 'realtime'],
  },
];

const initialLogs: ConsoleLog[] = [
  { id: 1, time: '00:00:00', kind: 'info', message: 'Workbench studio prototype initialized.' },
  { id: 2, time: '00:00:01', kind: 'success', message: 'Default layout: 3D Preview, Realtime Data / Charts, Current Parameters.' },
  { id: 3, time: '00:00:02', kind: 'warning', message: 'Panels are layout mockups only. PhysicsEngine is not connected.' },
];

const formatTime = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

const WorkbenchStudioPrototype: React.FC = () => {
  const [files, setFiles] = useState<WorkbenchFile[]>(initialFiles);
  const [activeFileId, setActiveFileId] = useState(initialFiles[0].id);
  const [selectedPanel, setSelectedPanel] = useState<PanelKey>('preview');
  const [logs, setLogs] = useState<ConsoleLog[]>(initialLogs);
  const [openTopMenu, setOpenTopMenu] = useState<TopMenu>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [parametersCollapsed, setParametersCollapsed] = useState(false);
  const [parametersEditing, setParametersEditing] = useState(false);

  const activeFile = files.find((file) => file.id === activeFileId) ?? files[0];
  const availablePanels = activeFile.kind === 'standard' ? standardPanels : idealPanels;
  const activePanelTitle = availablePanels.find((panel) => panel.key === selectedPanel)?.title ?? '3D Preview';
  const primaryPanels = availablePanels.filter((panel) => panel.key === 'preview' || panel.key === 'realtime');
  const optionalPanels = availablePanels.filter(
    (panel) => panel.key !== 'preview' && panel.key !== 'realtime' && activeFile.visiblePanels.includes(panel.key),
  );

  const currentParameters = useMemo<ParameterRow[]>(() => {
    const base: ParameterRow[] = [
      { label: 'N', value: activeFile.kind === 'ideal' ? '128' : '200', unit: 'particles' },
      { label: 'r', value: activeFile.kind === 'ideal' ? '0.16' : '0.20' },
      { label: 'L', value: activeFile.kind === 'ideal' ? '12.0' : '15.0' },
      { label: 'dt', value: '0.01' },
      { label: 'nu', value: activeFile.kind === 'ideal' ? '0.80' : '1.00' },
      { label: 'equilibriumTime', value: activeFile.kind === 'ideal' ? '8' : '10', unit: 's' },
      { label: 'statsDuration', value: activeFile.kind === 'ideal' ? '45' : '60', unit: 's' },
    ];

    if (activeFile.kind === 'ideal') {
      return [
        ...base,
        { label: 'targetTemperature', value: '1.00', unit: 'K*' },
        { label: 'verification', value: 'P-T relation' },
      ];
    }

    return base;
  }, [activeFile.kind]);

  const pushLog = (message: string, kind: LogKind = 'info') => {
    setLogs((current) => [
      ...current,
      {
        id: current.length + 1,
        time: formatTime(),
        kind,
        message,
      },
    ]);
  };

  const createFile = (kind: FileKind) => {
    const index = files.filter((file) => file.kind === kind).length + 1;
    const id = `${kind}-${String(index).padStart(3, '0')}`;
    const file: WorkbenchFile = {
      id,
      kind,
      name: `${kind === 'standard' ? 'Standard Simulation' : 'Ideal Gas Simulation'} - ${String(index).padStart(3, '0')}`,
      visiblePanels: ['preview', 'realtime'],
    };

    setFiles((current) => [...current, file]);
    setActiveFileId(id);
    setSelectedPanel('preview');
    setOpenTopMenu(null);
    pushLog(`Mock study created: ${file.name}`, 'success');
  };

  const handleAction = (label: string, kind: LogKind = 'info') => {
    pushLog(`Mock action: ${label}`, kind);
  };

  const togglePanel = (panel: PanelKey) => {
    setSelectedPanel(panel);
    setFiles((current) =>
      current.map((file) => {
        if (file.id !== activeFile.id) return file;
        const exists = file.visiblePanels.includes(panel);
        return {
          ...file,
          visiblePanels: exists
            ? file.visiblePanels.filter((item) => item !== panel)
            : [...file.visiblePanels, panel],
        };
      }),
    );
    pushLog(`${activeFile.name}: toggled panel ${panel}`);
  };

  const resetLayout = () => {
    setFiles((current) =>
      current.map((file) =>
        file.id === activeFile.id
          ? { ...file, visiblePanels: ['preview', 'realtime'] }
          : file,
      ),
    );
    setOpenTopMenu(null);
    pushLog(`${activeFile.name}: layout reset to 3D Preview + Realtime Data / Charts`, 'warning');
  };

  const selectFile = (file: WorkbenchFile) => {
    setActiveFileId(file.id);
    setSelectedPanel('preview');
    setParametersEditing(false);
    pushLog(`File tab selected: ${file.name}`);
  };

  const renderTopCommand = (menu: Exclude<TopMenu, null>, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      className={`studio-command-button ${openTopMenu === menu ? 'studio-command-button-active' : ''}`}
      onClick={() => setOpenTopMenu((current) => (current === menu ? null : menu))}
    >
      {icon}
      <span>{label}</span>
      <ChevronDown size={12} />
    </button>
  );

  const renderTopMenu = () => {
    if (openTopMenu === 'new') {
      return (
        <div className="studio-command-menu studio-command-menu-new">
          <button type="button" onClick={() => createFile('standard')}>
            <Activity size={14} />
            <span>Standard Simulation Study</span>
          </button>
          <button type="button" onClick={() => createFile('ideal')}>
            <FlaskConical size={14} />
            <span>Ideal Gas Simulation Study</span>
          </button>
        </div>
      );
    }

    if (openTopMenu === 'window') {
      return (
        <div className="studio-command-menu studio-command-menu-window">
          <div className="studio-command-menu-title">Panels for {activeFile.name}</div>
          {availablePanels.map((panel) => (
            <button type="button" key={panel.key} onClick={() => togglePanel(panel.key)}>
              {panel.icon}
              <span>{panel.title}</span>
              <strong>{activeFile.visiblePanels.includes(panel.key) ? 'shown' : 'off'}</strong>
            </button>
          ))}
          <button type="button" onClick={resetLayout}>
            <RotateCcw size={14} />
            <span>Reset Default Layout</span>
            <strong>default</strong>
          </button>
        </div>
      );
    }

    if (openTopMenu === 'settings') {
      return (
        <div className="studio-command-menu studio-command-menu-settings">
          <button type="button" onClick={() => handleAction('Switch theme')}>
            <Settings size={14} />
            <span>Theme: Dark / Light</span>
          </button>
          <button type="button" onClick={() => handleAction('Switch language')}>
            <Languages size={14} />
            <span>Language: Chinese / English</span>
          </button>
          <button type="button" onClick={() => handleAction('Performance mode')}>
            <Wrench size={14} />
            <span>Performance Mode</span>
          </button>
        </div>
      );
    }

    if (openTopMenu === 'help') {
      return (
        <div className="studio-command-menu studio-command-menu-help">
          <button type="button" onClick={() => handleAction('Open user guide')}>
            <BookOpen size={14} />
            <span>User Guide</span>
          </button>
          <button type="button" onClick={() => handleAction('Open theory PDF')}>
            <FileText size={14} />
            <span>Theory Document PDF</span>
          </button>
          <button type="button" onClick={() => handleAction('About workbench')}>
            <Archive size={14} />
            <span>About Hard Sphere Workbench</span>
          </button>
        </div>
      );
    }

    return null;
  };

  const renderPreviewPanel = () => (
    <div className="studio-preview">
      <div className="studio-preview-stage">
        <div className="studio-preview-label">
          <strong>{activeFile.name}</strong>
          <span>Mock 3D viewport. Real particles are not connected yet.</span>
        </div>
        <div className="studio-model-box">
          {particles.map((particle, index) => (
            <span key={index} className="studio-particle" style={{ left: particle.left, top: particle.top }} />
          ))}
        </div>
      </div>
      <div className="studio-preview-metrics">
        <div className="studio-metric"><span>Temperature</span><strong>{activeFile.kind === 'ideal' ? '1.000 K*' : '1.000'}</strong></div>
        <div className="studio-metric"><span>Pressure</span><strong>0.0593</strong></div>
        <div className="studio-metric"><span>Mean speed</span><strong>1.596</strong></div>
        <div className="studio-metric"><span>Run phase</span><strong>idle</strong></div>
      </div>
    </div>
  );

  const renderRealtimePanel = () => (
    <div className="studio-realtime-panel">
      <div className="studio-realtime-summary">
        <div><span>T</span><strong>{activeFile.kind === 'ideal' ? '1.000 K*' : '1.000'}</strong></div>
        <div><span>P</span><strong>0.0593</strong></div>
        <div><span>v mean</span><strong>1.596</strong></div>
        <div><span>{activeFile.kind === 'ideal' ? 'Relation' : 'Samples'}</span><strong>{activeFile.kind === 'ideal' ? 'P-T' : '2400'}</strong></div>
      </div>
      <div className="studio-chart-body">
        {Array.from({ length: 30 }).map((_, index) => (
          <span key={index} style={{ height: `${22 + ((index * 17) % 68)}%` }} />
        ))}
      </div>
    </div>
  );

  const renderTablePanel = (panel: PanelKey) => (
    <table className="studio-table">
      <tbody>
        {panel === 'experimentPoints' ? (
          <>
            <tr><th>T target</th><th>P measured</th><th>Verdict</th></tr>
            <tr><td>0.60</td><td>0.035</td><td>recorded</td></tr>
            <tr><td>1.00</td><td>0.059</td><td>recorded</td></tr>
            <tr><td>1.50</td><td>0.088</td><td>pending</td></tr>
          </>
        ) : (
          <>
            <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
            <tr><td>Temperature</td><td>1.000</td><td>stable</td></tr>
            <tr><td>Pressure</td><td>0.0593</td><td>sampled</td></tr>
            <tr><td>RMS speed</td><td>1.732</td><td>expected</td></tr>
          </>
        )}
      </tbody>
    </table>
  );

  const renderAnalysisPanel = () => (
    <div className="studio-analysis-grid">
      <div className="studio-analysis-cell"><span>Speed deviation</span><strong>2.18e-2</strong></div>
      <div className="studio-analysis-cell"><span>Energy deviation</span><strong>1.47e-2</strong></div>
      <div className="studio-analysis-cell"><span>Mean temp error</span><strong>0.84%</strong></div>
      <div className="studio-analysis-cell"><span>Energy drift</span><strong>1.12%</strong></div>
    </div>
  );

  const renderHistoryPanel = () => (
    <div className="studio-history">
      <p><strong>Verification history placeholder.</strong></p>
      <p>After an ideal-gas relation is verified, this block can show the scientific background, the relation that was verified, and the meaning of the fitted result.</p>
      <p>This remains mock content in the prototype.</p>
    </div>
  );

  const renderPanelContent = (panel: PanelDefinition) => {
    if (panel.key === 'preview') return renderPreviewPanel();
    if (panel.key === 'realtime' || panel.key === 'verification') return renderRealtimePanel();
    if (panel.key === 'finalStats') return renderAnalysisPanel();
    if (panel.key === 'dataTable' || panel.key === 'experimentPoints') return renderTablePanel(panel.key);
    if (panel.key === 'history') return renderHistoryPanel();
    return (
      <div className="studio-empty">
        <div>
          <FileText size={42} />
          <p>Report preview placeholder. The PDF viewer is not connected in this prototype.</p>
        </div>
      </div>
    );
  };

  const renderDockHeader = (panel: PanelDefinition) => (
    <div className="studio-dock-header">
      <div>
        <span>{panel.title}</span>
        <small>{panel.hint}</small>
      </div>
      {panel.key === 'preview' ? (
        <div className="studio-panel-actions">
          <button type="button" onClick={() => handleAction('Run current file', 'success')}><Play size={13} />Run</button>
          <button type="button" onClick={() => handleAction('Pause current file', 'warning')}><Pause size={13} />Pause</button>
          <button type="button" onClick={() => handleAction('Reset current file', 'warning')}><RotateCcw size={13} />Reset</button>
          <button type="button" title="Apply Params" onClick={() => handleAction('Apply Params', 'success')}><SlidersHorizontal size={13} />Apply</button>
        </div>
      ) : null}
    </div>
  );

  const renderDockPanel = (panel: PanelDefinition, optional = false) => (
    <section
      className={`studio-dock-panel ${optional ? 'studio-optional-panel' : 'studio-fixed-panel'}`}
      key={panel.key}
      onClick={() => setSelectedPanel(panel.key)}
    >
      {renderDockHeader(panel)}
      {renderPanelContent(panel)}
    </section>
  );

  return (
    <div className="studio-workbench">
      <div className="studio-shell">
        <header className="studio-menu">
          <div className="studio-brand">
            <span className="studio-brand-mark">HS</span>
            <span>Hard Sphere Workbench</span>
          </div>
          <nav className="studio-top-commands" aria-label="Top commands">
            {renderTopCommand('new', 'New Study', <FilePlus2 size={14} />)}
            {renderTopCommand('window', 'Window', <Wrench size={14} />)}
            {renderTopCommand('settings', 'Settings', <Settings size={14} />)}
            {renderTopCommand('help', 'Help', <BookOpen size={14} />)}
          </nav>
          {renderTopMenu()}
        </header>

        <main className={`studio-body ${leftCollapsed ? 'studio-left-collapsed' : ''}`}>
          <aside className="studio-sidebar" aria-label="Open Files and Panels">
            <div className="studio-panel-header">
              <span>Open Files</span>
              <button
                type="button"
                className="studio-panel-collapse"
                aria-label="Collapse Open Files sidebar"
                onClick={() => setLeftCollapsed(true)}
              >
                Hide
              </button>
            </div>
            <div className="studio-sidebar-body">
              <section className="studio-tree-section">
                <div className="studio-tree-title">Files</div>
                {files.map((file) => (
                  <button
                    type="button"
                    key={file.id}
                    className={`studio-tree-row ${file.id === activeFile.id ? 'studio-tree-row-active' : ''}`}
                    onClick={() => selectFile(file)}
                  >
                    {file.kind === 'standard' ? <Activity size={13} /> : <FlaskConical size={13} />}
                    <span>{file.name}</span>
                    <span className="studio-tree-meta">{file.kind}</span>
                  </button>
                ))}
              </section>

              <section className="studio-tree-section">
                <div className="studio-tree-title">{activeFile.name} / Panels</div>
                {availablePanels.map((panel) => {
                  const visible = activeFile.visiblePanels.includes(panel.key);
                  return (
                    <button
                      type="button"
                      key={panel.key}
                      className={`studio-tree-row studio-tree-row-child ${selectedPanel === panel.key ? 'studio-tree-row-active' : ''}`}
                      onClick={() => togglePanel(panel.key)}
                      title={panel.hint}
                    >
                      {panel.icon}
                      <span>{panel.title}</span>
                      <span className="studio-tree-meta">{visible ? 'shown' : 'off'}</span>
                    </button>
                  );
                })}
              </section>
            </div>
          </aside>

          {leftCollapsed ? (
            <button type="button" className="studio-rail-button studio-left-rail" onClick={() => setLeftCollapsed(false)}>
              Open Files
            </button>
          ) : null}

          <section className="studio-layout" aria-label="File workspace">
            <div className="studio-file-tabs">
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className={`studio-file-tab ${file.id === activeFile.id ? 'studio-file-tab-active' : ''}`}
                  onClick={() => selectFile(file)}
                >
                  {file.kind === 'standard' ? <Activity size={13} /> : <FlaskConical size={13} />}
                  <span>{file.name}</span>
                  <span className="studio-file-kind">{file.kind === 'standard' ? 'STD' : 'IDEAL'}</span>
                </button>
              ))}
            </div>

            <div className={`studio-workspace-shell ${parametersCollapsed ? 'studio-params-collapsed' : ''}`}>
              <div className="studio-center-workspace">
                {primaryPanels.map((panel) => renderDockPanel(panel))}
                {optionalPanels.length > 0 ? (
                  <div className="studio-optional-panels">
                    {optionalPanels.map((panel) => renderDockPanel(panel, true))}
                  </div>
                ) : null}
              </div>

              <aside className="studio-current-params" aria-label="Current Parameters">
                <div className="studio-current-params-header">
                  <div>
                    <span>Current Parameters</span>
                    <small>{parametersEditing ? 'mock edit mode' : 'current file values'}</small>
                  </div>
                  <button
                    type="button"
                    className="studio-panel-collapse"
                    aria-label="Collapse Current Parameters panel"
                    onClick={() => setParametersCollapsed(true)}
                  >
                    Hide
                  </button>
                </div>
                <div className="studio-current-params-body">
                  <div className="studio-param-file">
                    <strong>{activeFile.kind === 'standard' ? 'Standard Simulation' : 'Ideal Gas Simulation'}</strong>
                    <span>{activeFile.name}</span>
                  </div>
                  {currentParameters.map((param) => (
                    <div className={`studio-param-row ${parametersEditing ? 'studio-param-row-editing' : ''}`} key={param.label}>
                      <span>{param.label}</span>
                      {parametersEditing ? (
                        <input aria-label={`Edit parameter ${param.label}`} defaultValue={param.value} />
                      ) : (
                        <strong>{param.value}</strong>
                      )}
                      {param.unit ? <em>{param.unit}</em> : null}
                    </div>
                  ))}
                  <div className="studio-param-actions">
                    <button
                      type="button"
                      className={`studio-param-edit-button ${parametersEditing ? 'studio-param-edit-button-active' : ''}`}
                      onClick={() => {
                        setParametersEditing((current) => !current);
                        handleAction(parametersEditing ? 'Exit parameter edit mode' : 'Edit parameters in right sidebar');
                      }}
                    >
                      {parametersEditing ? 'Done' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      className="studio-param-save-button"
                      onClick={() => handleAction('Save parameter changes', 'success')}
                    >
                      Save
                    </button>
                  </div>
                  <div className="studio-readonly-note">
                    {parametersEditing
                      ? 'Mock edit mode only. Values are not connected to PhysicsEngine yet.'
                      : 'Click Edit to adjust parameters in this sidebar later. The current prototype does not write real simulation state.'}
                  </div>
                </div>
              </aside>

              {parametersCollapsed ? (
                <button type="button" className="studio-rail-button studio-right-rail" onClick={() => setParametersCollapsed(false)}>
                  Current Parameters
                </button>
              ) : null}
            </div>
          </section>
        </main>

        <section className="studio-console" aria-label="Console Output">
          <div className="studio-console-header">
            <span>Console / Output</span>
            <div className="studio-console-tabs">
              <span>Logs</span>
              <span>Warnings</span>
              <span>Summary</span>
            </div>
          </div>
          <div className="studio-console-body">
            {logs.map((log) => (
              <div className="studio-log" key={log.id}>
                <span className="studio-log-time">{log.time}</span>
                <span className={`studio-log-kind-${log.kind}`}>{log.kind.toUpperCase()}</span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="studio-status">
          <div className="studio-status-group">
            <span>Branch: react-workbench</span>
            <span>Active file: {activeFile.name}</span>
            <span>Selected block: {activePanelTitle}</span>
          </div>
          <div className="studio-status-group">
            <span>Mock UI</span>
            <span>PhysicsEngine disconnected</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default WorkbenchStudioPrototype;
