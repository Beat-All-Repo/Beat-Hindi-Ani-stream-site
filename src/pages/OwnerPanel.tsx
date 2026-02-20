import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Shield, Users, Palette, MessageSquare, Crown, Trash2, Plus, Save } from "lucide-react";

export default function OwnerPanel() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"theme" | "channels" | "users" | "ads">("theme");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      toast.error("Access denied");
      navigate("/");
    }
  }, [user, isAdmin, authLoading]);

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAdmin) return null;

  const tabs = [
    { id: "theme" as const, icon: Palette, label: "Theme" },
    { id: "channels" as const, icon: MessageSquare, label: "Channels" },
    { id: "users" as const, icon: Users, label: "Users" },
    { id: "ads" as const, icon: Crown, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 container">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-primary" size={28} />
          <h1 className="font-display font-black text-2xl">Owner Panel</h1>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.id ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80 border border-border"
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "theme" && <ThemePanel />}
        {tab === "channels" && <ChannelsPanel />}
        {tab === "users" && <UsersPanel />}
        {tab === "ads" && <SettingsPanel />}
      </div>
    </div>
  );
}

function ThemePanel() {
  const [theme, setTheme] = useState({ mode: "dark", primary: "0 85% 55%", accent: "180 80% 50%" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "theme").single().then(({ data }) => {
      if (data?.value) setTheme(data.value as any);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("site_settings").update({ value: theme as any }).eq("key", "theme");
    // Apply theme live
    document.documentElement.style.setProperty("--primary", theme.primary);
    document.documentElement.style.setProperty("--accent", theme.accent);
    toast.success("Theme saved!");
    setSaving(false);
  };

  const presets = [
    { name: "Crimson", primary: "0 85% 55%", accent: "180 80% 50%" },
    { name: "Ocean", primary: "210 90% 50%", accent: "170 80% 45%" },
    { name: "Purple", primary: "270 80% 55%", accent: "320 70% 55%" },
    { name: "Green", primary: "150 80% 40%", accent: "180 60% 50%" },
    { name: "Gold", primary: "40 90% 50%", accent: "20 80% 55%" },
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-6 max-w-lg">
      <h2 className="font-display font-bold text-lg">Site Theme</h2>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Presets</label>
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p.name}
              onClick={() => setTheme({ ...theme, primary: p.primary, accent: p.accent })}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-border hover:border-primary/50 transition-colors"
              style={{ borderColor: `hsl(${p.primary})` }}
            >
              <span className="inline-block w-3 h-3 rounded-full mr-1.5" style={{ background: `hsl(${p.primary})` }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Primary Color (HSL)</label>
        <input
          value={theme.primary}
          onChange={e => setTheme({ ...theme, primary: e.target.value })}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50"
          placeholder="0 85% 55%"
        />
        <div className="mt-2 h-8 rounded-lg" style={{ background: `hsl(${theme.primary})` }} />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Accent Color (HSL)</label>
        <input
          value={theme.accent}
          onChange={e => setTheme({ ...theme, accent: e.target.value })}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50"
          placeholder="180 80% 50%"
        />
        <div className="mt-2 h-8 rounded-lg" style={{ background: `hsl(${theme.accent})` }} />
      </div>

      <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50">
        <Save size={16} /> {saving ? "Saving..." : "Save Theme"}
      </button>
    </div>
  );
}

function ChannelsPanel() {
  const [channels, setChannels] = useState<any[]>([]);
  const [newChannel, setNewChannel] = useState({ channel_id: "", channel_name: "", channel_url: "" });

  useEffect(() => {
    supabase.from("telegram_channels").select("*").order("created_at").then(({ data }) => {
      if (data) setChannels(data);
    });
  }, []);

  const addChannel = async () => {
    if (!newChannel.channel_id || !newChannel.channel_name) return;
    const { data, error } = await supabase.from("telegram_channels").insert(newChannel).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) setChannels([...channels, data]);
    setNewChannel({ channel_id: "", channel_name: "", channel_url: "" });
    toast.success("Channel added!");
  };

  const removeChannel = async (id: string) => {
    await supabase.from("telegram_channels").delete().eq("id", id);
    setChannels(channels.filter(c => c.id !== id));
    toast.success("Channel removed");
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("telegram_channels").update({ is_active: !active }).eq("id", id);
    setChannels(channels.map(c => c.id === id ? { ...c, is_active: !active } : c));
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-6 max-w-2xl">
      <h2 className="font-display font-bold text-lg">Telegram Force-Join Channels</h2>

      <div className="space-y-3">
        {channels.map(ch => (
          <div key={ch.id} className="flex items-center gap-3 bg-secondary rounded-lg px-4 py-3 border border-border">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{ch.channel_name}</p>
              <p className="text-xs text-muted-foreground">{ch.channel_id}</p>
            </div>
            <button
              onClick={() => toggleActive(ch.id, ch.is_active)}
              className={`text-xs px-3 py-1 rounded-full ${ch.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
            >
              {ch.is_active ? "Active" : "Inactive"}
            </button>
            <button onClick={() => removeChannel(ch.id)} className="text-destructive hover:text-destructive/80">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-sm font-medium flex items-center gap-2"><Plus size={14} /> Add Channel</h3>
        <input
          value={newChannel.channel_id}
          onChange={e => setNewChannel({ ...newChannel, channel_id: e.target.value })}
          placeholder="Channel ID (e.g. -1001234567890)"
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50"
        />
        <input
          value={newChannel.channel_name}
          onChange={e => setNewChannel({ ...newChannel, channel_name: e.target.value })}
          placeholder="Display Name (e.g. Beat Anime)"
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50"
        />
        <input
          value={newChannel.channel_url}
          onChange={e => setNewChannel({ ...newChannel, channel_url: e.target.value })}
          placeholder="Channel URL (e.g. https://t.me/BeatAnime)"
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50"
        />
        <button onClick={addChannel} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
          Add Channel
        </button>
      </div>
    </div>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setUsers(data);
    });
  }, []);

  const togglePremium = async (userId: string, currentPremium: boolean) => {
    await supabase.from("profiles").update({ is_premium: !currentPremium }).eq("user_id", userId);
    setUsers(users.map(u => u.user_id === userId ? { ...u, is_premium: !currentPremium } : u));
    toast.success(`User ${!currentPremium ? "upgraded to" : "removed from"} premium`);
  };

  const filteredUsers = users.filter(u =>
    !search || u.display_name?.toLowerCase().includes(search.toLowerCase()) || u.user_id.includes(search)
  );

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4 max-w-3xl">
      <h2 className="font-display font-bold text-lg">Manage Users ({users.length})</h2>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or ID..."
        className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50"
      />

      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filteredUsers.map(u => (
          <div key={u.user_id} className="flex items-center gap-3 bg-secondary rounded-lg px-4 py-3 border border-border">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{u.display_name || "No name"}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{u.user_id}</p>
            </div>
            <div className="flex items-center gap-2">
              {u.telegram_verified && (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Verified</span>
              )}
              <button
                onClick={() => togglePremium(u.user_id, u.is_premium)}
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  u.is_premium ? "bg-yellow-500/20 text-yellow-400" : "bg-secondary border border-border text-muted-foreground"
                }`}
              >
                {u.is_premium ? "★ Premium" : "Free"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [siteName, setSiteName] = useState("Beat AniStream");

  useEffect(() => {
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      data?.forEach(s => {
        if (s.key === "ads_enabled") setAdsEnabled(s.value === true || s.value === "true");
        if (s.key === "site_name") setSiteName(typeof s.value === "string" ? s.value.replace(/"/g, "") : String(s.value));
      });
    });
  }, []);

  const save = async () => {
    await supabase.from("site_settings").update({ value: adsEnabled as any }).eq("key", "ads_enabled");
    await supabase.from("site_settings").update({ value: JSON.stringify(siteName) as any }).eq("key", "site_name");
    toast.success("Settings saved!");
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-6 max-w-lg">
      <h2 className="font-display font-bold text-lg">Site Settings</h2>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Site Name</label>
        <input
          value={siteName}
          onChange={e => setSiteName(e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary/50"
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Enable Ads</p>
          <p className="text-xs text-muted-foreground">Show ads to non-premium users</p>
        </div>
        <button
          onClick={() => setAdsEnabled(!adsEnabled)}
          className={`w-12 h-6 rounded-full transition-colors relative ${adsEnabled ? "bg-primary" : "bg-secondary border border-border"}`}
        >
          <div className={`w-5 h-5 rounded-full bg-foreground absolute top-0.5 transition-transform ${adsEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
        </button>
      </div>

      <button onClick={save} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90">
        <Save size={16} /> Save Settings
      </button>
    </div>
  );
}
