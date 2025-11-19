
import { AudioData } from './types';

export class AudioEngine {
  public context: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private fileSource: AudioBufferSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private dataArray: Uint8Array;
  private waveArray: Uint8Array;
  
  public isInitialized = false;
  public isMicActive = false;
  public isFilePlaying = false;
  public sensitivity = 1.0;

  constructor() {
    // Initialize with empty valid arrays to prevent null access
    this.dataArray = new Uint8Array(0);
    this.waveArray = new Uint8Array(0);
  }

  async initialize() {
    if (this.context) return;

    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.context.createAnalyser();
    
    // High resolution for spectrograms
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.85;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.waveArray = new Uint8Array(bufferLength);
    
    this.isInitialized = true;
  }

  async toggleMicrophone(): Promise<boolean> {
    await this.initialize();
    if (!this.context || !this.analyser) return false;

    if (this.isMicActive) {
      // Turn OFF
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
        this.micStream = null;
      }
      if (this.micSource) {
        this.micSource.disconnect();
        this.micSource = null;
      }
      this.isMicActive = false;
      return false;
    } else {
      // Turn ON
      // If file is playing, stop it
      if (this.isFilePlaying) {
        this.stopFile();
      }

      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.micSource = this.context.createMediaStreamSource(this.micStream);
        this.micSource.connect(this.analyser);
        this.isMicActive = true;
        this.resume();
        return true;
      } catch (e) {
        console.error("Microphone access denied", e);
        return false;
      }
    }
  }

  async playFile(arrayBuffer: ArrayBuffer) {
    await this.initialize();
    if (!this.context || !this.analyser) return;

    // Decode first
    try {
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      
      // Stop mic if active
      if (this.isMicActive) {
        await this.toggleMicrophone(); // This toggles it off
      }
      // Stop current file if playing
      this.stopFile();

      this.fileSource = this.context.createBufferSource();
      this.fileSource.buffer = audioBuffer;
      this.fileSource.connect(this.analyser);
      this.fileSource.connect(this.context.destination); // So we can hear it
      this.fileSource.onended = () => {
          this.isFilePlaying = false;
      };
      this.fileSource.start(0);
      this.isFilePlaying = true;
      this.resume();
    } catch (e) {
      console.error("Error playing audio file", e);
    }
  }

  stopFile() {
    if (this.fileSource) {
      try {
        this.fileSource.stop();
        this.fileSource.disconnect();
      } catch (e) { /* ignore if already stopped */ }
      this.fileSource = null;
    }
    this.isFilePlaying = false;
  }

  getAnalysis(): AudioData {
    if (!this.analyser || !this.isInitialized || !this.dataArray) {
      return { 
        level: 0, energy: 0, bass: 0, mid: 0, treble: 0, 
        spectrum: new Uint8Array(0), waveform: new Uint8Array(0) 
      };
    }

    // Safe check to prevent null errors
    try {
        this.analyser.getByteFrequencyData(this.dataArray);
        this.analyser.getByteTimeDomainData(this.waveArray);

        const spectrum = this.dataArray;
        const waveform = this.waveArray;

        // Use subarray instead of slice for performance and safety
        // Ensure indices are within bounds
        const bassLimit = Math.min(40, spectrum.length);
        const midLimit = Math.min(150, spectrum.length);
        const trebleLimit = Math.min(500, spectrum.length);

        const bassRange = spectrum.subarray(0, bassLimit);
        const midRange = spectrum.subarray(bassLimit + 1, midLimit);
        const trebleRange = spectrum.subarray(midLimit + 1, trebleLimit);

        const avg = (arr: Uint8Array) => {
            if (arr.length === 0) return 0;
            return arr.reduce((a, b) => a + b, 0) / arr.length;
        };

        // Apply sensitivity and clamp
        const applySens = (val: number) => Math.min(1.0, val * this.sensitivity);

        const bass = applySens(avg(bassRange) / 255);
        const mid = applySens(avg(midRange) / 255);
        const treble = applySens(avg(trebleRange) / 255);
        
        // Energy is overall loudness
        const energy = (bass * 0.6 + mid * 0.3 + treble * 0.1);
        
        return {
            level: energy,
            energy,
            bass,
            mid,
            treble,
            spectrum,
            waveform
        };
    } catch (err) {
        console.warn("Audio analysis error:", err);
        return { 
            level: 0, energy: 0, bass: 0, mid: 0, treble: 0, 
            spectrum: new Uint8Array(0), waveform: new Uint8Array(0) 
        };
    }
  }

  resume() {
    if (this.context?.state === 'suspended') {
      this.context.resume();
    }
  }
}

export const audioEngine = new AudioEngine();
