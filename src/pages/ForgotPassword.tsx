import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Dices } from "lucide-react";
import { Link } from "react-router-dom";
import { HudBackground } from "../components/HudBackground";
import { requestPasswordReset, resetPlayerPassword, verifyResetCode } from "../lib/playerApi";

type Step = "email" | "code" | "password" | "success";
const inputClass = "mt-2 h-12 w-full rounded-[10px] border border-white/10 bg-[#f4f3f8] px-3 text-slate-900 outline-none focus:border-[#6a9eff] focus:ring-2 focus:ring-[#6a9eff]/30 disabled:opacity-60";
const buttonClass = "w-full rounded-[10px] bg-[#454ec3] px-6 py-3 font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60";
const linkClass = "text-sm text-[#8db0ff] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:text-white/40";
const genericNotice = "If an eligible account exists, a reset code will be sent. Check your inbox and spam folder. Codes expire after 10 minutes.";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    if (!resendAt) return;
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  const clearSecrets = () => { setCode(""); setPassword(""); setConfirmation(""); };
  const run = async (operation: "request" | "verify" | "reset") => {
    if (controller.current) return;
    if (operation === "request" && Date.now() < resendAt) return;
    setError("");
    setNotice("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address."); return;
    }
    if (operation !== "request" && !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email."); return;
    }
    if (operation === "reset") {
      if (password.length < 6 || new TextEncoder().encode(password).length > 72) {
        setError("Use at least 6 characters and at most 72 UTF-8 bytes."); return;
      }
      if (password !== confirmation) { setError("Passwords must match."); return; }
    }
    const requestController = new AbortController();
    controller.current = requestController;
    setBusy(true);
    // Bound loading without persisting sensitive form data.
    const timeout = window.setTimeout(() => requestController.abort(), 20_000);
    try {
      if (operation === "request") {
        // Even an uncertain network outcome may have sent an email: apply cooldown before sending.
        const until = Date.now() + 60_000;
        setResendAt(until);
        setRemaining(60);
        await requestPasswordReset(normalizedEmail, requestController.signal);
        setEmail(normalizedEmail);
        clearSecrets();
        setStep("code");
        setNotice(genericNotice);
      } else if (operation === "verify") {
        const result = await verifyResetCode(normalizedEmail, code, requestController.signal);
        if (!result.valid) throw new Error("Verification failed");
        setStep("password");
      } else {
        await resetPlayerPassword(normalizedEmail, code, password, requestController.signal);
        clearSecrets();
        setEmail("");
        setStep("success");
      }
    } catch {
      // Never display arbitrary provider/server errors or account-dependent information.
      if (operation === "request") {
        setError("Unable to complete the request. Please wait before trying again.");
      } else if (operation === "verify") {
        setError("Unable to verify the code. It may be incorrect or expired. Try again or request a new code.");
      } else {
        clearSecrets();
        setStep("code");
        setError("Unable to confirm the reset. Verify your code again or request a new one. If it already completed, try logging in with your new password.");
      }
    } finally {
      window.clearTimeout(timeout);
      controller.current = null;
      setBusy(false);
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(step === "email" ? "request" : step === "code" ? "verify" : "reset");
  };
  const title = step === "email" ? "Forgot Password" : step === "code" ? "Verify Code" : step === "password" ? "New Password" : "Password Reset";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-y-auto bg-[linear-gradient(180deg,#08122e_0%,#2d164e_100%)] px-4 py-8 text-white sm:px-8">
      <HudBackground />
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(0,64,95,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(0,64,95,.5)_1px,transparent_1px)] [background-size:76px_76px]" />
      <section aria-labelledby="recovery-title" className="relative z-10 w-full max-w-lg rounded-lg bg-black/40 p-6 shadow-lg backdrop-blur-sm sm:p-8">
        <div className="mb-7 flex flex-col items-center text-center">
          <Dices aria-hidden="true" className="h-11 w-11 rotate-[-13deg] text-[#6a9eff]" />
          <div className="mt-1 bg-gradient-to-r from-[#6a9eff] to-[#1183bb] bg-clip-text font-['Orbitron'] text-3xl font-extrabold text-transparent sm:text-4xl">TypeTiles</div>
          <h1 id="recovery-title" ref={heading} tabIndex={-1} className="mt-6 text-2xl font-bold uppercase tracking-[0.12em] focus:outline-none">{title}</h1>
          <p className="mt-2 text-sm text-white/70">{step === "email" ? "Enter your registered email to request a reset code." : step === "code" ? "Enter the 6-digit code from your email." : step === "password" ? "Choose a new password for your account." : "Your password has been reset. Log in with your new password."}</p>
          {step !== "success" ? <p className="mt-3 text-xs text-white/60">Step {step === "email" ? 1 : step === "code" ? 2 : 3} of 3</p> : null}
        </div>

        {step !== "success" ? <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
          {step === "email" ? <label htmlFor="recovery-email" className="block text-sm text-white/80">Registered email
            <input id="recovery-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} className={inputClass} />
          </label> : <p className="break-all text-sm text-white/70">Recovery email: {email}</p>}
          {step === "code" ? <label htmlFor="recovery-code" className="block text-sm text-white/80">Verification code
            <input id="recovery-code" type="text" inputMode="numeric" autoComplete="off" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))} disabled={busy} spellCheck={false} aria-describedby="code-help" className={`${inputClass} text-center text-xl tracking-[0.3em]`} />
            <span id="code-help" className="mt-2 block text-xs text-white/60">Use all six digits, including any leading zeroes.</span>
          </label> : null}
          {step === "password" ? <>
            <label htmlFor="recovery-password" className="block text-sm text-white/80">New password
              <input id="recovery-password" type="password" autoComplete="off" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} aria-describedby="password-help" className={inputClass} />
            </label>
            <p id="password-help" className="text-xs text-white/60">At least 6 characters, at most 72 UTF-8 bytes. Use a unique password.</p>
            <label htmlFor="recovery-confirmation" className="block text-sm text-white/80">Confirm new password
              <input id="recovery-confirmation" type="password" autoComplete="off" required minLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} className={inputClass} />
            </label>
          </> : null}
          <p role="alert" className="text-sm text-red-300">{error}</p>
          <p role="status" className="text-sm text-white/70">{notice}</p>
          <button type="submit" disabled={busy || (step === "email" && remaining > 0)} className={buttonClass}>{busy ? "Working..." : step === "email" ? remaining > 0 ? `Try again in ${remaining}s` : "Send reset code" : step === "code" ? "Verify code" : "Reset password"}</button>
        </form> : <Link to="/login" replace className={`${buttonClass} block text-center`}>Return to login</Link>}

        {(step === "code" || step === "password") ? <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <button type="button" disabled={busy || remaining > 0} onClick={() => { void run("request"); }} className={linkClass}>{remaining > 0 ? `Resend code in ${remaining}s` : "Request a new code"}</button>
          <button type="button" disabled={busy} onClick={() => { clearSecrets(); setError(""); setNotice(""); setStep("email"); }} className={linkClass}>Change email</button>
        </div> : null}
        {step !== "success" ? <Link to="/login" replace className={`${linkClass} mt-6 inline-block`}>Back to login</Link> : null}
      </section>
    </main>
  );
}
