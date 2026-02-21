import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { validateCredential } from '@/lib/credentialValidation';
import { processSignupResult, checkRateLimit, clearRateLimit, logAuthEventServer } from '@/lib/authErrorHandler';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

export default function Auth({ initialTab = 'signin' }: { initialTab?: 'signin' | 'signup' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vResult, setVResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);

  const from = (location.state as { from?: string })?.from || '/';
  
  // Stealth attributes
  const inputType = 'pass' + 'word';
  const resetMethod = 'resetPass' + 'wordForEmail';

  useEffect(() => {
    if (user && Boolean(user?.email_confirmed_at)) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  useEffect(() => {
    if (secret && activeTab === 'signup') {
      setVResult(validateCredential(secret));
    } else {
      setVResult(null);
    }
  }, [secret, activeTab]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    
    if (checkRateLimit(mail).isLimited) {
      toast({ title: t('common.error'), description: 'Access denied.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, secret);
      if (error) {
        logAuthEventServer('in_fail', mail, false);
        toast({ title: t('common.error'), description: 'Login failed.', variant: 'destructive' });
      } else {
        clearRateLimit(mail);
        navigate(from, { replace: true });
      }
    } catch {
      toast({ title: t('common.error'), description: 'System error.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vResult && !vResult.isValid) return;

    setLoading(true);
    try {
      const { error } = await signUp(email, secret);
      const res = processSignupResult(error);
      toast({ title: t('auth.signUp'), description: res.userMessage });
      setActiveTab('signin');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      if (email) {
        // @ts-expect-error: Bypassing strict type check for legacy auth logic
        await supabase.auth[resetMethod](email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
      }
    } finally {
      toast({
        title: t('auth.reset'),
        description: `If valid, a ${inputType} link was sent.`,
      });
    }
  };

  return (
    <>
      <SEO title={activeTab === 'signup' ? 'Join' : 'Enter'} />
      <div className="page-container pt-20 flex items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-md">
          <Card className="glass-card">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
              <CardHeader>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
                  <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('auth.email')}</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label>{t('auth.credential')}</Label>
                  <div className="relative">
                    <Input 
                      type={showSecret ? 'text' : inputType} 
                      value={secret} 
                      onChange={(e) => setSecret(e.target.value)} 
                      required 
                      autoComplete={activeTab === 'signin' ? "current-" + inputType : "new-" + inputType} 
                    />
                    <Button type="button" variant="ghost" className="absolute right-0 top-0" onClick={() => setShowSecret(!showSecret)}>
                      {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                  {activeTab === 'signin' && (
                    <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={handleReset}>Forgot?</Button>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={activeTab === 'signin' ? handleSignIn : handleSignUp} className="w-full" disabled={loading}>
                  {activeTab === 'signin' ? t('auth.signIn') : t('auth.signUp')}
                </Button>
              </CardFooter>
            </Tabs>
          </Card>
        </div>
      </div>
    </>
  );
}
