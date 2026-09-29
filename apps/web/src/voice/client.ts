import { fetchSchema, fetchVoiceToken } from '../lib/api.js';
import { executeToolCall } from '../tools/handlers.js';
import { createAudioInputHandler, type AudioInputHandler } from './audio-in.js';
import { createAudioOutputHandler, type AudioOutputHandler } from './audio-out.js';

export type VoiceState = 'Idle' | 'Connecting' | 'Listening' | 'Thinking' | 'Speaking' | 'Interrupted';

export interface ToolChip {
  id: string;
  name: string;
  argsSummary: string;
  status: 'pending' | 'done' | 'error';
  errorCode?: string;
  timestamp: number;
}

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'agent';
  text: string;
  isFinal: boolean;
  interrupted?: boolean;
}

export interface VoiceClientCallbacks {
  onStateChange: (state: VoiceState) => void;
  onTranscriptUpdate: (entries: TranscriptEntry[]) => void;
  onToolChipAdd: (chip: ToolChip) => void;
  onToolChipUpdate: (id: string, update: Partial<ToolChip>) => void;
  onError: (errorMsg: string) => void;
  onMicLevel: (level: number) => void;
  onOutputLevel: (level: number) => void;
}

export class VoiceClient {
  private ws: WebSocket | null = null;
  private audioIn: AudioInputHandler;
  private audioOut: AudioOutputHandler;
  private callbacks: VoiceClientCallbacks;

  private state: VoiceState = 'Idle';
  private sessionId: string | null = null;
  private pendingTools: Array<{
    callId: string;
    chipId: string;
    promise: Promise<{ result: string; is_error: boolean }>;
  }> = [];

  private transcripts: TranscriptEntry[] = [];
  private currentUserEntry: TranscriptEntry | null = null;
  private currentAgentEntry: TranscriptEntry | null = null;

  private levelInterval: number | null = null;
  private isInterruptedTimeout: number | null = null;

  constructor(callbacks: VoiceClientCallbacks) {
    this.callbacks = callbacks;
    this.audioIn = createAudioInputHandler();
    this.audioOut = createAudioOutputHandler();
  }

