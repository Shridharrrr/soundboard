export interface AudioOutputHandler {
  start: () => Promise<void>;
  enqueueAudioChunk: (base64Pcm: string) => void;
  flush: () => void;
  stop: () => void;
  getOutputLevel: () => number;
}

export function createAudioOutputHandler(): AudioOutputHandler {
  let audioContext: AudioContext | null = null;
  let analyserNode: AnalyserNode | null = null;
  let nextPlayTime = 0;
  const activeSources: AudioBufferSourceNode[] = [];

  const initContext = async () => {
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  };

  return {
    async start() {
      await initContext();
      nextPlayTime = audioContext ? audioContext.currentTime : 0;
    },

    enqueueAudioChunk(base64Pcm: string) {
      if (!audioContext || !analyserNode) return;

      const binary = atob(base64Pcm);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] < 0 ? pcm16[i] / 0x8000 : pcm16[i] / 0x7fff;
      }

      const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserNode);

      const now = audioContext.currentTime;
      if (nextPlayTime < now) {
        nextPlayTime = now + 0.02; // slight 20ms jitter buffer
      }

      source.start(nextPlayTime);
      nextPlayTime += audioBuffer.duration;
      activeSources.push(source);

      source.onended = () => {
        const idx = activeSources.indexOf(source);
        if (idx !== -1) activeSources.splice(idx, 1);
      };
    },

    flush() {
      for (const s of activeSources) {
        try {
          s.stop();
          s.disconnect();
        } catch {
          // ignore already stopped sources
        }
      }
      activeSources.length = 0;
      if (audioContext) {
        nextPlayTime = audioContext.currentTime;
      }
    },

    stop() {
      this.flush();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        audioContext = null;
      }
      analyserNode = null;
    },

    getOutputLevel(): number {
      if (!analyserNode) return 0;
      const data = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      return sum / data.length / 255;
    },
  };
}
