import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, BookmarkPlus, Play, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from "../lib/utils";

const ONBOARDING_ID = 'cinetrekker_onboarding_completed';

interface OnboardingStep {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function OnboardingTooltip() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if onboarding was already completed
    const completed = localStorage.getItem(ONBOARDING_ID);
    if (!completed) {
      // Show after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps: OnboardingStep[] = [
    {
      id: 1,
      icon: <Sparkles className="w-6 h-6 text-primary" />,
      title: t('onboarding.step1Title', 'Welcome to CineTrekker!'),
      description: t('onboarding.step1Desc', 'Your personal hub for tracking movies and TV shows. Let\'s get you started.'),
    },
    {
      id: 2,
      icon: <BookmarkPlus className="w-6 h-6 text-primary" />,
      title: t('onboarding.step2Title', 'Build Your Watchlist'),
      description: t('onboarding.step2Desc', 'Click the bookmark icon on any title to save it to your watchlist for later.'),
    },
    {
      id: 3,
      icon: <Play className="w-6 h-6 text-primary" />,
      title: t('onboarding.step3Title', 'Start Your Trek'),
      description: t('onboarding.step3Desc', 'Use "Random Trek" to discover highly-rated titles, or browse trending content.'),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 150);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_ID, 'true');
    setIsVisible(false);
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_ID, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className={cn(
          "p-8 text-center transition-opacity duration-150",
          isAnimating && "opacity-0"
        )}>
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            {step.icon}
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === currentStep ? "w-6 bg-primary" : "w-1.5 bg-muted"
                )}
              />
            ))}
          </div>

          {/* Text */}
          <h2 className="text-xl font-bold mb-3">{step.title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              {t('onboarding.skip', 'Skip')}
            </Button>

            <Button
              onClick={handleNext}
              className="gap-2 btn-primary-glow"
            >
              {currentStep === steps.length - 1 ? (
                t('onboarding.start', 'Get Started')
              ) : (
                <>
                  {t('onboarding.next', 'Next')}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
