import { FormEvent, useState } from 'react';
import SEO from '@/components/SEO';
import { toTrustedScriptURL } from '@/lib/trustedTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { ApiRequestError, requestJson } from '@/services/api';

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

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
const CAPTCHA_PROVIDER = TURNSTILE_SITE_KEY ? 'turnstile' : RECAPTCHA_SITE_KEY ? 'recaptcha' : 'math';
const CAPTCHA_SITE_KEY = TURNSTILE_SITE_KEY || RECAPTCHA_SITE_KEY || '';
const CAPTCHA_CONFIGURED = true;

export default function Feedback() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [mathChallenge, setMathChallenge] = useState('');
  const [mathAnswer, setMathAnswer] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const fetchMathChallenge = async () => {
    try {
      const data = await requestJson<{ challenge: string; token: string }>('/api/captcha-challenge');
      setMathChallenge(data.challenge);
      setCaptchaToken(data.token);
      setMathAnswer('');
    } catch (err) {
      setError(t('feedback.formErrorCaptchaFetch', 'Failed to load bot protection challenge.'));
    }
  };

  useEffect(() => {
    if (CAPTCHA_PROVIDER === 'math') {
      void fetchMathChallenge();
      return;
    }

    if (!CAPTCHA_SITE_KEY || !turnstileContainerRef.current) return;

    const existingScript = document.querySelector<HTMLScriptElement>(
      CAPTCHA_PROVIDER === 'turnstile'
        ? 'script[data-turnstile-script="true"]'
        : 'script[data-recaptcha-script="true"]',
    );

    const renderWidget = () => {
      if (!turnstileContainerRef.current || turnstileWidgetIdRef.current) {
        return;
      }

      if (CAPTCHA_PROVIDER === 'turnstile' && window.turnstile) {
        turnstileWidgetIdRef.current = window.turnstile.render(
          turnstileContainerRef.current,
          {
            sitekey: CAPTCHA_SITE_KEY,
            theme: 'auto',
            callback: (token) => setCaptchaToken(token),
            'expired-callback': () => setCaptchaToken(''),
            'error-callback': () => setCaptchaToken(''),
          },
        );
      }

      if (CAPTCHA_PROVIDER === 'recaptcha' && window.grecaptcha) {
        turnstileWidgetIdRef.current = window.grecaptcha.render(
          turnstileContainerRef.current,
          {
            sitekey: CAPTCHA_SITE_KEY,
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
    script.src = toTrustedScriptURL(
      CAPTCHA_PROVIDER === 'turnstile'
        ? 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        : 'https://www.google.com/recaptcha/api.js?render=explicit',
    ) as string;
    script.async = true;
    script.defer = true;
    if (CAPTCHA_PROVIDER === 'turnstile') {
      script.dataset.turnstileScript = 'true';
    } else {
      script.dataset.recaptchaScript = 'true';
    }
    script.onload = () => renderWidget();
    document.head.appendChild(script);

    return () => {
      if (
        CAPTCHA_PROVIDER === 'turnstile' &&
        turnstileWidgetIdRef.current &&
        window.turnstile?.remove
      ) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError(t('feedback.formErrorRequired', 'Please fill in all fields before sending feedback.'));
      return;
    }

    if (CAPTCHA_PROVIDER === 'math' && !mathAnswer.trim()) {
      setError(t('feedback.formErrorCaptcha', 'Please complete the bot protection check before sending feedback.'));
      return;
    }

    if (!captchaToken) {
      setError(t('feedback.formErrorCaptcha', 'Please complete the bot protection check before sending feedback.'));
      return;
    }

    setIsSubmitting(true);

    try {
      await requestJson<{ ok?: boolean }>('/api/feedback', {
        method: 'POST',
        timeoutMs: 12000,
        body: {
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          captchaToken,
          captchaAnswer: mathAnswer.trim(),
          website: honeypot,
        },
      });

      setSuccess(t('feedback.formSuccess', 'Thanks for your feedback. It was sent successfully.'));
      setName('');
      setEmail('');
      setMessage('');
      setHoneypot('');
      setCaptchaToken('');
      setMathAnswer('');
      if (CAPTCHA_PROVIDER === 'turnstile' && turnstileWidgetIdRef.current && window.turnstile?.reset) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
      if (CAPTCHA_PROVIDER === 'recaptcha' && turnstileWidgetIdRef.current && window.grecaptcha?.reset) {
        window.grecaptcha.reset(turnstileWidgetIdRef.current);
      }
      if (CAPTCHA_PROVIDER === 'math') {
        void fetchMathChallenge();
      }
    } catch (error) {
      if (CAPTCHA_PROVIDER === 'math') {
        void fetchMathChallenge();
      }
      if (error instanceof ApiRequestError) {
        const details =
          typeof error.details === 'object' && error.details
            ? [
                (error.details as { error?: string }).error,
                (error.details as { detail?: string }).detail,
              ]
                .filter(Boolean)
                .join(' ')
            : '';

        setError(details || t('feedback.formErrorSend', 'Failed to send feedback. Please try again.'));
        return;
      }

      setError(t('feedback.formErrorSend', 'Failed to send feedback. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container pt-20 pb-24 md:pb-0">
      <SEO title="Feedback - CineTrekker" description="Send feedback to CineTrekker" />
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="section-title">Feedback</h1>
        <p className="text-muted-foreground mt-4">
          We&apos;d love to hear your feedback. Fill out the form below and send it directly from the website.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-xl border border-border/40 bg-card/50 p-6">
          <div className="space-y-2">
            <Label htmlFor="feedback-name">Name</Label>
            <Input
              id="feedback-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-email">Email</Label>
            <Input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your ideas, bug reports, or feature requests..."
              className="min-h-[140px]"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}

          <div className="space-y-2">
            <Label htmlFor="feedback-bot-protection">{t('feedback.botProtectionLabel', 'Bot Protection')}</Label>
            {CAPTCHA_PROVIDER === 'turnstile' && CAPTCHA_SITE_KEY && (
              <div id="feedback-bot-protection" ref={turnstileContainerRef} className="min-h-[65px]" />
            )}
            {CAPTCHA_PROVIDER === 'recaptcha' && CAPTCHA_SITE_KEY && (
              <div id="feedback-bot-protection" ref={turnstileContainerRef} className="min-h-[78px]" />
            )}
            {CAPTCHA_PROVIDER === 'math' && (
              <div className="space-y-2 rounded-lg border border-border/40 bg-background/50 p-4">
                <p className="text-sm font-medium text-foreground select-none">
                  {mathChallenge || t('feedback.loadingChallenge', 'Loading challenge...')}
                </p>
                <div className="flex gap-2">
                  <Input
                    id="feedback-bot-protection"
                    type="text"
                    value={mathAnswer}
                    onChange={(e) => setMathAnswer(e.target.value)}
                    placeholder={t('feedback.captchaPlaceholder', 'Answer')}
                    className="max-w-[150px] h-10 text-center font-semibold tracking-wider text-base"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchMathChallenge()}
                    className="h-10 px-3 text-xs"
                  >
                    {t('feedback.refresh', 'Refresh')}
                  </Button>
                </div>
              </div>
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
            disabled={isSubmitting || (CAPTCHA_PROVIDER === 'math' && !mathAnswer)}
          >
            {isSubmitting
              ? t('feedback.sending', 'Sending...')
              : t('feedback.sendButton', 'Send Feedback')}
          </Button>
        </form>
      </div>
    </div>
  );
}
