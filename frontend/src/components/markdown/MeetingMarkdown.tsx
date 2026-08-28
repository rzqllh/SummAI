"use client";

import ReactMarkdown from "react-markdown";

interface MeetingMarkdownProps {
  content: string;
  className?: string;
}

export function MeetingMarkdown({ content, className = "" }: MeetingMarkdownProps) {
  return (
    <div className={`prose prose-invert prose-emerald prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          table: ({ children }) => (
            <div className="my-4 w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-900/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-slate-300 font-bold font-mono">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-slate-300 align-top leading-relaxed">
              {children}
            </td>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-white tracking-tight border-b border-slate-800 pb-2 mb-3 mt-6">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-emerald-400 tracking-tight mb-2 mt-5 flex items-center gap-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-slate-200 mb-1.5 mt-4">
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1 my-2 pl-4 list-disc marker:text-emerald-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1 my-2 pl-4 list-decimal marker:text-emerald-500">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-slate-300 text-xs leading-relaxed">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-emerald-500 bg-emerald-500/5 px-4 py-2 my-3 rounded-r-lg text-slate-300 text-xs italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
