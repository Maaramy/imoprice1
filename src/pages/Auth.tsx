import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import {
  ArrowRight, Loader2, Mail, Home,
  User, UserPlus, LogIn, Lock, Phone, Eye, EyeOff, KeyRound, ShieldCheck,
  CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";

/* ── Error message helpers ── */

/**
 * Extrait un code d'erreur Convex Auth depuis le message brut reçu côté client.
 * Les erreurs serveur arrivent enveloppées (ex: "Uncaught Error: InvalidSecret at
 * retrieveAccount..."), on cherche donc le code par sous-chaîne.
 */
function authErrorCode(msg: string): string {
  const text = msg || "";
  if (text.includes("InvalidAccountId")) return "InvalidAccountId";
  if (text.includes("InvalidSecret")) return "InvalidSecret";
  if (text.includes("InvalidCredentials")) return "InvalidCredentials";
  return text;
}

export function getSignInErrorMessage(msg: string): string {
  const code = authErrorCode(msg);
  if (code === "InvalidAccountId") return "Aucun compte trouvé avec cet email";
  if (code === "InvalidSecret" || code === "InvalidCredentials") return "Mot de passe ou e-mail erronée";
  return msg || "Mot de passe ou e-mail erronée";
}

export function getSignUpErrorMessage(msg: string): string {
  if (msg.toLowerCase().includes("already exists")) return "Cet email est déjà utilisé";
  const code = authErrorCode(msg);
  if (code === "InvalidSecret" || code === "InvalidCredentials") return "Email déjà utilisé avec un mot de passe différent";
  if (code === "InvalidAccountId" || msg === "Invalid state: code is not a function") return "Erreur lors de l'inscription";
  if (msg.toLowerCase().includes("password")) return "Le mot de passe ne respecte pas les exigences de sécurité";
  return msg || "Erreur lors de l'inscription";
}

export function getResetErrorMessage(msg: string): string {
  const code = authErrorCode(msg);
  if (code === "InvalidAccountId" || msg.toLowerCase().includes("user")) return "Aucun compte trouvé avec cet email";
  return msg || "Erreur lors de l'envoi du code";
}

/* ── Shared field components (module scope → stable identity, no remount on re-render) ── */

function ErrorMsg({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
      role="alert" aria-live="assertive"
      className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 rounded-xl px-4 py-2.5 border border-red-100 dark:border-red-900/50">
      {error}
    </motion.p>
  );
}

function FormField({
  id, label, name, type = "text", placeholder, icon: Icon,
  value, onChange, disabled, required, minLength,
  rightElement, inputRef,
}: {
  id: string; label: string; name?: string; type?: string; placeholder?: string;
  icon: any; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean; required?: boolean; minLength?: number;
  rightElement?: React.ReactNode; inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
        {label}
      </label>
      <div className="relative group">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 sm:size-[18px] text-slate-400 group-focus-within:text-[oklch(0.52_0.175_35.5)] transition-colors duration-200 dark:group-focus-within:text-[oklch(0.7_0.14_35)]" aria-hidden="true" />
        <Input
          ref={inputRef}
          id={id} name={name} type={type} placeholder={placeholder}
          value={value} onChange={onChange}
          className={`pl-10 sm:pl-11 pr-${rightElement ? "12" : "4"} h-11 sm:h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900
            focus:bg-white dark:focus:bg-slate-900 focus:border-[oklch(0.52_0.175_35.5)] dark:focus:border-[oklch(0.7_0.14_35)] focus:ring-2 focus:ring-[oklch(0.52_0.175_35.5)]/15 dark:focus:ring-[oklch(0.7_0.14_35)]/20
            transition-all duration-200 text-sm shadow-sm hover:border-slate-300 dark:hover:border-slate-600`}
          disabled={disabled} required={required} minLength={minLength} />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

function PwToggle({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0">
      {show ? <EyeOff className="size-4 sm:size-[18px]" aria-hidden="true" /> : <Eye className="size-4 sm:size-[18px]" aria-hidden="true" />}
    </button>
  );
}

/* ── Auth component ── */

interface AuthProps {
  redirectAfterAuth?: string;
}

export function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

type AuthMode = "signin" | "signup";
type ResetStep = "email" | "otp" | "done";

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [mode, setMode] = useState<AuthMode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign-in fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign-up fields
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpPw, setSignUpPw] = useState("");
  const [signUpConfirmPw, setSignUpConfirmPw] = useState("");

  // Visibility toggles
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowPwConfirm] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [resetMode, setResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPw, setResetNewPw] = useState("");
  const [resetConfirmPw, setResetConfirmPw] = useState("");

  // Refs for focus-once (remplace autoFocus qui refocalise au re-render)
  const emailRef = useRef<HTMLInputElement>(null);
  const resetEmailRef = useRef<HTMLInputElement>(null);
  const signupEmailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (resetMode && resetStep === "email") {
      const t = setTimeout(() => {
        // Ne pas voler le focus si l'utilisateur tape déjà dans un champ
        const active = document.activeElement;
        if (active && active.tagName === "INPUT") return;
        resetEmailRef.current?.focus();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [resetMode, resetStep]);

  useEffect(() => {
    if (mode === "signup") {
      const t = setTimeout(() => {
        // Ne pas voler le focus si l'utilisateur tape déjà dans un champ
        const active = document.activeElement;
        if (active && active.tagName === "INPUT") return;
        signupEmailRef.current?.focus();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [mode]);

  const pwMinLen = 6;
  const pwLengthOk = signUpPw.length >= pwMinLen;
  const pwMatchOk = signUpPw === signUpConfirmPw && signUpConfirmPw.length > 0;
  const pwTouched = signUpPw.length > 0;
  const confirmTouched = signUpConfirmPw.length > 0;

  useEffect(() => {
    if (!authLoading && isAuthenticated && !resetMode) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect, resetMode]);

  const switchMode = useCallback((newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setResetMode(false);
    setResetStep("email");
    setResetEmail("");
    setResetCode("");
    setResetNewPw("");
    setResetConfirmPw("");
  }, []);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      await signIn("password", formData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(getSignInErrorMessage(msg));
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const pw = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;
    if (pw !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      setIsLoading(false);
      return;
    }
    if (pw.length < pwMinLen) {
      setError(`Le mot de passe doit contenir au moins ${pwMinLen} caractères`);
      setIsLoading(false);
      return;
    }
    try {
      await signIn("password", formData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(getSignUpErrorMessage(msg));
      setIsLoading(false);
    }
  };

  const sendResetCode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", resetEmail);
      formData.set("flow", "reset");
      await signIn("password", formData);
      setResetStep("otp");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(getResetErrorMessage(msg));
    }
    setIsLoading(false);
  };

  const handleResetSendCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await sendResetCode();
  };

  const handleResendCode = async () => {
    await sendResetCode();
  };

  const handleResetVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (resetNewPw !== resetConfirmPw) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (resetNewPw.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("email", resetEmail);
      formData.set("code", resetCode);
      formData.set("newPassword", resetNewPw);
      formData.set("flow", "reset-verification");
      await signIn("password", formData);
      setResetStep("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? "Code invalide ou expiré"
          : "Erreur lors de la réinitialisation"
      );
    }
    setIsLoading(false);
  };

  const otpRef = useRef<HTMLFormElement | null>(null);
  const handleOtpChange = useCallback((value: string) => {
    setResetCode(value);
    if (value.length === 6) {
      setTimeout(() => otpRef.current?.requestSubmit(), 100);
    }
  }, []);

  /* ── Success screen after reset ── */

  if (resetStep === "done") {
    return (
      <BaseLayout>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full"
        >
          <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
            <CardHeader className="text-center pt-8 sm:pt-10 pb-4 sm:pb-5 px-6 sm:px-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="flex justify-center mb-4 sm:mb-5">
                <div className="flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200/50">
                  <ShieldCheck className="size-6 sm:size-7 text-white" />
                </div>
              </motion.div>
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                Mot de passe réinitialisé
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 pb-7 sm:pb-8">
              <Button onClick={() => { setResetMode(false); setError(null); }}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.175_35.5)] to-[oklch(0.45_0.16_35.5)] text-white shadow-lg shadow-[oklch(0.52_0.175_35.5)]/20 hover:shadow-xl hover:from-[oklch(0.48_0.16_35.5)] hover:to-[oklch(0.42_0.15_35.5)] transition-all duration-200 text-sm font-semibold">
                Se connecter <ArrowRight className="ml-2 size-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full"
      >
        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-2xl overflow-hidden relative">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-[oklch(0.52_0.175_35.5)] via-[oklch(0.55_0.15_230)] to-[oklch(0.52_0.175_35.5)]" />

          {resetMode ? (
            /* ═══════ FORGOT PASSWORD ═══════ */
            <AnimatePresence mode="wait">
              {resetStep === "email" ? (
                <motion.div key="re"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <CardHeader className="text-center pt-6 sm:pt-8 pb-2 px-6 sm:px-8">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="flex justify-center mb-3">
                      <div className="flex size-11 sm:size-13 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-md shadow-amber-200/50">
                        <KeyRound className="size-5 sm:size-6 text-white" />
                      </div>
                    </motion.div>
                    <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                      Mot de passe oublié
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1.5">
                      Entrez votre email pour recevoir un code de vérification
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleResetSendCode}>
                    <CardContent className="px-6 sm:px-8 pb-2 space-y-4">
                      <FormField
                        id="re-email" label="Email" name="email" type="email"
                        placeholder="nom@exemple.com" icon={Mail}
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={isLoading} required
                        inputRef={resetEmailRef}
                      />
                      <ErrorMsg error={error} />
                      <Button type="submit" disabled={isLoading || !resetEmail}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.175_35.5)] to-[oklch(0.45_0.16_35.5)] text-white shadow-md shadow-[oklch(0.52_0.175_35.5)]/20 hover:shadow-lg hover:from-[oklch(0.48_0.16_35.5)] hover:to-[oklch(0.42_0.15_35.5)] active:shadow-sm transition-all duration-200 text-sm font-semibold"
                      >
                        {isLoading ? (
                          <><Loader2 className="mr-2 size-4 animate-spin" /> Envoi en cours...</>
                        ) : (
                          <><span>Envoyer le code</span><ArrowRight className="ml-2 size-4" /></>
                        )}
                      </Button>
                    </CardContent>
                    <CardFooter className="px-6 sm:px-8 pb-6 sm:pb-7 pt-1">
                      <button type="button" onClick={() => { setResetMode(false); setError(null); }}
                        className="w-full text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors py-1">
                        ← Retour à la connexion
                      </button>
                    </CardFooter>
                  </form>
                </motion.div>
              ) : (
                <motion.div key="ro"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <CardHeader className="text-center pt-6 sm:pt-8 pb-2 px-6 sm:px-8">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="flex justify-center mb-3">
                      <div className="flex size-11 sm:size-13 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.55_0.15_230)] to-[oklch(0.48_0.14_230)] shadow-md shadow-[oklch(0.55_0.15_230)]/25">
                        <ShieldCheck className="size-5 sm:size-6 text-white" />
                      </div>
                    </motion.div>
                    <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                      Code de vérification
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1.5">
                      Un code à 6 chiffres a été envoyé à <strong className="text-slate-700 dark:text-slate-300">{resetEmail}</strong>
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleResetVerify} ref={otpRef}>
                    <CardContent className="px-6 sm:px-8 pb-2 space-y-4">
                      <div className="flex justify-center my-3 sm:my-4">
                        <InputOTP value={resetCode} onChange={handleOtpChange} maxLength={6} disabled={isLoading}>
                          <InputOTPGroup className="gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <InputOTPSlot key={i} index={i}            className="size-10 sm:size-12 text-sm sm:text-lg font-bold rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm
              data-[active]:border-[oklch(0.52_0.175_35.5)] dark:data-[active]:border-[oklch(0.7_0.14_35)] data-[active]:ring-2 data-[active]:ring-[oklch(0.52_0.175_35.5)]/15 dark:data-[active]:ring-[oklch(0.7_0.14_35)]/20
              transition-all" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      {resetCode.length === 6 && !isLoading && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-sm text-[oklch(0.55_0.15_230)] dark:text-[oklch(0.7_0.14_230)] text-center italic">
                          Vérification automatique...
                        </motion.p>
                      )}

                      <FormField id="rnp" label="Nouveau mot de passe" type={showNewPw ? "text" : "password"}
                        placeholder="Min. 6 caractères" icon={Lock}
                        value={resetNewPw} onChange={(e) => setResetNewPw(e.target.value)}
                        disabled={isLoading} required minLength={6}
                        rightElement={<PwToggle show={showNewPw} onClick={() => setShowNewPw(!showNewPw)} />}
                      />

                      <FormField id="rcp" label="Confirmer le mot de passe" type={showConfirmPw ? "text" : "password"}
                        placeholder="Retapez le mot de passe" icon={Lock}
                        value={resetConfirmPw} onChange={(e) => setResetConfirmPw(e.target.value)}
                        disabled={isLoading} required minLength={6}
                        rightElement={<PwToggle show={showConfirmPw} onClick={() => setShowPwConfirm(!showConfirmPw)} />}
                      />

                      <ErrorMsg error={error} />
                      <Button type="submit" disabled={isLoading || resetCode.length !== 6 || !resetNewPw || !resetConfirmPw}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.175_35.5)] to-[oklch(0.45_0.16_35.5)] text-white shadow-md shadow-[oklch(0.52_0.175_35.5)]/20 hover:shadow-lg hover:from-[oklch(0.48_0.16_35.5)] hover:to-[oklch(0.42_0.15_35.5)] active:shadow-sm transition-all duration-200 text-sm font-semibold"
                      >
                        {isLoading ? (
                          <><Loader2 className="mr-2 size-4 animate-spin" /> Réinitialisation...</>
                        ) : (
                          <><span>Réinitialiser</span><ArrowRight className="ml-2 size-4" /></>
                        )}
                      </Button>
                    </CardContent>
                    <CardFooter className="px-6 sm:px-8 pb-6 sm:pb-7 pt-1">
                      <p className="text-sm text-slate-400 dark:text-slate-500 text-center w-full">
                        Pas reçu de code ?{" "}
                        <button type="button" onClick={handleResendCode} disabled={isLoading}
                          className="text-sm text-[oklch(0.52_0.175_35.5)] dark:text-[oklch(0.7_0.14_35)] hover:text-[oklch(0.45_0.16_35.5)] dark:hover:text-[oklch(0.78_0.13_35)] font-semibold transition-colors">
                          Renvoyer
                        </button>
                      </p>
                    </CardFooter>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            /* ═══════ NORMAL AUTH ═══════ */
            <>
              {/* Brand header */}
              <div className="pt-6 sm:pt-8 pb-1 px-6 sm:px-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="flex justify-center mb-3"
                >
                  <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.52_0.175_35.5)] to-[oklch(0.44_0.15_35.5)] shadow-soft-lg ring-4 ring-[oklch(0.52_0.175_35.5)]/10 dark:from-[oklch(0.68_0.14_35)] dark:to-[oklch(0.58_0.13_35)] dark:ring-[oklch(0.68_0.14_35)]/15">
                    <Home className="size-5 sm:size-6 text-white" />
                  </div>
                </motion.div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  <span className="text-[oklch(0.52_0.175_35.5)] dark:text-[oklch(0.7_0.14_35)]">imo</span>price <span className="text-[oklch(0.55_0.15_230)] dark:text-[oklch(0.7_0.14_230)]">AI</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                  Estimation immobilière intelligente
                </p>
              </div>

              {/* Mode switch */}
              <div className="mx-6 sm:mx-8 mt-4 sm:mt-5 mb-2">
                <div className="relative flex rounded-full border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-700/60 dark:bg-slate-800/80">
                  <div className="absolute inset-0 flex">
                    <motion.div
                      layoutId="tab-bg"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className={`rounded-full bg-white shadow-sm dark:bg-slate-700 ${mode === "signin" ? "w-1/2" : "w-1/2 ml-1/2"}`}
                    />
                  </div>
                  {[
                    { key: "signin" as AuthMode, label: "Connexion", icon: LogIn },
                    { key: "signup" as AuthMode, label: "Inscription", icon: UserPlus },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const active = mode === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => switchMode(tab.key)}
                        className={`relative flex-1 py-2.5 text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2 ${
                          active ? "text-[oklch(0.52_0.175_35.5)] dark:text-[oklch(0.7_0.14_35)]" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                      >
                        <Icon className="size-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {mode === "signin" ? (
                  /* ══════ SIGN IN ══════ */
                  <motion.div key="si"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <form onSubmit={handleSignIn}>
                      <CardContent className="px-6 sm:px-8 pb-2 pt-3 space-y-4">
                        <input type="hidden" name="flow" value="signIn" />
                        <FormField id="si-email" label="Email" name="email" type="email"
                          placeholder="nom@exemple.com" icon={Mail}
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          disabled={isLoading} required
                          inputRef={emailRef}
                        />
                        <FormField id="si-pw" label="Mot de passe" name="password"
                          type={showPw ? "text" : "password"} placeholder="Votre mot de passe" icon={Lock}
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          disabled={isLoading} required
                          rightElement={<PwToggle show={showPw} onClick={() => setShowPw(!showPw)} />}
                        />
                        <ErrorMsg error={error} />
                        <div className="flex items-center justify-end -mt-1">
                          <button type="button" onClick={() => { setResetMode(true); setResetStep("email"); setError(null); }}
                            className="text-sm text-[oklch(0.52_0.175_35.5)] dark:text-[oklch(0.7_0.14_35)] hover:text-[oklch(0.45_0.16_35.5)] dark:hover:text-[oklch(0.78_0.13_35)] font-semibold transition-colors">
                            Mot de passe oublié ?
                          </button>
                        </div>
                        <Button type="submit" disabled={isLoading || !signInEmail || !signInPassword}
                          className="w-full h-12 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.175_35.5)] to-[oklch(0.45_0.16_35.5)] text-white shadow-md shadow-[oklch(0.52_0.175_35.5)]/20 hover:shadow-lg hover:from-[oklch(0.48_0.16_35.5)] hover:to-[oklch(0.42_0.15_35.5)] active:shadow-sm transition-all duration-200 text-sm font-semibold"
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="size-4 animate-spin" /> Connexion en cours...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              Se connecter <ArrowRight className="size-4" />
                            </span>
                          )}
                        </Button>
                      </CardContent>
                    </form>
                  </motion.div>
                ) : (
                  /* ══════ SIGN UP ══════ */
                  <motion.div key="su"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <form onSubmit={handleSignUp}>
                      <CardContent className="px-6 sm:px-8 pb-2 pt-3 space-y-4">
                        <input type="hidden" name="flow" value="signUp" />

                        <FormField id="su-name" label="Nom complet" name="name" type="text"
                          placeholder="Votre nom" icon={User}
                          value={signUpName}
                          onChange={(e) => setSignUpName(e.target.value)}
                          disabled={isLoading} required
                        />
                        <FormField id="su-email" label="Email" name="email" type="email"
                          placeholder="nom@exemple.com" icon={Mail}
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          disabled={isLoading} required
                          inputRef={signupEmailRef}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField id="su-phone" label="Téléphone" name="phone" type="tel"
                            placeholder="+216 XX XXX XXX" icon={Phone}
                            value={signUpPhone}
                            onChange={(e) => setSignUpPhone(e.target.value)}
                            disabled={isLoading}
                          />
                          <FormField id="su-pw" label="Mot de passe" name="password"
                            type={showPw ? "text" : "password"} placeholder="Min. 6 car." icon={Lock}
                            value={signUpPw}
                            onChange={(e) => setSignUpPw(e.target.value)}
                            disabled={isLoading} required minLength={pwMinLen}
                            rightElement={<PwToggle show={showPw} onClick={() => setShowPw(!showPw)} />}
                          />
                        </div>
                        <FormField id="su-confirm" label="Confirmer le mot de passe" name="confirmPassword"
                          type={showConfirmPw ? "text" : "password"} placeholder="Retapez le mot de passe" icon={Lock}
                          value={signUpConfirmPw}
                          onChange={(e) => setSignUpConfirmPw(e.target.value)}
                          disabled={isLoading} required minLength={pwMinLen}
                          rightElement={<PwToggle show={showConfirmPw} onClick={() => setShowPwConfirm(!showConfirmPw)} />}
                        />

                        {/* Password validation */}
                        {pwTouched && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-1.5 text-sm ${pwLengthOk ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                                  {pwLengthOk
                                    ? <CheckCircle2 className="size-4" />
                                    : <XCircle className="size-4" />
                                  }
                                  <span>6 caractères minimum</span>
                                </div>
                              </div>
                              {confirmTouched && (
                                <div className="flex items-center gap-2">
                                  <div className={`flex items-center gap-1.5 text-sm ${pwMatchOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-400"}`}>
                                    {pwMatchOk
                                      ? <CheckCircle2 className="size-4" />
                                      : <XCircle className="size-4" />
                                    }
                                    <span>Mots de passe identiques</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}

                        <ErrorMsg error={error} />
                        <Button type="submit" disabled={isLoading || !signUpName || !signUpEmail || !signUpPw || !signUpConfirmPw}
                          className="w-full h-12 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.175_35.5)] to-[oklch(0.45_0.16_35.5)] text-white shadow-md shadow-[oklch(0.52_0.175_35.5)]/20 hover:shadow-lg hover:from-[oklch(0.48_0.16_35.5)] hover:to-[oklch(0.42_0.15_35.5)] active:shadow-sm transition-all duration-200 text-sm font-semibold"
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="size-4 animate-spin" /> Création du compte...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              Créer mon compte <ArrowRight className="size-4" />
                            </span>
                          )}
                        </Button>
                      </CardContent>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Footer */}
          <div className="py-3.5 px-6 sm:px-8 text-xs sm:text-sm text-center text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
            Sécurisé par{" "}
            <a href="https://freebuff.com" target="_blank" rel="noopener noreferrer"
              className="font-semibold text-[oklch(0.52_0.175_35.5)] dark:text-[oklch(0.7_0.14_35)] hover:text-[oklch(0.45_0.16_35.5)] dark:hover:text-[oklch(0.78_0.13_35)] transition-colors">
              freebuff.com
            </a>
          </div>
        </Card>
      </motion.div>
    </BaseLayout>
  );
}

