
import p5 from 'p5';
import { audioEngine } from './audio';
import { Sketch } from './types';
import { 
  FlowTrails, 
  PlexusVoronoi, 
  NoiseField,
  TravelShader,
  LandingPage,
  NoisePartition,
  Botanical
} from './sketches/index';

// --- APP STATE ---
// Main Sketches
const availableSketches: Sketch[] = [
  new Botanical(),
  new NoisePartition(),
  new TravelShader(),      
  new FlowTrails(),
  new PlexusVoronoi(),
  new NoiseField()
];

const landingSketch = new LandingPage();

// Initial State: Landing Page (-1 index indicates gallery)
let currentSketchIndex = -1; 
let currentSketch: Sketch = landingSketch;
let p5Instance: p5 | null = null;
// Landing page needs WEBGL for the 3D carousel
let currentRendererMode: 'P2D' | 'WEBGL' = 'WEBGL'; 
let uploadedBgImage: p5.Image | null = null;

// --- UI ELEMENTS ---
const micBtn = document.getElementById('mic-btn') as HTMLButtonElement;
const spectrumCanvas = document.getElementById('spectrum-viz') as HTMLCanvasElement;
const spectrumCtx = spectrumCanvas.getContext('2d');

const controlsContainer = document.getElementById('sketch-controls') as HTMLDivElement;
const fpsCounter = document.getElementById('fps-counter') as HTMLDivElement;
const uiLayer = document.getElementById('ui-layer') as HTMLDivElement;

// Global Sensitivity
const sensitivitySlider = document.getElementById('sensitivity-slider') as HTMLInputElement;
const sensitivityDisplay = document.getElementById('sens-val') as HTMLSpanElement;

// Upload Elements
const audioInput = document.getElementById('audio-upload') as HTMLInputElement;
const bgInput = document.getElementById('bg-upload') as HTMLInputElement;
const playAudioBtn = document.getElementById('play-audio') as HTMLButtonElement;
const stopAudioBtn = document.getElementById('stop-audio') as HTMLButtonElement;
const audioControls = document.getElementById('audio-controls') as HTMLDivElement;

// Modal & Panels
const aboutModal = document.getElementById('about-modal') as HTMLDivElement;
const btnAbout = document.getElementById('btn-about') as HTMLButtonElement;
const closeAbout = document.getElementById('close-about') as HTMLButtonElement;

const settingsPanel = document.getElementById('settings-panel') as HTMLDivElement;
// btnCustomize removed
const closeSettings = document.getElementById('close-settings') as HTMLButtonElement;

// Settings Content
const settingsContent = document.getElementById('settings-content') as HTMLDivElement;
const presetsContent = document.getElementById('presets-content') as HTMLDivElement;
const tabParams = document.getElementById('tab-params') as HTMLButtonElement;
const tabPresets = document.getElementById('tab-presets') as HTMLButtonElement;
const presetNameInput = document.getElementById('preset-name') as HTMLInputElement;
const savePresetBtn = document.getElementById('save-preset') as HTMLButtonElement;
const presetsList = document.getElementById('presets-list') as HTMLDivElement;

