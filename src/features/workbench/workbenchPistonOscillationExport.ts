import type {
  PistonOscillationFreeSession,
} from '../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import {
  PISTON_OSCILLATION_SCORING_POLICY_VERSION,
  getConsistentPistonOscillationGasMaterialSnapshot,
} from '../../domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationFreeExperimentContextSnapshot,
  doPistonOscillationGasMaterialSnapshotsAgree,
} from '../../domain/pistonOscillation/pistonOscillationFreeExperimentGroupModel.ts';
import {
  doPistonOscillationExperimentContextsAgree,
} from '../../domain/pistonOscillation/pistonOscillationExperimentContextModel.ts';
import {
  selectPistonOscillationProcessReviewModels,
} from '../processReview/pistonOscillationProcessReviewModel.ts';
import type { PistonOscillationLanguage } from '../pistonOscillation/pistonOscillationCopy.ts';
import type {
  WorkbenchExportLanguage,
  WorkbenchExportPayload,
} from './workbenchResults.ts';
import type {
  WorkbenchHeatCapacityPistonOscillationState,
} from './workbenchPistonOscillationState.ts';
import { calculatePistonUncertainty, PISTON_UNCERTAINTY_PHASES, PISTON_UNCERTAINTY_FIELDS, pistonUncertaintyComplete, pistonUncertaintyReference, pistonUncertaintyDigits } from '../../domain/pistonOscillation/pistonOscillationUncertaintyModel.ts';
import { buildPistonUncertaintyPresentation } from '../../domain/pistonOscillation/pistonOscillationUncertaintyPresentation.ts';

export const PISTON_OSCILLATION_REPORT_EXPORT_KIND =
  'heat-capacity-piston-oscillation' as const;

const formatTimestamp = (value: number) => {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
};

const sanitizeFilenamePart = (value: string) => (
  value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'piston-oscillation'
);

const getSessionCompletionTime = (session: PistonOscillationFreeSession) => (
  session.dataProcessing?.calculationSession?.completedAtMs
  ?? session.dataProcessing?.updatedAtMs
  ?? session.updatedAtMs
  ?? Date.now()
);

export const isPistonOscillationReportReady = (
  file: WorkbenchHeatCapacityPistonOscillationState,
) => {
  const session = file.pistonOscillationFreeSession;
  const processing = session.dataProcessing;
  if (
    session.status !== 'active'
    || processing?.status !== 'completed'
    || processing.linearFitResult === null
    || processing.calculationSession?.status !== 'completed'
    || !pistonUncertaintyComplete(processing.calculationSession.uncertainty)
    || processing.runs.length < 3
  ) return false;
  if (
    !processing.scoringPolicy
    || processing.scoringPolicy.policyVersion !== PISTON_OSCILLATION_SCORING_POLICY_VERSION
    || processing.scoringPolicy.scheme !== session.experimentGroup.scheme
    || processing.scoringPolicy.scoringEligible !== (session.experimentGroup.scheme === 'real')
  ) return false;
  if (processing.runs.length !== session.savedMeasurements.length) return false;
  if (processing.runs.some((run) => run.result === null || run.selection === null)) return false;
  const gasMaterial = getConsistentPistonOscillationGasMaterialSnapshot(
    session.savedMeasurements,
  );
  if (
    !gasMaterial
    || !doPistonOscillationGasMaterialSnapshotsAgree(
      gasMaterial,
      session.experimentGroup.gasMaterialSnapshot,
    )
  ) {
    return false;
  }
  const experimentContext = createPistonOscillationFreeExperimentContextSnapshot(
    session.experimentGroup,
  );
  if (session.savedMeasurements.some((measurement) => (
    !measurement.experimentContext
    || !doPistonOscillationExperimentContextsAgree(
      measurement.experimentContext,
      experimentContext,
    )
  ))) return false;
  return selectPistonOscillationProcessReviewModels(session, 'zh-CN').length
    === processing.runs.length;
};

