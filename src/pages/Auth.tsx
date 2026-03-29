import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
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

function ProviderIcon({
  provider,
}: {
  provider: "google" | "facebook" | "apple";
}) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6 6.9 2.6 2.8 6.7 2.8 11.8S6.9 21 12 21c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.9-.1-1.3H12Z"
        />
      </svg>
    );
  }

  if (provider === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          fill="#1877F2"
          d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1c0 6 4.4 11 10.1 11.9v-8.4H7.1v-3.5h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.3h3.4l-.5 3.5h-2.9V24C19.6 23.1 24 18.1 24 12.1Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M16.37 12.73c.03 3.21 2.82 4.28 2.85 4.3-.02.08-.45 1.54-1.48 3.04-.89 1.29-1.82 2.57-3.28 2.6-1.43.03-1.89-.85-3.52-.85-1.63 0-2.14.82-3.49.88-1.41.05-2.49-1.41-3.38-2.69C2.26 17.4.87 12.6 2.75 9.34c.94-1.62 2.61-2.65 4.43-2.68 1.38-.03 2.68.93 3.52.93.84 0 2.41-1.15 4.07-.98.69.03 2.62.28 3.86 2.09-.1.06-2.3 1.34-2.26 4.03ZM13.67 4.71c.74-.89 1.23-2.13 1.09-3.36-1.07.04-2.36.71-3.13 1.6-.69.8-1.3 2.06-1.14 3.27 1.2.09 2.43-.61 3.18-1.51Z" />
    </svg>
  );
}

export default function Auth({ initialTab }: { initialTab?: string }) {
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
  const { signIn, signUp, signInWithProvider, resetPassword } = useAuth();

  const handleProviderSignIn = async (
    provider: "google" | "facebook" | "apple",
  ) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const { error } = await signInWithProvider(provider);
      if (error) throw error;
    } catch (error: unknown) {
      const { userMessage } = processAuthError(error);
      setMessage({ type: "error", text: userMessage });
      setIsLoading(false);
    }
  };

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
        title="Sign In or Register - CineTrekker"
        description="Access your CineTrekker account to sync watchlists, ratings, and recommendations."
        canonical="https://cinetrekker.vercel.app/auth"
      />
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>CineTrekker</CardTitle>
            <CardDescription>
              Track what you watch, save your next pick, and keep your lists in sync.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
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
                  <Input
                    type="email"
                    name="email"
                    autoComplete={activeTab === "login" ? "username" : "email"}
                    placeholder="Email"
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
                  <div className="relative">
                                      {activeTab === "login" && (
                                        <div className="flex justify-end mt-2">
                                          <button
                                            type="button"
                                            onClick={() => void handleForgotPassword()}
                                            className="text-sm text-primary transition-colors hover:text-primary/80"
                                          >
                                            Forgot Password?
                                          </button>
                                        </div>
                                      )}
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete={
                        activeTab === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      placeholder="Password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((current) => ({
                          ...current,
                          password: undefined,
                        }));
                      }}
                      className="pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {fieldErrors.password && (
                    <p className="text-sm text-destructive">
                      {fieldErrors.password}
                    </p>
                  )}

                  {activeTab === "register" && (
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-1 pt-1 text-[10px] text-muted-foreground opacity-80">
                      <p>• Min. 8 characters</p>
                      <p>• Uppercase & Lowercase</p>
                      <p>• Number & Special char</p>
                      <p>• No sequences (123, abc)</p>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    aria-label="Remember me"
                  />
                  <span>Remember Me</span>
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
                    {activeTab === "login" ? "Sign In" : "Create Account"}
                  </span>
                </Button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-3"
                    disabled={isLoading}
                    onClick={() => void handleProviderSignIn("google")}
                  >
                    <ProviderIcon provider="google" />
                    Continue with Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-3"
                    disabled={isLoading}
                    onClick={() => void handleProviderSignIn("facebook")}
                  >
                    <ProviderIcon provider="facebook" />
                    Continue with Facebook
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-3"
                    disabled={isLoading}
                    onClick={() => void handleProviderSignIn("apple")}
                  >
                    <ProviderIcon provider="apple" />
                    Continue with Apple
                  </Button>
                </div>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
