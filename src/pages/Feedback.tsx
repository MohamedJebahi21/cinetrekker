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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields before sending feedback.');
      return;
    }

    const subject = encodeURIComponent(`CineTrekker Feedback from ${name.trim()}`);
    const body = encodeURIComponent(
      `Name: ${name.trim()}\nEmail: ${email.trim()}\n\nFeedback:\n${message.trim()}`
    );

    window.location.href = `mailto:support@cinetrekker.app?subject=${subject}&body=${body}`;
  };

  return (
    <div className="page-container pt-20 pb-24 md:pb-0">
      <SEO title="Feedback - CineTrekker" description="Send feedback to CineTrekker" />
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="section-title">Feedback</h1>
        <p className="text-muted-foreground mt-4">
          We&apos;d love to hear your feedback. Fill out the form below and we&apos;ll open your email client to send it.
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

          <Button type="submit" className="w-full sm:w-auto">
            Send Feedback
          </Button>
        </form>
      </div>
    </div>
  );
}
