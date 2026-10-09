import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Dices } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { HudBackground } from "../components/HudBackground";
import { usePlayerAuth } from "../lib/PlayerAuthContext";
import { resendEmailVerificationCode, verifyEmail } from "../lib/playerApi";

const inputClass = "mt-2 h-12 w-full rounded-[10px] border border-white/10 bg-[#f4f3f8] px-3 text-slate-900 outline-none focus:border-[#6a9eff] focus:ring-2 focus:ring-[#6a9eff]/30 disabled:opacity-60";
const buttonClass = "w-full rounded-[10px] bg-[#454ec3] px-6 py-3 font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60";
const linkClass = "text-sm text-[#8db0ff] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";

export default function VerifyEmail() {
  const { verificationEmail, verificationResendAt, clearPendingVerification } = usePlayerAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(verificationEmail);
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(verificationResendAt);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((verificationResendAt - Date.now()) / 1000)));
  const [busy, setBusy] = useState<"verify" | "resend" | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(verificationEmail ? "If your account is eligible, a code will be sent. Check your inbox and spam folder." : "Enter your registration email. Use an existing code or request a new one.");
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { heading.current?.focus(); }, [success]);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [resendAt]);
  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => navigate("/login", { replace: true, state: { emailVerified: true } }), 2500);
    return () => window.clearTimeout(timer);
  }, [success, navigate]);

  const run = async (operation: "verify" | "resend") => {
    if (controller.current || success || (operation === "resend" && Date.now() < resendAt)) return;
    setError("");
    setNotice("");
    const address = email.trim().toLowerCase();
    if (!address || address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter a valid registration email."); return;
    }
    if (operation === "verify" && !/^\d{6}$/.test(code)) {
      setError("Enter all six digits of your verification code."); return;
    }
    const requestController = new AbortController();
    controller.current = requestController;
    setBusy(operation);
    const timeout = window.setTimeout(() => requestController.abort(), 20_000);
    try {
      if (operation === "resend") {
        // A network failure may still have triggered delivery: keep the cooldown.
        setResendAt(Date.now() + 60_000);
        setRemaining(60);
        setCode("");
        await resendEmailVerificationCode(address, requestController.signal);
        setEmail(address);
        setNotice("If an eligible account exists, a verification code will be sent. Check your inbox and spam folder. Codes expire after 10 minutes.");
      } else {
        await verifyEmail(address, code, requestController.signal);
        setCode("");
        clearPendingVerification();
        setSuccess(true);
      }
    } catch {
      setError(operation === "resend" ? "Unable to complete the request. Please wait before trying again." : "Unable to verify the code. It may be incorrect, expired, or already used. Try again or request a new code. If verification already completed, return to login.");
    } finally {
      window.clearTimeout(timeout);
      controller.current = null;
      setBusy(null);
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void run("verify"); };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-y-auto bg-[linear-gradient(180deg,#08122e_0%,#2d164e_100%)] px-4 py-8 text-white sm:px-8">
      <HudBackground />
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(0,64,95,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(0,64,95,.5)_1px,transparent_1px)] [background-size:76px_76px]" />
      <section aria-labelledby="verification-title" className="relative z-10 w-full max-w-lg rounded-lg bg-black/40 p-6 shadow-lg backdrop-blur-sm sm:p-8">
        <div className="mb-7 flex flex-col items-center text-center">
          <Dices aria-hidden="true" className="h-11 w-11 rotate-[-13deg] text-[#6a9eff]" />
          <div className="mt-1 bg-gradient-to-r from-[#6a9eff] to-[#1183bb] bg-clip-text font-['Orbitron'] text-3xl font-extrabold text-transparent sm:text-4xl">TypeTiles</div>
          <h1 id="verification-title" ref={heading} tabIndex={-1} className="mt-6 text-2xl font-bold uppercase tracking-[0.12em] focus:outline-none">{success ? "Email Verified" : "Verify Your Email"}</h1>
          <p className="mt-2 text-sm text-white/70">{success ? "Your email is verified. Returning to login; sign in with your password." : "Verify your email before logging in to Type Tiles."}</p>
        </div>
        {success ? <Link to="/login" replace state={{ emailVerified: true }} className={`${buttonClass} block text-center`}>Return to login</Link> : <>
          <form onSubmit={submit} className="space-y-4" aria-busy={busy !== null}>
            <label htmlFor="verification-email" className="block text-sm text-white/80">Registration email
              <input id="verification-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setCode(""); setError(""); setNotice(""); }} disabled={busy !== null} className={inputClass} />
            </label>
            <label htmlFor="verification-code" className="block text-sm text-white/80">Verification code
              <input id="verification-code" type="text" inputMode="numeric" autoComplete="off" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))} disabled={busy !== null} spellCheck={false} aria-describedby="verification-help" className={`${inputClass} text-center text-xl tracking-[0.3em]`} />
            </label>
            <p id="verification-help" className="text-xs text-white/60">Enter all six digits, including leading zeroes. Codes expire after 10 minutes.</p>
            <p role="alert" className="text-sm text-red-300">{error}</p>
            <p role="status" className="text-sm text-white/70">{notice}</p>
            <button type="submit" disabled={busy !== null} className={buttonClass}>{busy === "verify" ? "Verifying..." : "Verify email"}</button>
          </form>
          <button type="button" onClick={() => { void run("resend"); }} disabled={busy !== null || remaining > 0} className={`${linkClass} mt-5 disabled:text-white/40`}>{busy === "resend" ? "Requesting..." : remaining > 0 ? `Resend code in ${remaining}s` : "Request a new code"}</button>
          <Link to="/login" replace className={`${linkClass} mt-6 block`}>Back to Login</Link>
        </>}
      </section>
    </main>
  );
}