// --- HELPER: GENERATE SETTINGS UI ---
const generateSettingsUI = () => {
  settingsContent.innerHTML = '';
  
  // --- RESET BUTTON SECTION ---
  const resetSection = document.createElement('div');
  resetSection.className = "mb-8 pb-8 border-b border-white/10";
  
  const resetBtn = document.createElement('button');
  resetBtn.innerText = "REBOOT SYSTEM";
  resetBtn.className = "w-full py-3 bg-red-900/20 border border-red-500/30 text-red-500 text-xs font-bold tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all uppercase hover:shadow-lg";
  resetBtn.onclick = () => {
      if (p5Instance) {
          currentSketch.setup(p5Instance);
          // Slight visual feedback on reboot
          const canvas = document.querySelector('canvas');
          if(canvas) {
              canvas.style.filter = 'brightness(1.5) blur(2px)';
              setTimeout(() => { canvas.style.filter = 'none'; }, 100);
          }
      }
  };
  resetSection.appendChild(resetBtn);
  settingsContent.appendChild(resetSection);

  // --- AUDIO REACTIVITY INFO ---
  if (currentSketch.audioReactivity) {
      const infoBox = document.createElement('div');
      infoBox.className = "mb-8 p-4 border border-white/10 bg-white/5";
      
      const infoTitle = document.createElement('div');
      infoTitle.className = "text-[10px] text-gray-400 font-mono uppercase tracking-widest mb-2 flex items-center gap-2";
      infoTitle.innerHTML = `<span class="w-2 h-2 bg-white rounded-full animate-pulse"></span> IMPACT AUDIO`;
      
      const infoText = document.createElement('p');
      infoText.className = "text-xs text-gray-300 font-mono leading-relaxed";
      infoText.innerText = currentSketch.audioReactivity;
      
      infoBox.appendChild(infoTitle);
      infoBox.appendChild(infoText);
      settingsContent.appendChild(infoBox);
  }

  if (!currentSketch.params) {
    const msg = document.createElement('div');
    msg.className = 'text-gray-600 text-xs italic text-center mt-10 font-mono border border-white/5 p-4 rounded';
    msg.innerText = "NO PARAMETERS AVAILABLE";
    settingsContent.appendChild(msg);
    return;
  }

  Object.keys(currentSketch.params).forEach(key => {
    const param = currentSketch.params![key];
    
    if (param.type === 'slider') {
        const container = document.createElement('div');
        container.className = 'group mb-6';

        // Header row with Label and Value Box
        const header = document.createElement('div');
        header.className = 'flex justify-between items-end mb-2';

        const label = document.createElement('label');
        label.className = 'text-[10px] text-gray-400 font-mono uppercase tracking-widest group-hover:text-white transition-colors';
        label.innerText = param.name;

        const valDisplay = document.createElement('div');
        // Minimalist value display: White text, clean
        valDisplay.className = 'text-xs font-bold text-white font-mono px-2 py-1 min-w-[40px] text-right';
        valDisplay.innerText = Number(param.value).toFixed(2);

        header.appendChild(label);
        header.appendChild(valDisplay);

        // Slider Input
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(param.min);
        input.max = String(param.max);
        input.step = String(param.step);
        input.value = String(param.value);
        
        // Function to update gradient fill - MONOCHROME
        const updateGradient = (val: number) => {
            const min = param.min || 0;
            const max = param.max || 100;
            const percentage = ((val - min) / (max - min)) * 100;
            // White fill, Dark Gray background
            input.style.background = `linear-gradient(to right, #ffffff ${percentage}%, #333333 ${percentage}%)`;
        };
        
        // Initial update
        updateGradient(param.value);

        input.oninput = (e: any) => {
            const val = parseFloat(e.target.value);
            param.value = val;
            valDisplay.innerText = val.toFixed(2);
            updateGradient(val);
            
            if (param.onChange) param.onChange(val);
            
            // Handle special resets
            if (key === 'density' && currentSketch.id === 'silence' && p5Instance) {
                 currentSketch.setup(p5Instance);
            }
        };
        
        container.appendChild(header);
        container.appendChild(input);
        settingsContent.appendChild(container);

    } else if (param.type === 'color') {
        const container = document.createElement('div');
        container.className = 'flex flex-col gap-2 mb-6';
        
        const label = document.createElement('span');
        label.className = "text-[10px] text-gray-400 font-mono uppercase tracking-widest";
        label.innerText = param.name;
        
        const inputWrapper = document.createElement('div');
        inputWrapper.className = "relative h-8 w-full border border-white/20 hover:border-white transition-colors bg-white/5";
        
        const input = document.createElement('input');
        input.type = 'color';
        input.value = param.value;
        input.className = "absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10";
        
        const colorPreview = document.createElement('div');
        colorPreview.className = "absolute inset-0 w-full h-full pointer-events-none";
        colorPreview.style.backgroundColor = param.value;
        
        input.oninput = (e: any) => {
            param.value = e.target.value;
            colorPreview.style.backgroundColor = param.value;
            if (param.onChange) param.onChange(param.value);
        };
        
        inputWrapper.appendChild(input);
        inputWrapper.appendChild(colorPreview);
        
        container.appendChild(label);
        container.appendChild(inputWrapper);
        settingsContent.appendChild(container);
    }
  });
};

