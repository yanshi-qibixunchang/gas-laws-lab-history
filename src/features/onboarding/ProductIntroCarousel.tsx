import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  PRODUCT_INTRO_AUTOPLAY_MS,
  moveProductIntroCard,
} from './productIntroCarouselModel.ts';
import type { FirstRunCopy, FirstRunProductCardCopy } from './firstRunCopy.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import { ProductIntroModesDemo } from './ProductIntroModesDemo.tsx';
import { ProductIntroModesVideo } from './ProductIntroModesVideo.tsx';
import { ProductIntroOutcomeVideo } from './ProductIntroOutcomeVideo.tsx';
import { ProductIntroWorkspaceDemo } from './ProductIntroWorkspaceDemo.tsx';

interface ProductIntroCarouselProps {
  language: WorkbenchLanguagePreference;
  theme: 'dark' | 'light';
  copy: FirstRunCopy;
  reducedMotion: boolean;
  onPrevious: () => void;
  onNext: () => void;
  active?: boolean;
  showPrevious?: boolean;
  nextLabel?: string;
}

const PRODUCT_INTRO_CONTENT_TRANSITION_MS = 450;

interface QueuedCarouselMove {
  direction: -1 | 1;
  announce: boolean;
}

export const ProductIntroCarousel = ({
  language,
  theme,
  copy,
  reducedMotion,
  onPrevious,
  onNext,
  active = true,
  showPrevious = true,
  nextLabel,
}: ProductIntroCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<-1 | 1>(1);
  const [userPaused, setUserPaused] = useState(false);
  const [announceChanges, setAnnounceChanges] = useState(false);
  const [pendingMoveCount, setPendingMoveCount] = useState(0);
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState === 'visible');
  const transitionTimerRef = useRef<number | null>(null);
  const activeIndexRef = useRef(0);
  const transitionInProgressRef = useRef(false);
  const queuedMovesRef = useRef<QueuedCarouselMove[]>([]);
  const moveRef = useRef<(nextDirection: -1 | 1, announce?: boolean) => void>(() => undefined);
  const cards = copy.product.cards;

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) window.clearTimeout(transitionTimerRef.current);
    transitionInProgressRef.current = false;
    queuedMovesRef.current = [];
  }, []);

  const move = useCallback((nextDirection: -1 | 1, announce = true) => {
    if (cards.length <= 1) return;

    if (transitionInProgressRef.current) {
      if (announce) {
        queuedMovesRef.current.push({ direction: nextDirection, announce });
        setPendingMoveCount(queuedMovesRef.current.length);
      }
      return;
    }

    const currentIndex = activeIndexRef.current;
    const nextIndex = moveProductIntroCard(currentIndex, nextDirection, cards.length);
    if (nextIndex === currentIndex) return;

    if (reducedMotion) {
      setDirection(nextDirection);
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      setAnnounceChanges(announce);
      return;
    }

    transitionInProgressRef.current = true;
    setOutgoingIndex(currentIndex);
    setDirection(nextDirection);
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    setAnnounceChanges(announce);
    transitionTimerRef.current = window.setTimeout(() => {
      setOutgoingIndex(null);
      transitionTimerRef.current = null;
      transitionInProgressRef.current = false;

      const queuedMove = queuedMovesRef.current.shift();
      setPendingMoveCount(queuedMovesRef.current.length);
      if (queuedMove) {
        moveRef.current(queuedMove.direction, queuedMove.announce);
      }
    }, PRODUCT_INTRO_CONTENT_TRANSITION_MS);
  }, [cards.length, reducedMotion]);

  moveRef.current = move;

  useEffect(() => {
    if (active) return;
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    transitionInProgressRef.current = false;
    queuedMovesRef.current = [];
    setPendingMoveCount(0);
    setOutgoingIndex(null);
  }, [active]);

  const scriptedCardPaused = !active || userPaused || !documentVisible;

  const completeWorkspaceDemo = useCallback(() => {
    if (activeIndex !== 0 || scriptedCardPaused || reducedMotion) return;
    move(1, false);
  }, [activeIndex, move, reducedMotion, scriptedCardPaused]);

  const completeModesDemo = useCallback(() => {
    if (activeIndex !== 1 || scriptedCardPaused || reducedMotion) return;
    move(1, false);
  }, [activeIndex, move, reducedMotion, scriptedCardPaused]);

  const completeOutcomeDemo = useCallback(() => {
    if (activeIndex !== 2 || scriptedCardPaused || reducedMotion) return;
    move(1, false);
  }, [activeIndex, move, reducedMotion, scriptedCardPaused]);

  const outcomeVideoPilotActive = activeIndex === 2 && language === 'zh-CN' && theme === 'light';

  useEffect(() => {
    if (
      !active ||
      reducedMotion ||
      userPaused ||
      !documentVisible ||
      activeIndex <= 1 ||
      outcomeVideoPilotActive ||
      cards.length <= 1
    ) return undefined;
    const timeoutId = window.setTimeout(() => move(1, false), PRODUCT_INTRO_AUTOPLAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [active, activeIndex, cards.length, documentVisible, move, outcomeVideoPilotActive, reducedMotion, userPaused]);

  const handleCarouselKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!active || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  };

  const renderCardContent = (
    card: FirstRunProductCardCopy,
    cardIndex: number,
    phase: 'incoming' | 'outgoing' | 'inactive',
  ) => {
    const workspaceShowcase = cardIndex === 0;
    const modesShowcase = cardIndex === 1;
    const outcomeShowcase = cardIndex === 2;
    const textShowcase = !workspaceShowcase && !modesShowcase && !outcomeShowcase;
    const modesVideoPilot = modesShowcase && language === 'zh-CN' && theme === 'light';
    const outcomeVideoPilot = outcomeShowcase && language === 'zh-CN' && theme === 'light';
    const bodyKind = workspaceShowcase
      ? 'workspace'
      : modesShowcase
        ? 'modes'
        : outcomeShowcase
          ? 'outcome'
          : 'text';
    const cardPlaybackActive = active && (
      phase === 'outgoing' || (phase === 'incoming' && outgoingIndex === null)
    );
    return (
    <div
      key={`product-card-${cardIndex}`}
      className={`first-run-product-card-content first-run-product-card-content-${phase} first-run-product-card-content-${direction === 1 ? 'next' : 'previous'}`}
      data-product-intro-card-kind={bodyKind}
      aria-hidden={phase !== 'incoming'}
    >
      <header className="first-run-product-card-header">
        <div className="first-run-product-card-heading-copy">
          <span className="first-run-product-card-eyebrow">{card.eyebrow}</span>
          <h2>{card.title}</h2>
        </div>
        <div className="first-run-product-card-index" aria-hidden="true">
          <strong>{String(cardIndex + 1).padStart(2, '0')}</strong>
          <span>/ {String(cards.length).padStart(2, '0')}</span>
        </div>
      </header>
      <div className={`first-run-product-card-body first-run-product-card-body-${bodyKind}`}>
        {workspaceShowcase ? (
          <ProductIntroWorkspaceDemo
            active={cardPlaybackActive}
            paused={scriptedCardPaused}
            reducedMotion={reducedMotion}
            language={language}
            onComplete={completeWorkspaceDemo}
          />
        ) : null}
        {modesShowcase ? (
          modesVideoPilot ? (
            <ProductIntroModesVideo
              active={cardPlaybackActive}
              paused={scriptedCardPaused}
              reducedMotion={reducedMotion}
              language={language}
              onComplete={completeModesDemo}
            />
          ) : (
            <ProductIntroModesDemo
              active={cardPlaybackActive}
              paused={scriptedCardPaused}
              reducedMotion={reducedMotion}
              language={language}
              theme={theme}
              onComplete={completeModesDemo}
            />
          )
        ) : null}
        {outcomeShowcase ? (
          outcomeVideoPilot ? (
            <ProductIntroOutcomeVideo
              active={cardPlaybackActive}
              paused={scriptedCardPaused}
              reducedMotion={reducedMotion}
              language={language}
              onComplete={completeOutcomeDemo}
            />
          ) : (
            <div className="first-run-product-card-details">
              <p>{card.body}</p>
              <small>{card.meta}</small>
            </div>
          )
        ) : null}
        {textShowcase ? (
          <div className="first-run-product-card-details">
            <p>{card.body}</p>
            <small>{card.meta}</small>
          </div>
        ) : null}
      </div>
    </div>
    );
  };

  const activeCard = cards[activeIndex];
  const outgoingCard = outgoingIndex === null ? null : cards[outgoingIndex];
  const keepModesVideoWarm = language === 'zh-CN' && theme === 'light';
  const showWarmModesVideo = keepModesVideoWarm && activeIndex !== 1 && outgoingIndex !== 1;
  const keepOutcomeVideoWarm = language === 'zh-CN' && theme === 'light';
  const showWarmOutcomeVideo = keepOutcomeVideoWarm && activeIndex !== 2 && outgoingIndex !== 2;
  const userPauseLabel = userPaused ? copy.product.resumeAutoplay : copy.product.pauseAutoplay;

  return (
    <section
      className="first-run-page first-run-product-page"
      data-first-run-page="product"
      data-product-intro-active-card={activeIndex}
      data-product-intro-transitioning={outgoingIndex !== null ? 'true' : 'false'}
      data-product-intro-transition-progress={outgoingIndex !== null ? '0.000' : '1.000'}
      data-product-intro-pending-move-count={pendingMoveCount}
      aria-label={copy.product.title}
      aria-hidden={!active}
    >
      <div
        className="first-run-carousel-region"
        onKeyDown={handleCarouselKeyDown}
      >
        <div className="first-run-carousel">
          <button
            type="button"
            className="first-run-carousel-arrow first-run-carousel-arrow-left"
            aria-label={copy.product.previousCard}
            tabIndex={active ? 0 : -1}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={22} strokeWidth={1.8} />
          </button>
          <article className="first-run-product-card" aria-live={announceChanges ? 'polite' : 'off'}>
            {outgoingCard ? renderCardContent(outgoingCard, outgoingIndex!, 'outgoing') : null}
            {renderCardContent(activeCard, activeIndex, 'incoming')}
            {showWarmModesVideo ? renderCardContent(cards[1], 1, 'inactive') : null}
            {showWarmOutcomeVideo ? renderCardContent(cards[2], 2, 'inactive') : null}
          </article>
          <button
            type="button"
            className="first-run-carousel-arrow first-run-carousel-arrow-right"
            aria-label={copy.product.nextCard}
            tabIndex={active ? 0 : -1}
            onClick={() => move(1)}
          >
            <ChevronRight size={22} strokeWidth={1.8} />
          </button>
        </div>
        <div className="first-run-carousel-status" aria-label={copy.product.cardStatus(activeIndex + 1, cards.length)}>
          <span className="first-run-carousel-count" aria-hidden="true">
            {String(activeIndex + 1).padStart(2, '0')}
            <i />
            {String(cards.length).padStart(2, '0')}
          </span>
          {!reducedMotion ? (
            <button
              type="button"
              className="first-run-carousel-autoplay"
              aria-label={userPauseLabel}
              aria-pressed={userPaused}
              data-prompt-tooltip={userPauseLabel}
              tabIndex={active ? 0 : -1}
              onClick={() => setUserPaused((current) => !current)}
            >
              {userPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
            </button>
          ) : null}
        </div>
      </div>
      <footer className={`first-run-page-actions ${showPrevious ? '' : 'first-run-page-actions-end'}`}>
        {showPrevious ? (
          <button
            type="button"
            className="first-run-action first-run-action-secondary"
            tabIndex={active ? 0 : -1}
            onClick={onPrevious}
          >
            {copy.common.previous}
          </button>
        ) : null}
        <button
          type="button"
          className="first-run-action first-run-action-primary"
          tabIndex={active ? 0 : -1}
          onClick={onNext}
        >
          {nextLabel ?? copy.common.next}
        </button>
      </footer>
    </section>
  );
};
