"use client";

import { useState } from "react";
import axios from "axios";
import { Send, X, CheckCircle2, AlertCircle, MessageSquare, BookOpen, Key, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api";

interface WebhookDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  summary: string;
}

export function WebhookDispatchModal({
  isOpen,
  onClose,
  title,
  summary,
}: WebhookDispatchModalProps) {
  const [platform, setPlatform] = useState<"slack" | "notion_api" | "notion_webhook">("slack");
  const [webhookUrl, setWebhookUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("summai_slack_webhook") || "";
    }
    return "";
  });

  // Direct Notion API credentials
  const [notionToken, setNotionToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("summai_notion_token") || "";
    }
    return "";
  });
  const [notionParentId, setNotionParentId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("summai_notion_parent_id") || "";
    }
    return "";
  });
  const [notionParentType, setNotionParentType] = useState<"database" | "page">("database");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      if (platform === "slack") {
        if (!webhookUrl.trim()) return;
        if (typeof window !== "undefined") {
          localStorage.setItem("summai_slack_webhook", webhookUrl.trim());
        }
        await axios.post(`${getApiBaseUrl()}/api/integrations/slack`, {
          webhook_url: webhookUrl.trim(),
          title: title || "Meeting Intelligence",
          summary: summary,
        });
        setStatus({
          type: "success",
          message: "Successfully posted Block Kit summary to Slack!",
        });
      } else if (platform === "notion_api") {
        if (!notionToken.trim() || !notionParentId.trim()) return;
        if (typeof window !== "undefined") {
          localStorage.setItem("summai_notion_token", notionToken.trim());
          localStorage.setItem("summai_notion_parent_id", notionParentId.trim());
        }
        await axios.post(`${getApiBaseUrl()}/api/integrations/notion`, {
          notion_api_token: notionToken.trim(),
          parent_id: notionParentId.trim(),
          parent_type: notionParentType,
          title: title || "Meeting Intelligence",
          summary: summary,
        });
        setStatus({
          type: "success",
          message: "Successfully created meeting page in Notion database!",
        });
      } else {
        if (!webhookUrl.trim()) return;
        if (typeof window !== "undefined") {
          localStorage.setItem("summai_notion_webhook", webhookUrl.trim());
        }
        await axios.post(`${getApiBaseUrl()}/api/integrations/notion`, {
          webhook_url: webhookUrl.trim(),
          title: title || "Meeting Intelligence",
          summary: summary,
        });
        setStatus({
          type: "success",
          message: "Successfully dispatched payload to Notion webhook relay!",
        });
      }

      setTimeout(() => {
        onClose();
        setStatus(null);
      }, 1800);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string }; detail?: { message?: string } } } };
      const msg =
        axiosErr.response?.data?.error?.message ||
        axiosErr.response?.data?.detail?.message ||
        `Failed to send to ${platform}. Please check your credentials or webhook URL.`;
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Dispatch to Workspace</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform Selector */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setPlatform("slack");
              const saved = typeof window !== "undefined" ? localStorage.getItem("summai_slack_webhook") || "" : "";
              setWebhookUrl(saved);
              setStatus(null);
            }}
            className={`p-2.5 rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              platform === "slack"
                ? "bg-slate-800 border-emerald-500/50 text-white shadow-md"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Slack</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPlatform("notion_api");
              setStatus(null);
            }}
            className={`p-2.5 rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              platform === "notion_api"
                ? "bg-slate-800 border-cyan-500/50 text-white shadow-md"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Notion API</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPlatform("notion_webhook");
              const saved = typeof window !== "undefined" ? localStorage.getItem("summai_notion_webhook") || "" : "";
              setWebhookUrl(saved);
              setStatus(null);
            }}
            className={`p-2.5 rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
              platform === "notion_webhook"
                ? "bg-slate-800 border-purple-500/50 text-white shadow-md"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Send className="w-4 h-4 text-purple-400" />
            <span>Relay Hook</span>
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="space-y-3.5">
          {platform === "slack" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Slack Incoming Webhook URL
              </label>
              <input
                type="url"
                required
                placeholder="https://hooks.slack.com/services/T.../B.../..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 leading-normal">
                Dispatches a formatted Block Kit message with key takeaways, agenda, and action items.
              </p>
            </div>
          )}

          {platform === "notion_api" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Notion Integration Token</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="ntn_... or secret_..."
                  value={notionToken}
                  onChange={(e) => setNotionToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Parent Database or Page ID</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="32-character Notion Database ID"
                    value={notionParentId}
                    onChange={(e) => setNotionParentId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <select
                    value={notionParentType}
                    onChange={(e) => setNotionParentType(e.target.value as "database" | "page")}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="database">Database</option>
                    <option value="page">Page</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Directly creates a native Notion page populated with formatted headings, lists, and action items.
              </p>
            </div>
          )}

          {platform === "notion_webhook" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Webhook Relay URL (Zapier / Make / n8n)
              </label>
              <input
                type="url"
                required
                placeholder="https://hook.us1.make.com/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 leading-normal">
                Dispatches a JSON structured meeting intelligence payload to your automation relay.
              </p>
            </div>
          )}

          {status && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                status.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                loading ||
                (platform === "slack" && !webhookUrl.trim()) ||
                (platform === "notion_webhook" && !webhookUrl.trim()) ||
                (platform === "notion_api" && (!notionToken.trim() || !notionParentId.trim()))
              }
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-8.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              {loading ? (
                <span>Dispatching...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    Send to {platform === "slack" ? "Slack" : platform === "notion_api" ? "Notion API" : "Relay"}
                  </span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