// --- HELPER: PRESETS SYSTEM ---
const loadPresetsList = () => {
    presetsList.innerHTML = '';
    const prefix = `pulseanime_preset_${currentSketch.id}_`;
    
    for(let i=0; i<localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            const name = key.replace(prefix, '');
            
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center bg-white/5 p-3 border border-white/10 hover:border-white/30 transition-colors group';
            
            const label = document.createElement('span');
            label.innerText = name;
            label.className = 'text-[10px] text-gray-300 font-mono uppercase tracking-wide';
            
            const actions = document.createElement('div');
            actions.className = 'flex gap-3';
            
            const loadBtn = document.createElement('button');
            loadBtn.innerText = 'LOAD';
            loadBtn.className = 'text-[9px] text-white font-bold opacity-50 group-hover:opacity-100 transition-opacity hover:underline';
            loadBtn.onclick = () => {
                try {
                    const saved = JSON.parse(localStorage.getItem(key)!);
                    // Apply params
                    if (currentSketch.params) {
                        Object.keys(saved).forEach(k => {
                           if(currentSketch.params![k]) currentSketch.params![k].value = saved[k];
                        });
                        generateSettingsUI();
                        // Force re-setup if needed
                        if (p5Instance) currentSketch.setup(p5Instance);
                    }
                } catch(e) { console.error(e); }
            };

            const delBtn = document.createElement('button');
            delBtn.innerText = 'DEL';
            delBtn.className = 'text-[9px] text-red-500 hover:text-red-300 font-bold opacity-50 group-hover:opacity-100 transition-opacity';
            delBtn.onclick = () => {
                localStorage.removeItem(key);
                loadPresetsList();
            };
            
            actions.appendChild(loadBtn);
            actions.appendChild(delBtn);
            item.appendChild(label);
            item.appendChild(actions);
            presetsList.appendChild(item);
        }
    }
};

savePresetBtn.onclick = () => {
    const name = presetNameInput.value.trim();
    if(!name || !currentSketch.params) return;
    
    const data: any = {};
    Object.keys(currentSketch.params).forEach(k => {
        data[k] = currentSketch.params![k].value;
    });
    
    localStorage.setItem(`pulseanime_preset_${currentSketch.id}_${name}`, JSON.stringify(data));
    presetNameInput.value = '';
    loadPresetsList();
};

// --- SKETCH SWITCHING LOGIC ---
const switchSketch = (idx: number) => {
  // Logic: If clicking the currently active sketch, toggle back to Landing (-1)
  if (currentSketchIndex === idx && idx !== -1) {
      idx = -1;
  }

  // If already gallery and requesting gallery, do nothing
  if (currentSketchIndex === -1 && idx === -1) return;

  // Determine next sketch
  if (idx === -1) {
      // Go to Gallery
      currentSketchIndex = -1;
      currentSketch = landingSketch;
  } else {
      currentSketchIndex = idx;
      currentSketch = availableSketches[idx];
  }

  // Determine Renderer
const nextRendererMode = (currentSketch.id === 'travel' || currentSketch.id === 'landing' || currentSketch.id === 'partition') ? 'WEBGL' : 'P2D';;

  // Update UI - MONOCHROME STYLES
  Array.from(controlsContainer.children).forEach((btn: any, i) => {
    if (i === idx) {
      // Active: White Background, Black Text
      btn.className = 'px-3 py-1 border border-white bg-white text-black font-bold text-xs font-mono uppercase transition-all shadow-lg';
    } else {
      // Inactive: Transparent, Gray Text
      btn.className = 'px-3 py-1 border border-white/20 text-gray-400 text-xs font-mono uppercase hover:bg-white/10 hover:text-white transition-colors';
    }
  });
  
  // Refresh Settings Panel if open
  generateSettingsUI();
  loadPresetsList();

  // P5 Context Switch
  if (nextRendererMode !== currentRendererMode) {
    if (p5Instance) {
      p5Instance.remove();
      p5Instance = null;
    }
    currentRendererMode = nextRendererMode;
    const container = document.getElementById('canvas-container');
    if (container) {
      p5Instance = new p5(sketch, container);
    }
  } else {
    if (currentSketch.cleanup) currentSketch.cleanup();
    if (p5Instance) {
       p5Instance.clear();
       p5Instance.resetMatrix();
       // Explicitly reset shader when reusing WebGL context
       if (currentRendererMode === 'WEBGL') {
          // @ts-ignore
          if (p5Instance.resetShader) p5Instance.resetShader();
       } else {
          p5Instance.imageMode(p5Instance.CORNER);
          p5Instance.rectMode(p5Instance.CORNER);
       }
       currentSketch.setup(p5Instance);
    }
  }
};

