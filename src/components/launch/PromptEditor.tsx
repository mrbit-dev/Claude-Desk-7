import { useState } from 'react';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function PromptEditor({ value, onChange }: PromptEditorProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-300">Prompt</label>
        <span className="text-xs text-gray-500">{value.length} chars</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your prompt for Claude..."
        className="flex-1 w-full rounded-xl border border-claude-800 bg-claude-950 p-4 font-mono text-sm text-gray-200 placeholder-gray-600 resize-none focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        spellCheck={false}
        rows={12}
      />
    </div>
  );
}
