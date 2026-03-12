import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import {
  processAuthError,
  processSignupResult,
  GENERIC_AUTH_ERROR,
  checkRateLimit,
} from "@/lib/authErrorHandler";
import { validateCredential } from "@/lib/credentialValidation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import SEO from "@/components/SEO";

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
  const [message, setMessage] = useState<{
    type: "complete" | "error";
    text: string;
  } | null>(null);

  const navigate = useNavigate();
  const { signIn, signUp, signInWithProvider } = useAuth();

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (activeTab === "register") {
      const validationResults = validateCredential(password);
      if (!validationResults.isValid) {
        setMessage({ type: "error", text: validationResults.errors[0] });
        setIsLoading(false);
        return;
      }
    }

    // Security Check: Rate limiting
    const { isLimited } = checkRateLimit(email);
    if (isLimited) {
      setMessage({ type: "error", text: GENERIC_AUTH_ERROR });
      setIsLoading(false);
      return;
    }

    try {
      if (activeTab === "login") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        const result = processSignupResult();
        setMessage({ type: "complete", text: result.userMessage });
      }
    } catch (error: unknown) {
      // Line 94: Using the central handler to avoid enumeration leaks
      const { userMessage } = processAuthError(error);
      setMessage({ type: "error", text: userMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Sign In or Register — CineTrekker"
        description="Access your CineTrekker account to sync watchlists, ratings, and recommendations."
        canonical="https://cinetrekker.vercel.app/auth"
      />
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>CineTrekker</CardTitle>
            <CardDescription>
              Enter your details to access your watchlist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={(v: string) => setActiveTab(v)}
            >
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
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    name="password"
                    autoComplete={
                      activeTab === "login"
                        ? "current-password"
                        : "new-password"
                    }
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  {activeTab === "register" && (
                    <div className="text-[10px] text-muted-foreground grid grid-cols-2 gap-x-2 gap-y-1 px-1 pt-1 opacity-80">
                      <p>• Min. 8 characters</p>
                      <p>• Uppercase & Lowercase</p>
                      <p>• Number & Special char</p>
                      <p>• No sequences (123, abc)</p>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full relative overflow-hidden"
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
                    className="w-full"
                    disabled={isLoading}
                    onClick={() => void handleProviderSignIn("google")}
                  >
                    Continue with Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                    onClick={() => void handleProviderSignIn("facebook")}
                  >
                    Continue with Facebook
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                    onClick={() => void handleProviderSignIn("apple")}
                  >
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