// --- INIT UI ---
const initUI = () => {
  // Generate Sketch Buttons
  availableSketches.forEach((s, idx) => {
    const btn = document.createElement('button');
    btn.innerText = s.name;
    // Initial state is unselected because we start on Landing Page (-1)
    btn.className = 'px-3 py-1 border border-white/20 text-gray-400 text-xs font-mono uppercase hover:bg-white/10 hover:text-white transition-colors';
    btn.onclick = () => switchSketch(idx);
    controlsContainer.appendChild(btn);
  });

  // Global Sensitivity
  // Initialize gradient for the global slider (Monochrome)
  const updateSensGradient = (val: number) => {
      const min = 0.1;
      const max = 3.0;
      const percentage = ((val - min) / (max - min)) * 100;
      sensitivitySlider.style.background = `linear-gradient(to right, #ffffff ${percentage}%, #333333 ${percentage}%)`;
  };
  updateSensGradient(1.0); // Init value

  sensitivitySlider.oninput = (e: any) => {
      const val = parseFloat(e.target.value);
      audioEngine.sensitivity = val;
      sensitivityDisplay.innerText = val.toFixed(1);
      updateSensGradient(val);
  };

  // Mic Toggle Logic (Keeping Red for ON AIR as requested)
  micBtn.onclick = async () => {
    try {
        const isActive = await audioEngine.toggleMicrophone();
        if (isActive) {
          micBtn.innerText = "ON AIR";
          // Active Red
          micBtn.classList.add('bg-red-900/20', 'text-red-500', 'border-red-500', 'shadow-[0_0_10px_rgba(255,0,0,0.4)]');
          micBtn.classList.remove('bg-white/5', 'border-white/20');
        } else {
          micBtn.innerText = "MICRO OFF";
          micBtn.classList.remove('bg-red-900/20', 'text-red-500', 'border-red-500', 'shadow-[0_0_10px_rgba(255,0,0,0.4)]');
          micBtn.classList.add('bg-white/5', 'text-white', 'border-white/20');
        }
    } catch (e) {
        console.error("Mic Error", e);
        micBtn.innerText = "ERR";
    }
  };
  
  // Audio File Upload
  audioInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
          const arrayBuffer = await file.arrayBuffer();
          audioEngine.playFile(arrayBuffer);
          audioControls.classList.remove('hidden');
          micBtn.innerText = "MICRO OFF";
          micBtn.classList.remove('bg-red-900/20', 'text-red-500', 'border-red-500');
          micBtn.classList.add('bg-white/5', 'text-white', 'border-white/20');
      }
  };

  playAudioBtn.onclick = () => {
      if (audioEngine.context && audioEngine.context.state === 'suspended') {
          audioEngine.context.resume();
      }
  };

  stopAudioBtn.onclick = () => {
      audioEngine.stopFile();
      audioControls.classList.add('hidden');
  };

  // BG Image Upload
  bgInput.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file && p5Instance) {
          const url = URL.createObjectURL(file);
          p5Instance.loadImage(url, (img) => {
              uploadedBgImage = img;
          });
      }
  };

  // --- Modal Logic ---
  btnAbout.onclick = () => {
    aboutModal.classList.remove('hidden');
    aboutModal.classList.add('flex');
  };
  closeAbout.onclick = () => {
    aboutModal.classList.add('hidden');
    aboutModal.classList.remove('flex');
  };

  // --- Settings Logic ---
  const toggleSettings = () => {
    // Check if it is CLOSED (hidden on left via -translate-x-full)
    const isClosed = settingsPanel.classList.contains('-translate-x-full');
    if (isClosed) {
      settingsPanel.classList.remove('-translate-x-full');
      generateSettingsUI();
      loadPresetsList();
    } else {
      settingsPanel.classList.add('-translate-x-full');
    }
  };
  // Removed btnCustomize listener, access via 'R'
  closeSettings.onclick = toggleSettings;

  // Tabs
  tabParams.onclick = () => {
    tabParams.classList.add('bg-white/5', 'text-white', 'border-white');
    tabParams.classList.remove('text-gray-500', 'border-transparent');
    tabPresets.classList.remove('bg-white/5', 'text-white', 'border-white');
    tabPresets.classList.add('text-gray-500', 'border-transparent');
    settingsContent.classList.remove('hidden');
    presetsContent.classList.add('hidden');
  };
  tabPresets.onclick = () => {
    tabPresets.classList.add('bg-white/5', 'text-white', 'border-white');
    tabPresets.classList.remove('text-gray-500', 'border-transparent');
    tabParams.classList.remove('bg-white/5', 'text-white', 'border-white');
    tabParams.classList.add('text-gray-500', 'border-transparent');
    presetsContent.classList.remove('hidden');
    settingsContent.classList.add('hidden');
  };

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.key === 'h') {
      uiLayer.style.opacity = uiLayer.style.opacity === '0' ? '1' : '0';
    }
    if (e.key === ' ') {
        if (p5Instance && p5Instance.isLooping()) p5Instance.noLoop();
        else if (p5Instance) p5Instance.loop();
    }
    if (e.key === 'm') {
        micBtn.click();
    }
    if (e.key === 'r' || e.key === 'R') {
      toggleSettings();
    }
    if (e.key === 'ArrowRight') {
      if (currentSketchIndex !== -1) {
         const nextIdx = (currentSketchIndex + 1) % availableSketches.length;
         switchSketch(nextIdx);
      }
    }
    if (e.key === 'ArrowLeft') {
       if (currentSketchIndex !== -1) {
        const prevIdx = (currentSketchIndex - 1 + availableSketches.length) % availableSketches.length;
        switchSketch(prevIdx);
       }
    }
    if (currentSketch.keyPressed && p5Instance) currentSketch.keyPressed(p5Instance, e.key);
  });
};

