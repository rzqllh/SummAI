"use client";

import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import {
  Key,
  Shield,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Server,
  Save,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Zap,
  AudioLines,
  Cloud,
  Layers,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api";

interface PresetItem {
  id: string;
  title: string;
  description?: string;
  prompt: string;
  custom?: boolean;
}

export default function SettingsPage() {
  const [groqKey, setGroqKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [cfToken, setCfToken] = useState("");
  const [mounted, setMounted] = useState(false);

  const [showGroq, setShowGroq] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [presets, setPresets] = useState<PresetItem[]>([]);

  // Add preset form state
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [newPresetTitle, setNewPresetTitle] = useState("");
  const [newPresetPrompt, setNewPresetPrompt] = useState("");
  const [addingPreset, setAddingPreset] = useState(false);
  const [addPresetError, setAddPresetError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Server keys metadata
  const [serverKeys, setServerKeys] = useState<{
    groq_configured: boolean;
    gemini_configured: boolean;
    cloudflare_configured: boolean;
    groq_preview: string;
    gemini_preview: string;
    cloudflare_preview: string;
  }>({
    groq_configured: false,
    gemini_configured: false,
    cloudflare_configured: false,
    groq_preview: "",
    gemini_preview: "",
    cloudflare_preview: "",
  });

  // Test status states
  const [groqTest, setGroqTest] = useState<{
    status: "idle" | "testing" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });

  const [geminiTest, setGeminiTest] = useState<{
    status: "idle" | "testing" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });

  const [cfTest, setCfTest] = useState<{
    status: "idle" | "testing" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });

  useEffect(() => {
    let isMounted = true;

    const savedGroq = localStorage.getItem("SUMMAI_GROQ_KEY") || "";
    const savedGemini = localStorage.getItem("SUMMAI_GEMINI_KEY") || "";
    const savedCf = localStorage.getItem("SUMMAI_CF_TOKEN") || "";

    const timer = setTimeout(() => {
      if (isMounted) {
        setGroqKey(savedGroq);
        setGeminiKey(savedGemini);
        setCfToken(savedCf);
        setMounted(true);
      }
    }, 0);

    async function loadData() {
      try {
        const [, presetsRes, keysRes] = await Promise.all([
          axios.get(`${getApiBaseUrl()}/api/stats`),
          axios.get<{ presets?: PresetItem[] }>(`${getApiBaseUrl()}/api/presets`),
          axios.get<{
            groq_configured: boolean;
            gemini_configured: boolean;
            cloudflare_configured: boolean;
            groq_preview: string;
            gemini_preview: string;
            cloudflare_preview: string;
          }>(`${getApiBaseUrl()}/api/settings/keys`).catch(() => null),
        ]);
        if (!isMounted) return;
        setBackendStatus("online");
        setPresets(presetsRes.data.presets || []);
        if (keysRes && keysRes.data) {
          setServerKeys(keysRes.data);
        }
      } catch {
        if (isMounted) {
          setBackendStatus("offline");
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const handleTestGroq = async () => {
    setGroqTest({ status: "testing", message: "Verifying Groq API Key..." });
    try {
      const res = await axios.post<{ valid: boolean; message: string }>(
        `${getApiBaseUrl()}/api/settings/test-groq`,
        { api_key: groqKey.trim() || undefined }
      );
      if (res.data.valid) {
        setGroqTest({ status: "success", message: res.data.message });
      } else {
        setGroqTest({ status: "error", message: res.data.message });
      }
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      setGroqTest({
        status: "error",
        message: "Failed to connect: " + (axiosErr.response?.data?.detail || axiosErr.message),
      });
    }
  };

  const handleTestGemini = async () => {
    setGeminiTest({ status: "testing", message: "Verifying Gemini API Key..." });
    try {
      const res = await axios.post<{ valid: boolean; message: string }>(
        `${getApiBaseUrl()}/api/settings/test-gemini`,
        { api_key: geminiKey.trim() || undefined }
      );
      if (res.data.valid) {
        setGeminiTest({ status: "success", message: res.data.message });
      } else {
        setGeminiTest({ status: "error", message: res.data.message });
      }
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      setGeminiTest({
        status: "error",
        message: "Failed to connect: " + (axiosErr.response?.data?.detail || axiosErr.message),
      });
    }
  };

  const handleTestCloudflare = async () => {
    setCfTest({ status: "testing", message: "Verifying Cloudflare Workers AI connection..." });
    try {
      const res = await axios.post<{ valid: boolean; message: string }>(
        `${getApiBaseUrl()}/api/settings/test-cloudflare`,
        { api_key: cfToken.trim() || undefined }
      );
      if (res.data.valid) {
        setCfTest({ status: "success", message: res.data.message });
      } else {
        setCfTest({ status: "error", message: res.data.message });
      }
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      setCfTest({
        status: "error",
        message: "Failed to connect: " + (axiosErr.response?.data?.detail || axiosErr.message),
      });
    }
  };

  const handleSaveKeys = () => {
    // 1. Save strictly to local browser storage (BYOK Privacy)
    if (groqKey.trim()) {
      localStorage.setItem("SUMMAI_GROQ_KEY", groqKey.trim());
    } else {
      localStorage.removeItem("SUMMAI_GROQ_KEY");
    }

    if (geminiKey.trim()) {
      localStorage.setItem("SUMMAI_GEMINI_KEY", geminiKey.trim());
    } else {
      localStorage.removeItem("SUMMAI_GEMINI_KEY");
    }

    if (cfToken.trim()) {
      localStorage.setItem("SUMMAI_CF_TOKEN", cfToken.trim());
    } else {
      localStorage.removeItem("SUMMAI_CF_TOKEN");
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const hasAnyKey = mounted && Boolean(groqKey.trim() || geminiKey.trim() || cfToken.trim());

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Smart Auto-Detection & Fallback Routing Banner */}
      <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 bg-emerald-950/20 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Smart Auto-Detection & Resilient Fallback
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {hasAnyKey
                  ? "Using your custom browser keys as primary with automatic failover to the zero-config free pool on rate limits."
                  : "Zero-config mode active: No API keys required. All meeting processing will seamlessly route through the free-tier Cloudflare Workers AI pool."}
              </p>
            </div>
          </div>
        </div>

        {/* Resolved Pipeline Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">STT Pipeline:</span>
            <span className="text-emerald-400 font-semibold truncate ml-2">
              {mounted && groqKey.trim() ? "Groq Whisper (BYOK) → Cloudflare (Fallback)" : "Cloudflare Whisper (Zero-Config)"}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">LLM Synthesis:</span>
            <span className="text-cyan-400 font-semibold truncate ml-2">
              {mounted && geminiKey.trim() ? "Google Gemini (BYOK) → Groq/CF (Fallback)" : "Cloudflare Llama 3.3 (Zero-Config)"}
            </span>
          </div>
        </div>
      </div>

      {/* System Health Status Card */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Engine & Backend Status
              </h2>
              <p className="text-xs text-slate-400">
                FastAPI, Local SQLite DB, and Multi-Provider Routing
              </p>
            </div>
          </div>

          <div className="self-start sm:self-auto">
            {backendStatus === "online" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Backend Online (Port 8000)
              </span>
            ) : backendStatus === "offline" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                Backend Offline
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-mono">Checking...</span>
            )}
          </div>
        </div>

        {/* 3 Engine Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 text-xs">
          {/* STT Engine Box */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <AudioLines className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">STT Engines</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">Multi-Provider</span>
            </div>
            <p className="font-bold text-slate-200 text-sm">Groq Whisper + Cloudflare</p>
          </div>

          {/* LLM Synthesis Box */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="font-medium">LLM Synthesis</span>
              </div>
              <span className="text-[10px] text-cyan-400 font-semibold font-mono">Multi-Provider</span>
            </div>
            <p className="font-bold text-slate-200 text-sm">Gemini Flash + Llama 3.3 70B</p>
          </div>

          {/* Cloudflare Fallback Box */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Cloud className="w-4 h-4 text-amber-400" />
                <span className="font-medium">Zero-Config Pool</span>
              </div>
              <span className="text-[10px] text-amber-400 font-semibold font-mono">Free Priority</span>
            </div>
            <p className="font-bold text-slate-200 text-sm">Cloudflare Workers AI</p>
          </div>
        </div>
      </div>

      {/* BYOK API Key Credentials Section */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-6">
        <div className="border-b border-slate-800/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Bring-Your-Own-Key (BYOK) Credentials
              </h2>
            </div>
            <span className="text-xs text-emerald-400 font-mono self-start sm:self-auto flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Stored exclusively in browser localStorage
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Keys are never logged or stored on the server. If you leave these blank, SummAI will automatically route your requests through the zero-config free Cloudflare pool.
          </p>
        </div>

        <div className="space-y-5">
          {/* Groq Key */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Groq API Key (Fast Speech-to-Text Whisper)</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {serverKeys.groq_configured && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Host: {serverKeys.groq_preview}
                  </span>
                )}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium hover:underline"
                >
                  <span>Get Groq Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showGroq ? "text" : "password"}
                  value={groqKey}
                  onChange={(e) => {
                    setGroqKey(e.target.value);
                    setGroqTest({ status: "idle", message: "" });
                  }}
                  placeholder="Optional: gsk_... (Leave blank for zero-config Cloudflare Whisper)"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowGroq(!showGroq)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  aria-label={showGroq ? "Hide Groq key" : "Show Groq key"}
                >
                  {showGroq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleTestGroq}
                disabled={groqTest.status === "testing"}
                className="h-10 px-4 border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs rounded-xl shrink-0 w-full sm:w-auto flex items-center justify-center gap-1.5 transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0"
              >
                {groqTest.status === "testing" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1 text-amber-400" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <span>Test Connection</span>
                )}
              </Button>
            </div>

            {groqTest.status === "success" && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{groqTest.message}</span>
              </div>
            )}
            {groqTest.status === "error" && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{groqTest.message}</span>
              </div>
            )}
          </div>

          {/* Gemini Key */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Google Gemini API Key (Structured Synthesis & Intelligence)</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {serverKeys.gemini_configured && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Host: {serverKeys.gemini_preview}
                  </span>
                )}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium hover:underline"
                >
                  <span>Get Gemini Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showGemini ? "text" : "password"}
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    setGeminiTest({ status: "idle", message: "" });
                  }}
                  placeholder="Optional: AIzaSy... (Leave blank for zero-config Cloudflare Llama 3.3)"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowGemini(!showGemini)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  aria-label={showGemini ? "Hide Gemini key" : "Show Gemini key"}
                >
                  {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleTestGemini}
                disabled={geminiTest.status === "testing"}
                className="h-10 px-4 border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs rounded-xl shrink-0 w-full sm:w-auto flex items-center justify-center gap-1.5 transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0"
              >
                {geminiTest.status === "testing" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1 text-cyan-400" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <span>Test Connection</span>
                )}
              </Button>
            </div>

            {geminiTest.status === "success" && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{geminiTest.message}</span>
              </div>
            )}
            {geminiTest.status === "error" && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{geminiTest.message}</span>
              </div>
            )}
          </div>

          {/* Cloudflare Token (Optional for Self-Hosters) */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Cloudflare Workers AI API Token (Optional Dedicated Token)</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="https://dash.cloudflare.com/profile/api-tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium hover:underline"
                >
                  <span>Cloudflare Dashboard</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showCf ? "text" : "password"}
                  value={cfToken}
                  onChange={(e) => {
                    setCfToken(e.target.value);
                    setCfTest({ status: "idle", message: "" });
                  }}
                  placeholder="Optional: Personal Cloudflare Token (or use server default fallback)"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowCf(!showCf)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  aria-label={showCf ? "Hide token" : "Show token"}
                >
                  {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleTestCloudflare}
                disabled={cfTest.status === "testing"}
                className="h-10 px-4 border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs rounded-xl shrink-0 w-full sm:w-auto flex items-center justify-center gap-1.5 transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0"
              >
                {cfTest.status === "testing" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1 text-amber-400" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <span>Test Connection</span>
                )}
              </Button>
            </div>

            {cfTest.status === "success" && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{cfTest.message}</span>
              </div>
            )}
            {cfTest.status === "error" && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{cfTest.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Save Row */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
          {saveSuccess ? (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Keys saved to local browser storage!</span>
            </span>
          ) : (
            <span className="text-xs text-slate-400 flex items-center gap-1.5 leading-relaxed">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Keys are saved only in your browser. Server environment is never modified.</span>
            </span>
          )}

          <Button
            onClick={handleSaveKeys}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-10 px-5 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0 shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Keys to Browser</span>
          </Button>
        </div>
      </div>

      {/* Preset Library */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Available Prompt Presets
            </h2>
          </div>
          {!showAddPreset && (
            <button
              type="button"
              onClick={() => { setShowAddPreset(true); setAddPresetError(""); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Preset
            </button>
          )}
        </div>

        {/* Add preset inline form */}
        {showAddPreset && (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/20 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">New Custom Preset</span>
              <button
                type="button"
                onClick={() => { setShowAddPreset(false); setNewPresetTitle(""); setNewPresetPrompt(""); setAddPresetError(""); }}
                className="text-slate-400 hover:text-slate-200 p-1"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={newPresetTitle}
                onChange={(e) => setNewPresetTitle(e.target.value)}
                placeholder="Preset name (e.g. Sales Call Summary)"
                maxLength={150}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-500"
              />
              <textarea
                value={newPresetPrompt}
                onChange={(e) => setNewPresetPrompt(e.target.value)}
                placeholder="Prompt instruction sent to the LLM (roles, rules, format requirements)..."
                rows={5}
                maxLength={10000}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-500 resize-y font-mono"
              />
              <div className="flex items-center justify-between">
                {addPresetError ? (
                  <span className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {addPresetError}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    {newPresetPrompt.length}/10000
                  </span>
                )}
                <button
                  type="button"
                  disabled={addingPreset || !newPresetTitle.trim() || !newPresetPrompt.trim()}
                  onClick={async () => {
                    setAddingPreset(true);
                    setAddPresetError("");
                    try {
                      const res = await axios.post<{ preset: PresetItem }>(`${getApiBaseUrl()}/api/presets`, {
                        title: newPresetTitle.trim(),
                        prompt: newPresetPrompt.trim(),
                      });
                      setPresets((prev) => [...prev, res.data.preset]);
                      setNewPresetTitle("");
                      setNewPresetPrompt("");
                      setShowAddPreset(false);
                    } catch (err: unknown) {
                      const axErr = err as AxiosError<{ detail?: string }>;
                      setAddPresetError(axErr.response?.data?.detail || "Failed to save preset");
                    } finally {
                      setAddingPreset(false);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-colors"
                >
                  {addingPreset ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2 text-xs hover:border-slate-700 transition-colors group relative flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-slate-200 text-sm">{preset.title}</div>
                  {preset.custom && (
                    <button
                      type="button"
                      disabled={deletingId === preset.id}
                      onClick={async () => {
                        setDeletingId(preset.id);
                        try {
                          await axios.delete(`${getApiBaseUrl()}/api/presets/${preset.id}`);
                          setPresets((prev) => prev.filter((p) => p.id !== preset.id));
                        } catch {
                          // silently ignore
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      className="shrink-0 p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label={`Delete ${preset.title}`}
                    >
                      {deletingId === preset.id
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                {preset.description ? (
                  <p className="text-slate-300 text-xs leading-relaxed">
                    &quot;{preset.description}&quot;
                  </p>
                ) : (
                  <p className="text-slate-400 font-mono text-[11px] leading-relaxed line-clamp-3">
                    &quot;{preset.prompt}&quot;
                  </p>
                )}
              </div>
              {preset.custom && (
                <div className="pt-1">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-mono border border-cyan-500/20">custom</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
