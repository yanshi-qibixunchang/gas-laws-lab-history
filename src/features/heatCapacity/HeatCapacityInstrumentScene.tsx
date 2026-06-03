import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, createPointerEvents, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Edges, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG,
  getHeatCapacityStopcockState,
} from '../workbench/workbenchState';
import usePreviewOverlayMotion from '../workbench/usePreviewOverlayMotion';
import HeatCapacityHardSphereLayer from './HeatCapacityHardSphereLayer';
import HeatCapacityHardSphereToggle from './HeatCapacityHardSphereToggle';
import HeatCapacityUltraInstrumentModel from './HeatCapacityUltraInstrumentModel';

interface HeatCapacityInstrumentSceneProps {
  performanceMode: 'standard' | 'balanced' | 'performance' | 'ultra';
  sceneTheme: 'dark' | 'light';
  language: 'zh-CN' | 'zh-TW' | 'en';
  autoDemoActive: boolean;
  powerOn: boolean;
  stopcockAngleDeg: number;
  pressureZeroAdjusted: boolean;
  pressureZeroKnobAngle: number;
  pressureZeroOffset: number;
  pressureZeroDisplayText: string;
  pressureRawPlaceholder: number;
  pressureDisplayedPlaceholder: number;
  pressureGaugeDisplayValue: number;
  gaugePressureMinKPa: number;
  gaugePressureMaxKPa: number;
  pressureSafetyThresholdKPa: number;
  pressureOverLimit: boolean;
  pressureZeroAdjustMode: 'none' | 'fineWheel' | 'coarseDrag';
  pressureKPa: number | null;
  pressureDeltaKPa: number;
  gasAmountRatio: number;
  gasTemperatureK: number;
  ambientTemperatureK: number;
  pressureLimitKPa: number;
  pumpValveOpen: boolean;
  pumpValveState: 'open' | 'closed';
  pumpBulbState: 'idle' | 'compressing' | 'releasing';
  pumpPulseId: number;
  pumpFrequency: number;
  pumpFrequencyStatus: 'idle' | 'tooSlow' | 'suitable';
  pumpHint: string;
  pressurePlaceholder: number;
  temperaturePlaceholder: number;
  phase: string;
  temperatureSignalMv: number | null;
  pressureSignalMv: number | null;
  pressureReleaseBurstActive: boolean;
  releaseFlowActive: boolean;
  releaseProgress: number;
  stopcockFlowOpen: boolean;
  pumpFlowActive: boolean;
  pumpFlowIntensity: number;
  hardSphereViewEnabled: boolean;
  hardSphereViewLocked?: boolean;
  hardSphereParticleMultiplier: number;
  hardSphereSpeedMultiplier: number;
  interactionLocked: boolean;
  demoFocusControlId: string | null;
  demoFocusPulseActive: boolean;
  manualRollbackAnimation: 'valveBounce' | 'stopcockBounce' | 'pumpBulbBounce' | 'knobBounce' | 'powerBounce' | null;
  manualRollbackKey: number;
  focusResetKey: number;
  onFocusModeChange: (mode: HeatCapacityFocusMode) => void;
  onLockedInteraction: (message?: string) => void;
  onPowerToggle: (nextPowerOn: boolean) => void;
  onStopcockOpenChange: (nextOpen: boolean) => void;
  onPressureZeroFineAdjust: (direction: number) => void;
  onPressureZeroCoarseAdjust: (angleDeltaDeg: number) => void;
  onPumpValveToggle: () => void;
  onPumpBulbPress: () => void;
  onHardSphereViewToggle: () => void;
  overlayTopLeft?: React.ReactNode;
  overlayTopCenter?: React.ReactNode;
  overlayTopRight?: React.ReactNode;
  overlayBottomRight?: React.ReactNode;
  overlayCenter?: React.ReactNode;
  overlayBottomCenter?: React.ReactNode;
}

type HeatCapacityFocusMode = 'none' | 'stopcock' | 'instrument' | 'pump';
type HeatCapacityHoveredControl = null | 'stopcock' | 'pumpBulb' | 'pumpValve' | 'powerSwitch' | 'pressureZero';
type HeatCapacitySceneTheme = 'dark' | 'light';
type ValveFocusControl = 'stopcock' | 'pumpValve';
type ValveFocusBubbleState = {
  visible: boolean;
  x: number;
  y: number;
  tailX: number;
  source: ValveFocusControl;
  closing: boolean;
};