// --- P5 INSTANCE DEFINITION ---
const sketch = (p: p5) => {
  let mainFont: p5.Font;

  // Preload font to fix WebGL Text Error
  (p as any).preload = () => {
    // p.loadFont typically returns p5.Font, but TS might infer it as Promise in some setups or wrapper types.
    // Casting to unknown first then p5.Font solves the "Promise<Font> is missing properties" error.
    mainFont = (p.loadFont('https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceCodePro-Bold.otf') as unknown) as p5.Font;
  };

  p.setup = () => {
    const mode = currentRendererMode === 'WEBGL' ? p.WEBGL : p.P2D;
    p.createCanvas(window.innerWidth, window.innerHeight, mode);
    p.frameRate(60);
    
    // Apply font globally so text() works in WebGL
    if (mainFont) p.textFont(mainFont);
    
    currentSketch.setup(p);
  };

  p.draw = () => {
    const audio = audioEngine.getAnalysis();
    
    p.push();
    // Pass BG Image to sketch
    currentSketch.draw(p, audio, uploadedBgImage);
    p.pop();
    
    // Draw Spectrum Visualization (2D Context on top overlay)
    if (spectrumCtx && spectrumCanvas) {
        const w = spectrumCanvas.width;
        const h = spectrumCanvas.height;
        spectrumCtx.clearRect(0, 0, w, h);
        
        // Check if we have spectrum data
        if (audio.spectrum && audio.spectrum.length > 0) {
            const bars = 32;
            const barW = w / bars;
            
            // Use a gradient (Keeping as requested by user "don't touch")
            const grad = spectrumCtx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, '#00FFFF');
            grad.addColorStop(0.5, '#FFFFFF');
            grad.addColorStop(1, '#FF00FF');
            spectrumCtx.fillStyle = grad;
            
            // Draw simplified bars from spectrum (skip first few low end)
            for(let i=0; i<bars; i++) {
                const idx = Math.floor(i * 1.5); // Skip some bins
                const val = audio.spectrum[idx] || 0;
                const percent = val / 255;
                const barH = Math.max(2, percent * h);
                
                spectrumCtx.fillRect(i * barW, h - barH, barW - 2, barH);
            }
        }
    }

    if (fpsCounter && p.frameCount % 30 === 0) {
        fpsCounter.innerText = `${Math.round(p.frameRate())} FPS`;
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
    currentSketch.setup(p);
  };
  
  p.mousePressed = () => {
      if (currentSketch.mousePressed) currentSketch.mousePressed(p);
  }
};

// --- BOOTSTRAP ---
initUI();
const container = document.getElementById('canvas-container');
if (container) {
  p5Instance = new p5(sketch, container);
}
