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
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import SEO from "@/components/SEO";



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
  const [activeTab, setActiveTab] = useState(normalizedTab);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [message, setMessage] = useState<{
    type: "complete" | "error";
    text: string;
  } | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, resetPassword } = useAuth();

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
    }

    const { isLimited } = checkRateLimit(emailValidation.data);
    if (isLimited) {
      setMessage({ type: "error", text: GENERIC_AUTH_ERROR });
      setIsLoading(false);
      return;
    }

    try {
      if (activeTab === "login") {
        const { error } = await signIn(emailValidation.data, password);
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await signUp(emailValidation.data, password);
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
        title={t("auth.seoTitle", "Sign In or Register - CineTrekker")}
        description={t("auth.seoDescription", "Access your CineTrekker account to sync watchlists, ratings, and recommendations.")}
        canonical="https://cinetrekker.vercel.app/auth"
      />
      <div className="flex min-h-[100dvh] items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]">
        <Card className="w-full max-w-md rounded-2xl">
          <CardHeader>
            <CardTitle>{t("auth.appName", "CineTrekker")}</CardTitle>
            <CardDescription>
              {t("auth.tagline", "Track what you watch, save your next pick, and keep your lists in sync.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t("auth.loginTab", "Login")}</TabsTrigger>
                <TabsTrigger value="register">{t("auth.registerTab", "Register")}</TabsTrigger>
              </TabsList>

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
                            className="text-muted-foreground hover:text-foreground transition-colors outline-none"
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

              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
