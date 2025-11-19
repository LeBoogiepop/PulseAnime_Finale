
import p5 from 'p5';
import { audioEngine } from './audio';
import { Sketch } from './types';
import { 
  BreathingGrid, 
  FlowTrails, 
  PlexusVoronoi, 
  NoiseField,
  SilenceOfTheLambs,
  TravelShader,
  LandingPage
} from './sketches';

// --- APP STATE ---
// Main Sketches
const availableSketches: Sketch[] = [
  new BreathingGrid(),
  new SilenceOfTheLambs(), 
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
  
  if (!currentSketch.params) {
    settingsContent.innerHTML = '<div class="text-gray-500 text-xs italic text-center mt-10">Aucun paramètre pour ce sketch.</div>';
    return;
  }

  Object.keys(currentSketch.params).forEach(key => {
    const param = currentSketch.params![key];
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-1';
    
    const labelRow = document.createElement('div');
    labelRow.className = 'flex justify-between text-xs text-gray-400 uppercase font-mono';
    const label = document.createElement('span');
    label.innerText = param.name;
    const valDisplay = document.createElement('span');
    valDisplay.innerText = Number(param.value).toFixed(3);
    valDisplay.className = 'text-white';
    
    labelRow.appendChild(label);
    labelRow.appendChild(valDisplay);
    
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(param.min);
    input.max = String(param.max);
    input.step = String(param.step);
    input.value = String(param.value);
    input.className = 'w-full accent-white';
    
    input.oninput = (e: any) => {
      const val = parseFloat(e.target.value);
      param.value = val;
      valDisplay.innerText = val.toFixed(3);
      if (param.onChange) param.onChange(val);
      
      // If sketch requires re-setup on param change (e.g., Grid density), handled manually
      if (key === 'density' && currentSketch.id === 'silence' && p5Instance) {
         currentSketch.setup(p5Instance);
      }
    };
    
    container.appendChild(labelRow);
    container.appendChild(input);
    settingsContent.appendChild(container);
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
            item.className = 'flex justify-between items-center bg-white/5 p-2 border border-white/10';
            
            const label = document.createElement('span');
            label.innerText = name;
            label.className = 'text-xs text-white font-mono';
            
            const actions = document.createElement('div');
            actions.className = 'flex gap-2';
            
            const loadBtn = document.createElement('button');
            loadBtn.innerText = 'LOAD';
            loadBtn.className = 'text-[10px] text-[#00FFFF] hover:underline';
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
            delBtn.innerText = 'X';
            delBtn.className = 'text-[10px] text-red-500 hover:underline';
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
  const nextRendererMode = (currentSketch.id === 'travel' || currentSketch.id === 'landing') ? 'WEBGL' : 'P2D';

  // Update UI
  Array.from(controlsContainer.children).forEach((btn: any, i) => {
    if (i === idx) {
      btn.className = 'px-3 py-1 border border-white bg-white text-black font-bold text-xs font-mono uppercase transition-colors';
    } else {
      btn.className = 'px-3 py-1 border border-white/20 text-gray-400 text-xs font-mono uppercase hover:bg-white/10 transition-colors';
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
    btn.className = 'px-3 py-1 border border-white/20 text-gray-400 text-xs font-mono uppercase hover:bg-white/10 transition-colors';
    btn.onclick = () => switchSketch(idx);
    controlsContainer.appendChild(btn);
  });

  // Global Sensitivity
  sensitivitySlider.oninput = (e: any) => {
      const val = parseFloat(e.target.value);
      audioEngine.sensitivity = val;
      sensitivityDisplay.innerText = val.toFixed(1);
  };

  // Mic Toggle Logic
  micBtn.onclick = async () => {
    try {
        const isActive = await audioEngine.toggleMicrophone();
        if (isActive) {
          micBtn.innerText = "MICRO ON";
          // White text on active state as requested
          micBtn.classList.add('bg-white/20', 'text-white', 'border-white');
          micBtn.classList.remove('bg-white/5', 'border-white/20');
        } else {
          micBtn.innerText = "MICRO OFF";
          micBtn.classList.remove('bg-white/20', 'border-white');
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
          micBtn.classList.remove('bg-white/20', 'border-white');
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
    tabParams.classList.add('bg-white/10', 'text-white');
    tabParams.classList.remove('text-gray-500');
    tabPresets.classList.remove('bg-white/10', 'text-white');
    tabPresets.classList.add('text-gray-500');
    settingsContent.classList.remove('hidden');
    presetsContent.classList.add('hidden');
  };
  tabPresets.onclick = () => {
    tabPresets.classList.add('bg-white/10', 'text-white');
    tabPresets.classList.remove('text-gray-500');
    tabParams.classList.remove('bg-white/10', 'text-white');
    tabParams.classList.add('text-gray-500');
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
  p.preload = () => {
    mainFont = p.loadFont('https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceCodePro-Bold.otf');
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
            const bars = 20;
            const barW = w / bars;
            
            // Use a gradient
            const grad = spectrumCtx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.5, '#00FFFF');
            grad.addColorStop(1, '#FF00FF');
            spectrumCtx.fillStyle = grad;
            
            // Draw simplified bars from spectrum (skip first few low end)
            for(let i=0; i<bars; i++) {
                const idx = Math.floor(i * 2); // Skip some bins
                const val = audio.spectrum[idx] || 0;
                const percent = val / 255;
                const barH = percent * h;
                
                spectrumCtx.fillRect(i * barW, h - barH, barW - 1, barH);
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
