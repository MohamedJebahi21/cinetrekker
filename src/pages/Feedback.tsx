import { FormEvent, useEffect, useRef, useState } from 'react';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
const CAPTCHA_PROVIDER = TURNSTILE_SITE_KEY ? 'turnstile' : RECAPTCHA_SITE_KEY ? 'recaptcha' : null;
const CAPTCHA_SITE_KEY = TURNSTILE_SITE_KEY || RECAPTCHA_SITE_KEY || '';

export default function Feedback() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  useEffect(() => {
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
    script.src =
      CAPTCHA_PROVIDER === 'turnstile'
        ? 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        : 'https://www.google.com/recaptcha/api.js?render=explicit';
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
      setError('Please fill in all fields before sending feedback.');
      return;
    }

    if (!captchaToken) {
      setError('Please complete the bot protection check before sending feedback.');
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
          captchaToken,
          website: honeypot,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = [data?.error, data?.detail].filter(Boolean).join(' ');
        setError(details || 'Failed to send feedback. Please try again.');
        return;
      }

      setSuccess('Thanks for your feedback. It was sent successfully.');
      setName('');
      setEmail('');
      setMessage('');
      setHoneypot('');
      setCaptchaToken('');
      if (CAPTCHA_PROVIDER === 'turnstile' && turnstileWidgetIdRef.current && window.turnstile?.reset) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
      if (CAPTCHA_PROVIDER === 'recaptcha' && turnstileWidgetIdRef.current && window.grecaptcha?.reset) {
        window.grecaptcha.reset(turnstileWidgetIdRef.current);
      }
    } catch {
      setError('Failed to send feedback. Please try again.');
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

          <div className="hidden" aria-hidden="true">
            <Label htmlFor="feedback-website">Website</Label>
            <Input
              id="feedback-website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Bot Protection</Label>
            {CAPTCHA_SITE_KEY && (
              <div ref={turnstileContainerRef} />
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}

          <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Feedback'}
          </Button>
        </form>
      </div>
    </div>
  );
}
