import { WelcomeProductIntroFlow } from '../onboarding/WelcomeProductIntroFlow';
import { LearningNeedsPage } from '../onboarding/LearningNeedsPage';
import { firstRunCopies } from '../onboarding/firstRunCopy';
import type { useWorkbenchTutorialState } from './useWorkbenchTutorialState';
import type { createWorkbenchTutorialOverlayActions } from './workbenchTutorialOverlayActions';
import type { WorkbenchLanguagePreference, WorkbenchResolvedTheme } from './workbenchGeneralSettings';
export type WorkbenchLearningExperienceOverlaysProps = Pick<ReturnType<typeof useWorkbenchTutorialState>, 'productIntroReplayPhase' | 'learningNeedsReselectOpen' | 'learningNeedsDraft' | 'setProductIntroReplayPhase'> & Pick<ReturnType<typeof createWorkbenchTutorialOverlayActions>, 'closeLearningExperienceOverlay' | 'submitLearningNeedsReselect' | 'updateLearningNeedsAnswer'> & { settingsLanguagePreference: WorkbenchLanguagePreference; resolvedWorkbenchTheme: WorkbenchResolvedTheme; onboardingReducedMotion: boolean };
export const WorkbenchLearningExperienceOverlays = ({ productIntroReplayPhase, learningNeedsReselectOpen, learningNeedsDraft, setProductIntroReplayPhase, closeLearningExperienceOverlay, submitLearningNeedsReselect, updateLearningNeedsAnswer, settingsLanguagePreference, resolvedWorkbenchTheme, onboardingReducedMotion }: WorkbenchLearningExperienceOverlaysProps) => <>{productIntroReplayPhase ? (
          <div
            className="first-run-experience first-run-replay-overlay"
            data-first-run-language={settingsLanguagePreference}
            data-learning-overlay="product-intro"
          >
            <WelcomeProductIntroFlow
              phase={productIntroReplayPhase}
              language={settingsLanguagePreference}
              copy={firstRunCopies[settingsLanguagePreference]}
              theme={resolvedWorkbenchTheme}
              reducedMotion={onboardingReducedMotion}
              showPrevious={false}
              nextLabel={firstRunCopies[settingsLanguagePreference].common.finish}
              onPhaseChange={setProductIntroReplayPhase}
              onPrevious={closeLearningExperienceOverlay}
              onNext={closeLearningExperienceOverlay}
            />
          </div>
        ) : null}
{learningNeedsReselectOpen ? (
          <div className="first-run-experience first-run-replay-overlay" data-learning-overlay="reselect-needs">
            <LearningNeedsPage
              copy={firstRunCopies[settingsLanguagePreference]}
              answers={learningNeedsDraft}
              onAnswerChange={updateLearningNeedsAnswer}
              onPrevious={closeLearningExperienceOverlay}
              onNext={submitLearningNeedsReselect}
            />
          </div>
        ) : null}</>;
