import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import {
  processAuthError,
  processSignupResult,
  GENERIC_AUTH_ERROR,
  checkRateLimit,
  AUTH_RESET_NOTIF,
} from "@/lib/authErrorHandler";
import {
  validateCredential,
  emailSchema,
} from "@/lib/credentialValidation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import SEO from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";



export default function Auth({ initialTab }: { initialTab?: string }) {
  const { t } = useTranslation();

  const normalizedTab =
    initialTab === "signin"
      ? "login"
      : initialTab === "signup"
        ? "register"
        : (initialTab ?? "login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [activeTab, setActiveTab] = useState(normalizedTab);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    username?: string;
  }>({});
  const [message, setMessage] = useState<{
    type: "complete" | "error";
    text: string;
  } | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, resetPassword, signInWithProvider } = useAuth();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithProvider("google", { rememberMe });
      if (error) throw error;
    } catch (error: unknown) {
      const { userMessage } = processAuthError(error);
      toast({ title: userMessage, variant: "destructive" });
    }
  };

  React.useEffect(() => {
    const state = location.state as { authMessage?: string } | null;
    if (!state?.authMessage) return;

    setMessage({
      type: "error",
      text: state.authMessage,
    });
  }, [location.state]);



  const handleForgotPassword = async () => {
    const emailValidation = emailSchema.safeParse(email);
    if (!emailValidation.success) {
      setFieldErrors({
        email: emailValidation.error.issues[0]?.message,
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setFieldErrors({});

    try {
      const { error } = await resetPassword(emailValidation.data);
      if (error) throw error;
      setMessage({ type: "complete", text: AUTH_RESET_NOTIF });
    } catch (error: unknown) {
      const { userMessage } = processAuthError(error);
      setMessage({ type: "error", text: userMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setFieldErrors({});

    const emailValidation = emailSchema.safeParse(email);
    if (!emailValidation.success) {
      setFieldErrors({
        email: emailValidation.error.issues[0]?.message,
      });
      setIsLoading(false);
      return;
    }

    if (activeTab === "register") {
      const validationResults = validateCredential(password);
      if (!validationResults.isValid) {
        setFieldErrors({ password: validationResults.errors[0] });
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setFieldErrors({ confirmPassword: "Passwords do not match" });
        setIsLoading(false);
        return;
      }
      if (!username.trim()) {
        setFieldErrors({ username: "Username is required" });
        setIsLoading(false);
        return;
      }
    }

    const { isLimited } = checkRateLimit(emailValidation.data);
    if (isLimited) {
      setMessage({ type: "error", text: GENERIC_AUTH_ERROR });
      setIsLoading(false);
      return;
    }

    try {
      if (activeTab === "login") {
        const { error } = await signIn(emailValidation.data, password, {
          rememberMe,
        });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await signUp(emailValidation.data, password, {
          username: username.trim(),
          rememberMe,
        });
        if (error) throw error;
        const result = processSignupResult();
        setMessage({ type: "complete", text: result.userMessage });
      }
    } catch (error: unknown) {
      const { userMessage } = processAuthError(error);
      setMessage({ type: "error", text: userMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title={
          activeTab === "register"
            ? t("auth.signupSeoTitle", "Create Your CineTrekker Account")
            : t("auth.loginSeoTitle", "Sign In to CineTrekker")
        }
        description={t("auth.seoDescription", "Access your CineTrekker account to sync watchlists, ratings, and recommendations.")}
        canonical={`https://cinetrekker.vercel.app/${activeTab === "register" ? "signup" : "login"}`}
      />
      <div className="flex min-h-[100dvh] items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]">
        <Card className="w-full max-w-md rounded-2xl">
          <CardHeader>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">{activeTab === "register" ? t("auth.createAccountHeading", "Create your CineTrekker account") : t("auth.signInHeading", "Sign in to CineTrekker")}</h1>
            <CardDescription>
              {t("auth.tagline", "Track what you watch, save your next pick, and keep your lists in sync.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger id="auth-tab-login" aria-controls="auth-panel" value="login">{t("auth.loginTab", "Login")}</TabsTrigger>
                <TabsTrigger id="auth-tab-register" aria-controls="auth-panel" value="register">{t("auth.registerTab", "Register")}</TabsTrigger>
              </TabsList>

              <div id="auth-panel" role="tabpanel" aria-labelledby={activeTab === "login" ? "auth-tab-login" : "auth-tab-register"}>
                <form onSubmit={handleAuth} className="space-y-4 pt-4">
                {message && (
                  <Alert
                    variant={
                      message.type === "complete" ? "default" : "destructive"
                    }
                  >
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="auth-email">{t("auth.emailLabel", "Email")}</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    name="email"
                    autoComplete={activeTab === "login" ? "username" : "email"}
                    placeholder={t("auth.emailLabel", "Email")}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors((current) => ({
                        ...current,
                        email: undefined,
                      }));
                    }}
                    required
                  />
                  {fieldErrors.email && (
                    <p className="text-sm text-destructive">{fieldErrors.email}</p>
                  )}
                </div>

                {activeTab === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="auth-username">Username</Label>
                    <Input
                      id="auth-username"
                      type="text"
                      name="username"
                      autoComplete="username"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setFieldErrors((current) => ({
                          ...current,
                          username: undefined,
                        }));
                      }}
                      required
                    />
                    {fieldErrors.username && (
                      <p className="text-sm text-destructive">{fieldErrors.username}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="mb-2 flex items-center gap-2">
                    <Label htmlFor="auth-password">
                      {t("auth.passwordLabel", "Password")}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            aria-label={t("auth.passwordRules", "Password requirements")}
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs space-y-1">
                          <p className="font-medium text-sm">{t("auth.passwordRulesTitle", "Password Requirements:")}</p>
                          <ul className="text-xs space-y-0.5">
                            <li>{t("auth.passwordRuleMin", "• Minimum 8 characters")}</li>
                            <li>{t("auth.passwordRuleProTip", "• Tip: Use uppercase and numbers for strength")}</li>
                            <li className="italic text-[10px] opacity-70">
                              {t("auth.passwordSymbolsOptional", "(Symbols are optional)")}
                            </li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="relative">
                    <Input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete={
                        activeTab === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      placeholder={t("auth.passwordPlaceholder", "Password")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((current) => ({
                          ...current,
                          password: undefined,
                        }));
                      }}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-e-md transition-colors"
                      aria-label={
                        showPassword
                          ? t("auth.hidePassword", "Hide password")
                          : t("auth.showPassword", "Show password")
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {activeTab === "register" && (
                    <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground md:hidden">
                      <li>{t("auth.passwordRuleMin", "• Minimum 8 characters")}</li>
                      <li>{t("auth.passwordRuleProTip", "• Tip: Use uppercase and numbers for strength")}</li>
                      <li className="italic opacity-70">
                        {t("auth.passwordSymbolsOptional", "(Symbols are optional)")}
                      </li>
                    </ul>
                  )}

                  {activeTab === "login" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleForgotPassword()}
                        className="min-h-11 rounded-md px-2 text-base text-primary transition-colors hover:text-primary/80"
                      >
                        {t("auth.forgotPassword", "Forgot Password?")}
                      </button>
                    </div>
                  )}

                  {fieldErrors.password && (
                    <p className="text-sm text-destructive">
                      {fieldErrors.password}
                    </p>
                  )}

                  {activeTab === "register" && (
                    <div className="space-y-2">
                      <div className="mb-2 flex items-center gap-2">
                        <Label htmlFor="auth-confirm-password">Confirm Password</Label>
                      </div>
                      <div className="relative">
                        <Input
                          id="auth-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          autoComplete="new-password"
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setFieldErrors((current) => ({
                              ...current,
                              confirmPassword: undefined,
                            }));
                          }}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((current) => !current)}
                          className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-e-md transition-colors"
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {fieldErrors.confirmPassword && (
                        <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                      )}
                    </div>
                  )}


                </div>

                <label htmlFor="remember-me" className="flex items-center gap-2 text-base text-muted-foreground">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <span>{t("auth.rememberMe", "Remember Me")}</span>
                </label>

                <Button
                  className="relative w-full overflow-hidden"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    </div>
                  )}
                  <span className={isLoading ? "opacity-0" : ""}>
                    {activeTab === "login"
                      ? t("auth.submitSignIn", "Sign In")
                      : t("auth.submitCreateAccount", "Create Account")}
                  </span>
                </Button>

                <div className="my-6 flex items-center">
                  <div className="flex-grow border-t border-muted-foreground/30"></div>
                  <span className="mx-4 text-sm text-muted-foreground">or</span>
                  <div className="flex-grow border-t border-muted-foreground/30"></div>
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  type="button"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </Button>
                </form>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
