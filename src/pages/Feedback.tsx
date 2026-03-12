import { FormEvent, useState } from 'react';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function Feedback() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields before sending feedback.');
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
