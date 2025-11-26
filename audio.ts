
import { AudioData } from './types';

export class AudioEngine {
  public context: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  public micGain: GainNode | null = null;
  public compressor: DynamicsCompressorNode | null = null;
  
  private micSource: MediaStreamAudioSourceNode | null = null;
  private fileSource: AudioBufferSourceNode | null = null;
  private micStream: MediaStream | null = null;
  
  private dataArray: Uint8Array;
  private waveArray: Uint8Array;
  
  public isInitialized = false;
  public isMicActive = false;
  public isFilePlaying = false;
  public sensitivity = 1.0;

  // Auto-gain tracking
  private volMax = 100; 
  private volDecay = 0.5; // Slowly decay max to adapt to quiet sections

  constructor() {
    this.dataArray = new Uint8Array(0);
    this.waveArray = new Uint8Array(0);
  }

  async initialize() {
    if (this.context) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.context = new AudioContextClass();
    
    this.analyser = this.context.createAnalyser();
    // Increase to 4096 for much better bass resolution (~10.7 Hz per bin)
    this.analyser.fftSize = 4096; 
    // Lower smoothing for snappier, more precise transient detection
    this.analyser.smoothingTimeConstant = 0.8;
    
    // --- MICROPHONE PROCESSING CHAIN ---
    // Compressor makes the mic signal "thicker" and robust against volume spikes
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -50;
    this.compressor.knee.value = 40;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0;
    this.compressor.release.value = 0.25;

    // Gain to boost potentially quiet mic signals
    this.micGain = this.context.createGain();
    this.micGain.gain.value = 2.0; 

    // Chain: MicSource -> MicGain -> Compressor -> Analyser
    this.micGain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    
    const bufferLength = this.analyser.frequencyBinCount; // 2048 bins
    this.dataArray = new Uint8Array(bufferLength);
    this.waveArray = new Uint8Array(bufferLength);
    
    this.isInitialized = true;
  }

  async toggleMicrophone(): Promise<boolean> {
    await this.initialize();
    if (!this.context || !this.analyser) return false;

    if (this.isMicActive) {
      this.stopMic();
      this.isMicActive = false;
      return false;
    } else {
      if (this.isFilePlaying) this.stopFile();
      
      try {
        // Request RAW audio without browser pre-processing (echo cancel, noise suppression)
        // This is crucial for music visualization to get the "real" sound.
        this.micStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false 
            } 
        });
        
        this.micSource = this.context.createMediaStreamSource(this.micStream);
        if (this.micGain) this.micSource.connect(this.micGain);
        
        this.isMicActive = true;
        this.resume();
        return true;
      } catch (e) {
        console.error("Microphone access denied", e);
        return false;
      }
    }
  }

  stopMic() {
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
        this.micStream = null;
      }
      if (this.micSource) {
        this.micSource.disconnect();
        this.micSource = null;
      }
  }

  async playFile(arrayBuffer: ArrayBuffer) {
    await this.initialize();
    if (!this.context || !this.analyser) return;

    try {
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      
      if (this.isMicActive) {
        this.stopMic();
        this.isMicActive = false;
      }
      this.stopFile();

      this.fileSource = this.context.createBufferSource();
      this.fileSource.buffer = audioBuffer;
      
      // File goes directly to analyser and speaker
      this.fileSource.connect(this.analyser);
      this.fileSource.connect(this.context.destination);
      
      this.fileSource.onended = () => { this.isFilePlaying = false; };
      this.fileSource.start(0);
      this.isFilePlaying = true;
      this.resume();
    } catch (e) {
      console.error("Error playing audio file", e);
    }
  }

  stopFile() {
    if (this.fileSource) {
      try { this.fileSource.stop(); this.fileSource.disconnect(); } catch (e) {}
      this.fileSource = null;
    }
    this.isFilePlaying = false;
  }

  // Helper to average a range of bins
  private getAverageVolume(array: Uint8Array, startBin: number, endBin: number): number {
      if (endBin <= startBin) return 0;
      let sum = 0;
      // Safety check for array bounds
      const safeEnd = Math.min(endBin, array.length);
      if (startBin >= safeEnd) return 0;
      
      for(let i = startBin; i < safeEnd; i++) {
          sum += array[i];
      }
      return sum / (safeEnd - startBin);
  }

  getAnalysis(): AudioData {
    if (!this.analyser || !this.isInitialized) {
      return { 
        level: 0, energy: 0, bass: 0, mid: 0, treble: 0, 
        spectrum: new Uint8Array(0), waveform: new Uint8Array(0) 
      };
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    this.analyser.getByteTimeDomainData(this.waveArray);

    const spectrum = this.dataArray;
    const waveform = this.waveArray;

    // --- FREQUENCY MAPPING (FFT Size 4096 / SampleRate 44100 -> ~10.7 Hz/bin) ---
    // Sub-Bass + Bass: 20Hz - 150Hz -> Bins 2 to 14
    // Midrange: 150Hz - 2500Hz -> Bins 14 to 233
    // Treble: 2500Hz - 15000Hz -> Bins 233 to 1400
    
    const bassRaw = this.getAverageVolume(spectrum, 2, 14); 
    const midRaw = this.getAverageVolume(spectrum, 14, 233); 
    const trebleRaw = this.getAverageVolume(spectrum, 233, 1024); // Cap high end to reduce noise
    
    // Weighted total for energy (Bass usually dominates energy perception)
    const totalRaw = (bassRaw * 1.5 + midRaw + trebleRaw * 0.5) / 3;

    // --- AUTO GAIN CONTROL (AGC) ---
    // Decay the max volume so the visualizer adapts to quieter songs/sections
    this.volMax -= this.volDecay;
    if (this.volMax < 50) this.volMax = 50; // Floor to prevent noise boosting too much

    // Update max if current levels exceed it
    if (bassRaw > this.volMax) this.volMax = bassRaw;
    if (midRaw > this.volMax) this.volMax = midRaw;
    
    // --- NORMALIZATION & DYNAMICS ---
    const process = (val: number) => {
        let n = val / this.volMax;       // Normalize 0..1 relative to recent max
        n *= this.sensitivity;           // Apply manual sensitivity
        n = Math.min(1, Math.max(0, n)); // Clamp
        return n * n;                    // Expander: Square it to make peaks "pop" and reduce background noise
    };

    const bass = process(bassRaw);
    const mid = process(midRaw);
    const treble = process(trebleRaw);
    const energy = process(totalRaw);

    return {
        level: energy,
        energy,
        bass,
        mid,
        treble,
        spectrum,
        waveform
    };
  }

  resume() {
    if (this.context?.state === 'suspended') {
      this.context.resume();
    }
  }
}

export const audioEngine = new AudioEngine();