const getHeightSource = (
  session: PistonOscillationFreeSession,
  recordId: string,
  targetHeightMm: number,
) => {
  const targetId = session.savedMeasurementTargetIds[recordId];
  const target = session.experimentPlan?.targets.find((candidate) => (
    candidate.targetId === targetId
  )) ?? session.experimentPlan?.targets.find((candidate) => (
    candidate.heightMm === targetHeightMm
  ));
  return target?.source ?? 'system';
};

export const createPistonOscillationReportExportPayload = (
  file: WorkbenchHeatCapacityPistonOscillationState,
  language: WorkbenchExportLanguage = 'zh-CN',
): WorkbenchExportPayload => {
  const session = file.pistonOscillationFreeSession;
  const processing = session.dataProcessing;
  if (!processing || processing.status !== 'completed') {
    throw new Error('Piston-oscillation report data are not complete.');
  }
  if (
    !processing.scoringPolicy
    || processing.scoringPolicy.policyVersion !== PISTON_OSCILLATION_SCORING_POLICY_VERSION
    || processing.scoringPolicy.scheme !== session.experimentGroup.scheme
    || processing.scoringPolicy.scoringEligible !== (session.experimentGroup.scheme === 'real')
  ) {
    throw new Error('Piston-oscillation scoring policy is inconsistent.');
  }
  const scoringEligible = processing.scoringPolicy.scoringEligible;
  const reviewModels = selectPistonOscillationProcessReviewModels(
    session,
    language as PistonOscillationLanguage,
  );
  if (reviewModels.length !== processing.runs.length) {
    throw new Error('Piston-oscillation process-review evidence is incomplete.');
  }
  const gasMaterial = getConsistentPistonOscillationGasMaterialSnapshot(
    session.savedMeasurements,
  );
  if (!gasMaterial) {
    throw new Error('Piston-oscillation gas-material evidence is inconsistent.');
  }
  if (!doPistonOscillationGasMaterialSnapshotsAgree(
    gasMaterial,
    session.experimentGroup.gasMaterialSnapshot,
  )) {
    throw new Error('Piston-oscillation experiment-group material is inconsistent.');
  }
  const experimentContext = createPistonOscillationFreeExperimentContextSnapshot(
    session.experimentGroup,
  );
  if (session.savedMeasurements.some((measurement) => (
    !measurement.experimentContext
    || !doPistonOscillationExperimentContextsAgree(
      measurement.experimentContext,
      experimentContext,
    )
  ))) {
    throw new Error('Piston-oscillation experiment-group context is inconsistent.');
  }

  const measurements = processing.runs.map((run, runIndex) => {
    const record = session.savedMeasurements.find((candidate) => (
      candidate.recordId === run.rawMeasurementRecordId
    ));
    const review = reviewModels[runIndex];
    if (!record || !review) {
      throw new Error(`Piston-oscillation measurement ${runIndex + 1} is missing.`);
    }
    const operationRows = review.scoreRows.filter((row) => row.id !== 'piston-calculation');
    const operationScore = scoringEligible
      ? operationRows.reduce((sum, row) => sum + (row.score ?? 0), 0)
      : null;
    const operationMaximum = scoringEligible
      ? operationRows.reduce((sum, row) => sum + (row.maxScore ?? 0), 0)
      : null;
    const touchdown = session.audit.some((event) => (
      event.type === 'operation-observed'
      && event.operation === 'bottomImpact'
      && event.measurementIndex === run.measurementIndex
    ));
    const pressureValues = record.samples.map((sample) => sample.absolutePressureKpa);
    const releaseGapS = record.pressOperationEvidence.signedReleaseGapS;
    return {
      number: runIndex + 1,
      measurementIndex: run.measurementIndex,
      recordId: record.recordId,
      targetHeightMm: run.targetHeightMm,
      confirmedHeightMm: record.confirmedHeightMm,
      heightSource: getHeightSource(
        session,
        record.recordId,
        run.targetHeightMm,
      ),
      capturedAtMs: record.capturedAtMs,
      acquisitionSettings: record.acquisitionSettings,
      sampleCount: record.samples.length,
      pressureRangeKpa: pressureValues.length > 0 ? {
        minimum: Math.min(...pressureValues),
        maximum: Math.max(...pressureValues),
      } : null,
      samples: record.samples,
      experimentContext: record.experimentContext
        ? { ...record.experimentContext }
        : null,
      gasMaterial: { ...record.physicsSnapshot.gasMaterial },
      pressOperationEvidence: record.pressOperationEvidence,
      selection: run.selection,
      periodResult: run.result,
      calculationPrecision: run.calculationPrecision,
      fitHeightMm: run.fitHeightMm,
      includedInFit: processing.linearFitResult?.selectedRunIndices.includes(
        run.measurementIndex,
      ) ?? false,
      keyEvidence: {
        heightDeviationMm: record.confirmedHeightMm - run.targetHeightMm,
        releaseGapMs: releaseGapS === null ? null : Math.abs(releaseGapS) * 1_000,
        touchdown,
        pressCount: review.events.filter((event) => (
          event.category === 'press' && event.id.endsWith(':press')
        )).length,
        resetCount: review.events.filter((event) => (
          event.label === '重置' || event.label === '重設' || event.label === 'Reset'
        )).length,
        result: 'saved',
      },
      processReview: {
        title: review.currentTitle,
        subtitle: review.currentSubtitle,
        statusLabel: review.options[runIndex]?.statusLabel ?? '',
        stages: review.stages,
        events: review.events,
        scoreRows: review.scoreRows,
      },
      score: scoringEligible ? {
        operation: operationScore,
        operationMaximum,
        setup: review.scoreRows.find((row) => row.id === 'piston-setup-height')?.score ?? 0,
        excitation: review.scoreRows.find((row) => row.id === 'piston-excitation')?.score ?? 0,
        selectionAndFit: review.scoreRows.find((row) => row.id === 'piston-selection-fit')?.score ?? 0,
        evidence: review.scoreRows.find((row) => row.id === 'piston-evidence')?.score ?? 0,
        tone: review.options[runIndex]?.statusTone ?? 'attention',
      } : null,
    };
  });

  const calculationScore = scoringEligible
    ? reviewModels[0]?.scoreRows.find((row) => (
        row.id === 'piston-calculation'
      ))?.score ?? 0
    : null;
  const calculationMaximum = scoringEligible
    ? reviewModels[0]?.scoreRows.find((row) => (
        row.id === 'piston-calculation'
      ))?.maxScore ?? 25
    : null;
  const operationAverage = scoringEligible
    ? Math.round(
        measurements.reduce((sum, measurement) => sum + (measurement.score?.operation ?? 0), 0)
        / Math.max(1, measurements.length),
      )
    : null;
  const calculation = processing.calculationSession;
  const uncertaintyAnalysis = calculation?.uncertainty && processing.linearFitResult
    ? calculatePistonUncertainty(calculation.knowns, processing.linearFitResult, processing.runs, calculation.uncertainty.profile) : null;
  const uncertaintyCopy = calculation?.uncertainty && uncertaintyAnalysis
    ? buildPistonUncertaintyPresentation(calculation.uncertainty, uncertaintyAnalysis, language) : null;
  const uncertaintyReport = calculation?.uncertainty && uncertaintyAnalysis && uncertaintyCopy ? {
    version: calculation.uncertainty.version,
    parameterRows: uncertaintyCopy.parameterRows,
    analysis: uncertaintyAnalysis,
    phases: PISTON_UNCERTAINTY_PHASES.map(phase => ({
      ...uncertaintyCopy.lessons[phase],
      items: PISTON_UNCERTAINTY_FIELDS[phase].map(id => ({
        id, ...uncertaintyCopy.fields[id],
        reference: pistonUncertaintyReference(id, uncertaintyAnalysis),
        working: uncertaintyAnalysis.values[id],
        significantFigures: pistonUncertaintyDigits(id, uncertaintyAnalysis),
        answer: calculation.uncertainty!.answers[id],
      })),
    })),
    result: `γ = ${pistonUncertaintyReference('result', uncertaintyAnalysis)} ± ${pistonUncertaintyReference('expanded', uncertaintyAnalysis)} (k = ${calculation.uncertainty.profile.coverage})`,
  } : null;
  const completedAtMs = getSessionCompletionTime(session);
  const exportedAtMs = Date.now();
  const scheme = session.experimentGroup.scheme;
  const gasType = gasMaterial.gasType;
  const experimentName = language === 'en'
    ? `${gasType === 'helium' ? 'Helium' : 'Air'} heat-capacity ratio by piston oscillation`
    : language === 'zh-TW'
      ? `活塞振動法測${gasType === 'helium' ? '氦氣' : '空氣'}比熱容比`
      : `活塞振动法测${gasType === 'helium' ? '氦气' : '空气'}比热容比`;

  return {
    kind: 'json',
    mode: 'report',
    filename: `${sanitizeFilenamePart(file.name)}-piston-oscillation-report-${formatTimestamp(completedAtMs)}.json`,
    data: {
      exportKind: PISTON_OSCILLATION_REPORT_EXPORT_KIND,
      schemaVersion: 4,
      language,
      fileId: file.id,
      fileName: file.name,
      experimentName,
      experimentMode: 'free',
      experimentGroup: {
        groupId: session.experimentGroup.groupId,
        scheme,
        gasMaterial: { ...session.experimentGroup.gasMaterialSnapshot },
        parameterProfileVersion: session.experimentGroup.parameterProfileVersion,
        parameterSnapshot: session.experimentGroup.parameterSnapshot
          ? structuredClone(session.experimentGroup.parameterSnapshot)
          : null,
        provenance: session.experimentGroup.provenance,
        createdAtMs: session.experimentGroup.createdAtMs,
        lockedAtMs: session.experimentGroup.lock?.lockedAtMs ?? null,
        lockReason: session.experimentGroup.lock?.reason ?? null,
      },
      gasMaterial: { ...gasMaterial },
      fileCreatedAtMs: file.createdAt,
      fileUpdatedAtMs: file.updatedAt,
      sessionStartedAtMs: session.startedAtMs,
      sessionCompletedAtMs: completedAtMs,
      exportedAtMs,
      experimentPlan: session.experimentPlan,
      summary: {
        measurementCount: measurements.length,
        fitPointCount: processing.linearFitResult?.selectedRunIndices.length ?? 0,
        areaM2: calculation?.answers.area.expectedValue ?? null,
        gamma: calculation?.answers.gamma.expectedValue ?? null,
        reportedGamma: uncertaintyAnalysis ? pistonUncertaintyReference('result', uncertaintyAnalysis) : null,
        scheme,
        gasType,
        scoringEligible,
        scoringPolicyVersion: processing.scoringPolicy.policyVersion,
        parameterProfileVersion: session.experimentGroup.parameterProfileVersion,
        referenceGamma: calculation?.knowns.referenceGamma ?? null,
        relativeErrorPercent: calculation?.answers.relativeError.expectedValue ?? null,
        rSquared: processing.linearFitResult?.rSquared ?? null,
        operationAverageScore: operationAverage,
        operationMaximum: scoringEligible ? 75 : null,
        calculationScore,
        calculationMaximum,
        totalScore: operationAverage === null || calculationScore === null
          ? null
          : operationAverage + calculationScore,
        totalMaximum: scoringEligible ? 100 : null,
      },
      measurements,
      linearFitResult: processing.linearFitResult,
      calculationSession: calculation,
      ...(uncertaintyReport ? { uncertaintyReport } : {}),
      precisionVersion: processing.precisionVersion,
      processingAudit: processing.audit,
      instrumentAudit: session.audit,
    },
  };
};
