import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import {
  processAuthError,
  processSignupResult,
  GENERIC_AUTH_ERROR,
  checkRateLimit,
} from "@/lib/authErrorHandler";
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

export default function Auth({ initialTab }: { initialTab?: string }) {
  const normalizedTab =
    initialTab === "signin" ? "login"
    : initialTab === "signup" ? "register"
    : (initialTab ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState(normalizedTab);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "complete" | "error";
    text: string;
  } | null>(null);

  // Line 27: Fixed strict typing instead of 'any'
  const [vResult, setVResult] = useState<{
    isDone: boolean;
    message: string;
  } | null>(null);

  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

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
        const result = processSignupResult(error);
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
                    activeTab === "login" ? "current-password" : "new-password"
                  }
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading
                  ? "Processing..."
                  : activeTab === "login"
                    ? "Sign In"
                    : "Create Account"}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