class HeatCapacityUltraModelErrorBoundary extends React.Component<{
  children: React.ReactNode;
  fallback: React.ReactNode;
}, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('Heat Capacity Ultra GLB failed to render; falling back to procedural scene.', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const heatCapacitySceneCopies = {
  'zh-CN': {
    defaultView: '默认视角',
    interactionTitle: '操作提示',
    unpowered: '未通电',
    pressureZeroLimitUpper: '已到调节上限',
    pressureZeroLimitLower: '已到调节下限',
    pumpBulbIdle: '待机',
    pumpBulbActive: '打气中',
    frequencyIdle: '空闲',
    frequencySlow: '打气过慢',
    frequencySuitable: '打气频率合适',
    hints: {
      stopcock: ['聚焦模式：整体视角已锁定', '玻璃旋塞与打气阀门只保留开 / 关状态', '点击退出聚焦返回默认视角'],
      pump: ['聚焦模式：点击打气球执行打气', '右下角面板显示阀门状态和打气频率', '点击退出聚焦返回默认视角'],
      instrument: ['聚焦模式：整体视角已锁定', '查看仪表读数、电源状态和瓶内参数', '点击退出聚焦返回默认视角'],
      normal: ['左键拖动：旋转模型', '右键拖动：平移模型', '滚轮：缩放模型', '双击高亮部件：进入聚焦', '悬停高亮表示可交互'],
    },
    tooltip: {
      stopcock: '玻璃旋塞：点击切换玻璃旋塞状态',
      pumpValve: '打气阀门：点击切换开闭状态',
      pumpBulbReady: '打气球：聚焦后点击打气',
      pumpBulbClosed: '打气球：需先打开打气阀门',
      powerSwitch: '电源开关：点击开关电源',
      pressureZero: '压力调零旋钮：拖拽粗调 / 滚轮精调',
    },
    focus: {
      stopcockTitle: '旋塞 / 阀门控制',
      glassStopcock: '玻璃旋塞',
      connected: '已连通',
      disconnected: '未连通',
      pumpValve: '打气阀门',
      opened: '已打开',
      closed: '已关闭',
      openStopcock: '连通玻璃旋塞',
      closeStopcock: '关闭玻璃旋塞',
      openPumpValve: '打开打气阀门',
      closePumpValve: '关闭打气阀门',
      enterValveFocus: '进入旋塞 / 阀门聚焦',
      exit: '退出聚焦',
      pumpTitle: '打气球控制',
      pumpBulb: '打气球',
      pumpFrequency: '打气频率',
      frequencyStatus: '频率评价',
      instrumentTitle: '仪表读数',
      powerStatus: '电源状态',
      powerOn: '已开机',
      powerOff: '未开机',
      pressureZero: '压力调零',
      zeroed: '已调零',
      notZeroed: '未调零',
      displayedPressure: '显示压力',
      placeholderTemperature: '瓶内温度',
      currentPhase: '当前阶段',
      zeroOffset: '零点偏移',
      placeholderPressure: '瓶内压强',
    },
  },
  'zh-TW': {
    defaultView: '預設視角',
    interactionTitle: '操作提示',
    unpowered: '未通電',
    pressureZeroLimitUpper: '已到調節上限',
    pressureZeroLimitLower: '已到調節下限',
    pumpBulbIdle: '待機',
    pumpBulbActive: '打氣中',
    frequencyIdle: '閒置',
    frequencySlow: '打氣過慢',
    frequencySuitable: '打氣頻率合適',
    hints: {
      stopcock: ['聚焦模式：整體視角已鎖定', '玻璃旋塞與打氣閥門只保留開 / 關狀態', '點擊退出聚焦返回預設視角'],
      pump: ['聚焦模式：點擊打氣球執行打氣', '右下角面板顯示閥門狀態和打氣頻率', '點擊退出聚焦返回預設視角'],
      instrument: ['聚焦模式：整體視角已鎖定', '查看儀表讀數、電源狀態和瓶內參數', '點擊退出聚焦返回預設視角'],
      normal: ['左鍵拖動：旋轉模型', '右鍵拖動：平移模型', '滾輪：縮放模型', '雙擊高亮部件：進入聚焦', '懸停高亮表示可互動'],
    },
    tooltip: {
      stopcock: '玻璃旋塞：點擊切換玻璃旋塞狀態',
      pumpValve: '打氣閥門：點擊切換開閉狀態',
      pumpBulbReady: '打氣球：聚焦後點擊打氣',
      pumpBulbClosed: '打氣球：需先打開打氣閥門',
      powerSwitch: '電源開關：點擊開關電源',
      pressureZero: '壓力調零旋鈕：拖拽粗調 / 滾輪精調',
    },
    focus: {
      stopcockTitle: '旋塞 / 閥門控制',
      glassStopcock: '玻璃旋塞',
      connected: '已連通',
      disconnected: '未連通',
      pumpValve: '打氣閥門',
      opened: '已打開',
      closed: '已關閉',
      openStopcock: '連通玻璃旋塞',
      closeStopcock: '關閉玻璃旋塞',
      openPumpValve: '打開打氣閥門',
      closePumpValve: '關閉打氣閥門',
      enterValveFocus: '進入旋塞 / 閥門聚焦',
      exit: '退出聚焦',
      pumpTitle: '打氣球控制',
      pumpBulb: '打氣球',
      pumpFrequency: '打氣頻率',
      frequencyStatus: '頻率評價',
      instrumentTitle: '儀表讀數',
      powerStatus: '電源狀態',
      powerOn: '已開機',
      powerOff: '未開機',
      pressureZero: '壓力調零',
      zeroed: '已調零',
      notZeroed: '未調零',
      displayedPressure: '顯示壓力',
      placeholderTemperature: '瓶內溫度',
      currentPhase: '目前階段',
      zeroOffset: '零點偏移',
      placeholderPressure: '瓶內壓強',
    },
  },
  en: {
    defaultView: 'Default view',
    interactionTitle: 'Operation hints',
    unpowered: 'Not powered',
    pressureZeroLimitUpper: 'Upper adjustment limit reached',
    pressureZeroLimitLower: 'Lower adjustment limit reached',
    pumpBulbIdle: 'Idle',
    pumpBulbActive: 'Pumping',
    frequencyIdle: 'Idle',
    frequencySlow: 'Too slow',
    frequencySuitable: 'Suitable rate',
    hints: {
      stopcock: ['Focus mode: camera is locked', 'Glass stopcock and pump valve use open / closed states only', 'Click exit focus to return to the default view'],
      pump: ['Focus mode: click the pump bulb to pump air', 'The lower-right panel shows valve state and pump frequency', 'Click exit focus to return to the default view'],
      instrument: ['Focus mode: camera is locked', 'Inspect instrument readings, power state, and vessel parameters', 'Click exit focus to return to the default view'],
      normal: ['Left drag: rotate model', 'Right drag: pan model', 'Wheel: zoom model', 'Double-click highlighted parts: enter focus', 'Hover highlight means interactive'],
    },
    tooltip: {
      stopcock: 'Glass stopcock: Click to toggle the glass stopcock state',
      pumpValve: 'Pump valve: click to switch open or closed',
      pumpBulbReady: 'Pump bulb: focus, then click to pump',
      pumpBulbClosed: 'Pump bulb: open the pump valve first',
      powerSwitch: 'Power switch: click to toggle power',
      pressureZero: 'Pressure-zero knob: drag for coarse adjustment / wheel for fine adjustment',
    },
    focus: {
      stopcockTitle: 'Stopcock / Valve Control',
      glassStopcock: 'Glass stopcock',
      connected: 'Connected',
      disconnected: 'Disconnected',
      pumpValve: 'Pump valve',
      opened: 'Open',
      closed: 'Closed',
      openStopcock: 'Open glass stopcock',
      closeStopcock: 'Close glass stopcock',
      openPumpValve: 'Open pump valve',
      closePumpValve: 'Close pump valve',
      enterValveFocus: 'Focus stopcock / valve',
      exit: 'Exit focus',
      pumpTitle: 'Pump Bulb Control',
      pumpBulb: 'Pump bulb',
      pumpFrequency: 'Pump frequency',
      frequencyStatus: 'Frequency status',
      instrumentTitle: 'Instrument Readings',
      powerStatus: 'Power state',
      powerOn: 'Power on',
      powerOff: 'Power off',
      pressureZero: 'Pressure zero',
      zeroed: 'Zeroed',
      notZeroed: 'Not zeroed',
      displayedPressure: 'Displayed pressure',
      placeholderTemperature: 'Vessel temperature',
      currentPhase: 'Current phase',
      zeroOffset: 'Zero offset',
      placeholderPressure: 'Vessel pressure',
    },
  },
} as const;
type HeatCapacitySceneCopy = (typeof heatCapacitySceneCopies)[keyof typeof heatCapacitySceneCopies];

const heatCapacityHardSphereNoteCopies = {
  'zh-CN': {
    title: '微观可视化',
    initial: '分子随机运动，表示室温下的热运动。',
    pumping: '瓶内粒子数量增加，碰撞频率提高，压强升高。',
    warming: '粒子平均运动速度加快，温度信号升高。',
    releasing: '部分粒子从出气方向流出，压强下降，温度短时降低。',
    recovering: '粒子速度逐渐恢复到室温状态。',
    poweredOff: '仪器未通电，显示室温下的微观热运动。',
    footnote: '仅用于教学展示，不参与数据计算。',
  },
  'zh-TW': {
    title: '微觀可視化',
    initial: '分子隨機運動，表示室溫下的熱運動。',
    pumping: '瓶內粒子數量增加，碰撞頻率提高，壓強升高。',
    warming: '粒子平均運動速度加快，溫度訊號升高。',
    releasing: '部分粒子從出氣方向流出，壓強下降，溫度短時降低。',
    recovering: '粒子速度逐漸恢復到室溫狀態。',
    poweredOff: '儀器未通電，顯示室溫下的微觀熱運動。',
    footnote: '僅用於教學展示，不參與資料計算。',
  },
  en: {
    title: 'Hard-Sphere View',
    initial: 'Molecules move randomly, representing thermal motion at room temperature.',
    pumping: 'Particle density rises, collisions increase, and pressure climbs.',
    warming: 'Average particle speed increases as the temperature signal rises.',
    releasing: 'Some particles flow out through the vent direction while pressure drops and temperature dips.',
    recovering: 'Particle speed gradually returns toward the room-temperature state.',
    poweredOff: 'The instrument is not powered; the view shows room-temperature microscopic motion.',
    footnote: 'Teaching display only. Not used in data calculations.',
  },
} as const;

const heatCapacityScenePalettes = {
  dark: {
    scene: {
      background: '#111827',
      deck: '#202b3c',
      ambientIntensity: 0.62,
      directionalIntensity: 1.1,
      pointIntensity: 0.52,
      pointColor: '#8fd6ff',
    },
    glass: {
      base: '#6b7280',
      vessel: '#a7d8ff',
      edge: '#d5efff',
      clear: '#d9f5ff',
      stopper: '#e5d1a8',
      rubber: '#5b4631',
      servicePort: '#1f2937',
      trace: '#64748b',
      sensorPort: '#9aa4b2',
      sensorRod: '#cbd5e1',
      hover: '#ecfeff',
      hoverHalo: '#7dd3fc',
      stopcockGlass: '#d9f5ff',
      stopcockCore: '#d9f5ff',
      stopcockEdge: '#67e8f9',
      stopcockOutlineVisible: false,
      stopcockBodyOpacity: 0.18,
      stopcockPortOpacity: 0.3,
      stopcockTubeOpacity: 0.28,
      stopcockCoreOpacity: 0.24,
      stopcockHoverOpacity: 0.34,
      stopcockConnectorOpacity: 0.55,
      stopcockConnectorHoverOpacity: 0.68,
      stopcockHandleOpacity: 0.66,
      stopcockHandleHoverOpacity: 0.78,
      stopcockTipOpacity: 0.66,
      stopcockBodyTransmission: 0.48,
      stopcockPortTransmission: 0.25,
      stopcockTubeTransmission: 0.25,
      stopcockCoreTransmission: 0.36,
      stopcockHandleTransmission: 0.22,
      flowOpen: '#22c55e',
      flowOpenEmissive: '#16a34a',
      flowClosed: '#334155',
      flowClosedEmissive: '#0891b2',
      flowOpenEdge: '#bbf7d0',
      flowClosedEdge: '#67e8f9',
    },
    instrument: {
      body: '#dbe3ec',
      face: '#c4ced9',
      label: '#0f172a',
      screenOn: '#34d5ff',
      screenOff: '#1d3144',
      screenGlowOn: '#8eeaff',
      screenGlowOff: '#203345',
      screenTextOn: '#062638',
      screenTextOff: '#7f94a8',
      terminalPositive: '#dc2626',
      terminalNegative: '#111827',
      terminalMetal: '#c7d0dc',
      gaugeFace: '#eef2f6',
      gaugeDangerFace: '#fee2e2',
      gaugeTick: '#1f2937',
      gaugeHub: '#111827',
      knobBody: '#64748b',
      knobFace: '#94a3b8',
      knobCenter: '#475569',
      knobIndicator: '#1f2937',
      zeroEnabledBody: '#b87516',
      zeroEnabledFace: '#c0841a',
      zeroEnabledCenter: '#7c4708',
      powerOn: '#16a34a',
      powerOff: '#ef4444',
      hoverHalo: '#7dd3fc',
      hoverEmissive: '#0e7490',
    },
    leads: {
      anchor: '#94a3b8',
      positive: '#dc2626',
      negative: '#374151',
      pressure: '#cbd5e1',
    },
    pump: {
      port: '#334155',
      portEdge: '#dbeafe',
      connector: '#7c8794',
      tubeIdle: '#64748b',
      tubeActive: '#7dd3fc',
      valveBody: '#9aa4af',
      valveNut: '#cbd5e1',
      valveOpen: '#22c55e',
      valveClosed: '#7f1d1d',
      valveOpenEmissive: '#16a34a',
      valveClosedEmissive: '#450a0a',
      handleOpen: '#b91c1c',
      handleClosed: '#991b1b',
      handleGrip: '#e5e7eb',
      bulbIdle: '#1f7a8c',
      bulbActive: '#2098a8',
      bulbBase: '#334155',
      bulbHaloActive: '#67e8f9',
      bulbHaloHover: '#bae6fd',
      hoverEdge: '#ecfeff',
    },
    effects: {
      demoHalo: '#bae6fd',
      demoHaloMinOpacity: 0.24,
      demoHaloMaxOpacity: 0.52,
      demoHaloBaseScale: 1.06,
      demoHaloPulseScale: 0.14,
      nonBulbHoverEmissiveIntensity: 0.26,
      nonBulbHoverHaloOpacity: 0.22,
      glassHoverEmissiveIntensity: 0.18,
      glassHoverHaloOpacity: 0.16,
      pumpBulbHoverEmissiveIntensity: 0.24,
      pumpBulbHoverHaloOpacity: 0.2,
    },
  },
  light: {
    scene: {
      background: '#eaf1f8',
      deck: '#d8e4ef',
      ambientIntensity: 0.86,
      directionalIntensity: 0.92,
      pointIntensity: 0.28,
      pointColor: '#8fb7d8',
    },
    glass: {
      base: '#b8c5d3',
      vessel: '#d7efff',
      edge: '#5f86a8',
      clear: '#cdeeff',
      stopper: '#d8c291',
      rubber: '#6f5438',
      servicePort: '#334155',
      trace: '#7c8b9c',
      sensorPort: '#7f8da0',
      sensorRod: '#8fa1b4',
      hover: '#f0fbff',
      hoverHalo: '#0284c7',
      stopcockGlass: '#b8e4f6',
      stopcockCore: '#a8d8ee',
      stopcockEdge: '#3f6f92',
      stopcockOutlineVisible: true,
      stopcockBodyOpacity: 0.32,
      stopcockPortOpacity: 0.36,
      stopcockTubeOpacity: 0.36,
      stopcockCoreOpacity: 0.44,
      stopcockHoverOpacity: 0.52,
      stopcockConnectorOpacity: 0.76,
      stopcockConnectorHoverOpacity: 0.86,
      stopcockHandleOpacity: 0.82,
      stopcockHandleHoverOpacity: 0.9,
      stopcockTipOpacity: 0.84,
      stopcockBodyTransmission: 0.24,
      stopcockPortTransmission: 0.16,
      stopcockTubeTransmission: 0.16,
      stopcockCoreTransmission: 0.18,
      stopcockHandleTransmission: 0.12,
      flowOpen: '#15803d',
      flowOpenEmissive: '#86efac',
      flowClosed: '#475569',
      flowClosedEmissive: '#7dd3fc',
      flowOpenEdge: '#166534',
      flowClosedEdge: '#0369a1',
    },
    instrument: {
      body: '#d5dde7',
      face: '#c3ceda',
      label: '#172033',
      screenOn: '#a7e7ef',
      screenOff: '#d2dde8',
      screenGlowOn: '#7dd3fc',
      screenGlowOff: '#b6c6d7',
      screenTextOn: '#102a3a',
      screenTextOff: '#60758c',
      terminalPositive: '#dc2626',
      terminalNegative: '#111827',
      terminalMetal: '#718096',
      gaugeFace: '#f8fafc',
      gaugeDangerFace: '#fee2e2',
      gaugeTick: '#334155',
      gaugeHub: '#1e293b',
      knobBody: '#8998aa',
      knobFace: '#b7c2cf',
      knobCenter: '#64748b',
      knobIndicator: '#1e293b',
      zeroEnabledBody: '#c98218',
      zeroEnabledFace: '#d99a28',
      zeroEnabledCenter: '#8a520d',
      powerOn: '#16a34a',
      powerOff: '#dc2626',
      hoverHalo: '#0284c7',
      hoverEmissive: '#0e7490',
    },
    leads: {
      anchor: '#64748b',
      positive: '#dc2626',
      negative: '#1f2937',
      pressure: '#64748b',
    },
    pump: {
      port: '#526174',
      portEdge: '#2563eb',
      connector: '#8391a3',
      tubeIdle: '#7c8da1',
      tubeActive: '#0891b2',
      valveBody: '#8e9aa8',
      valveNut: '#cbd5e1',
      valveOpen: '#16a34a',
      valveClosed: '#991b1b',
      valveOpenEmissive: '#86efac',
      valveClosedEmissive: '#fecaca',
      handleOpen: '#b91c1c',
      handleClosed: '#991b1b',
      handleGrip: '#f8fafc',
      bulbIdle: '#0f7f92',
      bulbActive: '#0891b2',
      bulbBase: '#64748b',
      bulbHaloActive: '#0891b2',
      bulbHaloHover: '#0284c7',
      hoverEdge: '#0f4f7a',
    },
    effects: {
      demoHalo: '#0284c7',
      demoHaloMinOpacity: 0.34,
      demoHaloMaxOpacity: 0.72,
      demoHaloBaseScale: 1.06,
      demoHaloPulseScale: 0.16,
      nonBulbHoverEmissiveIntensity: 0.36,
      nonBulbHoverHaloOpacity: 0.34,
      glassHoverEmissiveIntensity: 0.3,
      glassHoverHaloOpacity: 0.3,
      pumpBulbHoverEmissiveIntensity: 0.34,
      pumpBulbHoverHaloOpacity: 0.36,
    },
  },
} as const;

type HeatCapacityScenePalette = (typeof heatCapacityScenePalettes)[HeatCapacitySceneTheme];

const PRESSURE_ZERO_FINE_ANGLE_STEP_DEG = 12;
const PRESSURE_ZERO_DRAG_DIRECTION = -1;
const HOVER_CLEAR_DELAY_MS = 220;
const VALVE_FOCUS_BUBBLE_EXIT_MS = 160;
const VALVE_FOCUS_BUBBLE_WIDTH_PX = 190;
const VALVE_FOCUS_BUBBLE_HEIGHT_PX = 38;
const VALVE_FOCUS_BUBBLE_GAP_PX = 34;
const PUMP_VALVE_TRANSITION_MS = 420;
const DISABLE_RAYCAST: THREE.Object3D['raycast'] = () => undefined;
const createHeatCapacityPointerEvents: typeof createPointerEvents = (store) => {
  const pointerEvents = createPointerEvents(store);
  return {
    ...pointerEvents,
    compute: (event, state) => {
      const bounds = state.gl.domElement.getBoundingClientRect();
      const width = bounds.width || state.size.width;
      const height = bounds.height || state.size.height;
      const x = 'clientX' in event ? event.clientX - bounds.left : 0;
      const y = 'clientY' in event ? event.clientY - bounds.top : 0;
      state.pointer.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
      state.raycaster.setFromCamera(state.pointer, state.camera);
    },
  };
};
type CameraFocusView = {
  position: [number, number, number];
  target: [number, number, number];
};
type CameraFocusViews = Record<Exclude<HeatCapacityFocusMode, 'none'>, CameraFocusView>;
type CameraViewScheme = {
  defaultView: CameraFocusView;
  autoDemoView?: CameraFocusView;
  focusViews?: CameraFocusViews;
};
const PROCEDURAL_CAMERA_VIEW_SCHEME: CameraViewScheme = {
  defaultView: {
    position: [4.15, 2.9, 8.25],
    target: [0.25, -0.05, 0],
  },
  autoDemoView: {
    position: [3.82, 2.68, 7.58],
    target: [0.24, -0.05, 0.02],
  },
  focusViews: {
    stopcock: {
      position: [1.38, 2.18, 2.92],
      target: [-1.5, 0.82, 0.36],
    },
    instrument: {
      position: [2.18, 0.18, 3.42],
      target: [2.02, -0.76, 0.34],
    },
    pump: {
      position: [2.95, 0.25, 3.35],
      target: [1.65, -0.45, 0.95],
    },
  },
};
const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = {
  defaultView: {
    position: [0.88, 3.51, 7.43],
    target: [0.00, 0.32, 0.00],
  },
};
const getCameraViewScheme = (performanceMode: HeatCapacityInstrumentSceneProps['performanceMode']) => (
  performanceMode === 'ultra' ? ULTRA_CAMERA_VIEW_SCHEME : PROCEDURAL_CAMERA_VIEW_SCHEME
);
const ORBIT_MIN_DISTANCE = 2.7;
const ORBIT_MAX_DISTANCE = 11.5;

const formatSignal = (value: number | null, fallback = '--.-- mV') => (
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)} mV` : fallback
);

const clampPressureZeroSceneKnobAngle = (angleDeg: number) => Math.min(
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG,
  Math.max(HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG, angleDeg),
);

const getPressureZeroLimitMessage = (requestedAngleDeg: number, copy: HeatCapacitySceneCopy) => {
  if (requestedAngleDeg > HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG) return copy.pressureZeroLimitUpper;
  if (requestedAngleDeg < HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG) return copy.pressureZeroLimitLower;
  return null;
};

const getPumpBulbDisplayLabel = (pumpBulbState: HeatCapacityInstrumentSceneProps['pumpBulbState'], copy: HeatCapacitySceneCopy) => (
  pumpBulbState === 'idle' ? copy.pumpBulbIdle : copy.pumpBulbActive
);

const getPumpFrequencyStatusLabel = (status: HeatCapacityInstrumentSceneProps['pumpFrequencyStatus'], copy: HeatCapacitySceneCopy) => (
  status === 'idle' ? copy.frequencyIdle : status === 'tooSlow' ? copy.frequencySlow : copy.frequencySuitable
);

const getHardSphereNoteText = (
  props: HeatCapacityInstrumentSceneProps,
  language: HeatCapacityInstrumentSceneProps['language'],
) => {
  const copy = heatCapacityHardSphereNoteCopies[language] ?? heatCapacityHardSphereNoteCopies['zh-CN'];
  if (props.phase === 'demoComplete') return copy.recovering;
  if (!props.powerOn || props.phase === 'powerOff') return copy.poweredOff;
  if (props.releaseFlowActive) return copy.releasing;
  if (props.phase === 'recovering') return copy.recovering;
  if (props.phase === 'pumping') {
    const warming = props.temperatureSignalMv !== null && props.temperatureSignalMv >= 1510;
    return warming ? copy.warming : copy.pumping;
  }
  if (props.phase === 'sealedStabilizing') return copy.warming;
  return copy.initial;
};

const getHeatCapacityInteractionHints = (focusMode: HeatCapacityFocusMode, copy: HeatCapacitySceneCopy) => {
  if (focusMode === 'stopcock') return [...copy.hints.stopcock];
  if (focusMode === 'pump') return [...copy.hints.pump];
  if (focusMode === 'instrument') return [...copy.hints.instrument];
  return [...copy.hints.normal];
};

const getHeatCapacityHoverTooltip = (
  hoveredControl: HeatCapacityHoveredControl,
  pumpValveOpen: boolean,
  copy: HeatCapacitySceneCopy,
) => {
  if (hoveredControl === 'stopcock') return copy.tooltip.stopcock;
  if (hoveredControl === 'pumpValve') return copy.tooltip.pumpValve;
  if (hoveredControl === 'pumpBulb') return pumpValveOpen ? copy.tooltip.pumpBulbReady : copy.tooltip.pumpBulbClosed;
  if (hoveredControl === 'powerSwitch') return copy.tooltip.powerSwitch;
  if (hoveredControl === 'pressureZero') return copy.tooltip.pressureZero;
  return null;
};

const formatPanelNumber = (value: number, digits = 2) => (
  Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const PRESSURE_GAUGE_MIN_ROTATION = -2.15;
const PRESSURE_GAUGE_MAX_ROTATION = 2.15;
const PRESSURE_GAUGE_DANGER_START_ROTATION = 0.86;
const PRESSURE_GAUGE_NORMAL_TICK_COLOR = '#1e293b';
const PRESSURE_GAUGE_DANGER_TICK_COLOR = '#dc2626';
const PRESSURE_GAUGE_TICKS = [
  -2.15,
  -1.79,
  -1.43,
  -1.08,
  -0.72,
  -0.36,
  0,
  0.36,
  0.72,
  PRESSURE_GAUGE_DANGER_START_ROTATION,
  1.08,
  1.29,
  1.51,
  1.72,
  1.94,
  2.15,
];
const PRESSURE_GAUGE_NEEDLE_SMOOTHING_RATE = 9;
const modelPressureGaugeAngleToVisualAngle = (modelAngle: number) => Math.PI / 2 - modelAngle;

const clampSceneNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const mapPressureGaugeValueToRotation = (
  pressureKPa: number,
  gaugePressureMinKPa: number,
  gaugePressureMaxKPa: number,
) => {
  const pressureRange = Math.max(0.001, gaugePressureMaxKPa - gaugePressureMinKPa);
  const clampedPressure = clampSceneNumber(pressureKPa, gaugePressureMinKPa, gaugePressureMaxKPa);
  const fraction = (clampedPressure - gaugePressureMinKPa) / pressureRange;
  return PRESSURE_GAUGE_MIN_ROTATION + fraction * (PRESSURE_GAUGE_MAX_ROTATION - PRESSURE_GAUGE_MIN_ROTATION);
};

const getPressureGaugeNeedleRotation = (
  pressureGaugeDisplayValue: number,
  gaugePressureMinKPa: number,
  gaugePressureMaxKPa: number,
  powerOn: boolean,
) => {
  if (!powerOn || typeof pressureGaugeDisplayValue !== 'number' || !Number.isFinite(pressureGaugeDisplayValue)) {
    return PRESSURE_GAUGE_MIN_ROTATION;
  }
  return mapPressureGaugeValueToRotation(pressureGaugeDisplayValue, gaugePressureMinKPa, gaugePressureMaxKPa);
};

const INSTRUMENT_DIGITAL_DISPLAY_TEXT_SIZE = 0.054;
const INSTRUMENT_PANEL_TITLE_TEXT_SIZE = 0.044;
const INSTRUMENT_PANEL_CHANNEL_LABEL_TEXT_SIZE = 0.034;
const INSTRUMENT_PANEL_INPUT_LABEL_TEXT_SIZE = 0.032;

function PanelText({
  name,
  position,
  children,
  size = 0.045,
  color = '#0f172a',
  updateIntervalMs = 250,
}: {
  name: string;
  position: [number, number, number];
  children: string;
  size?: number;
  color?: string;
  updateIntervalMs?: number;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastDrawRef = useRef(0);
  const pendingTimerRef = useRef<number | null>(null);
  const latestTextRef = useRef(children);
  const latestStyleRef = useRef({ color, size });
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    canvasRef.current = canvas;
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.minFilter = THREE.LinearFilter;
    canvasTexture.magFilter = THREE.LinearFilter;
    canvasTexture.needsUpdate = true;
    return canvasTexture;
  }, []);

  useEffect(() => {
    latestTextRef.current = children;
    latestStyleRef.current = { color, size };

    const drawTexture = () => {
      pendingTimerRef.current = null;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      const style = latestStyleRef.current;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = style.color;
      context.font = `700 ${Math.max(24, Math.round(style.size * 900))}px Consolas, monospace`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(latestTextRef.current, canvas.width / 2, canvas.height / 2);
      texture.needsUpdate = true;
      lastDrawRef.current = window.performance.now();
      invalidate();
    };

    const elapsedMs = window.performance.now() - lastDrawRef.current;
    if (elapsedMs >= updateIntervalMs) {
      drawTexture();
      return undefined;
    }

    pendingTimerRef.current = window.setTimeout(drawTexture, updateIntervalMs - elapsedMs);
    return () => {
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [children, color, invalidate, size, texture, updateIntervalMs]);

  useEffect(() => () => {
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    texture.dispose();
  }, [texture]);

  return (
    <mesh
      name={name}
      position={position}
    >
      <planeGeometry args={[0.46, 0.115]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

function PanelTerminal({
  name,
  position,
  color,
  radius = 0.04,
  metalness = 0.08,
}: {
  name: string;
  position: [number, number, number];
  color: string;
  radius?: number;
  metalness?: number;
}) {
  return (
    <mesh name={name} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[radius, radius, 0.035, 24]} />
      <meshStandardMaterial color={color} roughness={0.38} metalness={metalness} />
    </mesh>
  );
}

function DemoFocusHalo({
  active,
  suspended = false,
  name = 'DemoFocusHalo',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  focusHaloColor = '#bae6fd',
  focusHaloMinOpacity = 0.24,
  focusHaloMaxOpacity = 0.52,
  focusHaloBaseScale = 1.06,
  focusHaloPulseScale = 0.14,
  children,
}: {
  active: boolean;
  suspended?: boolean;
  name?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  focusHaloColor?: string;
  focusHaloMinOpacity?: number;
  focusHaloMaxOpacity?: number;
  focusHaloBaseScale?: number;
  focusHaloPulseScale?: number;
  children: React.ReactNode;
}) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useFrame(({ clock }) => {
    if (suspended) return;
    if (!meshRef.current || !materialRef.current) return;
    const pulse = (Math.sin(clock.elapsedTime * Math.PI * 1.5) + 1) / 2;
    const scale = focusHaloBaseScale + pulse * focusHaloPulseScale;
    meshRef.current.scale.setScalar(scale);
    materialRef.current.opacity = focusHaloMinOpacity + pulse * (focusHaloMaxOpacity - focusHaloMinOpacity);
  });

  if (!active) return null;

  return (
    <mesh name={name} ref={meshRef} position={position} rotation={rotation} raycast={DISABLE_RAYCAST}>
      {children}
      <meshBasicMaterial
        ref={materialRef}
        color={focusHaloColor}
        transparent
        opacity={focusHaloMinOpacity}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

function InstrumentBox({
  highClarityMode,
  performanceMode,
  powerOn,
  pressureZeroKnobAngle,
  pressureGaugeDisplayValue,
  gaugePressureMinKPa,
  gaugePressureMaxKPa,
  pressureOverLimit,
  temperatureSignalMv,
  pressureSignalMv,
  onPowerToggle,
  onPressureZeroFineAdjust,
  onPressureZeroCoarseAdjust,
  zeroEnabled,
  onFocus,
  focusMode,
  hoveredControl,
  setHoveredControl,
  interactionLocked,
  demoFocusControlId,
  demoFocusPulseActive,
  manualRollbackAnimation,
  manualRollbackKey,
  onLockedInteraction,
  interactionQualityReduced,
  panelTextInteractionReduced,
  sceneCopy,
  scenePalette,
}: Pick<HeatCapacityInstrumentSceneProps, 'performanceMode' | 'powerOn' | 'pressureZeroKnobAngle' | 'pressureGaugeDisplayValue' | 'gaugePressureMinKPa' | 'gaugePressureMaxKPa' | 'pressureSafetyThresholdKPa' | 'pressureOverLimit' | 'temperatureSignalMv' | 'pressureSignalMv' | 'onPowerToggle' | 'onPressureZeroFineAdjust' | 'onPressureZeroCoarseAdjust' | 'interactionLocked' | 'demoFocusControlId' | 'demoFocusPulseActive' | 'manualRollbackAnimation' | 'manualRollbackKey' | 'onLockedInteraction'> & {
  highClarityMode: boolean;
  zeroEnabled: boolean;
  onFocus: (mode: HeatCapacityFocusMode) => void;
  focusMode: HeatCapacityFocusMode;
  hoveredControl: HeatCapacityHoveredControl;
  setHoveredControl: (control: HeatCapacityHoveredControl) => void;
  interactionQualityReduced: boolean;
  panelTextInteractionReduced: boolean;
  sceneCopy: HeatCapacitySceneCopy;
  scenePalette: HeatCapacityScenePalette;
}) {
  const temperatureText = powerOn ? formatSignal(temperatureSignalMv) : '';
  const pressureText = powerOn ? formatSignal(pressureSignalMv) : '';
  const screenColor = powerOn ? scenePalette.instrument.screenOn : scenePalette.instrument.screenOff;
  const screenGlow = powerOn ? scenePalette.instrument.screenGlowOn : scenePalette.instrument.screenGlowOff;
  const powerSwitchHovered = hoveredControl === 'powerSwitch';
  const pressureZeroHovered = hoveredControl === 'pressureZero';
  const pressureZeroInteractionEnabled = focusMode === 'instrument';
  const powerSwitchDemoFocused = demoFocusPulseActive && demoFocusControlId === 'powerSwitch';
  const pressureZeroDemoFocused = demoFocusPulseActive && demoFocusControlId === 'pressureZero';
  const pressureDisplayDemoFocused = demoFocusPulseActive && (
    demoFocusControlId === 'instrumentPressureDisplay' ||
    demoFocusControlId === 'instrumentPanel'
  );
  const temperatureDisplayDemoFocused = demoFocusPulseActive && (
    demoFocusControlId === 'instrumentTemperatureDisplay' ||
    demoFocusControlId === 'instrumentPanel'
  );
  const { camera, gl } = useThree();
  const invalidate = useThree((state) => state.invalidate);
  const gaugeNeedlePivotRef = useRef<THREE.Group | null>(null);
  const pressureZeroKnobRef = useRef<THREE.Group | null>(null);
  const [pressureZeroRollbackOffsetDeg, setPressureZeroRollbackOffsetDeg] = useState(0);
  const [powerSwitchRollbackOffset, setPowerSwitchRollbackOffset] = useState(0);
  const pressureZeroDragRef = useRef({
    startKnobAngle: pressureZeroKnobAngle,
    lastPointerAngle: 0,
    totalDelta: 0,
    lastAppliedKnobAngle: pressureZeroKnobAngle,
    moved: false,
  });
  const gaugeNeedleTargetRotation = getPressureGaugeNeedleRotation(
    pressureGaugeDisplayValue,
    gaugePressureMinKPa,
    gaugePressureMaxKPa,
    powerOn,
  );
  const gaugeSafetyRotation = PRESSURE_GAUGE_DANGER_START_ROTATION;
  const gaugeNeedleTargetRotationRef = useRef(gaugeNeedleTargetRotation);
  const gaugeDisplayedRotationRef = useRef(gaugeNeedleTargetRotation);
  const panelTextUpdateIntervalMs = panelTextInteractionReduced
    ? 400
    : (performanceMode === 'performance' || performanceMode === 'ultra')
      ? 250
      : performanceMode === 'balanced'
        ? 180
        : 120;

  useEffect(() => {
    gaugeNeedleTargetRotationRef.current = gaugeNeedleTargetRotation;
    invalidate();
  }, [gaugeNeedleTargetRotation, invalidate]);

  useFrame((_, delta) => {
    if (interactionQualityReduced) return;
    const targetRotation = gaugeNeedleTargetRotationRef.current;
    const previousRotation = gaugeDisplayedRotationRef.current;
    const smoothing = 1 - Math.exp(-PRESSURE_GAUGE_NEEDLE_SMOOTHING_RATE * delta);
    gaugeDisplayedRotationRef.current = clampSceneNumber(
      THREE.MathUtils.lerp(previousRotation, targetRotation, smoothing),
      PRESSURE_GAUGE_MIN_ROTATION,
      PRESSURE_GAUGE_MAX_ROTATION,
    );
    if (gaugeNeedlePivotRef.current) {
      gaugeNeedlePivotRef.current.rotation.z = modelPressureGaugeAngleToVisualAngle(gaugeDisplayedRotationRef.current);
    }
    if (Math.abs(gaugeDisplayedRotationRef.current - targetRotation) > 0.001) {
      invalidate();
    }
  });

  useEffect(() => {
    if (manualRollbackAnimation !== 'knobBounce' || manualRollbackKey <= 0) return undefined;
    const startTime = performance.now();
    let frameId = 0;
    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / 360);
      setPressureZeroRollbackOffsetDeg(Math.sin(progress * Math.PI) * 18);
      invalidate();
      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        setPressureZeroRollbackOffsetDeg(0);
      }
    };
    frameId = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frameId);
      setPressureZeroRollbackOffsetDeg(0);
    };
  }, [invalidate, manualRollbackAnimation, manualRollbackKey]);

  useEffect(() => {
    if (manualRollbackAnimation !== 'powerBounce' || manualRollbackKey <= 0) return undefined;
    const startTime = performance.now();
    const direction = powerOn ? 1 : -1;
    let frameId = 0;
    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / 320);
      setPowerSwitchRollbackOffset(Math.sin(progress * Math.PI) * 0.7 * direction);
      invalidate();
      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        setPowerSwitchRollbackOffset(0);
      }
    };
    frameId = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frameId);
      setPowerSwitchRollbackOffset(0);
    };
  }, [invalidate, manualRollbackAnimation, manualRollbackKey, powerOn]);

  const getPressureZeroPointerAngle = useCallback((clientX: number, clientY: number) => {
    if (!pressureZeroKnobRef.current) return null;
    const rect = gl.domElement.getBoundingClientRect();
    const center = new THREE.Vector3();
    pressureZeroKnobRef.current.getWorldPosition(center);
    center.project(camera);
    const centerX = rect.left + ((center.x + 1) / 2) * rect.width;
    const centerY = rect.top + ((1 - center.y) / 2) * rect.height;
    return THREE.MathUtils.radToDeg(Math.atan2(clientY - centerY, clientX - centerX));
  }, [camera, gl]);

  const getSignedAngleDelta = (nextAngle: number, startAngle: number) => {
    const delta = ((nextAngle - startAngle + 540) % 360) - 180;
    return Number.isFinite(delta) ? delta : 0;
  };

  const handlePressureZeroWheel = (event: ThreeEvent<WheelEvent>) => {
    event.stopPropagation();
    if (interactionLocked) {
      onLockedInteraction();
      return;
    }
    const requestedDelta = (event.deltaY < 0 ? PRESSURE_ZERO_FINE_ANGLE_STEP_DEG : -PRESSURE_ZERO_FINE_ANGLE_STEP_DEG) * PRESSURE_ZERO_DRAG_DIRECTION;
    const requestedKnobAngle = pressureZeroKnobAngle + requestedDelta;
    const nextKnobAngle = clampPressureZeroSceneKnobAngle(requestedKnobAngle);
    const boundedDelta = nextKnobAngle - pressureZeroKnobAngle;
    if (Math.abs(boundedDelta) < 0.01) {
      const limitMessage = getPressureZeroLimitMessage(requestedKnobAngle, sceneCopy);
      if (limitMessage) onLockedInteraction(limitMessage);
      return;
    }
    onPressureZeroFineAdjust(boundedDelta);
  };

  const startPressureZeroDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (interactionLocked) {
      onLockedInteraction();
      return;
    }
    const pointerAngle = getPressureZeroPointerAngle(event.clientX, event.clientY);
    if (pointerAngle === null) return;
    pressureZeroDragRef.current = {
      startKnobAngle: pressureZeroKnobAngle,
      lastPointerAngle: pointerAngle,
      totalDelta: 0,
      lastAppliedKnobAngle: pressureZeroKnobAngle,
      moved: false,
    };
    const pointerId = event.pointerId;
    gl.domElement.setPointerCapture?.(pointerId);
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextPointerAngle = getPressureZeroPointerAngle(moveEvent.clientX, moveEvent.clientY);
      if (nextPointerAngle === null) return;
      const dragState = pressureZeroDragRef.current;
      const pointerDelta = getSignedAngleDelta(nextPointerAngle, dragState.lastPointerAngle);
      dragState.lastPointerAngle = nextPointerAngle;
      dragState.totalDelta += pointerDelta * PRESSURE_ZERO_DRAG_DIRECTION;
      const requestedKnobAngle = dragState.startKnobAngle + dragState.totalDelta;
      const nextKnobAngle = clampPressureZeroSceneKnobAngle(requestedKnobAngle);
      const incrementalDelta = nextKnobAngle - dragState.lastAppliedKnobAngle;
      if (Math.abs(incrementalDelta) < 0.15) {
        const limitMessage = getPressureZeroLimitMessage(requestedKnobAngle, sceneCopy);
        if (limitMessage) onLockedInteraction(limitMessage);
        return;
      }
      dragState.lastAppliedKnobAngle = nextKnobAngle;
      dragState.moved = true;
      onPressureZeroCoarseAdjust(incrementalDelta);
    };
    const handlePointerUp = () => {
      gl.domElement.releasePointerCapture?.(pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const powerSwitchRotation = powerOn ? -0.35 : 0.35;
  const powerSwitchVisualRotation = powerSwitchRotation + powerSwitchRollbackOffset;

  return (
    <group
      name="InstrumentBoxRoot"
      position={[1.85, -0.5, 0]}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (interactionLocked) {
          onLockedInteraction();
          return;
        }
        onFocus('instrument');
      }}
    >
      <mesh name="InstrumentBox" position={[0, 0, 0]}>
        <boxGeometry args={[2.18, 0.78, 0.86]} />
        <meshStandardMaterial color={scenePalette.instrument.body} roughness={0.58} metalness={0.05} />
        {highClarityMode ? <Edges color={scenePalette.instrument.hoverHalo} /> : null}
      </mesh>
      <mesh name="InstrumentBoxFace" position={[0, 0.02, 0.44]}>
        <boxGeometry args={[2.04, 0.6, 0.04]} />
        <meshStandardMaterial color={scenePalette.instrument.face} roughness={0.7} />
        {highClarityMode ? <Edges color={scenePalette.instrument.hoverHalo} /> : null}
      </mesh>

      <PanelText name="InstrumentPanelTitleText" position={[0, 0.28, 0.505]} size={INSTRUMENT_PANEL_TITLE_TEXT_SIZE} color={scenePalette.instrument.label}>
        FD-NCD-C
      </PanelText>
      <PanelText name="TemperatureDisplayChannelLabelText" position={[-0.64, 0.215, 0.505]} size={INSTRUMENT_PANEL_CHANNEL_LABEL_TEXT_SIZE} color={scenePalette.instrument.label}>
        Uₜ / mV
      </PanelText>
      <PanelText name="PressureDisplayChannelLabelText" position={[0, 0.215, 0.505]} size={INSTRUMENT_PANEL_CHANNEL_LABEL_TEXT_SIZE} color={scenePalette.instrument.label}>
        Uₚ / mV
      </PanelText>

      <mesh name="TemperatureDisplay" position={[-0.64, 0.1, 0.48]}>
        <boxGeometry args={[0.42, 0.18, 0.035]} />
        <meshStandardMaterial color={screenColor} emissive={screenGlow} emissiveIntensity={powerOn ? highClarityMode ? 0.72 : 0.55 : 0.05} />
        {highClarityMode ? <Edges color={scenePalette.instrument.hoverHalo} /> : null}
      </mesh>
      <DemoFocusHalo active={temperatureDisplayDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloTemperatureDisplay" position={[-0.64, 0.1, 0.508]} focusHaloColor={scenePalette.effects.demoHalo} focusHaloMinOpacity={scenePalette.effects.demoHaloMinOpacity} focusHaloMaxOpacity={scenePalette.effects.demoHaloMaxOpacity} focusHaloBaseScale={scenePalette.effects.demoHaloBaseScale} focusHaloPulseScale={scenePalette.effects.demoHaloPulseScale}>
        <boxGeometry args={[0.5, 0.24, 0.02]} />
      </DemoFocusHalo>
      <PanelText name="TemperatureDisplayText" position={[-0.64, 0.1, 0.505]} size={INSTRUMENT_DIGITAL_DISPLAY_TEXT_SIZE} color={powerOn ? scenePalette.instrument.screenTextOn : scenePalette.instrument.screenTextOff} updateIntervalMs={panelTextUpdateIntervalMs}>
        {temperatureText || 'Uₜ'}
      </PanelText>
      <PanelTerminal name="TemperaturePositiveInputTerminal" position={[-0.73, -0.12, 0.49]} color={scenePalette.instrument.terminalPositive} />
      <PanelTerminal name="TemperatureNegativeInputTerminal" position={[-0.55, -0.12, 0.49]} color={scenePalette.instrument.terminalNegative} />
      <PanelText name="TemperatureInputPortLabelText" position={[-0.64, -0.23, 0.505]} size={INSTRUMENT_PANEL_INPUT_LABEL_TEXT_SIZE} color={scenePalette.instrument.label}>
        INPUT +/-
      </PanelText>

      <mesh name="PressureDisplay" position={[0, 0.1, 0.48]}>
        <boxGeometry args={[0.42, 0.18, 0.035]} />
        <meshStandardMaterial color={screenColor} emissive={screenGlow} emissiveIntensity={powerOn ? highClarityMode ? 0.72 : 0.55 : 0.05} />
        {highClarityMode ? <Edges color={scenePalette.instrument.hoverHalo} /> : null}
      </mesh>
      <DemoFocusHalo active={pressureDisplayDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloPressureDisplay" position={[0, 0.1, 0.508]} focusHaloColor={scenePalette.effects.demoHalo} focusHaloMinOpacity={scenePalette.effects.demoHaloMinOpacity} focusHaloMaxOpacity={scenePalette.effects.demoHaloMaxOpacity} focusHaloBaseScale={scenePalette.effects.demoHaloBaseScale} focusHaloPulseScale={scenePalette.effects.demoHaloPulseScale}>
        <boxGeometry args={[0.5, 0.24, 0.02]} />
      </DemoFocusHalo>
      <PanelText name="PressureDisplayText" position={[0, 0.1, 0.505]} size={INSTRUMENT_DIGITAL_DISPLAY_TEXT_SIZE} color={powerOn ? scenePalette.instrument.screenTextOn : scenePalette.instrument.screenTextOff} updateIntervalMs={panelTextUpdateIntervalMs}>
        {pressureText || 'Uₚ'}
      </PanelText>
      <PanelTerminal name="PressureSensorInputPort" position={[-0.08, -0.13, 0.49]} color={scenePalette.instrument.terminalMetal} radius={0.055} metalness={0.45} />
      <PanelText name="PressureInputPortLabelText" position={[-0.08, -0.24, 0.505]} size={INSTRUMENT_PANEL_INPUT_LABEL_TEXT_SIZE} color={scenePalette.instrument.label}>
        PRESS IN
      </PanelText>

      <group name="AnalogPressureGauge" position={[0.58, 0.05, 0.52]}>
        <mesh name="AnalogPressureGaugeDial" rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 0.035, 48]} />
          <meshStandardMaterial
            color={scenePalette.instrument.gaugeFace}
            roughness={0.45}
            emissive="#000000"
            emissiveIntensity={0}
          />
        </mesh>
        {PRESSURE_GAUGE_TICKS.map((tickModelAngle) => {
          const tickVisualAngle = modelPressureGaugeAngleToVisualAngle(tickModelAngle);
          const tickRadius = tickModelAngle >= gaugeSafetyRotation ? 0.148 : 0.137;
          const majorTick = (
            Math.abs(tickModelAngle) === PRESSURE_GAUGE_MAX_ROTATION ||
            tickModelAngle === 0 ||
            tickModelAngle === gaugeSafetyRotation
          );
          const dangerTick = tickModelAngle >= gaugeSafetyRotation;
          return (
            <mesh
              key={tickModelAngle}
              name="AnalogPressureGaugeTick"
              position={[Math.cos(tickVisualAngle) * tickRadius, Math.sin(tickVisualAngle) * tickRadius, 0.064]}
              rotation={[0, 0, tickVisualAngle]}
            >
              <boxGeometry args={[majorTick ? 0.048 : 0.034, dangerTick ? 0.011 : 0.009, 0.012]} />
              <meshBasicMaterial color={dangerTick ? PRESSURE_GAUGE_DANGER_TICK_COLOR : PRESSURE_GAUGE_NORMAL_TICK_COLOR} />
            </mesh>
          );
        })}
        <group name="AnalogPressureGaugeNeedlePivot" ref={gaugeNeedlePivotRef} rotation={[0, 0, modelPressureGaugeAngleToVisualAngle(gaugeDisplayedRotationRef.current)]}>
          <mesh name="AnalogPressureGaugeNeedle" position={[0.055, 0, 0.062]}>
            <boxGeometry args={[0.14, 0.014, 0.012]} />
            <meshStandardMaterial color={pressureOverLimit ? '#f97316' : powerOn ? '#e11d48' : '#64748b'} emissive={pressureOverLimit ? '#991b1b' : '#000000'} emissiveIntensity={pressureOverLimit ? 0.32 : 0} />
          </mesh>
        </group>
        <mesh name="AnalogPressureGaugeHub" position={[0, 0.004, 0.055]}>
          <sphereGeometry args={[0.018, 16, 16]} />
          <meshStandardMaterial color={scenePalette.instrument.gaugeHub} />
        </mesh>
      </group>

      <group
        name="PowerSwitch"
        position={[0.98, -0.14, 0.56]}
        onClick={(event) => {
          event.stopPropagation();
          if (interactionLocked) {
            onLockedInteraction();
            return;
          }
          onPowerToggle(!powerOn);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHoveredControl('powerSwitch');
        }}
        onPointerOut={() => setHoveredControl(null)}
      >
        <mesh name="HitboxPowerSwitch">
          <boxGeometry args={[0.34, 0.34, 0.22]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <DemoFocusHalo active={powerSwitchDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloPowerSwitch" rotation={[powerSwitchVisualRotation, 0, 0]} focusHaloColor={scenePalette.effects.demoHalo} focusHaloMinOpacity={scenePalette.effects.demoHaloMinOpacity} focusHaloMaxOpacity={scenePalette.effects.demoHaloMaxOpacity} focusHaloBaseScale={scenePalette.effects.demoHaloBaseScale} focusHaloPulseScale={scenePalette.effects.demoHaloPulseScale}>
          <boxGeometry args={[0.22, 0.38, 0.16]} />
        </DemoFocusHalo>
        <mesh rotation={[powerSwitchVisualRotation, 0, 0]}>
          <boxGeometry args={[0.14, 0.28, 0.12]} />
          <meshStandardMaterial color={powerOn ? scenePalette.instrument.powerOn : scenePalette.instrument.powerOff} roughness={0.45} emissive={powerSwitchHovered ? scenePalette.instrument.hoverEmissive : '#000000'} emissiveIntensity={powerSwitchHovered ? scenePalette.effects.nonBulbHoverEmissiveIntensity : 0} />
        </mesh>
        {powerSwitchHovered ? (
          <mesh name="PowerSwitchHoverHalo" rotation={[powerSwitchVisualRotation, 0, 0]} raycast={DISABLE_RAYCAST}>
            <boxGeometry args={[0.19, 0.34, 0.15]} />
            <meshBasicMaterial color={scenePalette.instrument.hoverHalo} transparent opacity={scenePalette.effects.nonBulbHoverHaloOpacity} depthWrite={false} />
          </mesh>
        ) : null}
      </group>

      <group
        name="PressureZeroKnob"
        ref={pressureZeroKnobRef}
        position={[0.22, -0.14, 0.55]}
        onPointerDown={pressureZeroInteractionEnabled ? startPressureZeroDrag : undefined}
        onWheel={pressureZeroInteractionEnabled ? handlePressureZeroWheel : undefined}
        onClick={(event) => {
          event.stopPropagation();
          if (interactionLocked) {
            onLockedInteraction();
            return;
          }
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (interactionLocked) {
            onLockedInteraction();
            return;
          }
          onFocus('instrument');
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHoveredControl('pressureZero');
        }}
        onPointerOut={() => setHoveredControl(null)}
      >
        <mesh name="HitboxPressureZeroKnob">
          <boxGeometry args={[0.36, 0.36, 0.22]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <DemoFocusHalo active={pressureZeroDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloPressureZero" position={[0, 0, 0.065]} focusHaloColor={scenePalette.effects.demoHalo} focusHaloMinOpacity={scenePalette.effects.demoHaloMinOpacity} focusHaloMaxOpacity={scenePalette.effects.demoHaloMaxOpacity} focusHaloBaseScale={scenePalette.effects.demoHaloBaseScale} focusHaloPulseScale={scenePalette.effects.demoHaloPulseScale}>
          <torusGeometry args={[0.145, 0.011, 12, 48]} />
        </DemoFocusHalo>
        {[-55, -28, 0, 28, 55].map((tickDeg) => {
          const tickRad = THREE.MathUtils.degToRad(tickDeg - 90);
          return (
            <mesh
              key={tickDeg}
              name="PressureZeroScaleTick"
              position={[Math.cos(tickRad) * 0.16, Math.sin(tickRad) * 0.16, 0.052]}
              rotation={[0, 0, tickRad]}
              raycast={DISABLE_RAYCAST}
            >
              <boxGeometry args={[0.026, 0.005, 0.008]} />
              <meshStandardMaterial color={scenePalette.instrument.knobCenter} roughness={0.65} />
            </mesh>
          );
        })}
        <mesh name="PressureZeroKnobBody" rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.118, 0.108, 0.084, 48]} />
          <meshStandardMaterial color={zeroEnabled ? scenePalette.instrument.zeroEnabledBody : scenePalette.instrument.knobBody} roughness={0.5} metalness={0.08} emissive={pressureZeroHovered ? scenePalette.instrument.hoverEmissive : '#000000'} emissiveIntensity={pressureZeroHovered ? scenePalette.effects.nonBulbHoverEmissiveIntensity : 0} />
        </mesh>
        <mesh name="PressureZeroKnobFace" position={[0, 0, 0.048]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.096, 0.102, 0.014, 48]} />
          <meshStandardMaterial color={zeroEnabled ? scenePalette.instrument.zeroEnabledFace : scenePalette.instrument.knobFace} roughness={0.46} metalness={0.04} emissive={pressureZeroHovered ? scenePalette.instrument.hoverEmissive : '#000000'} emissiveIntensity={pressureZeroHovered ? scenePalette.effects.nonBulbHoverEmissiveIntensity * 0.62 : 0} />
        </mesh>
        <mesh name="PressureZeroKnobRim" position={[0, 0, 0.058]} raycast={DISABLE_RAYCAST}>
          <torusGeometry args={[0.103, 0.006, 12, 48]} />
          <meshStandardMaterial color={zeroEnabled ? scenePalette.instrument.zeroEnabledCenter : scenePalette.instrument.knobCenter} roughness={0.4} metalness={0.16} />
        </mesh>
        <mesh name="PressureZeroKnobCenter" position={[0, 0, 0.068]} rotation={[Math.PI / 2, 0, 0]} raycast={DISABLE_RAYCAST}>
          <cylinderGeometry args={[0.018, 0.018, 0.01, 24]} />
          <meshStandardMaterial color={scenePalette.instrument.gaugeHub} roughness={0.42} metalness={0.12} />
        </mesh>
        {pressureZeroHovered ? (
          <mesh name="PressureZeroHoverHalo" position={[0, 0, 0.047]} raycast={DISABLE_RAYCAST}>
            <torusGeometry args={[0.135, 0.006, 12, 42]} />
            <meshBasicMaterial color={scenePalette.instrument.hoverHalo} transparent opacity={scenePalette.effects.nonBulbHoverHaloOpacity} depthWrite={false} />
          </mesh>
        ) : null}
        <group name="PressureZeroIndicatorGroup" rotation={[0, 0, THREE.MathUtils.degToRad(pressureZeroKnobAngle + pressureZeroRollbackOffsetDeg)]}>
          <mesh name="PressureZeroIndicatorLine" position={[0.035, 0, 0.076]} raycast={DISABLE_RAYCAST}>
            <boxGeometry args={[0.105, 0.013, 0.016]} />
            <meshStandardMaterial color={scenePalette.instrument.knobIndicator} roughness={0.34} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function GlassStopcock({
  highClarityMode,
  angleDeg,
  onStopcockOpenChange,
  hoveredControl,
  setHoveredControl,
  onValveFocusAnchor,
  interactionLocked,
  demoFocusControlId,
  demoFocusPulseActive,
  manualRollbackAnimation,
  manualRollbackKey,
  onLockedInteraction,
  interactionQualityReduced,
  scenePalette,
}: Pick<HeatCapacityInstrumentSceneProps, 'onStopcockOpenChange' | 'interactionLocked' | 'demoFocusControlId' | 'demoFocusPulseActive' | 'manualRollbackAnimation' | 'manualRollbackKey' | 'onLockedInteraction'> & {
  highClarityMode: boolean;
  angleDeg: number;
  hoveredControl: HeatCapacityHoveredControl;
  setHoveredControl: (control: HeatCapacityHoveredControl) => void;
  onValveFocusAnchor: (control: ValveFocusControl, clientX: number, clientY: number) => void;
  interactionQualityReduced: boolean;
  scenePalette: HeatCapacityScenePalette;
}) {
  const { camera, gl } = useThree();
  const stopcockCoreRef = useRef<THREE.Group | null>(null);
  const [displayAngleDeg, setDisplayAngleDeg] = useState(angleDeg);
  const displayAngleRef = useRef(angleDeg);
  const [stopcockRollbackOffsetDeg, setStopcockRollbackOffsetDeg] = useState(0);

  useEffect(() => {
    const startAngle = displayAngleRef.current;
    const targetAngle = angleDeg;
    if (Math.abs(targetAngle - startAngle) < 0.01) {
      displayAngleRef.current = targetAngle;
      setDisplayAngleDeg(targetAngle);
      return undefined;
    }
    const startTime = performance.now();
    const durationMs = PUMP_VALVE_TRANSITION_MS;
    let frameId = 0;
    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / durationMs);
      const eased = 1 - ((1 - progress) ** 3);
      const nextAngle = startAngle + (targetAngle - startAngle) * eased;
      displayAngleRef.current = nextAngle;
      setDisplayAngleDeg(nextAngle);
      if (progress < 1) frameId = window.requestAnimationFrame(animate);
    };
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [angleDeg]);

  useEffect(() => {
    if (manualRollbackAnimation !== 'stopcockBounce' || manualRollbackKey <= 0) return undefined;
    const startTime = performance.now();
    let frameId = 0;
    const direction = getHeatCapacityStopcockState(angleDeg) === 'open' ? -1 : 1;
    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / 360);
      setStopcockRollbackOffsetDeg(Math.sin(progress * Math.PI) * 24 * direction);
      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        setStopcockRollbackOffsetDeg(0);
      }
    };
    frameId = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frameId);
      setStopcockRollbackOffsetDeg(0);
    };
  }, [angleDeg, manualRollbackAnimation, manualRollbackKey]);

  const state = getHeatCapacityStopcockState(angleDeg);
  const stopcockHovered = hoveredControl === 'stopcock';
  const stopcockDemoFocused = demoFocusPulseActive && demoFocusControlId === 'stopcock';
  const angleRad = ((displayAngleDeg + stopcockRollbackOffsetDeg) * Math.PI) / 180;
  const showStopcockOutlines = scenePalette.glass.stopcockOutlineVisible || highClarityMode;

  const handleStopcockToggle = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
    if (interactionLocked) {
      onLockedInteraction();
      return;
    }
    onStopcockOpenChange(state !== 'open');
  };
  const projectValveFocusAnchor = useCallback(() => {
    const anchor = stopcockCoreRef.current;
    if (!anchor) return null;
    const rect = gl.domElement.getBoundingClientRect();
    const position = new THREE.Vector3();
    anchor.getWorldPosition(position);
    position.project(camera);
    return {
      clientX: rect.left + ((position.x + 1) / 2) * rect.width,
      clientY: rect.top + ((1 - position.y) / 2) * rect.height,
    };
  }, [camera, gl]);
  const openStopcockFocusBubble = useCallback(() => {
    const anchor = projectValveFocusAnchor();
    if (!anchor) return;
    onValveFocusAnchor('stopcock', anchor.clientX, anchor.clientY);
  }, [onValveFocusAnchor, projectValveFocusAnchor]);

  return (
    <group name="GlassStopcockAssembly" position={[0, 1.58, 0]}>
      <mesh name="StopcockBody" rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.76, 32]} />
        <meshPhysicalMaterial color={scenePalette.glass.stopcockGlass} transparent opacity={scenePalette.glass.stopcockBodyOpacity} roughness={0.06} transmission={scenePalette.glass.stopcockBodyTransmission} />
        {showStopcockOutlines ? <Edges color={scenePalette.glass.stopcockEdge} /> : null}
      </mesh>
      <mesh name="StopcockSidePort" position={[0.38, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.16, 20]} />
        <meshPhysicalMaterial color={scenePalette.glass.stopcockGlass} transparent opacity={scenePalette.glass.stopcockPortOpacity} roughness={0.08} transmission={scenePalette.glass.stopcockPortTransmission} />
        {showStopcockOutlines ? <Edges color={scenePalette.glass.stopcockEdge} /> : null}
      </mesh>
      <mesh name="StopcockTopVentOutlet" position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.043, 0.048, 0.36, 24]} />
        <meshPhysicalMaterial color={scenePalette.glass.stopcockGlass} transparent opacity={scenePalette.glass.stopcockTubeOpacity} roughness={0.08} transmission={scenePalette.glass.stopcockTubeTransmission} />
        {showStopcockOutlines ? <Edges color={scenePalette.glass.stopcockEdge} /> : null}
      </mesh>
      <mesh name="StopcockDownTube" position={[0, -0.36, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.72, 24]} />
        <meshPhysicalMaterial color={scenePalette.glass.stopcockGlass} transparent opacity={scenePalette.glass.stopcockTubeOpacity} roughness={0.08} transmission={scenePalette.glass.stopcockTubeTransmission} />
        {showStopcockOutlines ? <Edges color={scenePalette.glass.stopcockEdge} /> : null}
      </mesh>
      <group
        name="StopcockRotatingCore"
        ref={stopcockCoreRef}
        rotation={[angleRad, 0, 0]}
        onClick={handleStopcockToggle}
        onPointerOver={(event) => {
          event.stopPropagation();
          event.nativeEvent.stopPropagation();
          setHoveredControl('stopcock');
          openStopcockFocusBubble();
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
        }}
        onPointerOut={() => {
          setHoveredControl(null);
        }}
      >
        <mesh name="HitboxStopcockHandle">
          <boxGeometry args={[1.02, 0.72, 0.34]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <DemoFocusHalo active={stopcockDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloStopcock" rotation={[0, 0, Math.PI / 2]} focusHaloColor={scenePalette.effects.demoHalo} focusHaloMinOpacity={scenePalette.effects.demoHaloMinOpacity} focusHaloMaxOpacity={scenePalette.effects.demoHaloMaxOpacity} focusHaloBaseScale={scenePalette.effects.demoHaloBaseScale} focusHaloPulseScale={scenePalette.effects.demoHaloPulseScale}>
          <cylinderGeometry args={[0.19, 0.19, 0.84, 32]} />
        </DemoFocusHalo>
        <mesh name="StopcockCorePlug" rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.14, 0.34, 32]} />
          <meshPhysicalMaterial
            color={stopcockHovered ? scenePalette.glass.hover : scenePalette.glass.stopcockCore}
            transparent
            opacity={stopcockHovered ? scenePalette.glass.stopcockHoverOpacity : scenePalette.glass.stopcockCoreOpacity}
            roughness={0.06}
            transmission={scenePalette.glass.stopcockCoreTransmission}
            emissive={stopcockHovered ? scenePalette.instrument.hoverEmissive : '#000000'}
            emissiveIntensity={stopcockHovered ? scenePalette.effects.glassHoverEmissiveIntensity : 0}
          />
          {showStopcockOutlines ? <Edges color={scenePalette.glass.stopcockEdge} /> : null}
        </mesh>
        {stopcockHovered ? (
          <mesh name="StopcockCoreHoverHalo" rotation={[0, 0, Math.PI / 2]} raycast={DISABLE_RAYCAST}>
            <cylinderGeometry args={[0.158, 0.158, 0.35, 32]} />
            <meshBasicMaterial color={scenePalette.glass.hoverHalo} transparent opacity={scenePalette.effects.glassHoverHaloOpacity} depthWrite={false} />
          </mesh>
        ) : null}
        <mesh name="StopcockRotatingFlowChannel" position={[0, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.24, 16]} />
          <meshStandardMaterial
            color={state === 'open' ? scenePalette.glass.flowOpen : scenePalette.glass.flowClosed}
            emissive={state === 'open' ? scenePalette.glass.flowOpenEmissive : scenePalette.glass.flowClosedEmissive}
            emissiveIntensity={state === 'open' ? 0.85 : 0.24}
            transparent
            opacity={state === 'open' ? 0.96 : 0.76}
            depthTest={false}
          />
          <Edges color={state === 'open' ? scenePalette.glass.flowOpenEdge : scenePalette.glass.flowClosedEdge} />
        </mesh>
        <group name="StopcockRodHandle" position={[0.44, 0, 0]}>
          <mesh name="StopcockRodHandleConnector" position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.028, 0.028, 0.24, 20]} />
            <meshPhysicalMaterial
              color={stopcockHovered ? scenePalette.glass.hover : scenePalette.glass.stopcockGlass}
              transparent
              opacity={stopcockHovered ? scenePalette.glass.stopcockConnectorHoverOpacity : scenePalette.glass.stopcockConnectorOpacity}
              roughness={0.08}
              transmission={scenePalette.glass.stopcockHandleTransmission}
              emissive={stopcockHovered ? scenePalette.instrument.hoverEmissive : '#000000'}
              emissiveIntensity={stopcockHovered ? scenePalette.effects.glassHoverEmissiveIntensity : 0}
            />
            {showStopcockOutlines ? <Edges color={scenePalette.glass.stopcockEdge} /> : null}
          </mesh>
          <mesh name="StopcockRodHandleStem">
            <cylinderGeometry args={[0.035, 0.035, 0.58, 24]} />
            <meshPhysicalMaterial
              color={stopcockHovered ? scenePalette.glass.hover : scenePalette.glass.stopcockGlass}
              transparent
              opacity={stopcockHovered ? scenePalette.glass.stopcockHandleHoverOpacity : scenePalette.glass.stopcockHandleOpacity}
              roughness={0.08}
              transmission={scenePalette.glass.stopcockHandleTransmission}
              emissive={stopcockHovered ? scenePalette.instrument.hoverEmissive : '#000000'}
              emissiveIntensity={stopcockHovered ? scenePalette.effects.glassHoverEmissiveIntensity : 0}
            />
            {showStopcockOutlines ? <Edges color={scenePalette.glass.stopcockEdge} /> : null}
          </mesh>
          {stopcockHovered ? (
            <mesh name="StopcockRodHandleHoverHalo" raycast={DISABLE_RAYCAST}>
              <cylinderGeometry args={[0.05, 0.05, 0.6, 24]} />
              <meshBasicMaterial color={scenePalette.glass.hoverHalo} transparent opacity={scenePalette.effects.glassHoverHaloOpacity} depthWrite={false} />
            </mesh>
          ) : null}
          <mesh name="StopcockRodHandleTipTop" position={[0, 0.31, 0]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshPhysicalMaterial color={scenePalette.glass.stopcockGlass} transparent opacity={scenePalette.glass.stopcockTipOpacity} roughness={0.08} transmission={scenePalette.glass.stopcockHandleTransmission} />
          </mesh>
          <mesh name="StopcockRodHandleTipBottom" position={[0, -0.31, 0]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshPhysicalMaterial color={scenePalette.glass.stopcockGlass} transparent opacity={scenePalette.glass.stopcockTipOpacity} roughness={0.08} transmission={scenePalette.glass.stopcockHandleTransmission} />
          </mesh>
        </group>
      </group>
      {state === 'open' ? (
        <group name="StopcockVentFlowArrow" position={[0, 0.62, 0]}>
          <mesh name="StopcockVentFlowArrowStem">
            <cylinderGeometry args={[0.018, 0.018, 0.24, 16]} />
            <meshStandardMaterial color={scenePalette.glass.flowOpen} emissive={scenePalette.glass.flowOpenEmissive} emissiveIntensity={0.75} />
          </mesh>
          <mesh name="StopcockVentFlowArrowHead" position={[0, 0.15, 0]}>
            <coneGeometry args={[0.055, 0.12, 20]} />
            <meshStandardMaterial color={scenePalette.glass.flowOpen} emissive={scenePalette.glass.flowOpenEmissive} emissiveIntensity={0.75} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}
function PressureBottle({
  highClarityMode,
  stopcockAngleDeg,
  onStopcockOpenChange,
  focusMode,
  hoveredControl,
  setHoveredControl,
  onValveFocusAnchor,
  interactionLocked,
  demoFocusControlId,
  demoFocusPulseActive,
  manualRollbackAnimation,
  manualRollbackKey,
  onLockedInteraction,
  interactionQualityReduced,
  scenePalette,
}: Pick<HeatCapacityInstrumentSceneProps, 'onStopcockOpenChange' | 'interactionLocked' | 'demoFocusControlId' | 'demoFocusPulseActive' | 'manualRollbackAnimation' | 'manualRollbackKey' | 'onLockedInteraction'> & {
  highClarityMode: boolean;
  stopcockAngleDeg: number;
  focusMode: HeatCapacityFocusMode;
  hoveredControl: HeatCapacityHoveredControl;
  setHoveredControl: (control: HeatCapacityHoveredControl) => void;
  onValveFocusAnchor: (control: ValveFocusControl, clientX: number, clientY: number) => void;
  interactionQualityReduced: boolean;
  scenePalette: HeatCapacityScenePalette;
}) {
  return (
    <group name="SquareGlassPressureBottle" position={[-1.3, -0.28, 0]}>
      <mesh name="BottleBase" position={[0, -1.22, 0]}>
        <boxGeometry args={[1.85, 0.18, 1.85]} />
        <meshStandardMaterial color={scenePalette.glass.base} roughness={0.6} />
      </mesh>
      <mesh name="VesselGlassCube">
        <boxGeometry args={[1.75, 1.75, 1.75]} />
        <meshPhysicalMaterial color={scenePalette.glass.vessel} transparent opacity={highClarityMode ? 0.22 : 0.16} roughness={0.08} transmission={highClarityMode ? 0.3 : 0.45} depthWrite={false} />
        <Edges color={scenePalette.glass.edge} />
      </mesh>
      <mesh name="BottleMouthNeck" position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.43, 0.39, 0.34, 40]} />
        <meshPhysicalMaterial color={scenePalette.glass.clear} transparent opacity={0.2} roughness={0.08} transmission={0.35} depthWrite={false} />
        {highClarityMode ? <Edges color={scenePalette.glass.edge} /> : null}
      </mesh>
      <mesh name="BottleMouthRim" position={[0, 1.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.43, 0.025, 12, 48]} />
        <meshPhysicalMaterial color={scenePalette.glass.clear} transparent opacity={0.28} roughness={0.08} transmission={0.3} depthWrite={false} />
        {highClarityMode ? <Edges color={scenePalette.glass.edge} /> : null}
      </mesh>
      <mesh name="RubberStopper" position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.54, 0.42, 0.24, 40]} />
        <meshStandardMaterial color={scenePalette.glass.stopper} roughness={0.72} />
      </mesh>
      <mesh name="CentralSensorStopperHole" position={[0.16, 1.16, 0.24]}>
        <cylinderGeometry args={[0.085, 0.085, 0.035, 24]} />
        <meshStandardMaterial color={scenePalette.glass.rubber} roughness={0.82} />
      </mesh>
      <mesh name="SharedServiceCablePort" position={[0.2, 1.17, 0.36]}>
        <cylinderGeometry args={[0.06, 0.06, 0.045, 24]} />
        <meshStandardMaterial color={scenePalette.glass.servicePort} roughness={0.78} />
      </mesh>
      <mesh name="SensorToServicePortTrace" position={[0.18, 1.176, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.13, 16]} />
        <meshStandardMaterial color={scenePalette.glass.trace} roughness={0.66} />
      </mesh>
      <mesh name="TopNeck" position={[0, 1.28, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.5, 32]} />
        <meshPhysicalMaterial color={scenePalette.glass.clear} transparent opacity={0.3} roughness={0.08} transmission={0.25} depthWrite={false} />
      </mesh>
      <mesh name="SensorStopperPort" position={[0.16, 0.96, 0.24]}>
        <cylinderGeometry args={[0.075, 0.075, 0.08, 20]} />
        <meshStandardMaterial color={scenePalette.glass.sensorPort} roughness={0.44} metalness={0.1} />
      </mesh>
      <mesh name="SensorRod" position={[0.16, 0.52, 0.24]}>
        <cylinderGeometry args={[0.035, 0.035, 0.875, 16]} />
        <meshStandardMaterial color={scenePalette.glass.sensorRod} roughness={0.34} metalness={0.15} />
      </mesh>
      <GlassStopcock
        highClarityMode={highClarityMode}
        angleDeg={stopcockAngleDeg}
        onStopcockOpenChange={onStopcockOpenChange}
        hoveredControl={hoveredControl}
        setHoveredControl={setHoveredControl}
        onValveFocusAnchor={onValveFocusAnchor}
        interactionLocked={interactionLocked}
        demoFocusControlId={demoFocusControlId}
        demoFocusPulseActive={demoFocusPulseActive}
        manualRollbackAnimation={manualRollbackAnimation}
        manualRollbackKey={manualRollbackKey}
        onLockedInteraction={onLockedInteraction}
        interactionQualityReduced={interactionQualityReduced}
        scenePalette={scenePalette}
      />
    </group>
  );
}

function InstrumentLeads({
  highClarityMode,
  scenePalette,
}: {
  highClarityMode: boolean;
  scenePalette: HeatCapacityScenePalette;
}) {
  return (
    <group name="InstrumentLeadSet">
      <mesh name="ServicePortBundleAnchor" position={[-1.1, 0.92, 1.1]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color={scenePalette.leads.anchor} roughness={0.5} />
      </mesh>
      <mesh name="ExternalTemperatureLeadAnchor" position={[-0.52, 0.36, 1.22]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color={scenePalette.leads.anchor} roughness={0.5} />
      </mesh>
      <mesh name="ExternalPressureLeadAnchor" position={[-0.28, 0.46, 1.42]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color={scenePalette.leads.anchor} roughness={0.5} />
      </mesh>
      <Line
        name="TemperaturePositiveLead"
        points={[
          [-1.1, 0.89, 0.36],
          [-1.1, 0.92, 1.1],
          [-0.52, 0.36, 1.22],
          [0.52, -0.18, 1.02],
          [1.12, -0.62, 0.51],
        ]}
        color={scenePalette.leads.positive}
        lineWidth={highClarityMode ? 3 : 2}
      />
      <Line
        name="TemperatureNegativeLead"
        points={[
          [-1.08, 0.885, 0.38],
          [-1.1, 0.92, 1.1],
          [-0.62, 0.26, 1.34],
          [0.46, -0.28, 1.08],
          [1.3, -0.62, 0.51],
        ]}
        color={scenePalette.leads.negative}
        lineWidth={highClarityMode ? 4 : 3}
      />
      <Line
        name="PressureSensorLead"
        points={[
          [-1.12, 0.88, 0.34],
          [-1.1, 0.92, 1.1],
          [-0.28, 0.46, 1.42],
          [0.84, -0.14, 1.14],
          [1.77, -0.63, 0.51],
        ]}
        color={scenePalette.leads.pressure}
        lineWidth={highClarityMode ? 5 : 4}
      />
    </group>
  );
}

function PumpAssembly({
  pumpValveOpen,
  pumpBulbState,
  pumpPulseId,
  onPumpValveToggle,
  onPumpBulbPress,
  onFocus,
  focusMode,
  hoveredControl,
  setHoveredControl,
  onValveFocusAnchor,
  interactionLocked,
  demoFocusControlId,
  demoFocusPulseActive,
  manualRollbackAnimation,
  manualRollbackKey,
  onLockedInteraction,
  interactionQualityReduced,
  scenePalette,
}: Pick<HeatCapacityInstrumentSceneProps, 'pumpValveOpen' | 'pumpBulbState' | 'pumpPulseId' | 'onPumpValveToggle' | 'onPumpBulbPress' | 'interactionLocked' | 'demoFocusControlId' | 'demoFocusPulseActive' | 'manualRollbackAnimation' | 'manualRollbackKey' | 'onLockedInteraction'> & {
  onFocus: (mode: HeatCapacityFocusMode) => void;
  focusMode: HeatCapacityFocusMode;
  hoveredControl: HeatCapacityHoveredControl;
  setHoveredControl: (control: HeatCapacityHoveredControl) => void;
  onValveFocusAnchor: (control: ValveFocusControl, clientX: number, clientY: number) => void;
  interactionQualityReduced: boolean;
  scenePalette: HeatCapacityScenePalette;
}) {
  const { camera, gl } = useThree();
  const pumpValveRef = useRef<THREE.Group | null>(null);
  const bulbHovered = hoveredControl === 'pumpBulb';
  const valveHovered = hoveredControl === 'pumpValve';
  const pumpBulbDemoFocused = demoFocusPulseActive && demoFocusControlId === 'pumpBulb';
  const pumpValveDemoFocused = demoFocusPulseActive && demoFocusControlId === 'pumpValve';
  const [valveHandleAngle, setValveHandleAngle] = useState(pumpValveOpen ? 0 : Math.PI / 2);
  const [valveRollbackOffset, setValveRollbackOffset] = useState(0);
  const pumpPulseTimersRef = useRef<{
    releaseTimerId: number | null;
    idleTimerId: number | null;
  }>({ releaseTimerId: null, idleTimerId: null });
  const [pumpPulseVisualState, setPumpPulseVisualState] = useState<HeatCapacityInstrumentSceneProps['pumpBulbState']>('idle');
  const visualPumpBulbState = pumpPulseVisualState !== 'idle' ? pumpPulseVisualState : pumpBulbState;
  const pumpBulbScale: [number, number, number] = visualPumpBulbState === 'compressing'
    ? [1.08, 0.7, 1.06]
    : visualPumpBulbState === 'releasing'
      ? [1.02, 0.92, 1.01]
      : [1, 1, 1];
  const pumpBulbActive = visualPumpBulbState !== 'idle';
  const tubeColor = pumpValveOpen && pumpBulbActive ? scenePalette.pump.tubeActive : scenePalette.pump.tubeIdle;

  const clearPumpPulseTimers = () => {
    const timers = pumpPulseTimersRef.current;
    if (timers.releaseTimerId !== null) {
      window.clearTimeout(timers.releaseTimerId);
      timers.releaseTimerId = null;
    }
    if (timers.idleTimerId !== null) {
      window.clearTimeout(timers.idleTimerId);
      timers.idleTimerId = null;
    }
  };

  const handlePumpBulbPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
    if (interactionLocked) {
      onLockedInteraction();
      return;
    }
    onPumpBulbPress();
  };

  const handlePumpValveClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    event.nativeEvent.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
    if (interactionLocked) {
      onLockedInteraction();
      return;
    }
    onPumpValveToggle();
  };
  const projectValveFocusAnchor = useCallback(() => {
    const anchor = pumpValveRef.current;
    if (!anchor) return null;
    const rect = gl.domElement.getBoundingClientRect();
    const position = new THREE.Vector3();
    anchor.getWorldPosition(position);
    position.project(camera);
    return {
      clientX: rect.left + ((position.x + 1) / 2) * rect.width,
      clientY: rect.top + ((1 - position.y) / 2) * rect.height,
    };
  }, [camera, gl]);
  const openPumpValveFocusBubble = useCallback(() => {
    const anchor = projectValveFocusAnchor();
    if (!anchor) return;
    onValveFocusAnchor('pumpValve', anchor.clientX, anchor.clientY);
  }, [onValveFocusAnchor, projectValveFocusAnchor]);

  useEffect(() => {
    const targetAngle = pumpValveOpen ? 0 : Math.PI / 2;
    const startAngle = valveHandleAngle;
    const startTime = performance.now();
    const duration = PUMP_VALVE_TRANSITION_MS;
    let frameId = 0;
    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      setValveHandleAngle(startAngle + (targetAngle - startAngle) * eased);
      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [pumpValveOpen]);

  useEffect(() => {
    if (manualRollbackAnimation !== 'valveBounce' || manualRollbackKey <= 0) return undefined;
    const startTime = performance.now();
    let frameId = 0;
    const direction = pumpValveOpen ? 1 : -1;
    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / 320);
      setValveRollbackOffset(Math.sin(progress * Math.PI) * 0.38 * direction);
      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        setValveRollbackOffset(0);
      }
    };
    frameId = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frameId);
      setValveRollbackOffset(0);
    };
  }, [manualRollbackAnimation, manualRollbackKey, pumpValveOpen]);

  useEffect(() => {
    if (pumpPulseId <= 0) return undefined;
    clearPumpPulseTimers();
    setPumpPulseVisualState('compressing');
    pumpPulseTimersRef.current.releaseTimerId = window.setTimeout(() => {
      pumpPulseTimersRef.current.releaseTimerId = null;
      setPumpPulseVisualState('releasing');
    }, 90);
    pumpPulseTimersRef.current.idleTimerId = window.setTimeout(() => {
      pumpPulseTimersRef.current.idleTimerId = null;
      setPumpPulseVisualState('idle');
    }, 280);
    return clearPumpPulseTimers;
  }, [pumpPulseId]);

  return (
    <group name="pumpAssembly">
      <mesh name="pumpPortOnStopper" position={[-1.72, 0.9, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.068, 0.068, 0.18, 24]} />
        <meshStandardMaterial color={scenePalette.pump.port} roughness={0.58} metalness={0.2} />
        <Edges color={scenePalette.pump.portEdge} />
      </mesh>
      <mesh name="pumpShortConnectorIn" position={[-1.72, 0.9, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.16, 24]} />
        <meshStandardMaterial color={scenePalette.pump.connector} roughness={0.42} metalness={0.35} />
      </mesh>
      <group
        name="pumpValve"
        ref={pumpValveRef}
        position={[-1.72, 0.9, 0.54]}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.nativeEvent.stopPropagation();
          event.nativeEvent.stopImmediatePropagation?.();
        }}
        onClick={handlePumpValveClick}
        onPointerOver={(event) => {
          event.stopPropagation();
          event.nativeEvent.stopPropagation();
          setHoveredControl('pumpValve');
          openPumpValveFocusBubble();
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
        }}
        onPointerOut={() => {
          setHoveredControl(null);
        }}
      >
        <mesh name="pumpValveHitbox">
          <boxGeometry args={[0.48, 0.42, 0.48]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <DemoFocusHalo active={pumpValveDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloPumpValve" position={[0, 0.04, 0]} focusHaloColor={scenePalette.effects.demoHalo} focusHaloMinOpacity={scenePalette.effects.demoHaloMinOpacity} focusHaloMaxOpacity={scenePalette.effects.demoHaloMaxOpacity} focusHaloBaseScale={scenePalette.effects.demoHaloBaseScale} focusHaloPulseScale={scenePalette.effects.demoHaloPulseScale}>
          <boxGeometry args={[0.56, 0.48, 0.52]} />
        </DemoFocusHalo>
        <mesh name="pumpValveBody" rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.32, 32]} />
          <meshStandardMaterial color={scenePalette.pump.valveBody} roughness={0.34} metalness={0.58} emissive={valveHovered ? scenePalette.instrument.hoverEmissive : '#000000'} emissiveIntensity={valveHovered ? scenePalette.effects.nonBulbHoverEmissiveIntensity : 0} />
          {valveHovered && !interactionQualityReduced ? <Edges color={scenePalette.pump.hoverEdge} /> : null}
        </mesh>
        <mesh name="pumpValveHexNutLeft" position={[0, 0, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.115, 0.105, 0.055, 6]} />
          <meshStandardMaterial color={scenePalette.pump.valveNut} roughness={0.32} metalness={0.5} />
        </mesh>
        <mesh name="pumpValveHexNutRight" position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.105, 0.115, 0.055, 6]} />
          <meshStandardMaterial color={scenePalette.pump.valveNut} roughness={0.32} metalness={0.5} />
        </mesh>
        <mesh name="pumpValveStateBadge" position={[0.13, 0.02, 0]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial color={pumpValveOpen ? scenePalette.pump.valveOpen : scenePalette.pump.valveClosed} emissive={pumpValveOpen ? scenePalette.pump.valveOpenEmissive : scenePalette.pump.valveClosedEmissive} emissiveIntensity={0.22} roughness={0.45} />
        </mesh>
        <group name="pumpValveHandle" position={[0, 0, 0]} rotation={[0, valveHandleAngle + valveRollbackOffset, 0]}>
          <mesh name="pumpValveStem" position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.12, 18]} />
            <meshStandardMaterial color={scenePalette.pump.valveNut} roughness={0.36} metalness={0.48} />
          </mesh>
          <mesh name="pumpValveWingHandle" position={[0, 0.18, 0]}>
            <boxGeometry args={[0.34, 0.052, 0.078]} />
            <meshStandardMaterial color={pumpValveOpen ? scenePalette.pump.handleOpen : scenePalette.pump.handleClosed} roughness={0.48} metalness={0.06} emissive={valveHovered ? '#7f1d1d' : '#000000'} emissiveIntensity={valveHovered ? scenePalette.effects.nonBulbHoverEmissiveIntensity : 0} />
          </mesh>
          <mesh name="pumpValveWingHandleGripLeft" position={[-0.2, 0.18, 0]}>
            <sphereGeometry args={[0.055, 16, 12]} />
            <meshStandardMaterial color={scenePalette.pump.handleGrip} roughness={0.46} metalness={0.18} />
          </mesh>
          <mesh name="pumpValveWingHandleGripRight" position={[0.2, 0.18, 0]}>
            <sphereGeometry args={[0.055, 16, 12]} />
            <meshStandardMaterial color={scenePalette.pump.handleGrip} roughness={0.46} metalness={0.18} />
          </mesh>
        </group>
      </group>
      <mesh name="pumpShortConnectorOut" position={[-1.72, 0.9, 0.69]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.058, 0.058, 0.14, 24]} />
        <meshStandardMaterial color={scenePalette.pump.connector} roughness={0.42} metalness={0.35} />
      </mesh>
      <Line
        name="pumpTube"
        points={[
          [-1.72, 0.9, 0.74],
          [-2.18, 0.72, 0.92],
          [-2.18, -0.3, 1.52],
          [-1.18, -1.08, 1.62],
          [0.32, -1.28, 1.42],
          [1.66, -0.98, 1.08],
        ]}
        color={tubeColor}
        lineWidth={8}
      />
      <group
        name="pumpBulb"
        position={[1.85, -1.03, 1.05]}
        scale={pumpBulbScale}
        onPointerDown={focusMode === 'pump' ? handlePumpBulbPointerDown : undefined}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (interactionLocked) {
            onLockedInteraction();
            return;
          }
          if (focusMode === 'pump') return;
          onFocus('pump');
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHoveredControl('pumpBulb');
        }}
        onPointerOut={() => setHoveredControl(null)}
      >
        <mesh name="pumpBulbHitbox">
          <boxGeometry args={[0.62, 0.42, 0.62]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <DemoFocusHalo active={pumpBulbDemoFocused} suspended={interactionQualityReduced} name="DemoFocusHaloPumpBulb" rotation={[Math.PI / 2, 0, 0]} focusHaloColor={scenePalette.effects.demoHalo} focusHaloMinOpacity={scenePalette.effects.demoHaloMinOpacity} focusHaloMaxOpacity={scenePalette.effects.demoHaloMaxOpacity} focusHaloBaseScale={scenePalette.effects.demoHaloBaseScale} focusHaloPulseScale={scenePalette.effects.demoHaloPulseScale}>
          <torusGeometry args={[0.32, 0.014, 12, 56]} />
        </DemoFocusHalo>
        <mesh name="pumpBulbStatusHalo" visible={pumpBulbActive || bulbHovered} rotation={[Math.PI / 2, 0, 0]} raycast={DISABLE_RAYCAST}>
          <torusGeometry args={[0.29, 0.01, 12, 48]} />
          <meshBasicMaterial color={pumpBulbActive ? scenePalette.pump.bulbHaloActive : scenePalette.pump.bulbHaloHover} transparent opacity={pumpBulbActive ? 0.34 : scenePalette.effects.pumpBulbHoverHaloOpacity} depthWrite={false} />
        </mesh>
        <mesh name="pumpBulbRubber">
          <sphereGeometry args={[0.24, 32, 24]} />
          <meshStandardMaterial color={pumpBulbActive ? scenePalette.pump.bulbActive : scenePalette.pump.bulbIdle} roughness={0.5} metalness={0.02} emissive={bulbHovered || pumpBulbActive ? scenePalette.instrument.hoverEmissive : '#000000'} emissiveIntensity={pumpBulbActive ? 0.18 : bulbHovered ? scenePalette.effects.pumpBulbHoverEmissiveIntensity : 0} />
          {bulbHovered && !interactionQualityReduced ? <Edges color={scenePalette.pump.hoverEdge} /> : null}
        </mesh>
        <mesh name="pumpBulbBase" position={[0, -0.23, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 0.08, 24]} />
          <meshStandardMaterial color={scenePalette.pump.bulbBase} roughness={0.65} />
        </mesh>
      </group>
    </group>
  );
}

function HeatCapacitySceneLighting({ scenePalette }: { scenePalette: HeatCapacityScenePalette }) {
  return (
    <>
      <ambientLight intensity={scenePalette.scene.ambientIntensity} />
      <directionalLight position={[3.4, 4.8, 4]} intensity={scenePalette.scene.directionalIntensity} />
      <pointLight position={[-3, 2.2, 3]} intensity={scenePalette.scene.pointIntensity} color={scenePalette.scene.pointColor} />
    </>
  );
}

function InstrumentSceneContent(props: HeatCapacityInstrumentSceneProps & {
  onFocus: (mode: HeatCapacityFocusMode) => void;
  focusMode: HeatCapacityFocusMode;
  hoveredControl: HeatCapacityHoveredControl;
  setHoveredControl: (control: HeatCapacityHoveredControl) => void;
  onValveFocusAnchor: (control: ValveFocusControl, clientX: number, clientY: number) => void;
  interactionQualityReduced: boolean;
  panelTextInteractionReduced: boolean;
  sceneCopy: HeatCapacitySceneCopy;
  scenePalette: HeatCapacityScenePalette;
}) {
  const stopcockState = getHeatCapacityStopcockState(props.stopcockAngleDeg);
  const zeroEnabled = props.powerOn && stopcockState === 'open';
  const scenePalette = props.scenePalette;
  const highClarityMode = props.performanceMode === 'standard';

  return (
    <>
      <mesh name="WorkbenchDeck" rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]}>
        <planeGeometry args={[6.3, 3.7]} />
        <meshStandardMaterial color={scenePalette.scene.deck} roughness={0.82} />
      </mesh>

      <group name="HeatCapacityProceduralSkeleton" scale={0.9} position={[0, -0.08, 0]}>
        <PressureBottle
          highClarityMode={highClarityMode}
          stopcockAngleDeg={props.stopcockAngleDeg}
          onStopcockOpenChange={props.onStopcockOpenChange}
          focusMode={props.focusMode}
          hoveredControl={props.hoveredControl}
          setHoveredControl={props.setHoveredControl}
          onValveFocusAnchor={props.onValveFocusAnchor}
          interactionLocked={props.interactionLocked}
          demoFocusControlId={props.demoFocusControlId}
          demoFocusPulseActive={props.demoFocusPulseActive}
          manualRollbackAnimation={props.manualRollbackAnimation}
          manualRollbackKey={props.manualRollbackKey}
          onLockedInteraction={props.onLockedInteraction}
          interactionQualityReduced={props.interactionQualityReduced}
          scenePalette={scenePalette}
        />
        <HeatCapacityHardSphereLayer
          enabled={props.hardSphereViewEnabled}
          powerOn={props.powerOn}
          temperatureMv={props.temperatureSignalMv}
          pressureMv={props.pressureSignalMv}
          pressureDeltaKPa={props.pressureDeltaKPa}
          gasAmountRatio={props.gasAmountRatio}
          gasTemperatureK={props.gasTemperatureK}
          ambientTemperatureK={props.ambientTemperatureK}
          phase={props.phase}
          releaseFlowActive={props.releaseFlowActive}
          releaseProgress={props.releaseProgress}
          stopcockFlowOpen={props.stopcockFlowOpen}
          glassStopcockOpen={stopcockState === 'open'}
          pumpValveOpen={props.pumpValveOpen}
          pumpBulbState={props.pumpBulbState}
          pumpFlowActive={props.pumpFlowActive}
          pumpFlowIntensity={props.pumpFlowIntensity}
          particleMultiplier={props.hardSphereParticleMultiplier}
          speedMultiplier={props.hardSphereSpeedMultiplier}
          sceneTheme={props.sceneTheme}
        />
        <InstrumentLeads highClarityMode={highClarityMode} scenePalette={scenePalette} />
        <PumpAssembly
          pumpValveOpen={props.pumpValveOpen}
          pumpBulbState={props.pumpBulbState}
          pumpPulseId={props.pumpPulseId}
          onPumpValveToggle={props.onPumpValveToggle}
          onPumpBulbPress={props.onPumpBulbPress}
          onFocus={props.onFocus}
          focusMode={props.focusMode}
          hoveredControl={props.hoveredControl}
          setHoveredControl={props.setHoveredControl}
          onValveFocusAnchor={props.onValveFocusAnchor}
          interactionLocked={props.interactionLocked}
          demoFocusControlId={props.demoFocusControlId}
          demoFocusPulseActive={props.demoFocusPulseActive}
          manualRollbackAnimation={props.manualRollbackAnimation}
          manualRollbackKey={props.manualRollbackKey}
          onLockedInteraction={props.onLockedInteraction}
          interactionQualityReduced={props.interactionQualityReduced}
          scenePalette={scenePalette}
        />
        <InstrumentBox
          highClarityMode={highClarityMode}
          performanceMode={props.performanceMode}
          powerOn={props.powerOn}
          pressureZeroKnobAngle={props.pressureZeroKnobAngle}
          pressureGaugeDisplayValue={props.pressureGaugeDisplayValue}
          gaugePressureMinKPa={props.gaugePressureMinKPa}
          gaugePressureMaxKPa={props.gaugePressureMaxKPa}
          pressureSafetyThresholdKPa={props.pressureSafetyThresholdKPa}
          pressureOverLimit={props.pressureOverLimit}
          temperatureSignalMv={props.temperatureSignalMv}
          pressureSignalMv={props.pressureSignalMv}
          onPowerToggle={props.onPowerToggle}
          onPressureZeroFineAdjust={props.onPressureZeroFineAdjust}
          onPressureZeroCoarseAdjust={props.onPressureZeroCoarseAdjust}
          zeroEnabled={zeroEnabled}
          onFocus={props.onFocus}
          focusMode={props.focusMode}
          hoveredControl={props.hoveredControl}
          setHoveredControl={props.setHoveredControl}
          interactionLocked={props.interactionLocked}
          demoFocusControlId={props.demoFocusControlId}
          demoFocusPulseActive={props.demoFocusPulseActive}
          manualRollbackAnimation={props.manualRollbackAnimation}
          manualRollbackKey={props.manualRollbackKey}
          onLockedInteraction={props.onLockedInteraction}
          interactionQualityReduced={props.interactionQualityReduced}
          panelTextInteractionReduced={props.panelTextInteractionReduced}
          sceneCopy={props.sceneCopy}
          scenePalette={scenePalette}
        />
      </group>
    </>
  );
}

function CameraRig({
  controlsRef,
  focusMode,
  resetKey,
  autoDemoActive,
  cameraViewScheme,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  focusMode: HeatCapacityFocusMode;
  resetKey: number;
  autoDemoActive: boolean;
  cameraViewScheme: CameraViewScheme;
}) {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    const startPosition = camera.position.clone();
    const startTarget = controlsRef.current?.target.clone() ?? new THREE.Vector3(0.25, -0.05, 0);
    const nextPosition = new THREE.Vector3();
    const nextTarget = new THREE.Vector3();
    const focusView = (focusMode === 'stopcock' || focusMode === 'instrument' || focusMode === 'pump')
      ? cameraViewScheme.focusViews?.[focusMode]
      : undefined;
    const nextView = focusView ?? (
      autoDemoActive
        ? cameraViewScheme.autoDemoView ?? cameraViewScheme.defaultView
        : cameraViewScheme.defaultView
    );
    nextPosition.set(...nextView.position);
    nextTarget.set(...nextView.target);

    let frameId = 0;
    const startTime = performance.now();
    const duration = 360;
    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      camera.position.lerpVectors(startPosition, nextPosition, eased);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(startTarget, nextTarget, eased);
        camera.lookAt(controlsRef.current.target);
        controlsRef.current.update();
      } else {
        camera.lookAt(nextTarget);
      }
      invalidate();
      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [autoDemoActive, camera, cameraViewScheme, controlsRef, focusMode, invalidate, resetKey]);

  return null;
}

function HeatCapacitySceneInvalidator({
  active,
}: {
  active: boolean;
}) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
    if (!active) return undefined;
    const intervalId = window.setInterval(() => {
      invalidate();
    }, 33);
    return () => window.clearInterval(intervalId);
  }, [active, invalidate]);

  return null;
}

function HeatCapacityOrbitControls({
  controlsRef,
  enabled,
  defaultCameraTarget,
  onInteractionStart,
  onInteractionEnd,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  enabled: boolean;
  defaultCameraTarget: [number, number, number];
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
}) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(...defaultCameraTarget);
    controlsRef.current.update();
    invalidate();
  }, [controlsRef, defaultCameraTarget, invalidate]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      enablePan={true}
      enableZoom={true}
      minDistance={ORBIT_MIN_DISTANCE}
      maxDistance={ORBIT_MAX_DISTANCE}
      minPolarAngle={0.62}
      maxPolarAngle={1.42}
      onStart={onInteractionStart}
      onEnd={onInteractionEnd}
      onChange={() => invalidate()}
    />
  );
}

export default function HeatCapacityInstrumentScene(props: HeatCapacityInstrumentSceneProps) {
  const sceneRootRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const hoverClearTimerRef = useRef<number | null>(null);
  const valveFocusBubbleExitTimerRef = useRef<number | null>(null);
  const valveFocusPointerDownRef = useRef(false);
  const onFocusModeChangeRef = useRef(props.onFocusModeChange);
  const [focusMode, setFocusMode] = useState<HeatCapacityFocusMode>('none');
  const [hoveredControl, setHoveredControl] = useState<HeatCapacityHoveredControl>(null);
  const [valveFocusBubble, setValveFocusBubble] = useState<ValveFocusBubbleState | null>(null);
  const [isOrbitInteracting, setIsOrbitInteracting] = useState(false);
  const [viewResetKey, setViewResetKey] = useState(0);
  const sceneCopy = heatCapacitySceneCopies[props.language] ?? heatCapacitySceneCopies['zh-CN'];
  const sceneTheme: HeatCapacitySceneTheme = props.sceneTheme === 'light' ? 'light' : 'dark';
  const scenePalette = heatCapacityScenePalettes[sceneTheme];
  const clearHoverTimer = useCallback(() => {
    if (hoverClearTimerRef.current !== null) {
      window.clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }
  }, []);
  const setStableHoveredControl = useCallback((control: HeatCapacityHoveredControl) => {
    clearHoverTimer();
    if (control !== null) {
      setHoveredControl(control);
      return;
    }
    hoverClearTimerRef.current = window.setTimeout(() => {
      hoverClearTimerRef.current = null;
      setHoveredControl(null);
    }, HOVER_CLEAR_DELAY_MS);
  }, [clearHoverTimer]);
  useEffect(() => clearHoverTimer, [clearHoverTimer]);
  const clearValveFocusBubbleExitTimer = useCallback(() => {
    if (valveFocusBubbleExitTimerRef.current !== null) {
      window.clearTimeout(valveFocusBubbleExitTimerRef.current);
      valveFocusBubbleExitTimerRef.current = null;
    }
  }, []);
  const clampValveFocusBubblePosition = useCallback((clientX: number, clientY: number) => {
    const sceneRoot = sceneRootRef.current;
    const rect = sceneRoot?.getBoundingClientRect();
    if (!sceneRoot || !rect) {
      return {
        x: clientX - (VALVE_FOCUS_BUBBLE_WIDTH_PX / 2),
        y: Math.max(8, clientY - VALVE_FOCUS_BUBBLE_HEIGHT_PX - VALVE_FOCUS_BUBBLE_GAP_PX),
        tailX: VALVE_FOCUS_BUBBLE_WIDTH_PX / 2,
      };
    }
    const inset = 8;
    const scaleX = rect.width / (sceneRoot.offsetWidth || rect.width) || 1;
    const scaleY = rect.height / (sceneRoot.offsetHeight || rect.height) || 1;
    const localWidth = rect.width / scaleX;
    const localHeight = rect.height / scaleY;
    const anchorX = (clientX - rect.left) / scaleX;
    const anchorY = (clientY - rect.top) / scaleY;
    const maxX = Math.max(inset, localWidth - VALVE_FOCUS_BUBBLE_WIDTH_PX - inset);
    const maxY = Math.max(inset, localHeight - VALVE_FOCUS_BUBBLE_HEIGHT_PX - inset);
    const preferredX = anchorX - (VALVE_FOCUS_BUBBLE_WIDTH_PX / 2);
    const preferredY = anchorY - VALVE_FOCUS_BUBBLE_HEIGHT_PX - VALVE_FOCUS_BUBBLE_GAP_PX;
    const x = Math.max(inset, Math.min(maxX, preferredX));
    const y = Math.max(inset, Math.min(maxY, preferredY));
    return {
      x,
      y,
      tailX: Math.max(16, Math.min(VALVE_FOCUS_BUBBLE_WIDTH_PX - 16, anchorX - x)),
    };
  }, []);
  const openValveFocusBubble = useCallback((source: ValveFocusControl, clientX: number, clientY: number) => {
    if (focusMode !== 'none') return;
    if (valveFocusPointerDownRef.current) return;
    clearValveFocusBubbleExitTimer();
    const nextPosition = clampValveFocusBubblePosition(clientX, clientY);
    setValveFocusBubble({
      visible: true,
      x: nextPosition.x,
      y: nextPosition.y,
      tailX: nextPosition.tailX,
      source,
      closing: false,
    });
  }, [clampValveFocusBubblePosition, clearValveFocusBubbleExitTimer, focusMode]);
  const closeValveFocusBubble = useCallback(() => {
    clearValveFocusBubbleExitTimer();
    setValveFocusBubble((current) => {
      if (!current) return current;
      return {
        ...current,
        closing: true,
      };
    });
    valveFocusBubbleExitTimerRef.current = window.setTimeout(() => {
      valveFocusBubbleExitTimerRef.current = null;
      setValveFocusBubble(null);
    }, VALVE_FOCUS_BUBBLE_EXIT_MS);
  }, [clearValveFocusBubbleExitTimer]);
  useEffect(() => clearValveFocusBubbleExitTimer, [clearValveFocusBubbleExitTimer]);
  useEffect(() => {
    onFocusModeChangeRef.current = props.onFocusModeChange;
  }, [props.onFocusModeChange]);
  useEffect(() => {
    onFocusModeChangeRef.current(focusMode);
  }, [focusMode]);
  useEffect(() => {
    if (props.performanceMode === 'ultra' && focusMode !== 'none') {
      setFocusMode('none');
    }
  }, [focusMode, props.performanceMode]);
  const triggerSmoothDefaultView = useCallback(() => {
    closeValveFocusBubble();
    setFocusMode('none');
    setViewResetKey((key) => key + 1);
  }, [closeValveFocusBubble]);
  const overlayMotionRef = usePreviewOverlayMotion<HTMLDivElement>();
  useEffect(() => {
    triggerSmoothDefaultView();
  }, [props.focusResetKey, triggerSmoothDefaultView]);
  const stopcockState = getHeatCapacityStopcockState(props.stopcockAngleDeg);
  const stopcockConnected = stopcockState === 'open';
  const pumpBulbDisplayLabel = getPumpBulbDisplayLabel(props.pumpBulbState, sceneCopy);
  const pumpFrequencyStatusLabel = getPumpFrequencyStatusLabel(props.pumpFrequencyStatus, sceneCopy);
  const temperatureDisplay = props.powerOn ? formatSignal(props.temperatureSignalMv) : sceneCopy.unpowered;
  const pressureDisplay = props.powerOn ? formatSignal(props.pressureSignalMv) : sceneCopy.unpowered;
  const poweredInstrumentReadout = (displayValue: string) => props.powerOn ? displayValue : sceneCopy.unpowered;
  const poweredInstrumentNumber = (displayValue: string) => props.powerOn ? displayValue : '--';
  const interactionHints = getHeatCapacityInteractionHints(focusMode, sceneCopy);
  const hoverTooltip = getHeatCapacityHoverTooltip(hoveredControl, props.pumpValveOpen, sceneCopy);
  const hardSphereNoteCopy = heatCapacityHardSphereNoteCopies[props.language] ?? heatCapacityHardSphereNoteCopies['zh-CN'];
  const hardSphereNoteText = getHardSphereNoteText(props, props.language);
  const hardSphereTooltipId = 'heat-capacity-hard-sphere-tooltip';
  const sceneShouldAnimate = props.hardSphereViewEnabled ||
    props.pumpBulbState !== 'idle' ||
    (props.performanceMode !== 'ultra' && (props.demoFocusPulseActive || Boolean(props.manualRollbackAnimation)));
  const interactionQualityReduced = isOrbitInteracting || props.performanceMode === 'performance';
  const orbitControlsEnabled = props.performanceMode === 'ultra'
    ? true
    : focusMode === 'none' && !props.interactionLocked;
  const cameraViewScheme = useMemo(() => getCameraViewScheme(props.performanceMode), [props.performanceMode]);
  const canvasProps = useMemo(() => ({
    camera: { position: cameraViewScheme.defaultView.position, fov: 38 },
    dpr: props.performanceMode === 'standard'
      ? 2.5
      : props.performanceMode === 'balanced'
        ? 1.5
        : props.performanceMode === 'ultra'
          ? 1.75
          : 1,
    frameloop: 'demand' as const,
    shadows: false,
  }), [cameraViewScheme, props.performanceMode]);
  const proceduralSceneContent = (
    <InstrumentSceneContent
      {...props}
      onFocus={setFocusMode}
      focusMode={focusMode}
      hoveredControl={hoveredControl}
      setHoveredControl={setStableHoveredControl}
      onValveFocusAnchor={openValveFocusBubble}
      interactionQualityReduced={interactionQualityReduced}
      panelTextInteractionReduced={isOrbitInteracting}
      sceneCopy={sceneCopy}
      scenePalette={scenePalette}
    />
  );
  const instrumentSceneContent = props.performanceMode === 'ultra' ? (
    <HeatCapacityUltraModelErrorBoundary fallback={proceduralSceneContent}>
      <Suspense fallback={proceduralSceneContent}>
        <HeatCapacityUltraInstrumentModel
          powerOn={props.powerOn}
          sceneTheme={props.sceneTheme}
          stopcockAngleDeg={props.stopcockAngleDeg}
          pressureZeroKnobAngle={props.pressureZeroKnobAngle}
          pressureGaugeDisplayValue={props.pressureGaugeDisplayValue}
          gaugePressureMinKPa={props.gaugePressureMinKPa}
          gaugePressureMaxKPa={props.gaugePressureMaxKPa}
          pressureDeltaKPa={props.pressureDeltaKPa}
          phase={props.phase}
          temperatureSignalMv={props.temperatureSignalMv}
          pressureSignalMv={props.pressureSignalMv}
          releaseFlowActive={props.releaseFlowActive}
          releaseProgress={props.releaseProgress}
          stopcockFlowOpen={props.stopcockFlowOpen}
          pumpValveOpen={props.pumpValveOpen}
          pumpBulbState={props.pumpBulbState}
          pumpPulseId={props.pumpPulseId}
          pumpFlowActive={props.pumpFlowActive}
          pumpFlowIntensity={props.pumpFlowIntensity}
          gasAmountRatio={props.gasAmountRatio}
          gasTemperatureK={props.gasTemperatureK}
          ambientTemperatureK={props.ambientTemperatureK}
          hardSphereViewEnabled={props.hardSphereViewEnabled}
          hardSphereParticleMultiplier={props.hardSphereParticleMultiplier}
          hardSphereSpeedMultiplier={props.hardSphereSpeedMultiplier}
        />
      </Suspense>
    </HeatCapacityUltraModelErrorBoundary>
  ) : proceduralSceneContent;

  return (
    <div
      ref={sceneRootRef}
      className="studio-heat-instrument-scene"
      data-heat-capacity-instrument-scene="true"
      data-heat-capacity-scene-theme={sceneTheme}
      data-heat-capacity-hovered-control={hoveredControl ?? undefined}
      data-heat-capacity-hard-sphere-view={props.hardSphereViewEnabled ? 'true' : undefined}
      onPointerDownCapture={() => {
        valveFocusPointerDownRef.current = true;
        closeValveFocusBubble();
      }}
      onPointerUpCapture={() => {
        valveFocusPointerDownRef.current = false;
      }}
      onPointerCancelCapture={() => {
        valveFocusPointerDownRef.current = false;
      }}
      onWheelCapture={() => closeValveFocusBubble()}
      onPointerLeave={() => {
        setStableHoveredControl(null);
      }}
    >
      <Canvas {...canvasProps} events={createHeatCapacityPointerEvents}>
        {/* GLB replacement contract: preserve node names, pivots, and hitbox roles from this procedural skeleton. */}
        <color attach="background" args={[scenePalette.scene.background]} />
        <HeatCapacitySceneLighting scenePalette={scenePalette} />
        <HeatCapacitySceneInvalidator active={sceneShouldAnimate} />
        <CameraRig
          controlsRef={controlsRef}
          focusMode={focusMode}
          resetKey={viewResetKey}
          autoDemoActive={props.autoDemoActive}
          cameraViewScheme={cameraViewScheme}
        />
        {instrumentSceneContent}
        <HeatCapacityOrbitControls
          enabled={orbitControlsEnabled}
          controlsRef={controlsRef}
          defaultCameraTarget={cameraViewScheme.defaultView.target}
          onInteractionStart={() => {
            setIsOrbitInteracting(true);
            setStableHoveredControl(null);
            closeValveFocusBubble();
          }}
          onInteractionEnd={() => {
            setIsOrbitInteracting(false);
          }}
        />
      </Canvas>
      <div
        ref={overlayMotionRef}
        className="studio-preview-overlay-layer studio-heat-overlay-layer"
        data-preview-overlay-layer="heat-capacity"
      >
        <div className="studio-preview-overlay-slot studio-preview-overlay-slot-top-left">
          {props.overlayTopLeft ? (
            <div data-preview-overlay-item="heat-parent-top-left">
              {props.overlayTopLeft}
            </div>
          ) : null}
          <div
            className="studio-heat-hard-sphere-tooltip-anchor"
            data-preview-overlay-item="heat-hard-sphere-toggle"
            title={`${hardSphereNoteCopy.title}: ${hardSphereNoteText} ${hardSphereNoteCopy.footnote}`}
          >
            <HeatCapacityHardSphereToggle
              enabled={props.hardSphereViewEnabled}
              onToggle={props.onHardSphereViewToggle}
              disabled={props.hardSphereViewLocked}
              language={props.language}
              descriptionId={hardSphereTooltipId}
            />
            <div
              id={hardSphereTooltipId}
              className="studio-heat-hard-sphere-tooltip"
              role="tooltip"
              data-heat-capacity-hard-sphere-tooltip="true"
            >
              <strong>{hardSphereNoteCopy.title}</strong>
              <span>{hardSphereNoteText}</span>
              <small>{hardSphereNoteCopy.footnote}</small>
            </div>
          </div>
        </div>
        <div className="studio-preview-overlay-slot studio-preview-overlay-slot-top-center">
          {props.overlayTopCenter ? (
            <div data-preview-overlay-item="heat-parent-top-center">
              {props.overlayTopCenter}
            </div>
          ) : null}
        </div>
        <div className="studio-preview-overlay-slot studio-preview-overlay-slot-top-right">
          {props.overlayTopRight ? (
            <div data-preview-overlay-item="heat-parent-top-right">
              {props.overlayTopRight}
            </div>
          ) : null}
          <button
            type="button"
            className="studio-heat-view-reset"
            data-heat-capacity-view-reset="true"
            data-preview-overlay-item="heat-view-reset"
            disabled={props.interactionLocked}
            onClick={() => {
              if (props.interactionLocked) {
                props.onLockedInteraction();
                return;
              }
              triggerSmoothDefaultView();
            }}
          >
            {sceneCopy.defaultView}
          </button>
        </div>
        <div className="studio-preview-overlay-slot studio-preview-overlay-slot-bottom-left">
          <div
            className="studio-heat-interaction-hints"
            data-heat-capacity-interaction-hints="true"
            data-preview-overlay-item="heat-interaction-hints"
          >
            <strong>{sceneCopy.interactionTitle}</strong>
            {interactionHints.map((hint) => (
              <span key={hint}>{hint}</span>
            ))}
          </div>
        </div>
        <div className="studio-preview-overlay-slot studio-preview-overlay-slot-bottom-right">
          {hoverTooltip ? (
            <div data-preview-overlay-item="heat-hover-tooltip">
              <div
                className="studio-heat-hover-tooltip"
                data-heat-capacity-hover-tooltip="true"
              >
                {hoverTooltip}
              </div>
            </div>
          ) : null}
          {props.overlayBottomRight ? (
            <div data-preview-overlay-item="heat-parent-bottom-right">
              {props.overlayBottomRight}
            </div>
          ) : null}
          {focusMode === 'stopcock' ? (
            <div data-preview-overlay-item="heat-focus-panel">
              <div
                className="studio-heat-focus-panel studio-heat-focus-panel-stopcock"
                data-heat-capacity-focus-panel="stopcock"
              >
                <div className="studio-heat-focus-title">{sceneCopy.focus.stopcockTitle}</div>
                <div className="studio-heat-focus-grid">
                  <div className="studio-heat-focus-panel-row">
                    <span>{sceneCopy.focus.glassStopcock}</span>
                    <strong className={stopcockConnected ? 'studio-heat-focus-positive' : 'studio-heat-focus-muted'}>
                      {stopcockConnected ? sceneCopy.focus.connected : sceneCopy.focus.disconnected}
                    </strong>
                  </div>
                  <div className="studio-heat-focus-panel-row">
                    <span>{sceneCopy.focus.pumpValve}</span>
                    <strong className={props.pumpValveOpen ? 'studio-heat-focus-positive' : 'studio-heat-focus-muted'}>
                      {props.pumpValveOpen ? sceneCopy.focus.opened : sceneCopy.focus.closed}
                    </strong>
                  </div>
                </div>
                <div className="studio-heat-focus-panel-actions">
                  <button
                    type="button"
                    data-heat-capacity-valve-focus-stopcock-toggle="true"
                    disabled={props.interactionLocked}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (props.interactionLocked) {
                        props.onLockedInteraction();
                        return;
                      }
                      props.onStopcockOpenChange(!stopcockConnected);
                    }}
                  >
                    {stopcockConnected ? sceneCopy.focus.closeStopcock : sceneCopy.focus.openStopcock}
                  </button>
                  <button
                    type="button"
                    data-heat-capacity-valve-focus-pump-valve-toggle="true"
                    disabled={props.interactionLocked}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (props.interactionLocked) {
                        props.onLockedInteraction();
                        return;
                      }
                      props.onPumpValveToggle();
                    }}
                  >
                    {props.pumpValveOpen ? sceneCopy.focus.closePumpValve : sceneCopy.focus.openPumpValve}
                  </button>
                </div>
                <div className="studio-heat-focus-panel-actions studio-heat-focus-panel-actions-single">
                  <button
                    type="button"
                    data-heat-capacity-focus-exit="true"
                    disabled={props.interactionLocked}
                    onClick={() => {
                      if (props.interactionLocked) {
                        props.onLockedInteraction();
                        return;
                      }
                      setFocusMode('none');
                    }}
                  >
                    {sceneCopy.focus.exit}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {focusMode === 'pump' ? (
            <div data-preview-overlay-item="heat-focus-panel">
              <div
                className="studio-heat-focus-panel studio-heat-focus-panel-pump"
                data-heat-capacity-focus-panel="pump"
              >
                <div className="studio-heat-focus-title">{sceneCopy.focus.pumpTitle}</div>
                <div className="studio-heat-focus-grid">
                  <div className="studio-heat-focus-panel-row">
                    <span>{sceneCopy.focus.pumpBulb}</span>
                    <strong className={props.pumpBulbState === 'idle' ? 'studio-heat-focus-muted' : 'studio-heat-focus-positive'}>
                      {pumpBulbDisplayLabel}
                    </strong>
                  </div>
                  <div className="studio-heat-focus-panel-row">
                    <span>{sceneCopy.focus.pumpFrequency}</span>
                    <strong>{formatPanelNumber(props.pumpFrequency, 2)} /s</strong>
                  </div>
                  <div className="studio-heat-focus-panel-row">
                    <span>{sceneCopy.focus.frequencyStatus}</span>
                    <strong className={props.pumpFrequencyStatus === 'suitable' ? 'studio-heat-focus-positive' : 'studio-heat-focus-muted'}>
                      {pumpFrequencyStatusLabel}
                    </strong>
                  </div>
                </div>
                <div className="studio-heat-focus-hint">{props.pumpHint}</div>
                <div className="studio-heat-focus-panel-actions studio-heat-focus-panel-actions-single">
                  <button
                    type="button"
                    data-heat-capacity-focus-exit="true"
                    disabled={props.interactionLocked}
                    onClick={() => {
                      if (props.interactionLocked) {
                        props.onLockedInteraction();
                        return;
                      }
                      setFocusMode('none');
                    }}
                  >
                    {sceneCopy.focus.exit}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {focusMode === 'instrument' ? (
            <div data-preview-overlay-item="heat-focus-panel">
              <div
                className="studio-heat-focus-panel studio-heat-focus-panel-instrument"
                data-heat-capacity-focus-panel="instrument"
              >
                <div className="studio-heat-focus-title">{sceneCopy.focus.instrumentTitle}</div>
                <div className="studio-heat-focus-instrument-columns">
                  <div className="studio-heat-focus-column">
                    <div className="studio-heat-focus-panel-row">
                      <span>{sceneCopy.focus.powerStatus}</span>
                      <strong className={props.powerOn ? 'studio-heat-focus-positive' : 'studio-heat-focus-muted'}>
                        {props.powerOn ? sceneCopy.focus.powerOn : sceneCopy.focus.powerOff}
                      </strong>
                    </div>
                    <div className="studio-heat-focus-panel-row">
                      <span>U<sub>T</sub></span>
                      <strong>{poweredInstrumentReadout(temperatureDisplay)}</strong>
                    </div>
                    <div className="studio-heat-focus-panel-row">
                      <span>{sceneCopy.focus.pressureZero}</span>
                      <strong className={props.pressureZeroAdjusted ? 'studio-heat-focus-positive' : 'studio-heat-focus-muted'}>
                        {props.pressureZeroAdjusted ? sceneCopy.focus.zeroed : sceneCopy.focus.notZeroed}
                      </strong>
                    </div>
                    <div className="studio-heat-focus-panel-row">
                      <span>{sceneCopy.focus.displayedPressure}</span>
                      <strong>{poweredInstrumentNumber(`${formatPanelNumber(props.pressureDisplayedPlaceholder, 2)} mV`)}</strong>
                    </div>
                    <div className="studio-heat-focus-panel-row">
                      <span>{sceneCopy.focus.placeholderTemperature}</span>
                      <strong>{poweredInstrumentNumber(formatPanelNumber(props.temperaturePlaceholder, 3))}</strong>
                    </div>
                  </div>
                  <div className="studio-heat-focus-column">
                    <div className="studio-heat-focus-panel-row">
                      <span>{sceneCopy.focus.currentPhase}</span>
                      <strong>{props.phase}</strong>
                    </div>
                    <div className="studio-heat-focus-panel-row">
                      <span>U<sub>p</sub></span>
                      <strong>{poweredInstrumentReadout(pressureDisplay)}</strong>
                    </div>
                    <div className="studio-heat-focus-panel-row">
                      <span>{sceneCopy.focus.zeroOffset}</span>
                      <strong>{poweredInstrumentNumber(`${formatPanelNumber(props.pressureZeroOffset, 2)} mV`)}</strong>
                    </div>
                    <div className="studio-heat-focus-panel-row">
                      <span>{sceneCopy.focus.placeholderPressure}</span>
                      <strong>{poweredInstrumentNumber(`${formatPanelNumber(props.pressurePlaceholder, 2)} kPa`)}</strong>
                    </div>
                  </div>
                </div>
                <div className="studio-heat-focus-panel-actions studio-heat-focus-panel-actions-single">
                  <button
                    type="button"
                    data-heat-capacity-focus-exit="true"
                    disabled={props.interactionLocked}
                    onClick={() => {
                      if (props.interactionLocked) {
                        props.onLockedInteraction();
                        return;
                      }
                      setFocusMode('none');
                    }}
                  >
                    {sceneCopy.focus.exit}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        {props.overlayCenter ? (
          <div className="studio-preview-overlay-center" data-preview-overlay-center="true">
            {props.overlayCenter}
          </div>
        ) : null}
        {props.overlayBottomCenter ? (
          <div className="studio-preview-overlay-bottom-center" data-preview-overlay-bottom-center="true">
            {props.overlayBottomCenter}
          </div>
        ) : null}
      </div>
      {valveFocusBubble?.visible ? (
        <div
          className={`studio-heat-valve-focus-bubble${valveFocusBubble.closing ? ' studio-heat-valve-focus-bubble-closing' : ''}`}
          data-heat-capacity-valve-focus-bubble={valveFocusBubble.source}
          style={{
            '--heat-valve-focus-tail-x': `${valveFocusBubble.tailX}px`,
            transform: `translate3d(${valveFocusBubble.x}px, ${valveFocusBubble.y}px, 0)`,
          } as React.CSSProperties}
          onPointerDownCapture={(event) => {
            event.stopPropagation();
          }}
        >
          <button
            type="button"
            className="studio-heat-valve-focus-button"
            data-heat-capacity-valve-focus-entry="true"
            disabled={props.interactionLocked}
            onClick={(event) => {
              event.stopPropagation();
              if (props.interactionLocked) {
                props.onLockedInteraction();
                return;
              }
              closeValveFocusBubble();
              setFocusMode('stopcock');
            }}
          >
            {sceneCopy.focus.enterValveFocus}
          </button>
        </div>
      ) : null}
    </div>
  );
}
