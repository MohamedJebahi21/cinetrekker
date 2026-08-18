import { FormEvent, useEffect, useRef, useState } from 'react';
import { toTrustedScriptURL } from '@/lib/trustedTypes';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark";
        },
      ) => string;
      reset?: (widgetId: string) => void;
    };
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        },
      ) => string;
      remove?: (widgetId: string) => void;
      reset?: (widgetId: string) => void;
    };
  }
}

type CaptchaProvider = 'turnstile' | 'recaptcha';

type FeedbackAvailabilityResponse = {
  available?: boolean;
  captchaProvider?: CaptchaProvider | null;
  captchaSiteKey?: string | null;
};

export default function Feedback() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackAvailability, setFeedbackAvailability] = useState<
    'checking' | 'available' | 'unavailable'
  >('checking');
  const [captchaConfig, setCaptchaConfig] = useState<{
    provider: CaptchaProvider;
    siteKey: string;
  } | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const feedbackServiceAvailable = feedbackAvailability === 'available';
  const captchaProvider = captchaConfig?.provider ?? null;
  const captchaSiteKey = captchaConfig?.siteKey ?? '';
  const captchaConfigured = Boolean(captchaProvider && captchaSiteKey);

  useEffect(() => {
    const controller = new AbortController();

    void fetch('/api/feedback', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return { available: false } satisfies FeedbackAvailabilityResponse;
        return response.json() as Promise<FeedbackAvailabilityResponse>;
      })
      .then((status) => {
        const provider =
          status.captchaProvider === 'turnstile' || status.captchaProvider === 'recaptcha'
            ? status.captchaProvider
            : null;
        const siteKey = typeof status.captchaSiteKey === 'string' ? status.captchaSiteKey.trim() : '';
        const available = Boolean(status.available && provider && siteKey);

        setCaptchaConfig(available && provider ? { provider, siteKey } : null);
        setFeedbackAvailability(available ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCaptchaConfig(null);
          setFeedbackAvailability('unavailable');
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!feedbackServiceAvailable || !captchaSiteKey || !turnstileContainerRef.current) return;

    const existingScript = document.querySelector<HTMLScriptElement>(
      captchaProvider === 'turnstile'
        ? 'script[data-turnstile-script="true"]'
        : 'script[data-recaptcha-script="true"]',
    );

    const renderWidget = () => {
      if (!turnstileContainerRef.current || turnstileWidgetIdRef.current) {
        return;
      }

      if (captchaProvider === 'turnstile' && window.turnstile) {
        turnstileWidgetIdRef.current = window.turnstile.render(
          turnstileContainerRef.current,
          {
            sitekey: captchaSiteKey,
            theme: 'auto',
            callback: (token) => setCaptchaToken(token),
            'expired-callback': () => setCaptchaToken(''),
            'error-callback': () => setCaptchaToken(''),
          },
        );
      }

      if (captchaProvider === 'recaptcha' && window.grecaptcha) {
        turnstileWidgetIdRef.current = window.grecaptcha.render(
          turnstileContainerRef.current,
          {
            sitekey: captchaSiteKey,
            theme: 'dark',
            callback: (token) => setCaptchaToken(token),
            'expired-callback': () => setCaptchaToken(''),
            'error-callback': () => setCaptchaToken(''),
          },
        );
      }
    };

    if (existingScript) {
      renderWidget();
      return;
    }

    const script = document.createElement('script');
    const captchaUrl =
      captchaProvider === 'turnstile'
        ? 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        : 'https://www.google.com/recaptcha/api.js?render=explicit';
    // script.src is a TrustedScriptURL sink; use the cinetrekker policy.
    script.src = toTrustedScriptURL(captchaUrl) as string;
    script.async = true;
    script.defer = true;
    if (captchaProvider === 'turnstile') {
      script.dataset.turnstileScript = 'true';
    } else {
      script.dataset.recaptchaScript = 'true';
    }
    script.onload = () => renderWidget();
    document.head.appendChild(script);

    return () => {
      if (
        captchaProvider === 'turnstile' &&
        turnstileWidgetIdRef.current &&
        window.turnstile?.remove
      ) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [feedbackServiceAvailable, captchaConfigured, captchaProvider, captchaSiteKey]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!feedbackServiceAvailable) {
      setError(
        t(
          'feedback.unavailableError',
          'Feedback submissions are temporarily unavailable. Please email cinetrekker.contact@gmail.com instead.',
        ),
      );
      return;
    }

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError(t('feedback.formErrorRequired', 'Please fill in all fields before sending feedback.'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          captchaToken: captchaToken || undefined,
          website: honeypot,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = [data?.error, data?.detail].filter(Boolean).join(' ');
        setError(details || t('feedback.formErrorSend', 'Failed to send feedback. Please try again.'));
        return;
      }

      setSuccess(t('feedback.formSuccess', 'Thanks for your feedback. It was sent successfully.'));
      setName('');
      setEmail('');
      setMessage('');
      setHoneypot('');
      setCaptchaToken('');
      if (captchaProvider === 'turnstile' && turnstileWidgetIdRef.current && window.turnstile?.reset) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
      if (captchaProvider === 'recaptcha' && turnstileWidgetIdRef.current && window.grecaptcha?.reset) {
        window.grecaptcha.reset(turnstileWidgetIdRef.current);
      }
    } catch {
      setError(t('feedback.formErrorSend', 'Failed to send feedback. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container pt-20 pb-24 md:pb-0">
      <SEO
        title={t('feedback.seoTitle', 'Feedback - CineTrekker')}
        description={t('feedback.seoDescription', 'Send feedback to CineTrekker')}
      />
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="section-title">{t('feedback.title', 'Feedback')}</h1>
        <p className="mt-4 text-base text-muted-foreground">
          {t(
            'feedback.subtitle',
            "We'd love to hear your feedback. Fill out the form below and send it directly from the website.",
          )}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-xl border border-border/40 bg-card/50 p-6">
          {feedbackAvailability !== 'available' && (
            <div
              className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
              role="status"
              aria-live="polite"
            >
              {feedbackAvailability === 'checking'
                ? t('feedback.checkingAvailability', 'Checking feedback service availability…')
                : t(
                    'feedback.serviceUnavailable',
                    'The feedback form is temporarily unavailable. Please email us directly instead.',
                  )}{' '}
              <a
                href="mailto:cinetrekker.contact@gmail.com"
                className="font-semibold text-amber-50 underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                cinetrekker.contact@gmail.com
              </a>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="feedback-name">{t('feedback.nameLabel', 'Name')}</Label>
            <Input
              id="feedback-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('feedback.namePlaceholder', 'Your name')}
              autoComplete="name"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'feedback-form-error' : undefined}
              disabled={!feedbackServiceAvailable || isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-email">{t('feedback.emailLabel', 'Email')}</Label>
            <Input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('feedback.emailPlaceholder', 'you@example.com')}
              autoComplete="email"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'feedback-form-error' : undefined}
              disabled={!feedbackServiceAvailable || isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">{t('feedback.messageLabel', 'Message')}</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('feedback.messagePlaceholder', 'Share your ideas, bug reports, or feature requests...')}
              className="min-h-[140px]"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'feedback-form-error' : undefined}
              disabled={!feedbackServiceAvailable || isSubmitting}
              required
            />
          </div>

          <div className="hidden" aria-hidden="true">
            <Label htmlFor="feedback-website">{t('feedback.websiteLabel', 'Website')}</Label>
            <Input
              id="feedback-website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-bot-protection">{t('feedback.botProtectionLabel', 'Bot Protection')}</Label>
            {captchaSiteKey && (
              <div id="feedback-bot-protection" ref={turnstileContainerRef} />
            )}
            {feedbackServiceAvailable && !captchaConfigured && (
              <p className="text-sm text-muted-foreground">
                {t(
                  'feedback.botProtectionUnavailable',
                  'Bot protection is currently unavailable. Feedback submissions are disabled.',
                )}
              </p>
            )}
          </div>

          {error && (
            <p id="feedback-form-error" className="text-base text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-base text-emerald-400" role="status" aria-live="polite">
              {success}
            </p>
          )}

          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={!feedbackServiceAvailable || isSubmitting}
          >
            {isSubmitting
              ? t('feedback.sending', 'Sending...')
              : feedbackAvailability === 'checking'
                ? t('feedback.checking', 'Checking availability...')
                : feedbackServiceAvailable
                  ? t('feedback.sendButton', 'Send Feedback')
                  : t('feedback.unavailableButton', 'Feedback temporarily unavailable')}
          </Button>
        </form>
      </div>
    </div>
  );
}
