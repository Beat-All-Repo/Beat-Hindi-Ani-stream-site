import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { ExternalLink, Shield, CheckCircle, AlertCircle, HelpCircle } from "lucide-react";
import logo from "@/assets/logo.png";

interface Channel {
  channel_name: string;
  channel_url: string | null;
}

export default function VerifyPage() {
  const [step, setStep] = useState<"channels" | "code">("channels");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const fnUrl = `https://beat-verification-bot.onrender.com/telegram-verify`;

  useEffect(() => {
    // Load channels
    fetch(`${fnUrl}?action=channels`)
      .then(r => r.json())
      .then(data => {
        if (data.channels?.length > 0) {
          setChannels(data.channels.map((c: any) => ({ channel_name: c.channel_name, channel_url: c.channel_url })));
        } else {
          // No channels configured, skip to code
          setStep("code");
        }
      })
      .catch(() => setStep("code"));
  }, []);

  const handleGenerateCode = () => {
    // Open Telegram bot - user sends /start to get code
    window.open("https://t.me/Beat_AniStream_hub_bot", "_blank");
    setStep("code");
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Enter a 6-digit code");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${fnUrl}?action=verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error === "invalid_code" ? "Invalid or expired code. Generate a new one." : data.error);
        return;
      }

      // Store verified status locally
      localStorage.setItem("beat-verified", JSON.stringify({
        verified: true,
        telegramUserId: data.telegram_user_id,
        code,
        verifiedAt: Date.now(),
      }));

      setSuccess(true);
      setTimeout(() => navigate("/"), 1500);
    } catch {
      setError("Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle size={64} className="text-green-500 mx-auto" />
          <h1 className="font-display font-bold text-2xl">Verified!</h1>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logo} alt="Beat AniStream" className="w-16 h-16 rounded-xl mx-auto mb-4" />
            <h1 className="font-display font-black text-3xl text-glow-red">Beat AniStream</h1>
            <p className="text-muted-foreground text-sm mt-2">Join our community to access the site</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="text-primary" size={24} />
              <h2 className="font-display font-bold text-lg">Community Verification</h2>
            </div>

            {step === "channels" && channels.length > 0 && (
              <>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Step 1: Join all our Telegram channels first
                  </p>
                  {channels.map((ch, i) => (
                    <a
                      key={i}
                      href={ch.channel_url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between bg-secondary rounded-lg px-4 py-3 border border-border hover:border-primary/50 transition-colors"
                    >
                      <span className="text-sm font-medium">{ch.channel_name}</span>
                      <ExternalLink size={16} className="text-primary" />
                    </a>
                  ))}
                </div>
                <button
                  onClick={handleGenerateCode}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-all"
                >
                  I've Joined → Generate Code
                </button>
              </>
            )}

            {step === "code" && (
              <>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {channels.length > 0 
                      ? "Step 2: Get your 6-digit code from our Telegram bot and enter it below"
                      : "Get your 6-digit code from our Telegram bot"}
                  </p>
                  
                  <a
                    href="https://t.me/Beat_AniStream_hub_bot"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#0088cc] hover:bg-[#0077b5] text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    <ExternalLink size={16} /> Open Telegram Bot
                  </a>

                  <div className="pt-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Enter 6-Digit Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle size={14} /> {error}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleVerify}
                  disabled={loading || code.length !== 6}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>Verify & Enter</>
                  )}
                </button>
              </>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By verifying, you agree to stay in our community channels.
          </p>

          <a
            href="https://t.me/Beat_Anime_Discussion"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mt-3"
          >
            <HelpCircle size={14} /> Need help? Ask in our Discussion Group
          </a>
        </div>
      </div>
    </div>
  );
}