/* ── Base Layout ── */

function BaseLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[oklch(0.98_0.008_60)] dark:bg-slate-950">
      {/* Thème Tunisie : quadrillage type plan d'architecte + halos méditerranéens */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 blueprint-grid" />
        <div className="absolute -top-40 -right-40 size-96 rounded-full bg-[oklch(0.55_0.15_230)]/10 blur-3xl dark:bg-[oklch(0.55_0.15_230)]/15" />
        <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-[oklch(0.52_0.175_35.5)]/10 blur-3xl dark:bg-[oklch(0.52_0.175_35.5)]/15" />
        <div className="absolute left-1/2 top-1/4 size-72 -translate-x-1/2 rounded-full bg-[oklch(0.55_0.15_230)]/5 blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 px-5 sm:px-8 pt-5 sm:pt-6 pb-2">
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-all duration-300"
        >
          <img src={logo} alt="imoprice AI" width={32} height={32} className="size-8 rounded-lg shadow-soft" />
          <span className="text-sm font-bold tracking-tight"><span className="text-[oklch(0.52_0.175_35.5)] dark:text-[oklch(0.7_0.14_35)]">imo</span>price <span className="text-[oklch(0.55_0.15_230)] dark:text-[oklch(0.7_0.14_230)]">AI</span></span>
        </motion.button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-start sm:items-center justify-center px-4 sm:px-6 pb-10 sm:pb-12 -mt-2 sm:mt-0">
        <div className="w-full max-w-[420px] sm:max-w-[460px] pt-2 sm:pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
