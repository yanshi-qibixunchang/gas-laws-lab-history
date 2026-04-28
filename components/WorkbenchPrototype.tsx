import React, { useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  BarChart3,
  Beaker,
  ChevronDown,
  ChevronRight,
  Download,
  FilePlus2,
  FileText,
  FlaskConical,
  Gauge,
  Languages,
  LayoutDashboard,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings,
  SlidersHorizontal,
  Table2,
  Thermometer,
} from 'lucide-react';
import './WorkbenchPrototype.css';

type WorkspaceTab = 'Simulation View' | 'Realtime Charts' | 'Final Analysis' | 'Ideal Gas Lab' | 'Report Preview';
type LogKind = 'info' | 'warning' | 'success' | 'error';

interface ConsoleLog {
  id: number;
  time: string;
  kind: LogKind;
  message: string;
}

const menus = ['File', 'Edit', 'View', 'Simulation', 'Analysis', 'Tools', 'Help'];
const tabs: WorkspaceTab[] = ['Simulation View', 'Realtime Charts', 'Final Analysis', 'Ideal Gas Lab', 'Report Preview'];

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

const initialLogs: ConsoleLog[] = [
  { id: 1, time: '00:00:00', kind: 'info', message: 'Hard Sphere Workbench prototype initialized.' },
  { id: 2, time: '00:00:01', kind: 'warning', message: 'PhysicsEngine is intentionally disconnected in this UI design pass.' },
  { id: 3, time: '00:00:02', kind: 'success', message: 'Mock study loaded: Standard Simulation / Ideal Gas Verification.' },
];

const formatTime = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

