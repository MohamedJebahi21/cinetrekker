import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { validateCredential, CredentialValidationResult } from '@/lib/credentialValidation';
import {
  GENERIC_AUTH_ERROR,
  GENERIC_SIGNUP_SUCCESS,
  AUTH_RESET_MSG,
  processSignupResult,
  checkRateLimit,
  clearRateLimit,
  logAuthEventServer,
} from '@/lib/authErrorHandler';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

/**
 * Security: Authentication Page
 *
 * Features:
 * - Strong credential validation with real-time feedback
 * - Google OAuth as preferred sign-in method (inherits Google's security)
 * - Email verification required before protected-route access
 * - Redirect to original destination after login
 */
export default function Auth({ initialTab = 'signin' }: { initialTab?: 'signin' | 'signup' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [secretValidation, setSecretValidation] = useState<CredentialValidationResult | null>(null);
  const [showSecretRequirements, setShowSecretRequirements] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);

  // Get the redirect path from location state, default to home
  const from = (location.state as { from?: string })?.from || '/';

  // Redirect if already authenticated
  useEffect(() => {
    const isVerified = Boolean(user?.email_confirmed_at);
    if (user && isVerified) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setShowSecretRequirements(activeTab === 'signup');
  }, [activeTab]);

  // Validate secret on change (for signup)
  useEffect(() => {
    if (secret && showSecretRequirements) {
      setSecretValidation(validateCredential(secret));
    } else {
      setSecretValidation(null);
    }
  }, [secret, showSecretRequirements]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    
    // Rate limit check
    const rateLimit = checkRateLimit(normalizedEmail);
    if (rateLimit.isLimited) {
      toast({
        title: t('common.error'),
        description: GENERIC_AUTH_ERROR,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email, secret);

      // CRITICAL: Single path - no branching on error type
      if (error) {
        logAuthEventServer('signin_attempt', normalizedEmail, false);
        
        toast({
          title: t('common.error'),
          description: GENERIC_AUTH_ERROR,
          variant: 'destructive',
        });
      } else {
        logAuthEventServer('signin_attempt', normalizedEmail, true);
        clearRateLimit(normalizedEmail);
        
        toast({
          title: t('auth.signIn'),
          description: 'Welcome back!',
        });
        navigate(from, { replace: true });
      }
    } catch {
      // Catch block: do NOT log error object
      console.warn('[Auth] Sign-in attempt completed');
      
      toast({
        title: t('common.error'),
        description: GENERIC_AUTH_ERROR,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    const rateLimit = checkRateLimit(normalizedEmail);
    if (rateLimit.isLimited) {
      // Even rate limit shows same message
      toast({
        title: t('auth.signUp', 'Sign Up'),
        description: GENERIC_SIGNUP_SUCCESS,
      });
      return;
    }

    // Client-side credential validation (ok to show detailed errors)
    const validation = validateCredential(secret);
    if (!validation.isValid) {
      toast({
        title: 'Security Requirements',
        description: validation.errors[0],
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, secret);

      // Process signup result - treats "account registered" as success
      const result = processSignupResult(error);

      logAuthEventServer('signup_attempt', normalizedEmail, result.isSuccess);

      // CRITICAL: Same message always shown
      toast({
        title: t('auth.signUp', 'Sign Up'),
        description: result.userMessage,
      });

      // Always redirect to signin after signup
      setActiveTab('signin');
    } catch {
      // Catch: do NOT log error object
      console.warn('[Auth] Sign-up attempt completed');

      // Even on exception, same message
      toast({
        title: t('auth.signUp', 'Sign Up'),
        description: GENERIC_SIGNUP_SUCCESS,
      });
      setActiveTab('signin');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        logAuthEventServer('signin_attempt', normalizedEmail, false);
        toast({
          title: t('common.error'),
          description: GENERIC_AUTH_ERROR,
          variant: 'destructive',
        });
        setLoading(false);
      }
      // OAuth redirect happens automatically if successful
    } catch {
      console.warn('[Auth] OAuth initiated');
      toast({
        title: t('common.error'),
        description: GENERIC_AUTH_ERROR,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleSecretReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (normalizedEmail) {
        await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
      }
    } catch {
      console.warn('[Auth] Credential reset initiated');
    } finally {
      // CRITICAL: Same message whether account is registered or not
      logAuthEventServer('credential_reset', normalizedEmail, true);
      
      toast({
        title: t('auth.resetPassword', 'Reset Password'),
        description: AUTH_RESET_MSG,
      });
    }
  };

  const getStrengthColor = (strength: CredentialValidationResult['strength']) => {
    switch (strength) {
      case 'weak': return 'bg-destructive';
      case 'fair': return 'bg-orange-500';
      case 'good': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
    }
  };

  const getStrengthWidth = (strength: CredentialValidationResult['strength']) => {
    switch (strength) {
      case 'weak': return 'w-1/4';
      case 'fair': return 'w-2/4';
      case 'good': return 'w-3/4';
      case 'strong': return 'w-full';
    }
  };

  const canonicalPath = activeTab === 'signup' ? '/signup' : '/login';

  return (
    <>
      <SEO 
        title={activeTab === 'signup' ? 'Create Account — CineTrekker' : 'Sign In — CineTrekker'}
        description="Sign in to CineTrekker to track your movies and TV shows"
        canonical={`https://cinetrekker.vercel.app${canonicalPath}`}
      />
    <div className="page-container pt-20 flex items-center justify-center min-h-[70vh] pb-24 md:pb-0">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">{t('nav.signIn')}</h1>
        <Card className="glass-card">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')} className="w-full">
          <CardHeader className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
              <TabsTrigger value="signup">
                {t('auth.signUp')}
              </TabsTrigger>
            </TabsList>
            
            {/* Google OAuth - Preferred Method */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t('auth.credential')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type={showSecret ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="text-right">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={handleSecretReset}
                      disabled={loading || !email.trim()}
                    >
                      {t('auth.forgotCredential', 'Forgot credential?')}
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Skeleton className="mr-2 h-4 w-4 rounded-full" />}
                  {t('auth.signIn')}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth.credential')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showSecret ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {/* Credential Strength Indicator */}
                  {secretValidation && (
                    <div className="space-y-2 mt-2">
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${getStrengthColor(secretValidation.strength)} ${getStrengthWidth(secretValidation.strength)}`}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Credential strength: <span className="font-medium capitalize">{secretValidation.strength}</span>
                      </p>
                    </div>
                  )}
                  
                  {/* Credential Requirements */}
                  <div className="text-xs space-y-1 mt-2">
                    <p className="text-muted-foreground font-medium">Security requirements:</p>
                    {[
                      { check: secret.length >= 8, text: 'At least 8 characters' },
                      { check: /[A-Z]/.test(secret), text: 'One uppercase letter' },
                      { check: /[a-z]/.test(secret), text: 'One lowercase letter' },
                      { check: /[0-9]/.test(secret), text: 'One number' },
                      { check: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(secret), text: 'One special character' },
                    ].map((req, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {secret ? (
                          req.check ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-destructive" />
                          )
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                        )}
                        <span className={req.check && secret ? 'text-green-600' : 'text-muted-foreground'}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || (secretValidation && !secretValidation.isValid)}
                >
                  {loading && <Skeleton className="mr-2 h-4 w-4 rounded-full" />}
                  {t('auth.signUp')}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
      <div className="mt-4 flex items-center justify-center">
        <Button
          type="button"
          variant="ghost"
          className="text-sm"
          onClick={() => navigate(from, { replace: true })}
        >
          {t('auth.continueAsGuest', 'Continue as guest')}
        </Button>
      </div>
      </div>
    </div>
    </>
  );
}
