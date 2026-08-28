"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Folder, Plus, Trash2, X, FolderOpen, Tag, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api";

export interface FolderItem {
  id: number;
  name: string;
  color: string;
  created_at: string;
  meeting_count?: number;
}

export interface TagItem {
  id: number;
  name: string;
  color: string;
  created_at?: string;
  meeting_count?: number;
}

interface FolderManagerBarProps {
  selectedFolderId: number | null;
  onSelectFolder: (id: number | null) => void;
  selectedTagId?: number | null;
  onSelectTag?: (id: number | null) => void;
}

const FOLDER_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];
const TAG_COLORS = ["#38bdf8", "#a855f7", "#34d399", "#f43f5e", "#fb923c", "#facc15"];

export function FolderManagerBar({
  selectedFolderId,
  onSelectFolder,
  selectedTagId = null,
  onSelectTag,
}: FolderManagerBarProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);

  // Folder creation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);

  // Tag creation
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const [loading, setLoading] = useState(false);

  const loadFolders = () => {
    axios
      .get<{ folders: FolderItem[] }>(`${getApiBaseUrl()}/api/folders`)
      .then((res) => setFolders(res.data.folders || []))
      .catch(() => {});
  };

  const loadTags = () => {
    axios
      .get<{ tags: TagItem[] }>(`${getApiBaseUrl()}/api/tags`)
      .then((res) => setTags(res.data.tags || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadFolders();
    loadTags();
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${getApiBaseUrl()}/api/folders`, {
        name: newFolderName.trim(),
        color: newFolderColor,
      });
      setNewFolderName("");
      setIsCreatingFolder(false);
      loadFolders();
    } catch (err) {
      console.error("Failed to create folder", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this folder? Meetings inside will be unassigned.")) return;

    try {
      await axios.delete(`${getApiBaseUrl()}/api/folders/${folderId}`);
      if (selectedFolderId === folderId) {
        onSelectFolder(null);
      }
      loadFolders();
    } catch (err) {
      console.error("Failed to delete folder", err);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${getApiBaseUrl()}/api/tags`, {
        name: newTagName.trim(),
        color: newTagColor,
      });
      setNewTagName("");
      setIsCreatingTag(false);
      loadTags();
    } catch (err) {
      console.error("Failed to create tag", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this tag?")) return;

    try {
      await axios.delete(`${getApiBaseUrl()}/api/tags/${tagId}`);
      if (selectedTagId === tagId && onSelectTag) {
        onSelectTag(null);
      }
      loadTags();
    } catch (err) {
      console.error("Failed to delete tag", err);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* 1. Folders Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300">
            <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
            Project Folders
          </span>
          <button
            type="button"
            onClick={() => {
              setIsCreatingFolder(true);
              setIsCreatingTag(false);
            }}
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[10px] cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>New Folder</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => onSelectFolder(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
              selectedFolderId === null
                ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                : "bg-slate-900/60 text-slate-400 border border-slate-800/80 hover:text-white hover:border-slate-700"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>All Folders</span>
          </button>

          {folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            return (
              <div
                key={folder.id}
                onClick={() => onSelectFolder(isSelected ? null : folder.id)}
                className={`group px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? "bg-slate-800 text-white border-slate-700 shadow-sm"
                    : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-white hover:border-slate-700"
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: folder.color || "#10b981" }}
                />
                <span className="truncate max-w-[130px]">{folder.name}</span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteFolder(folder.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-0.5 rounded ml-0.5"
                  title="Delete folder"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Tags Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            Topic Tags
          </span>
          <button
            type="button"
            onClick={() => {
              setIsCreatingTag(true);
              setIsCreatingFolder(false);
            }}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[10px] cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>New Tag</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {onSelectTag && (
            <button
              type="button"
              onClick={() => onSelectTag(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all shrink-0 cursor-pointer border ${
                selectedTagId === null
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                  : "bg-slate-900/50 text-slate-400 border-slate-800/80 hover:text-white"
              }`}
            >
              <Hash className="w-3 h-3" />
              <span>All Tags</span>
            </button>
          )}

          {tags.map((t) => {
            const isSelected = selectedTagId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onSelectTag && onSelectTag(isSelected ? null : t.id)}
                className={`group px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-sm"
                    : "bg-slate-900/50 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: t.color || "#38bdf8" }}
                />
                <span className="truncate max-w-[120px]">#{t.name}</span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteTag(t.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-0.5 rounded ml-0.5"
                  title="Delete tag"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Inline Create Folder Form */}
      {isCreatingFolder && (
        <form
          onSubmit={handleCreateFolder}
          className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 animate-in fade-in duration-150 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-emerald-400" />
              <span>Create Project Folder</span>
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <input
              type="text"
              placeholder="e.g. Q3 Roadmap, Client Alpha, Research"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              required
              className="w-full sm:flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />

            <div className="flex items-center gap-1.5 shrink-0">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewFolderColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    newFolderColor === c ? "scale-125 ring-2 ring-white/50" : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={loading || !newFolderName.trim()}
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-8 px-3.5 rounded-xl shrink-0"
            >
              <span>Save Folder</span>
            </Button>
          </div>
        </form>
      )}

      {/* 4. Inline Create Tag Form */}
      {isCreatingTag && (
        <form
          onSubmit={handleCreateTag}
          className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 animate-in fade-in duration-150 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span>Create Topic Tag</span>
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingTag(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <input
              type="text"
              placeholder="e.g. backend, urgent, design-sync"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              required
              className="w-full sm:flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex items-center gap-1.5 shrink-0">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewTagColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    newTagColor === c ? "scale-125 ring-2 ring-white/50" : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={loading || !newTagName.trim()}
              className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-8 px-3.5 rounded-xl shrink-0"
            >
              <span>Save Tag</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
