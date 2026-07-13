import { useState } from 'react';
import { User, Bot, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { ContentBlock } from '../../types/claude';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: ContentBlock[];
  timestamp?: string;
}

export function MessageBubble({ role, content: rawContent, timestamp }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  // Normalize content: sometimes it's a string, an array of blocks, or an object
  const content = (() => {
    if (Array.isArray(rawContent)) return rawContent;
    if (typeof rawContent === 'string') return [{ type: 'text' as const, text: rawContent }];
    // Handle object with text property (common in some JSONL formats)
    if (rawContent && typeof rawContent === 'object' && 'text' in (rawContent as any)) {
      return [{ type: 'text' as const, text: (rawContent as any).text }];
    }
    return [];
  })();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderBlock = (block: ContentBlock, i: number) => {
    switch (block.type) {
      case 'text':
        return (
          <div key={i} className="group relative">
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
              {block.text}
            </p>
            <button
              onClick={() => handleCopy(block.text)}
              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-claude-800 transition-all"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        );

      case 'thinking':
        return (
          <details key={i} className="mt-2 rounded-lg bg-claude-950/50 border border-claude-800">
            <summary className="flex items-center gap-2 cursor-pointer px-3 py-2 text-xs text-gray-500 hover:text-gray-300 select-none">
              <ChevronRight className="h-3 w-3" />
              <span>Thinking</span>
            </summary>
            <div className="px-3 pb-2 text-xs text-gray-500 italic whitespace-pre-wrap">
              {block.thinking}
            </div>
          </details>
        );

      case 'tool_use':
        return (
          <ToolCallBlock key={i} name={block.name} input={block.input} id={block.id} />
        );

      case 'tool_result':
        return (
          <ToolResultBlock key={i} content={block.content} isError={(block as any).is_error} />
        );

      case 'image':
        return (
          <div key={i} className="mt-2 rounded-lg overflow-hidden border border-claude-800">
            <img
              src={`data:${block.source.media_type};base64,${block.source.data}`}
              alt="Message attachment"
              className="max-w-full max-h-96 object-contain"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (!content || content.length === 0) return null;

  return (
    <div className={clsx(
      'flex gap-3 px-4 py-3 rounded-xl',
      role === 'user' ? 'bg-blue-900/10 border border-blue-800/20' : 'bg-claude-900 border border-claude-800'
    )}>
      <div className={clsx(
        'flex-shrink-0 mt-0.5 rounded-full p-1.5',
        role === 'user' ? 'bg-blue-500/20' : 'bg-accent/20'
      )}>
        {role === 'user'
          ? <User className="h-4 w-4 text-blue-400" />
          : <Bot className="h-4 w-4 text-accent" />
        }
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {role === 'user' ? 'You' : 'Claude'}
          </span>
          {timestamp && (
            <span className="text-xs text-gray-700">{new Date(timestamp).toLocaleTimeString()}</span>
          )}
        </div>
        {content.map((block, i) => renderBlock(block, i))}
      </div>
    </div>
  );
}

function ToolCallBlock({ name, input, id }: { name: string; input: unknown; id: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-claude-700 bg-claude-950/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 hover:text-gray-300 hover:bg-claude-800/50 transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="font-medium text-accent">🔧 {name}</span>
        <span className="text-gray-600 font-mono">({id.slice(0, 8)})</span>
      </button>
      {expanded && (
        <pre className="px-3 pb-2 text-xs text-gray-500 overflow-x-auto">
          {JSON.stringify(input, null, 2).slice(0, 2000)}
        </pre>
      )}
    </div>
  );
}

function ToolResultBlock({ content, isError }: { content: unknown; isError?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const str = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  return (
    <div className={clsx(
      'rounded-lg border overflow-hidden',
      isError ? 'border-red-800/50 bg-red-900/10' : 'border-claude-700 bg-claude-950/50'
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className={isError ? 'text-red-400' : 'text-gray-400'}>
          📦 Tool Result {isError ? '(error)' : ''}
        </span>
        <span className="text-gray-600 ml-auto text-[10px]">
          {str.length > 100 ? `${str.length} chars` : ''}
        </span>
      </button>
      {expanded && (
        <pre className={clsx(
          'px-3 pb-2 text-xs overflow-x-auto max-h-48 overflow-y-auto',
          isError ? 'text-red-300' : 'text-gray-400'
        )}>
          {str.slice(0, 5000)}
        </pre>
      )}
    </div>
  );
}
