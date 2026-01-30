import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Scissors, ArrowLeft, Mail, Lock, User, Phone, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DEVICE_ID_KEY = "barber_device_id";
const REGISTERED_DEVICE_KEY = "barber_registered_device";

const signUpSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number").max(20),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

// Generate a unique device ID
const getOrCreateDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

// Check if device has already registered an account
const hasDeviceRegistered = (): boolean => {
  return localStorage.getItem(REGISTERED_DEVICE_KEY) === "true";
};

// Mark device as having registered an account
const markDeviceAsRegistered = () => {
  localStorage.setItem(REGISTERED_DEVICE_KEY, "true");
};

// Generate a random 4-digit PIN
const generatePin = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup" | "verify">(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pinValue, setPinValue] = useState("");
  const [displayedPin, setDisplayedPin] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [deviceRestricted, setDeviceRestricted] = useState(false);

  const { signIn, signUp, user, isLoading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check device restriction on mount
  useEffect(() => {
    getOrCreateDeviceId();
    if (hasDeviceRegistered() && mode === "signup") {
      setDeviceRestricted(true);
    }
  }, [mode]);

  useEffect(() => {
    if (!authLoading && user && mode !== "verify") {
      checkUserVerification();
    }
  }, [user, authLoading, mode]);

  const checkUserVerification = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_verified")
      .eq("id", user.id)
      .single();
    
    if (profile?.is_verified) {
      navigate("/dashboard");
    } else {
      // User exists but not verified - show PIN verification
      setPendingUserId(user.id);
      showPinVerification();
    }
  };

  const showPinVerification = () => {
    const pin = generatePin();
    setDisplayedPin(pin);
    setMode("verify");
    
    toast({
      title: "🔐 Security PIN",
      description: `Your verification code is: ${pin}`,
      duration: 30000, // Show for 30 seconds
    });
  };

  const verifyPin = async () => {
    if (!pendingUserId || pinValue.length !== 4) return;

    if (pinValue !== displayedPin) {
      toast({
        title: "Invalid PIN",
        description: "The PIN you entered doesn't match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update profile to mark as verified
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", pendingUserId);

      if (error) throw error;

      // Refresh the profile data in auth context
      await refreshProfile();

      toast({
        title: "Verified!",
        description: "Your account has been verified successfully.",
      });
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error verifying:", error);
      toast({
        title: "Verification failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const regeneratePin = () => {
    const pin = generatePin();
    setDisplayedPin(pin);
    setPinValue("");
    
    toast({
      title: "🔐 New Security PIN",
      description: `Your new verification code is: ${pin}`,
      duration: 30000,
    });
  };

  const validateForm = () => {
    try {
      if (mode === "signup") {
        signUpSchema.parse(formData);
      } else {
        signInSchema.parse(formData);
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Check device restriction for signup
    if (mode === "signup" && hasDeviceRegistered()) {
      setDeviceRestricted(true);
      toast({
        title: "Device Limit Reached",
        description: "Only one account can be created per device.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "signup") {
        const { error, data } = await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.phone
        );

        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else if (data?.user) {
          // Mark device as registered
          markDeviceAsRegistered();
          
          // Show PIN verification instead of email OTP
          setPendingUserId(data.user.id);
          showPinVerification();
        }
      } else {
        const { error, data } = await signIn(formData.email, formData.password);

        if (error) {
          toast({
            title: "Sign in failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        } else if (data?.user) {
          // Check if user is verified
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_verified, full_name")
            .eq("id", data.user.id)
            .single();
          
          if (profile?.is_verified) {
            navigate("/dashboard");
          } else {
            // User not verified, show PIN verification
            setPendingUserId(data.user.id);
            showPinVerification();
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-purple" />
      </div>
    );
  }

  // PIN Verification Screen
  if (mode === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md relative">
          <Card variant="elevated" className="border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 p-3 rounded-xl bg-navy shadow-md">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Security PIN Verification</CardTitle>
              <CardDescription>
                Enter the 4-digit code displayed on screen (testing mode)
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Display the PIN prominently */}
              <Alert className="bg-primary/10 border-primary">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-center">
                  <span className="block text-sm text-muted-foreground mb-2">
                    Your verification code is:
                  </span>
                  <span className="block text-3xl font-bold tracking-[0.5em] text-primary">
                    {displayedPin}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-2">
                    (Testing mode - code displayed on screen)
                  </span>
                </AlertDescription>
              </Alert>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={4}
                  value={pinValue}
                  onChange={(value) => setPinValue(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                variant="hero"
                className="w-full"
                size="lg"
                disabled={isLoading || pinValue.length !== 4}
                onClick={verifyPin}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify PIN"
                )}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Need a new code?
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={regeneratePin}
                  disabled={isLoading}
                >
                  Generate New PIN
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-purple/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Card variant="elevated" className="border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            {/* Logo */}
            <div className="mx-auto mb-4 p-3 rounded-xl bg-navy shadow-md">
              <Scissors className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">
              {mode === "signup" ? "Create an account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {mode === "signup"
                ? "Start booking your appointments today"
                : "Sign in to manage your bookings"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Device Restriction Warning */}
            {deviceRestricted && mode === "signup" && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This device has already been used to create an account. 
                  Please sign in instead or use a different device.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        className="pl-10"
                        disabled={deviceRestricted}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="pl-10"
                        disabled={deviceRestricted}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pl-10"
                    disabled={mode === "signup" && deviceRestricted}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="pl-10"
                    disabled={mode === "signup" && deviceRestricted}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                size="lg"
                disabled={isLoading || (mode === "signup" && deviceRestricted)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === "signup" ? "Creating account..." : "Signing in..."}
                  </>
                ) : mode === "signup" ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {mode === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => {
                        setMode("signin");
                        setDeviceRestricted(false);
                      }}
                      className="text-purple hover:text-purple-light font-medium transition-colors"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{" "}
                    <button
                      onClick={() => {
                        setMode("signup");
                        if (hasDeviceRegistered()) {
                          setDeviceRestricted(true);
                        }
                      }}
                      className="text-purple hover:text-purple-light font-medium transition-colors"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