const WorkbenchPrototype: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('Simulation View');
  const [logs, setLogs] = useState<ConsoleLog[]>(initialLogs);
  const [selectedNode, setSelectedNode] = useState('Standard Simulation');

  const selectedProperties = useMemo(
    () => [
      ['Object Type', selectedNode.includes('Chart') || selectedNode.includes('Distribution') ? 'Chart View' : selectedNode.includes('Result') ? 'Result Set' : 'Simulation Object'],
      ['Particle Count', '200'],
      ['Box Size', '15.0'],
      ['Particle Radius', '0.20'],
      ['Time Step', '0.01'],
      ['Sampling Window', '10s + 60s'],
      ['Thermostat', 'Andersen'],
      ['Status', 'Mock UI Only'],
    ],
    [selectedNode],
  );

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

  const handleAction = (label: string, kind: LogKind = 'info') => {
    pushLog(`Mock action: ${label}`, kind);
  };

  const renderToolButton = (
    label: string,
    icon: React.ReactNode,
    kind: LogKind = 'info',
    primary = false,
  ) => (
    <button
      type="button"
      className={`wb-tool-button ${primary ? 'wb-tool-button-primary' : ''}`}
      onClick={() => handleAction(label, kind)}
      title={`${label} mock action`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const renderRibbonGroup = (title: string, children: React.ReactNode) => (
    <div className="wb-ribbon-group">
      <div className="wb-tool-group">{children}</div>
      <div className="wb-ribbon-title">{title}</div>
    </div>
  );

  const treeRows: Array<{ label: string; icon: React.ReactNode; depth: number; count?: string; tab?: WorkspaceTab }> = [
    { label: 'Hard Sphere Lab Study', icon: <ChevronDown size={13} />, depth: 0 },
    { label: 'Experiments', icon: <ChevronDown size={13} />, depth: 1, count: '2' },
    { label: 'Standard Simulation', icon: <Activity size={13} />, depth: 2, count: 'active', tab: 'Simulation View' },
    { label: 'Ideal Gas Law Verification', icon: <FlaskConical size={13} />, depth: 2, count: 'P-T', tab: 'Ideal Gas Lab' },
    { label: 'Parameter Sets', icon: <ChevronDown size={13} />, depth: 1, count: '4' },
    { label: 'Default Parameters', icon: <SlidersHorizontal size={13} />, depth: 2 },
    { label: 'Saved Presets', icon: <Archive size={13} />, depth: 2, count: 'local' },
    { label: 'Results', icon: <ChevronDown size={13} />, depth: 1, count: 'mock' },
    { label: 'Realtime Metrics', icon: <Gauge size={13} />, depth: 2, tab: 'Realtime Charts' },
    { label: 'Final Statistics', icon: <Table2 size={13} />, depth: 2, tab: 'Final Analysis' },
    { label: 'Charts', icon: <ChevronDown size={13} />, depth: 1, count: '5' },
    { label: 'Speed Distribution', icon: <BarChart3 size={13} />, depth: 2, tab: 'Realtime Charts' },
    { label: 'Energy Distribution', icon: <BarChart3 size={13} />, depth: 2, tab: 'Realtime Charts' },
    { label: 'Diagnostics', icon: <Thermometer size={13} />, depth: 2, tab: 'Final Analysis' },
    { label: 'Reports', icon: <ChevronDown size={13} />, depth: 1, count: '1' },
    { label: 'Built-in PDF Report', icon: <FileText size={13} />, depth: 2, tab: 'Report Preview' },
  ];

  const renderWorkspaceContent = () => {
    if (activeTab === 'Realtime Charts') {
      return (
        <div className="wb-dashboard-grid">
          {['Speed distribution', 'Energy distribution', 'Temperature error', 'Total energy trace'].map((title, index) => (
            <section className="wb-mock-chart" key={title}>
              <div className="wb-card-header">
                <span>{title}</span>
                <span>{index < 2 ? 'Histogram' : 'Trace'}</span>
              </div>
              <div className="wb-bars">
                {Array.from({ length: 18 }).map((_, barIndex) => (
                  <span key={barIndex} style={{ height: `${24 + ((barIndex * 19 + index * 11) % 68)}%` }} />
                ))}
              </div>
            </section>
          ))}
        </div>
      );
    }

    if (activeTab === 'Final Analysis') {
      return (
        <div className="wb-analysis-layout">
          <section className="wb-analysis-card">
            <div className="wb-card-header">
              <span>Distribution Fit Summary</span>
              <span>mock</span>
            </div>
            <div className="wb-metric-grid">
              <div><span>Speed deviation</span><strong>2.18e-2</strong></div>
              <div><span>Energy deviation</span><strong>1.47e-2</strong></div>
              <div><span>Mean temp error</span><strong>0.84%</strong></div>
              <div><span>Energy drift</span><strong>1.12%</strong></div>
            </div>
          </section>
          <section className="wb-analysis-card">
            <div className="wb-card-header">
              <span>Final Result Table</span>
              <span>read-only mock</span>
            </div>
            <table className="wb-data-table">
              <tbody>
                <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
                <tr><td>Temperature</td><td>1.000</td><td>stable</td></tr>
                <tr><td>Pressure</td><td>0.0593</td><td>sampled</td></tr>
                <tr><td>RMS speed</td><td>1.732</td><td>expected</td></tr>
                <tr><td>Samples</td><td>2000</td><td>limited</td></tr>
              </tbody>
            </table>
          </section>
        </div>
      );
    }

    if (activeTab === 'Ideal Gas Lab') {
      return (
        <div className="wb-lab-layout">
          <section className="wb-analysis-card">
            <div className="wb-card-header">
              <span>Ideal Gas Verification</span>
              <span>P-T relation</span>
            </div>
            <div className="wb-lab-flow">
              <div><strong>1</strong><span>Select target temperature</span></div>
              <div><strong>2</strong><span>Run equilibrium sampling</span></div>
              <div><strong>3</strong><span>Record pressure point</span></div>
              <div><strong>4</strong><span>Check linear fit</span></div>
            </div>
          </section>
          <section className="wb-analysis-card">
            <div className="wb-card-header">
              <span>Experiment Points</span>
              <span>mock</span>
            </div>
            <table className="wb-data-table">
              <tbody>
                <tr><th>T target</th><th>P measured</th><th>Verdict</th></tr>
                <tr><td>0.60</td><td>0.035</td><td>recorded</td></tr>
                <tr><td>1.00</td><td>0.059</td><td>recorded</td></tr>
                <tr><td>1.50</td><td>0.088</td><td>pending</td></tr>
              </tbody>
            </table>
          </section>
        </div>
      );
    }

    if (activeTab === 'Report Preview') {
      return (
        <div className="wb-report-preview">
          <FileText size={46} />
          <h2>Built-in PDF Report</h2>
          <p>Report preview placeholder. The current PDF modal is not connected in this prototype screen.</p>
          <button type="button" onClick={() => handleAction('Open built-in PDF report')}>
            Open Report Mock
          </button>
        </div>
      );
    }

    return (
      <div className="wb-viewport">
        <div className="wb-viewport-stage">
          <div className="wb-viewport-label">
            <strong>Hard-sphere molecular dynamics view</strong>
            <span>Mock viewport for layout design. Real particles are not connected.</span>
          </div>
          <div className="wb-model-box">
            {particles.map((particle, index) => (
              <span
                key={index}
                className="wb-particle"
                style={{ left: particle.left, top: particle.top }}
              />
            ))}
          </div>
          <div className="wb-axis">
            <span>X  1.00</span>
            <span>Y  1.00</span>
            <span>Z  1.00</span>
          </div>
        </div>
        <div className="wb-workspace-strip">
          <div className="wb-strip-card">
            <div className="wb-strip-label">Temperature</div>
            <div className="wb-strip-value">1.000 K*</div>
          </div>
          <div className="wb-strip-card">
            <div className="wb-strip-label">Pressure</div>
            <div className="wb-strip-value">0.0593</div>
          </div>
          <div className="wb-strip-card">
            <div className="wb-strip-label">Mean speed</div>
            <div className="wb-strip-value">1.596</div>
          </div>
          <div className="wb-strip-card">
            <div className="wb-strip-label">Run phase</div>
            <div className="wb-strip-value">idle</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="workbench-prototype">
      <div className="wb-shell">
        <header className="wb-menu-bar">
          <div className="wb-brand">
            <span className="wb-brand-mark">HS</span>
            <span>Hard Sphere Workbench</span>
          </div>
          {menus.map((menu) => (
            <button key={menu} type="button" className="wb-menu-item" onClick={() => handleAction(`${menu} menu`)}>
              {menu}
            </button>
          ))}
        </header>

        <section className="wb-toolbar" aria-label="Workbench toolbar">
          <div className="wb-toolbar-groups">
            {renderRibbonGroup('Project', (
              <>
                {renderToolButton('New Study', <FilePlus2 size={16} />)}
                {renderToolButton('Save Preset', <Save size={16} />, 'success')}
                {renderToolButton('Load Preset', <Archive size={16} />)}
              </>
            ))}
            {renderRibbonGroup('Simulation', (
              <>
                {renderToolButton('Apply Params', <SlidersHorizontal size={16} />)}
                {renderToolButton('Run', <Play size={16} />, 'success', true)}
                {renderToolButton('Pause', <Pause size={16} />, 'warning')}
                {renderToolButton('Reset System', <RotateCcw size={16} />, 'warning')}
              </>
            ))}
            {renderRibbonGroup('Experiment', (
              <>
                {renderToolButton('Record Point', <Beaker size={16} />, 'success')}
                {renderToolButton('Verify P-T', <FlaskConical size={16} />)}
                {renderToolButton('Clear Samples', <RotateCcw size={16} />, 'warning')}
              </>
            ))}
            {renderRibbonGroup('Analysis', (
              <>
                {renderToolButton('Charts', <BarChart3 size={16} />)}
                {renderToolButton('Final Stats', <Table2 size={16} />)}
                {renderToolButton('Report', <FileText size={16} />)}
              </>
            ))}
            {renderRibbonGroup('Tools', (
              <>
                {renderToolButton('Export PDF', <Download size={16} />)}
                {renderToolButton('Language', <Languages size={16} />)}
                {renderToolButton('Settings', <Settings size={16} />)}
              </>
            ))}
          </div>
          <div className="wb-toolbar-status">
            <span className="wb-status-dot" />
            <span>Workbench mockup</span>
            <span>PhysicsEngine disconnected</span>
          </div>
        </section>

        <main className="wb-main">
          <aside className="wb-panel" aria-label="Project Explorer">
            <div className="wb-panel-header">
              <span>Project Explorer</span>
              <SlidersHorizontal size={14} />
            </div>
            <div className="wb-panel-body">
              <div className="wb-tree">
                {treeRows.map((row) => (
                  <button
                    key={row.label}
                    type="button"
                    className={`wb-tree-row ${selectedNode === row.label ? 'wb-tree-row-active' : ''} ${row.depth > 0 ? 'wb-tree-child' : ''}`}
                    onClick={() => {
                      setSelectedNode(row.label);
                      if (row.tab) setActiveTab(row.tab);
                      pushLog(`Selected project node: ${row.label}`);
                    }}
                  >
                    {row.icon}
                    <span>{row.label}</span>
                    {row.count && <span className="wb-tree-count">{row.count}</span>}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="wb-workspace" aria-label="Workspace">
            <div className="wb-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`wb-tab ${activeTab === tab ? 'wb-tab-active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab);
                    pushLog(`Workspace tab opened: ${tab}`);
                  }}
                >
                  {tab === 'Simulation View' && <LayoutDashboard size={13} />}
                  {tab === 'Realtime Charts' && <BarChart3 size={13} />}
                  {tab === 'Final Analysis' && <Table2 size={13} />}
                  {tab === 'Ideal Gas Lab' && <FlaskConical size={13} />}
                  {tab === 'Report Preview' && <FileText size={13} />}
                  <span>{tab}</span>
                </button>
              ))}
            </div>

            <div className="wb-canvas-area">
              {renderWorkspaceContent()}
            </div>
          </section>

          <aside className="wb-panel wb-panel-right" aria-label="Properties Panel">
            <div className="wb-panel-header">
              <span>Properties</span>
              <Settings size={14} />
            </div>
            <div className="wb-panel-body">
              <div className="wb-property-grid">
                <section className="wb-property-section">
                  <div className="wb-property-title">Selected object</div>
                  <div className="wb-property-row">
                    <div className="wb-property-key">Name</div>
                    <div className="wb-property-value">{selectedNode}</div>
                  </div>
                  {selectedProperties.map(([key, value]) => (
                    <div className="wb-property-row" key={key}>
                      <div className="wb-property-key">{key}</div>
                      <div className="wb-property-value">{value}</div>
                    </div>
                  ))}
                </section>

                <section className="wb-property-section">
                  <div className="wb-property-title">Parameter editor placeholder</div>
                  <div className="wb-property-row">
                    <div className="wb-property-key">N</div>
                    <div className="wb-property-value">200 particles</div>
                  </div>
                  <div className="wb-property-row">
                    <div className="wb-property-key">r</div>
                    <div className="wb-property-value">0.20</div>
                  </div>
                  <div className="wb-property-row">
                    <div className="wb-property-key">L</div>
                    <div className="wb-property-value">15.0</div>
                  </div>
                  <div className="wb-property-row">
                    <div className="wb-property-key">dt</div>
                    <div className="wb-property-value">0.01</div>
                  </div>
                </section>
              </div>
            </div>
          </aside>
        </main>

        <section className="wb-console" aria-label="Console Output">
          <div className="wb-console-header">
            <span>Console / Output</span>
            <div className="wb-console-tabs">
              <span>Logs</span>
              <span>Warnings</span>
              <span>Summary</span>
            </div>
          </div>
          <div className="wb-console-body">
            {logs.map((log) => (
              <div className="wb-log" key={log.id}>
                <span className="wb-log-time">{log.time}</span>
                <span className={`wb-log-kind-${log.kind}`}>{log.kind.toUpperCase()}</span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="wb-status-bar">
          <div className="wb-status-group">
            <span>Branch: react-workbench</span>
            <span>Engine: disconnected</span>
            <span>UI: feature-mapped mock</span>
          </div>
          <div className="wb-status-group">
            <span>TypeScript</span>
            <span>Vite Preview Ready</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default WorkbenchPrototype;
