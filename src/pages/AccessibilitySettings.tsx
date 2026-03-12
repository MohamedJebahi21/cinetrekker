import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Accessibility,
  Type,
  Eye,
  RotateCcw,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SEO from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  applyAccessibilityPreferencesToRoot,
  readAccessibilityPreferences,
  saveFontSizePreference,
  saveReduceMotionPreference,
} from "@/lib/accessibility-preferences";
import { useTheme } from "@/contexts/theme-context";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

export default function AccessibilitySettings() {
  const MIN_FONT_SIZE = 80;
  const MAX_FONT_SIZE = 150;
  const FONT_SIZE_STEP = 10;
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const resetButtonRef = useRef<HTMLButtonElement | null>(null);
  const [fontSize, setFontSize] = useState<number>(
    () => readAccessibilityPreferences().fontSize,
  );
  const [reduceMotion, setReduceMotion] = useState<boolean>(
    () => readAccessibilityPreferences().reduceMotion,
  );

  // Apply font size
  useEffect(() => {
    const clamped = saveFontSizePreference(fontSize);
    if (clamped !== fontSize) {
      setFontSize(clamped);
      return;
    }
    applyAccessibilityPreferencesToRoot();
  }, [fontSize]);

  // Apply reduce motion
  useEffect(() => {
    saveReduceMotionPreference(reduceMotion);
    applyAccessibilityPreferencesToRoot();
  }, [reduceMotion]);

  const resetToDefaults = () => {
    setFontSize(100);
    setReduceMotion(false);
    setTheme("dark");
    toast({
      title: "Settings Reset",
      description: "Theme and accessibility settings have been reset to defaults.",
    });
  };

  const decreaseFontSize = () => {
    setFontSize((current) => Math.max(MIN_FONT_SIZE, current - FONT_SIZE_STEP));
  };

  const increaseFontSize = () => {
    setFontSize((current) => Math.min(MAX_FONT_SIZE, current + FONT_SIZE_STEP));
  };

  return (
    <>
      <SEO
        title="Accessibility Settings - CineTrekker"
        description="Customize your viewing experience with font size, theme, and motion settings"
        canonical="https://cinetrekker.vercel.app/accessibility"
      />

      <motion.div
        className="page-container max-w-4xl bg-[var(--bg-page)] pt-20 pb-24 md:pb-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Header */}
        <motion.section variants={itemVariants} className="mb-8">
          <Card className="relative overflow-hidden border-[color:hsl(var(--border))] bg-[var(--bg-card)] backdrop-blur-md shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-transparent to-red-500/5 pointer-events-none" />
            <CardContent className="pt-8 pb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-red-700/20 flex items-center justify-center backdrop-blur-sm">
                  <Accessibility className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Accessibility Settings</h1>
                  <p className="text-[var(--text-secondary)]">
                    Customize the app for better readability and usability.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Font Size */}
        <motion.div variants={itemVariants} className="mb-6">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <Type className="h-3.5 w-3.5 text-red-400" />
            Text Size
          </p>
          <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)] backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-white/5">
                  <Type className="h-5 w-5 text-red-400" />
                </div>
                <span>Font Size</span>
              </CardTitle>
              <CardDescription>Adjust text size throughout the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 border-[color:hsl(var(--border))] bg-[var(--bg-row)] text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                    onClick={decreaseFontSize}
                    aria-label="Decrease font size"
                    disabled={fontSize <= MIN_FONT_SIZE}
                  >
                    -
                  </Button>
                  <Slider
                    value={[fontSize]}
                    onValueChange={(value) => setFontSize(value[0])}
                    min={MIN_FONT_SIZE}
                    max={MAX_FONT_SIZE}
                    step={FONT_SIZE_STEP}
                    className="flex-1"
                    aria-label="Font size"
                    aria-valuemin={MIN_FONT_SIZE}
                    aria-valuemax={MAX_FONT_SIZE}
                    aria-valuenow={fontSize}
                    aria-valuetext={`${fontSize}%`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 border-[color:hsl(var(--border))] bg-[var(--bg-row)] text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                    onClick={increaseFontSize}
                    aria-label="Increase font size"
                    disabled={fontSize >= MAX_FONT_SIZE}
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center" aria-live="polite" aria-atomic="true">
                <span className="text-3xl font-bold text-[var(--text-primary)]">{fontSize}%</span>
              </div>

            </CardContent>
          </Card>
        </motion.div>

        {/* Theme & Motion */}
        <motion.div variants={itemVariants} className="mb-6">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <Accessibility className="h-3.5 w-3.5 text-red-400" />
            Display Preferences
          </p>
          <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)] backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-white/5">
                  <Accessibility className="h-5 w-5 text-red-400" />
                </div>
                <span>Theme & Motion</span>
              </CardTitle>
              <CardDescription>Choose a visual theme and motion behavior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Theme Switcher */}
              <div
                className={cn(
                  "flex items-center justify-between gap-4 rounded-xl border px-4 py-4 transition-all duration-300",
                  "border-[color:hsl(var(--border))] bg-[var(--bg-row)]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p id="theme-switcher-label" className="text-sm font-semibold text-[var(--text-primary)]">
                    App Theme
                  </p>
                  <p id="theme-switcher-description" className="mt-1 text-sm text-[var(--text-secondary)]">
                    Pick Dark, Light, or OLED mode for the full app.
                  </p>
                </div>
                <div
                  role="group"
                  aria-labelledby="theme-switcher-label"
                  aria-describedby="theme-switcher-description"
                  className="inline-flex rounded-xl border border-[color:hsl(var(--border))] bg-[var(--bg-card)] p-1"
                >
                  {(["dark", "light", "oled"] as const).map((option) => {
                    const active = theme === option;
                    const label = option === "oled" ? "OLED" : option[0].toUpperCase() + option.slice(1);
                    return (
                      <button
                        key={option}
                        type="button"
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                          active
                            ? "bg-red-600 text-white"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                        )}
                        onClick={() => setTheme(option)}
                        aria-pressed={active}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reduce Motion Row */}
              <div
                className={cn(
                  "flex items-center justify-between gap-4 rounded-xl border px-4 py-4 transition-all duration-300",
                  "border-[color:hsl(var(--border))] bg-[var(--bg-row)]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <Label
                    htmlFor="reduceMotion"
                    id="reduceMotion-label"
                    className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] cursor-pointer"
                  >
                    <Eye className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                    Reduce Motion
                  </Label>
                  <p id="reduceMotion-description" className="mt-1 text-sm text-[var(--text-secondary)]">
                    Minimize animations and transitions.
                  </p>
                </div>
                <Switch
                  id="reduceMotion"
                  checked={reduceMotion}
                  onCheckedChange={setReduceMotion}
                  aria-labelledby="reduceMotion-label"
                  aria-describedby="reduceMotion-description"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Built-in Features Info */}
        <motion.div variants={itemVariants} className="mb-6">
          <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
            <Accessibility className="h-3.5 w-3.5 text-red-400" />
            Built-in Features
          </p>
          <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)] backdrop-blur-sm">
            <CardContent className="px-5 py-4 space-y-2">
              {[
                "Keyboard navigation support throughout the app",
                "Screen reader compatible with ARIA labels",
                "Focus indicators for better navigation",
                "Skip to content links",
                "Alt text for all images",
              ].map((feature) => (
                <p key={feature} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Check className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                  {feature}
                </p>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Reset Button */}
        <motion.div variants={itemVariants}>
          <Button
            ref={resetButtonRef}
            onClick={() => setConfirmResetOpen(true)}
            variant="outline"
            className="w-full gap-2 border border-red-500/80 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300"
            aria-label="Reset all settings to defaults"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default Settings
          </Button>
        </motion.div>
        <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
          <AlertDialogContent
            role="alertdialog"
            aria-modal="true"
            className="border-[color:hsl(var(--border))] bg-[var(--bg-card)] text-[var(--text-primary)]"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              resetButtonRef.current?.focus();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Reset accessibility settings?</AlertDialogTitle>
              <AlertDialogDescription>
                This will restore theme, font size, and motion preferences to their default values.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={resetToDefaults}
              >
                Confirm Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </>
  );
}