  private setState(newState: VoiceState) {
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  public getState(): VoiceState {
    return this.state;
  }

  public isMuted(): boolean {
    return this.audioIn.isMuted();
  }

  public toggleMute(): boolean {
    const next = !this.audioIn.isMuted();
    this.audioIn.setMuted(next);
    return next;
  }

  public async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setState('Connecting');

    try {
      const [schema, tokenData] = await Promise.all([
        fetchSchema(),
        fetchVoiceToken(),
      ]);

      await this.audioOut.start();

      const wsUrl = `${tokenData.ws_url_base}?token=${encodeURIComponent(tokenData.token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Immediate session.update handshake
        const sessionUpdate = {
          type: 'session.update',
          session: {
            system_prompt: schema.system_prompt,
            greeting: schema.greeting,
            output: {
              voice: 'ivy',
              format: 'pcm_24k',
            },
            tools: schema.tools,
          },
        };
        this.ws?.send(JSON.stringify(sessionUpdate));
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          await this.handleServerEvent(msg);
        } catch (err) {
          console.error('[Voice WS] Error parsing message:', err, event.data);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[Voice WS Error]', err);
        this.callbacks.onError('Voice connection error occurred.');
      };

      this.ws.onclose = () => {
        this.cleanup();
      };

      // Start level monitoring
      this.levelInterval = window.setInterval(() => {
        if (this.state === 'Listening') {
          this.callbacks.onMicLevel(this.audioIn.getMicLevel());
        } else if (this.state === 'Speaking') {
          this.callbacks.onOutputLevel(this.audioOut.getOutputLevel());
        } else {
          this.callbacks.onMicLevel(0);
          this.callbacks.onOutputLevel(0);
        }
      }, 50);

    } catch (err) {
      console.error('[Voice Connect Failed]', err);
      this.setState('Idle');
      this.callbacks.onError(err instanceof Error ? err.message : String(err));
    }
  }

  private async handleServerEvent(msg: any) {
    switch (msg.type) {
      case 'session.ready': {
        this.sessionId = msg.session_id;
        this.setState('Listening');

        // Start mic stream now that session is ready
        await this.audioIn.start((base64Pcm) => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(
              JSON.stringify({
                type: 'input.audio',
                audio: base64Pcm,
              })
            );
          }
        });
        break;
      }

      case 'input.speech.started': {
        if (this.state === 'Speaking') {
          // Barge-in interruption
          this.audioOut.flush();
        }
        this.setState('Listening');
        break;
      }

      case 'input.speech.stopped': {
        this.setState('Thinking');
        break;
      }

      case 'transcript.user.delta': {
        // Replace current user line
        if (!this.currentUserEntry) {
          this.currentUserEntry = {
            id: `u-${Date.now()}`,
            role: 'user',
            text: msg.text || msg.delta || '',
            isFinal: false,
          };
          this.transcripts = [...this.transcripts, this.currentUserEntry];
        } else {
          this.currentUserEntry.text = msg.text || msg.delta || '';
          this.transcripts = [...this.transcripts];
        }
        this.callbacks.onTranscriptUpdate(this.transcripts);
        break;
      }

      case 'transcript.user': {
        if (this.currentUserEntry) {
          this.currentUserEntry.text = msg.text || this.currentUserEntry.text;
          this.currentUserEntry.isFinal = true;
          this.currentUserEntry = null;
        } else {
          this.transcripts = [
            ...this.transcripts,
            { id: `u-${Date.now()}`, role: 'user', text: msg.text || '', isFinal: true },
          ];
        }
        this.callbacks.onTranscriptUpdate(this.transcripts);
        break;
      }

      case 'reply.started': {
        this.setState('Speaking');
        this.currentAgentEntry = {
          id: `a-${Date.now()}`,
          role: 'agent',
          text: '',
          isFinal: false,
        };
        this.transcripts = [...this.transcripts, this.currentAgentEntry];
        this.callbacks.onTranscriptUpdate(this.transcripts);
        break;
      }

      case 'reply.audio': {
        if (msg.audio) {
          this.audioOut.enqueueAudioChunk(msg.audio);
        }
        break;
      }

      case 'transcript.agent.delta': {
        if (this.currentAgentEntry) {
          this.currentAgentEntry.text += (this.currentAgentEntry.text ? ' ' : '') + (msg.delta || '');
          this.transcripts = [...this.transcripts];
          this.callbacks.onTranscriptUpdate(this.transcripts);
        }
        break;
      }

      case 'transcript.agent': {
        if (this.currentAgentEntry) {
          this.currentAgentEntry.text = msg.text || this.currentAgentEntry.text;
          this.currentAgentEntry.isFinal = true;
          this.currentAgentEntry.interrupted = Boolean(msg.interrupted);
          this.currentAgentEntry = null;
          this.callbacks.onTranscriptUpdate(this.transcripts);
        }
        break;
      }

      case 'tool.call': {
        const chipId = `chip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const argsStr = Object.entries(msg.arguments || {})
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .slice(0, 2)
          .join(' · ');

        this.callbacks.onToolChipAdd({
          id: chipId,
          name: msg.name,
          argsSummary: argsStr || 'call',
          status: 'pending',
          timestamp: Date.now(),
        });

        // Run client-side tool mutation immediately
        const execPromise = executeToolCall(msg.name, msg.arguments || {})
          .then(res => {
            let parsedRes: any;
            try {
              parsedRes = JSON.parse(res.result);
            } catch {
              parsedRes = {};
            }

            if (res.is_error || parsedRes.ok === false) {
              this.callbacks.onToolChipUpdate(chipId, {
                status: 'error',
                errorCode: parsedRes.error_code || 'error',
              });
            } else {
              this.callbacks.onToolChipUpdate(chipId, { status: 'done' });
            }
            return res;
          })
          .catch(err => {
            this.callbacks.onToolChipUpdate(chipId, { status: 'error', errorCode: 'exception' });
            return { result: JSON.stringify({ ok: false, error: String(err) }), is_error: true };
          });

        this.pendingTools.push({
          callId: msg.call_id,
          chipId,
          promise: execPromise,
        });
        break;
      }

      case 'reply.done': {
        if (msg.status === 'interrupted') {
          this.audioOut.flush();
          this.pendingTools = [];

          this.setState('Interrupted');
          if (this.isInterruptedTimeout) window.clearTimeout(this.isInterruptedTimeout);
          this.isInterruptedTimeout = window.setTimeout(() => {
            this.setState('Listening');
          }, 800);
        } else {
          // Drain pending tool results and send to server
          const currentTools = [...this.pendingTools];
          this.pendingTools = [];

          if (currentTools.length > 0) {
            for (const item of currentTools) {
              const res = await item.promise;
              if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(
                  JSON.stringify({
                    type: 'tool.result',
                    call_id: item.callId,
                    result: res.result,
                    is_error: res.is_error,
                  })
                );
              }
            }
          }

          this.setState('Listening');
        }
        break;
      }

      case 'session.error': {
        console.error('[Voice Session Error]', msg);
        this.callbacks.onError(msg.message || 'Voice session error');
        break;
      }

      case 'session.ended': {
        this.cleanup();
        break;
      }
    }
  }

  public sendTextMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Offline fallback: simulate local user entry
      this.transcripts = [
        ...this.transcripts,
        { id: `u-${Date.now()}`, role: 'user', text, isFinal: true },
      ];
      this.callbacks.onTranscriptUpdate(this.transcripts);
      return;
    }

    // Text injection protocol (Section 5)
    this.ws.send(
      JSON.stringify({
        type: 'conversation.message',
        role: 'user',
        content: text,
      })
    );

    this.ws.send(
      JSON.stringify({
        type: 'reply.create',
      })
    );
  }

  public disconnect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'session.end' }));
      } catch {
        // ignore send error on close
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.levelInterval) {
      clearInterval(this.levelInterval);
      this.levelInterval = null;
    }
    if (this.isInterruptedTimeout) {
      clearTimeout(this.isInterruptedTimeout);
      this.isInterruptedTimeout = null;
    }

    this.audioIn.stop();
    this.audioOut.stop();

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    this.pendingTools = [];
    this.currentUserEntry = null;
    this.currentAgentEntry = null;
    this.setState('Idle');
  }
}
