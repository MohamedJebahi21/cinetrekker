import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { validatePassword, PasswordValidationResult } from '@/lib/passwordValidation';
import { supabase } from '@/integrations/supabase/client';

/**
 * Security: Authentication Page
 * 
 * Features:
 * - Strong password validation with real-time feedback
 * - Google OAuth as preferred sign-in method (inherits Google's security)
 * - Email verification required after signup
 * - Redirect to original destination after login
 */
export default function Auth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(null);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  // Get the redirect path from location state, default to home
  const from = (location.state as { from?: string })?.from || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  // Validate password on change (for signup)
  useEffect(() => {
    if (password && showPasswordRequirements) {
      setPasswordValidation(validatePassword(password));
    } else {
      setPasswordValidation(null);
    }
  }, [password, showPasswordRequirements]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('auth.signIn'),
        description: 'Welcome back!',
      });
      navigate(from, { replace: true });
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password before attempting signup
    const validation = validatePassword(password);
    if (!validation.isValid) {
      toast({
        title: 'Password Requirements Not Met',
        description: validation.errors[0],
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your email and click the verification link to complete registration.',
      });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${from}`,
      },
    });
    
    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
    // OAuth redirects, so we don't need to handle success here
  };

  const getStrengthColor = (strength: PasswordValidationResult['strength']) => {
    switch (strength) {
      case 'weak': return 'bg-destructive';
      case 'fair': return 'bg-orange-500';
      case 'good': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
    }
  };

  const getStrengthWidth = (strength: PasswordValidationResult['strength']) => {
    switch (strength) {
      case 'weak': return 'w-1/4';
      case 'fair': return 'w-2/4';
      case 'good': return 'w-3/4';
      case 'strong': return 'w-full';
    }
  };

  return (
    <div className="page-container pt-20 flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md glass-card">
        <Tabs defaultValue="signin" className="w-full">
          <CardHeader className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
              <TabsTrigger 
                value="signup" 
                onClick={() => setShowPasswordRequirements(true)}
              >
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
                  <Label htmlFor="signin-password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                  <Label htmlFor="signup-password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {passwordValidation && (
                    <div className="space-y-2 mt-2">
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${getStrengthColor(passwordValidation.strength)} ${getStrengthWidth(passwordValidation.strength)}`}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Password strength: <span className="font-medium capitalize">{passwordValidation.strength}</span>
                      </p>
                    </div>
                  )}
                  
                  {/* Password Requirements */}
                  <div className="text-xs space-y-1 mt-2">
                    <p className="text-muted-foreground font-medium">Password must have:</p>
                    {[
                      { check: password.length >= 8, text: 'At least 8 characters' },
                      { check: /[A-Z]/.test(password), text: 'One uppercase letter' },
                      { check: /[a-z]/.test(password), text: 'One lowercase letter' },
                      { check: /[0-9]/.test(password), text: 'One number' },
                      { check: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), text: 'One special character' },
                    ].map((req, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {password ? (
                          req.check ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-destructive" />
                          )
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                        )}
                        <span className={req.check && password ? 'text-green-600' : 'text-muted-foreground'}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Security Notice */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    After signing up, you'll receive a verification email. 
                    Click the link to verify your account before you can access protected features.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || (passwordValidation && !passwordValidation.isValid)}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.signUp')}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
