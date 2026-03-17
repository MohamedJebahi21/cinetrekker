import React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickySaveBarProps {
  isVisible: boolean;
  isSaving?: boolean;
  hasError?: boolean;
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
  errorMessage?: string;
  cancelLabel?: string;
  saveLabel?: string;
  successMessage?: string;
  children?: React.ReactNode;
  className?: string;
}

export function StickySaveBar({
  isVisible,
  isSaving = false,
  hasError = false,
  onSave,
  onCancel,
  errorMessage,
  cancelLabel = 'Cancel',
  saveLabel = 'Save Changes',
  successMessage,
  children,
  className,
}: StickySaveBarProps) {
  const footerVariants: Variants = {
    hidden: {
      y: 100,
      opacity: 0,
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 30,
        stiffness: 300,
        duration: 0.3,
      },
    },
    exit: {
      y: 100,
      opacity: 0,
      transition: {
        duration: 0.2,
      },
    },
  };

  const buttonContainerVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const buttonVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', damping: 20 },
    },
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          variants={footerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'bg-background/80 backdrop-blur-xl border-t border-border/50',
            'shadow-lg shadow-black/20',
            'safe-area-inset-bottom',
            className
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <motion.div
              className="flex items-center justify-between gap-4"
              variants={buttonContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Status indicator and message */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {hasError ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-500 font-medium truncate">
                      {errorMessage || 'An error occurred'}
                    </span>
                  </>
                ) : successMessage ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-green-500 font-medium truncate">
                      {successMessage}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 animate-pulse" />
                    <span className="text-sm text-muted-foreground font-medium">
                      {children || 'Unsaved changes'}
                    </span>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <motion.div
                className="flex gap-2 flex-shrink-0"
                variants={buttonContainerVariants}
              >
                <motion.div variants={buttonVariants}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="h-9"
                  >
                    {cancelLabel}
                  </Button>
                </motion.div>

                <motion.div variants={buttonVariants}>
                  <Button
                    size="sm"
                    onClick={onSave}
                    disabled={isSaving || hasError}
                    className="h-9 gap-2"
                  >
                    {isSaving && (
                      <svg
                        className="w-4 h-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    )}
                    <span>{saveLabel}</span>
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
