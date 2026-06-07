import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, BookmarkPlus, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";
import { useCookieConsent } from "@/hooks/useCookieConsent";

const ONBOARDING_ID = "cinetrekker_onboarding_completed";

interface OnboardingStep {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function OnboardingTooltip() {
  const { t } = useTranslation();
  const { choice: cookieChoice } = useCookieConsent();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Only start the timer AFTER the user has dismissed the cookie banner.
    // This prevents both overlays from appearing simultaneously.
    if (!cookieChoice) return;

    // Check if onboarding was already completed
    const completed = localStorage.getItem(ONBOARDING_ID);
    if (!completed) {
      // Show after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [cookieChoice]);

  const steps: OnboardingStep[] = [
    {
      id: 1,
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      title: t("onboarding.step1Title", "Welcome to CineTrekker!"),
      description: t(
        "onboarding.step1Desc",
        "Your personal hub for tracking movies and TV shows. Let's get you started.",
      ),
    },
    {
      id: 2,
      icon: <BookmarkPlus className="w-5 h-5 text-primary" />,
      title: t("onboarding.step2Title", "Build Your Watchlist"),
      description: t(
        "onboarding.step2Desc",
        "Click the bookmark icon on any title to save it to your watchlist for later.",
      ),
    },
    {
      id: 3,
      icon: <Play className="w-5 h-5 text-primary" />,
      title: t("onboarding.step3Title", "Start Discovering"),
      description: t(
        "onboarding.step3Desc",
        "Browse trending titles, search by mood or genre, and jump straight into your next watch.",
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setIsAnimating(false);
      }, 150);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_ID, "true");
    setIsVisible(false);
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_ID, "true");
    setIsVisible(false);
  };

  // Hide if onboarding is complete, cookie consent is not yet chosen, or visibility is false
  if (!isVisible || !cookieChoice) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed bottom-4 right-4 z-[75] max-w-sm w-[calc(100vw-2rem)] animate-slide-up">
      <div className="relative bg-card/95 border border-border/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl overflow-hidden p-5">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Content */}
        <div
          className={cn(
            "text-center transition-opacity duration-150",
            isAnimating && "opacity-0",
          )}
        >
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary/10 mb-3">
            {step.icon}
          </div>

          {/* Step indicator */}
          <PaginationDots className="mb-2 mt-0">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === currentStep ? "w-6 bg-primary" : "w-1.5 bg-muted",
                )}
              />
            ))}
          </div>

          {/* Text */}
          <h2 className="text-base font-bold mb-1.5 text-foreground">{step.title}</h2>
          <p className="text-muted-foreground text-xs leading-relaxed mb-5">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground text-xs h-8 px-3"
            >
              {t("onboarding.skip", "Skip")}
            </Button>

            <Button onClick={handleNext} size="sm" className="gap-1 btn-primary-glow text-xs h-8 px-4">
              {currentStep === steps.length - 1 ? (
                t("onboarding.start", "Get Started")
              ) : (
                <>
                  {t("onboarding.next", "Next")}
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
