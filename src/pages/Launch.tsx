import { useState, useCallback, useEffect, useRef } from 'react';
import { Rocket, Square } from 'lucide-react';
import { PromptEditor } from '../components/launch/PromptEditor';
import { LaunchConfig } from '../components/launch/LaunchConfig';
import { OutputConsole, OutputLine } from '../components/launch/OutputConsole';
import { useWebSocket } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

type LaunchStatus = 'idle' | 'running' | 'done' | 'error';

export default function Launch() {
  const { subscribe, send } = useWebSocket();

  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [effort, setEffort] = useState('');
  const [cwd, setCwd] = useState('');
  const [status, setStatus] = useState<LaunchStatus>('idle');
  const [outputLines, setOutputLines] = useState<OutputLine[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // WebSocket event handlers
  useEffect(() => {
    const unsubOutput = subscribe('launch:output', (event: any) => {
      setOutputLines(prev => [...prev, {
        id: uuidv4(),
        text: event.text,
        stream: event.stream || 'stdout',
        timestamp: Date.now(),
      }]);
    });

    const unsubDone = subscribe('launch:done', (event: any) => {
      setStatus('done');
      setExitCode(event.exitCode);
      setDuration(event.duration);
      setIsLoading(false);
      if (event.exitCode === 0) {
        toast.success('Session completed');
      } else {
        toast.error(`Session exited with code ${event.exitCode}`);
      }
    });

    const unsubError = subscribe('launch:error', (event: any) => {
      setStatus('error');
      setOutputLines(prev => [...prev, {
        id: uuidv4(),
        text: `Error: ${event.error}`,
        stream: 'error',
        timestamp: Date.now(),
      }]);
      setIsLoading(false);
      toast.error('Session error');
    });

    return () => {
      unsubOutput();
      unsubDone();
      unsubError();
    };
  }, [subscribe]);

  const handleLaunch = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    setStatus('running');
    setOutputLines([]);
    setExitCode(null);
    setDuration(0);

    try {
      const response = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: model || undefined,
          effort: effort || undefined,
          cwd: cwd || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Launch failed');
      }

      const data = await response.json();
      setSessionId(data.sessionId);

      // Subscribe to this session's launch events
      send({ type: 'subscribe:launch', sessionId: data.sessionId });
    } catch (error: any) {
      setStatus('error');
      setOutputLines(prev => [...prev, {
        id: uuidv4(),
        text: `Failed to launch: ${error.message}`,
        stream: 'error',
        timestamp: Date.now(),
      }]);
      setIsLoading(false);
    }
  }, [prompt, model, effort, cwd, send]);

  const handleCancel = useCallback(async () => {
    if (sessionId) {
      send({ type: 'launch:cancel', sessionId });
      setStatus('done');
      setIsLoading(false);
      toast('Session cancelled');
    }
  }, [sessionId, send]);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setOutputLines([]);
    setSessionId(null);
    setExitCode(null);
    setDuration(0);
  }, []);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Launch Session</h2>
          <p className="mt-1 text-sm text-gray-500">
            Send a prompt to Claude Code and see the output in real-time
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left: Prompt + Config */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Prompt editor */}
          <div className="flex-1 min-h-[200px] rounded-xl border border-claude-800 bg-claude-900 p-4">
            <PromptEditor value={prompt} onChange={setPrompt} />
          </div>
        </div>

        {/* Right: Config panel */}
        <div className="rounded-xl border border-claude-800 bg-claude-900 p-4">
          <LaunchConfig
            model={model} effort={effort} cwd={cwd}
            onModelChange={setModel}
            onEffortChange={setEffort}
            onCwdChange={setCwd}
          />

          <div className="mt-6 space-y-2">
            {(status === 'idle' || status === 'done' || status === 'error') ? (
              <button
                onClick={handleLaunch}
                disabled={isLoading || !prompt.trim()}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
                  'bg-accent text-white hover:bg-accent-dark',
                  'disabled:bg-claude-800 disabled:text-gray-500 disabled:cursor-not-allowed'
                )}
              >
                <Rocket className="h-4 w-4" />
                Launch
              </button>
            ) : (
              <button
                onClick={handleCancel}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-700 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/30"
              >
                <Square className="h-4 w-4" />
                Cancel
              </button>
            )}

            {(status === 'done' || status === 'error') && (
              <button
                onClick={handleReset}
                className="w-full rounded-lg border border-claude-700 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-claude-800 hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Output console */}
      <div className="flex-shrink-0">
        <OutputConsole
          lines={outputLines}
          status={status}
          exitCode={exitCode}
          duration={duration}
        />
      </div>
    </div>
  );
}
