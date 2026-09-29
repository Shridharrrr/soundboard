export interface AudioInputHandler {
  start: (onAudioFrame: (base64Pcm: string) => void) => Promise<void>;
  stop: () => void;
  getMicLevel: () => number;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
}

export function createAudioInputHandler(): AudioInputHandler {
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let processorNode: ScriptProcessorNode | null = null;
  let analyserNode: AnalyserNode | null = null;
  let muted = false;

  return {
    async start(onAudioFrame: (base64Pcm: string) => void) {
      if (mediaStream) return;

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      // AssemblyAI Voice Agent expects 24kHz mono PCM16
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;

      // 50ms buffer at 24kHz = 1200 samples (closest power of 2 for ScriptProcessor is 1024 or 2048)
      // We buffer samples until 1200 (50ms) to ensure exact rate
      const frameSampleCount = 1200;
      let sampleBuffer = new Float32Array(frameSampleCount);
      let bufferOffset = 0;

      processorNode = audioContext.createScriptProcessor(2048, 1, 1);

      processorNode.onaudioprocess = (e) => {
        if (muted) return;

        const inputChannel = e.inputBuffer.getChannelData(0);

        for (let i = 0; i < inputChannel.length; i++) {
          sampleBuffer[bufferOffset++] = inputChannel[i];

          if (bufferOffset === frameSampleCount) {
            // Convert Float32 to Int16 PCM
            const pcm16 = new Int16Array(frameSampleCount);
            for (let j = 0; j < frameSampleCount; j++) {
              const s = Math.max(-1, Math.min(1, sampleBuffer[j]));
              pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }

            // Convert to base64
            const uint8 = new Uint8Array(pcm16.buffer);
            let binary = '';
            for (let b = 0; b < uint8.byteLength; b++) {
              binary += String.fromCharCode(uint8[b]);
            }
            const base64 = btoa(binary);
            onAudioFrame(base64);

            // Reset buffer
            sampleBuffer = new Float32Array(frameSampleCount);
            bufferOffset = 0;
          }
        }
      };

      sourceNode.connect(analyserNode);
      analyserNode.connect(processorNode);
      processorNode.connect(audioContext.destination);
    },

    stop() {
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
      }
      if (processorNode) {
        processorNode.disconnect();
        processorNode = null;
      }
      if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        audioContext = null;
      }
      analyserNode = null;
    },

    getMicLevel(): number {
      if (!analyserNode || muted) return 0;
      const data = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      return sum / data.length / 255;
    },

    setMuted(m: boolean) {
      muted = m;
    },

    isMuted(): boolean {
      return muted;
    },
  };
}
