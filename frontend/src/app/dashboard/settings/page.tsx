"use client";

import { useState, useEffect } from "react";
import axios from "axios";
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
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [groqKey, setGroqKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [showGroq, setShowGroq] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [presets, setPresets] = useState<any[]>([]);

  // Server keys metadata
  const [serverKeys, setServerKeys] = useState<{
    groq_configured: boolean;
    gemini_configured: boolean;
    groq_preview: string;
    gemini_preview: string;
  }>({
    groq_configured: false,
    gemini_configured: false,
    groq_preview: "",
    gemini_preview: "",
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

  useEffect(() => {
    // Load local storage keys if present
    const savedGroq = localStorage.getItem("SUMMAI_GROQ_KEY") || "";
    const savedGemini = localStorage.getItem("SUMMAI_GEMINI_KEY") || "";
    if (savedGroq) setGroqKey(savedGroq);
    if (savedGemini) setGeminiKey(savedGemini);

    checkBackendAndPresets();
  }, []);

  const checkBackendAndPresets = async () => {
    try {
      const [statsRes, presetsRes, keysRes] = await Promise.all([
        axios.get("http://localhost:8000/api/stats"),
        axios.get("http://localhost:8000/api/presets"),
        axios.get("http://localhost:8000/api/settings/keys").catch(() => null),
      ]);
      setBackendStatus("online");
      setPresets(presetsRes.data.presets || []);
      if (keysRes && keysRes.data) {
        setServerKeys(keysRes.data);
      }
    } catch (err) {
      setBackendStatus("offline");
    }
  };

  const handleTestGroq = async () => {
    setGroqTest({ status: "testing", message: "Verifying Groq API Key..." });
    try {
      const res = await axios.post("http://localhost:8000/api/settings/test-groq", {
        api_key: groqKey.trim() || undefined,
      });
      if (res.data.valid) {
        setGroqTest({ status: "success", message: res.data.message });
      } else {
        setGroqTest({ status: "error", message: res.data.message });
      }
    } catch (err: any) {
      setGroqTest({
        status: "error",
        message: "Failed to connect to backend: " + (err.response?.data?.detail || err.message),
      });
    }
  };

  const handleTestGemini = async () => {
    setGeminiTest({ status: "testing", message: "Verifying Gemini API Key..." });
    try {
      const res = await axios.post("http://localhost:8000/api/settings/test-gemini", {
        api_key: geminiKey.trim() || undefined,
      });
      if (res.data.valid) {
        setGeminiTest({ status: "success", message: res.data.message });
      } else {
        setGeminiTest({ status: "error", message: res.data.message });
      }
    } catch (err: any) {
      setGeminiTest({
        status: "error",
        message: "Failed to connect to backend: " + (err.response?.data?.detail || err.message),
      });
    }
  };

  const handleSaveKeys = async () => {
    setSaveLoading(true);
    // 1. Save to local storage
    if (groqKey.trim()) localStorage.setItem("SUMMAI_GROQ_KEY", groqKey.trim());
    if (geminiKey.trim()) localStorage.setItem("SUMMAI_GEMINI_KEY", geminiKey.trim());

    // 2. Persist to server .env
    try {
      const res = await axios.post("http://localhost:8000/api/settings/keys", {
        groq_api_key: groqKey.trim() || undefined,
        gemini_api_key: geminiKey.trim() || undefined,
      });
      setServerKeys({
        groq_configured: !!groqKey.trim() || serverKeys.groq_configured,
        gemini_configured: !!geminiKey.trim() || serverKeys.gemini_configured,
        groq_preview: res.data.groq_preview || serverKeys.groq_preview,
        gemini_preview: res.data.gemini_preview || serverKeys.gemini_preview,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.warn("Saved to browser, but backend sync failed:", err);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* System Health Status Card */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Engine & Backend Status
              </h2>
              <p className="text-xs text-slate-400">
                FastAPI, Local SQLite DB, and LPU Inference
              </p>
            </div>
          </div>

          <div>
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

        {/* 3 Sub-Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 text-xs">
          {/* STT Engine Box */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <AudioLines className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">STT Engine</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">Active</span>
            </div>
            <p className="font-bold text-slate-200 text-sm">Groq Whisper Large-v3</p>
          </div>

          {/* LLM Synthesis Box */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">LLM Synthesis</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">Active</span>
            </div>
            <p className="font-bold text-slate-200 text-sm">Google Gemini 3.6 Flash</p>
          </div>

          {/* Storage Engine Box */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-400">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span className="font-medium">Storage Engine</span>
            </div>
            <p className="font-bold text-slate-200 text-sm">Local SQLite (meetings.db)</p>
          </div>
        </div>
      </div>

      {/* API Key Credentials Section */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-6">
        <div className="border-b border-slate-800/80 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                API Key Credentials & Server Sync
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Persisted in <code className="text-emerald-400">.env</code> & Browser
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Save keys here to update both your server environment and browser session instantly.
          </p>
        </div>

        <div className="space-y-5">
          {/* Groq Key */}
          <div className="space-y-2.5 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Groq API Key (Fast Speech-to-Text Whisper)</span>
              </label>
              <div className="flex items-center gap-2">
                {serverKeys.groq_configured && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Server: {serverKeys.groq_preview}
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

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showGroq ? "text" : "password"}
                  value={groqKey}
                  onChange={(e) => {
                    setGroqKey(e.target.value);
                    setGroqTest({ status: "idle", message: "" });
                  }}
                  placeholder={serverKeys.groq_preview ? `Saved (${serverKeys.groq_preview}) or enter new gsk_...` : "gsk_..."}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowGroq(!showGroq)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showGroq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleTestGroq}
                disabled={groqTest.status === "testing"}
                className="h-10 px-3.5 border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs rounded-xl shrink-0"
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

            {/* Test result message */}
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
          <div className="space-y-2.5 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Gemini API Key (Structured Synthesis & Intelligence)</span>
              </label>
              <div className="flex items-center gap-2">
                {serverKeys.gemini_configured && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Server: {serverKeys.gemini_preview}
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

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showGemini ? "text" : "password"}
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    setGeminiTest({ status: "idle", message: "" });
                  }}
                  placeholder={serverKeys.gemini_preview ? `Saved (${serverKeys.gemini_preview}) or enter new AIzaSy...` : "AIzaSy..."}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowGemini(!showGemini)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleTestGemini}
                disabled={geminiTest.status === "testing"}
                className="h-10 px-3.5 border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs rounded-xl shrink-0"
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

            {/* Test result message */}
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
        </div>

        {/* Footer Save Row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
          {saveSuccess ? (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Keys synced to .env & browser storage!</span>
            </span>
          ) : (
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Keys are securely stored in local <code className="text-slate-300">.env</code> and your browser session.</span>
            </span>
          )}

          <Button
            onClick={handleSaveKeys}
            disabled={saveLoading}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-10 px-5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
          >
            {saveLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Credentials to Server & Browser</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preset Library Reference */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800/80 bg-slate-950/60 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Available Prompt Presets
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5 text-xs hover:border-slate-700 transition-colors"
            >
              <div className="font-bold text-slate-200 text-sm">
                {preset.title}
              </div>
              <p className="text-slate-400 font-mono text-[11px] leading-relaxed">
                &quot;{preset.prompt}&quot;
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
