import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Shield, CheckCircle, AlertCircle, HelpCircle, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

// Edge function URL — proxies everything to your Render bot API
const BOT_PROXY = `https://epgzewpcdqmqpnyvpfzu.supabase.co/functions/v1/telegram-verify`;

// Your Telegram bot link
const BOT_LINK = "https://t.me/Beat_AniStream_hub_bot";

export default function VerifyPage() {
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const navigate              = useNavigate();

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError("Please enter the 6-digit code you received from the bot.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BOT_PROXY}?action=verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.error === "max_devices") {
          setError(data.message || "This code is already used on 2 devices. Generate a new code from the bot.");
        } else if (data.error === "bot_unavailable") {
          setError("Verification service is temporarily unavailable. Please try again in a moment.");
        } else {
          setError("Invalid or expired code. Open the bot, send /start to get a fresh code.");
        }
        return;
      }

      // Save verified state in localStorage
      localStorage.setItem(
        "beat-verified",
        JSON.stringify({
          verified:     true,
          telegramId:   data.telegram_id,
          devicesUsed:  data.devices_used,
          devicesMax:   data.devices_max,
          code:         trimmed,
          verifiedAt:   Date.now(),
        })
      );

      setSuccess(true);
      setTimeout(() => navigate("/"), 1500);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle size={64} className="text-green-500 mx-auto" />
          <h1 className="font-display font-bold text-2xl">Verified!</h1>
          <p className="text-muted-foreground">Redirecting to Beat AniStream…</p>
        </div>
      </div>
    );
  }

  // ── Main verify screen ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center">
          <img src={logo} alt="Beat AniStream" className="w-16 h-16 rounded-xl mx-auto mb-4" />
          <h1 className="font-display font-black text-3xl text-glow-red">Beat AniStream</h1>
          <p className="text-muted-foreground text-sm mt-1">Join our Telegram community to get access</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">

          <div className="flex items-center gap-3">
            <Shield className="text-primary" size={22} />
            <h2 className="font-display font-bold text-lg">Community Verification</h2>
          </div>

          {/* Steps */}
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary shrink-0">①</span>
              Open the Telegram bot below and join all required channels
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary shrink-0">②</span>
              Send <code className="bg-secondary px-1 rounded text-xs">/start</code> to the bot — it will generate your 6-digit code
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary shrink-0">③</span>
              Enter that code below to unlock the site
            </li>
          </ol>

          {/* Open bot button */}
          <a
            href={BOT_LINK}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 bg-[#0088cc] hover:bg-[#0077b5] text-white font-semibold py-3 rounded-lg transition-colors w-full"
          >
            <ExternalLink size={16} />
            Open Telegram Bot
          </a>

          {/* Code input */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Enter Your 6-Digit Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => {
                setError("");
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              }}
              onKeyDown={e => e.key === "Enter" && handleVerify()}
              placeholder="000000"
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Verifying…</>
              : "Verify & Enter"
            }
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          By verifying, you agree to stay in our community channels.
          Your code becomes invalid if you leave.
        </p>

        <a
          href="https://t.me/Beat_Anime_Discussion"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <HelpCircle size={14} /> Need help? Ask in our Discussion Group
        </a>

      </div>
    </div>
  );
}
