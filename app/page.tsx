"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateOtp } from "./actions";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Simple unmount/mount animation class
  const animationClass = "transition-all duration-500 ease-out";

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const res = await generateOtp(email);
      if (res.otp) setDemoOtp(res.otp);
      setIsLoading(false);
      setStep("otp");
    } catch (err) {
      setIsLoading(false);
      setError("Failed to send OTP. Please try again.");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1); // Only keep the last char if they type fast
    }

    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    // Move to next input
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length < 4) {
      setError("Please enter the complete 4-digit OTP.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        otp: enteredOtp,
      });

      if (res?.error) {
        setIsLoading(false);
        setError(res.error); // Display "Invalid OTP" or "Expired"
      } else if (res?.ok) {
        setIsLoading(false);
        setStep("success");
        setTimeout(() => {
          router.push("/community");
        }, 1500);
      }
    } catch (err) {
      setIsLoading(false);
      setError("An unexpected error occurred.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-400/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-400/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-zinc-200 rounded-3xl shadow-xl shadow-zinc-200/50 p-8 relative z-10">

        {step === "email" && (
          <div className={`flex flex-col gap-6 ${animationClass} animate-[fadeIn_0.5s_ease-out]`}>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            <div className="text-center mb-2">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-100 shadow-sm shadow-indigo-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M7 15V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10" /></svg>
              </div>
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Welcome Back</h1>
              <p className="text-zinc-500 mt-2 text-sm">Sign in to your community account</p>
            </div>

            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-zinc-700 ml-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium shadow-sm"
                    autoFocus
                  />
                </div>
                {error && <p className="text-rose-500 text-sm ml-1 mt-1.5 font-medium flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> {error}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-70 disabled:hover:bg-indigo-600 disabled:active:scale-100"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <>Continue with Email <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg></>
                )}
              </button>
            </form>

            <div className="relative mt-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200"></div></div>
              <div className="relative flex justify-center"><span className="bg-white/80 px-4 text-xs text-zinc-400 font-medium uppercase tracking-wider rounded-lg backdrop-blur-md">Or continue with</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/community" })}
                className="flex items-center justify-center gap-2 py-3 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl transition-colors text-sm font-medium text-zinc-600 hover:text-zinc-900 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" /></svg>
                Google
              </button>
              <button className="flex items-center justify-center gap-2 py-3 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl transition-colors text-sm font-medium text-zinc-600 hover:text-zinc-900 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>
                GitHub
              </button>
            </div>
          </div>
        )}

        {step === "otp" && (
          <div className={`flex flex-col gap-6 ${animationClass} animate-[slideIn_0.4s_ease-out]`}>
            <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>

            <div className="mb-4">
              <button
                onClick={() => setStep("email")}
                className="mb-6 flex items-center justify-center w-9 h-9 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-600 transition-colors shadow-sm"
                aria-label="Back to email"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Check your email</h1>
              <p className="text-zinc-500 mt-2 text-sm leading-relaxed">
                We sent a 4-digit verification code to <span className="text-zinc-900 font-medium">{email}</span>.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                {demoOtp ? (
                  <>Demo note: enter <span className="font-bold text-indigo-800">{demoOtp}</span></>
                ) : (
                  <>Demo note: Look in your terminal/server console to see the 4-digit code!</>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex justify-between gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    value={otp[index]}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-[72px] h-[72px] text-center text-3xl font-bold bg-white border border-zinc-300 rounded-2xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-300 shadow-sm"
                    placeholder="-"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              <div className="min-h-[20px]">
                {error && <p className="text-rose-500 text-sm text-center font-medium animate-[fadeIn_0.3s_ease-out] flex items-center justify-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {error}
                </p>}
              </div>

              <button
                onClick={verifyOtp}
                disabled={isLoading || otp.join("").length < 4}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:active:scale-100 disabled:shadow-none mt-2"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  "Verify Code"
                )}
              </button>
            </div>

            <p className="text-center text-sm text-zinc-500">
              Didn&apos;t receive the code? <button className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors ml-1">Resend</button>
            </p>
          </div>
        )}

        {step === "success" && (
          <div className={`flex flex-col items-center justify-center py-10 gap-5 ${animationClass} animate-[zoomIn_0.5s_ease-out]`}>
            <style>{`@keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>

            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-100 mb-2 relative shadow-md shadow-emerald-500/10">
              <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-75"></div>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 z-10"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">Verified!</h1>
              <p className="text-zinc-500 text-sm max-w-[250px] mx-auto">
                You&apos;re successfully signed in as <span className="text-zinc-900 font-medium block mt-1 truncate">{email}</span>
              </p>
            </div>

            <button
              onClick={() => {
                setStep("email");
                setEmail("");
                setOtp(["", "", "", ""]);
              }}
              className="mt-8 w-full bg-white hover:bg-zinc-50 text-zinc-700 font-medium py-3.5 rounded-xl transition-all active:scale-[0.98] border border-zinc-200 shadow-sm"
            >
              Sign Out
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
