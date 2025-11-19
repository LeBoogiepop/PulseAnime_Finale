
import p5 from 'p5';
import { Sketch, AudioData, PALETTES, SketchParams } from './types';

// --- UTILS ---
const getPalette = (idx: number) => PALETTES[idx % PALETTES.length];

// Helper for background drawing
const drawBackground = (p: p5, bgImage?: p5.Image | null, opacity: number = 20) => {
  if (bgImage) {
    p.push();
    p.imageMode(p.CORNER);
    p.tint(255, opacity + 10);
    p.image(bgImage, 0, 0, p.width, p.height);
    p.pop();
    p.background(0, 255 - (opacity + 30)); 
  } else {
    p.background(10);
  }
};

// --- SKETCH 1: BREATHING GRID ---
export class BreathingGrid implements Sketch {
  id = 'breathing_grid';
  name = 'Grille Respirante';
  
  params: SketchParams = {
      speed: { type: 'slider', value: 0.005, min: 0.001, max: 0.02, step: 0.001, name: 'Vitesse' },
      noiseScale: { type: 'slider', value: 0.003, min: 0.001, max: 0.01, step: 0.001, name: 'Échelle Bruit' },
      distortion: { type: 'slider', value: 200, min: 50, max: 500, step: 10, name: 'Distortion Audio' },
      connectionDist: { type: 'slider', value: 40, min: 10, max: 100, step: 5, name: 'Distance Liens' }
  };

  private rows = 40;
  private cols = 40;
  private nodes: {x: number, y: number, ox: number, oy: number}[][] = [];
  private colorIdx = 0;

  setup(p: p5) {
    this.nodes = [];
    const margin = 100;
    const w = p.width - margin * 2;
    const h = p.height - margin * 2;
    
    for(let r = 0; r < this.rows; r++) {
      this.nodes[r] = [];
      for(let c = 0; c < this.cols; c++) {
        // Use P2D friendly coords
        const x = margin + (c / (this.cols-1)) * w;
        const y = margin + (r / (this.rows-1)) * h;
        this.nodes[r][c] = { x, y, ox: x, oy: y };
      }
    }
    this.colorIdx = Math.floor(p.random(PALETTES.length));
  }

  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    drawBackground(p, bgImage);
    const palette = getPalette(this.colorIdx);
    
    const speed = this.params.speed.value;
    const nScale = this.params.noiseScale.value;
    const distFactor = this.params.distortion.value;
    const connDist = this.params.connectionDist.value;

    const t = p.frameCount * speed;
    const amp = audio.level * distFactor;
    
    p.strokeWeight(2);
    
    for(let r = 0; r < this.rows; r++) {
      for(let c = 0; c < this.cols; c++) {
        const node = this.nodes[r][c];
        
        const nx = (node.ox * nScale) + t;
        const ny = (node.oy * nScale) + t;
        
        const noiseVal = p.noise(nx, ny, t * 0.5);
        const angle = noiseVal * p.TWO_PI * 2;
        
        const dist = (amp + 20) * noiseVal;
        node.x = node.ox + Math.cos(angle) * dist;
        node.y = node.oy + Math.sin(angle) * dist;
        
        const colVal = p.map(noiseVal + audio.bass, 0, 2, 0, 1);
        // Monochromatic lerp for modern look
        const col = p.lerpColor(p.color(255), p.color(100), colVal);
        
        p.stroke(col);
        p.point(node.x, node.y);
        
        if (c > 0) {
           const left = this.nodes[r][c-1];
           if (p.dist(node.x, node.y, left.x, left.y) < connDist + amp) {
             p.strokeWeight(1);
             p.stroke(p.red(col), p.green(col), p.blue(col), 50);
             p.line(node.x, node.y, left.x, left.y);
           }
        }
      }
    }
  }
  
  cleanup() {}
  mousePressed(p: p5) { this.colorIdx++; }
}

// --- SKETCH 3: FLOW TRAILS ---
class Particle {
  pos: p5.Vector;
  vel: p5.Vector;
  acc: p5.Vector;
  history: p5.Vector[];
  maxHistory = 10;
  
  constructor(p: p5) {
    this.pos = p.createVector(p.random(p.width), p.random(p.height));
    this.vel = p.createVector(0,0);
    this.acc = p.createVector(0,0);
    this.history = [];
  }
  
  update(p: p5, audio: AudioData, flowScale: number, speedMult: number, traceLen: number) {
    const t = p.frameCount * 0.01;
    const n = p.noise(this.pos.x * flowScale, this.pos.y * flowScale, t);
    const angle = n * p.TWO_PI * 4;
    
    this.acc = p5.Vector.fromAngle(angle);
    this.acc.mult(0.5 + audio.mid);
    
    this.vel.add(this.acc);
    this.vel.limit((4 + audio.bass * 10) * speedMult);
    this.pos.add(this.vel);
    
    if(this.pos.x > p.width) { this.pos.x = 0; this.history = []; }
    if(this.pos.x < 0) { this.pos.x = p.width; this.history = []; }
    if(this.pos.y > p.height) { this.pos.y = 0; this.history = []; }
    if(this.pos.y < 0) { this.pos.y = p.height; this.history = []; }
    
    this.history.push(this.pos.copy());
    if(this.history.length > traceLen) this.history.shift();
  }
  
  show(p: p5, audio: AudioData) {
    p.noFill();
    p.beginShape();
    for(let i=0; i<this.history.length; i++) {
      const pos = this.history[i];
      const alpha = p.map(i, 0, this.history.length, 0, 255);
      // White/Grey theme
      p.stroke(255, 255, 255, alpha);
      if (audio.bass > 0.5) p.stroke(200, 200, 200, alpha);
      p.vertex(pos.x, pos.y);
    }
    p.endShape();
  }
}

export class FlowTrails implements Sketch {
  id = 'flow_trails';
  name = 'Flux de Particules';

  params: SketchParams = {
      flowScale: { type: 'slider', value: 0.005, min: 0.001, max: 0.02, step: 0.001, name: 'Échelle Flux' },
      speed: { type: 'slider', value: 1.0, min: 0.1, max: 3.0, step: 0.1, name: 'Vitesse Particules' },
      traceLength: { type: 'slider', value: 10, min: 2, max: 50, step: 1, name: 'Longueur Traînée' },
  };

  particles: Particle[] = [];
  
  setup(p: p5) {
    this.particles = [];
    for(let i=0; i<300; i++) {
      this.particles.push(new Particle(p));
    }
  }
  
  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    if (bgImage) {
       drawBackground(p, bgImage, 20);
    } else {
       p.background(0, 20); 
    }
    
    const fs = this.params.flowScale.value;
    const sp = this.params.speed.value;
    const tl = this.params.traceLength.value;

    for(let pt of this.particles) {
      pt.update(p, audio, fs, sp, tl);
      pt.show(p, audio);
    }
  }
  cleanup() {}
}

// --- SKETCH 5: PLEXUS VORONOI ---
export class PlexusVoronoi implements Sketch {
  id = 'plexus';
  name = 'Réseau Plexus';
  
  params: SketchParams = {
      threshold: { type: 'slider', value: 150, min: 50, max: 300, step: 10, name: 'Seuil Connexion' },
      pointSize: { type: 'slider', value: 4, min: 1, max: 10, step: 0.5, name: 'Taille Points' },
      speed: { type: 'slider', value: 1, min: 0.1, max: 5, step: 0.1, name: 'Vitesse' }
  };

  points: {pos: p5.Vector, vel: p5.Vector}[] = [];
  
  setup(p: p5) {
    this.points = [];
    for(let i=0; i<80; i++) {
      this.points.push({
        pos: p.createVector(p.random(p.width), p.random(p.height)),
        vel: p.createVector(p.random(-1,1), p.random(-1,1))
      });
    }
  }
  
  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    drawBackground(p, bgImage);
    
    const thresh = this.params.threshold.value + audio.level * 200;
    const pSize = this.params.pointSize.value;
    const spd = this.params.speed.value;

    for(let pt of this.points) {
      // Apply custom speed
      pt.pos.add(p5.Vector.mult(pt.vel, spd));

      if(pt.pos.x < 0 || pt.pos.x > p.width) pt.vel.x *= -1;
      if(pt.pos.y < 0 || pt.pos.y > p.height) pt.vel.y *= -1;
      
      if(audio.treble > 0.3) {
        pt.pos.x += p.random(-2, 2);
        pt.pos.y += p.random(-2, 2);
      }
      p.stroke(255);
      p.strokeWeight(pSize);
      p.point(pt.pos.x, pt.pos.y);
    }
    
    p.strokeWeight(1);
    
    for(let i=0; i<this.points.length; i++) {
      for(let j=i+1; j<this.points.length; j++) {
        let d = p.dist(this.points[i].pos.x, this.points[i].pos.y, this.points[j].pos.x, this.points[j].pos.y);
        if(d < thresh) {
          let alpha = p.map(d, 0, thresh, 255, 0);
          p.stroke(255, 255, 255, alpha);
          p.line(this.points[i].pos.x, this.points[i].pos.y, this.points[j].pos.x, this.points[j].pos.y);
        }
      }
    }
  }
  cleanup() {}
}

// --- SKETCH 7: NOISE ABSTRACT ---
export class NoiseField implements Sketch {
  id = 'noise_abstract';
  name = 'Champ de Bruit';
  
  params: SketchParams = {
      resolution: { type: 'slider', value: 20, min: 5, max: 50, step: 5, name: 'Résolution' },
      noiseScale: { type: 'slider', value: 0.1, min: 0.01, max: 0.5, step: 0.01, name: 'Échelle Bruit' },
      speed: { type: 'slider', value: 0.02, min: 0.001, max: 0.1, step: 0.001, name: 'Vitesse' }
  };

  setup(p: p5) {}
  
  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    if (bgImage) {
        p.image(bgImage, 0, 0, p.width, p.height);
        p.background(0, 200); 
    } else {
        p.background(0); 
    }

    const res = this.params.resolution.value;
    const ns = this.params.noiseScale.value;
    const spd = this.params.speed.value;

    p.noStroke();
    const cols = Math.ceil(p.width / res);
    const rows = Math.ceil(p.height / res);
    const t = p.frameCount * spd;
    
    for(let y=0; y<rows; y++) {
      for(let x=0; x<cols; x++) {
         const n = p.noise(x * ns, y * ns, t + audio.bass);
         
         p.fill(n * 255, 200);
         p.rect(x*res, y*res, res, res);
      }
    }
  }
  cleanup() {}
}

// --- SKETCH 8: THE SILENCE OF THE LAMBS ---
class LambNode {
  x: number; y: number; mx: number; my: number; life: number;
  constructor(x: number, y: number, p: p5) {
    this.x = x; this.y = y; this.mx = x; this.my = y;
    this.life = p.random(3);
  }
  reset(p: p5) {
    this.x = this.mx; this.y = this.my;
    this.life = p.random(3);
  }
}

export class SilenceOfTheLambs implements Sketch {
  id = 'silence';
  name = 'Le Silence';
  
  params: SketchParams = {
      noiseScale: { type: 'slider', value: 0.01, min: 0.001, max: 0.05, step: 0.001, name: 'Chaos' },
      reactivity: { type: 'slider', value: 1.0, min: 0.1, max: 3.0, step: 0.1, name: 'Réactivité' },
      density: { type: 'slider', value: 50, min: 20, max: 100, step: 5, name: 'Densité (Reset)' },
  };

  private nodes: LambNode[][] = [];
  private cols = 50;
  private rows = 50;
  private wOff = 200;
  private hOff = 200;
  private xoff = 0;
  private yoff = 0;
  private bloodColor: p5.Color | null = null;

  setup(p: p5) {
    this.cols = this.params.density.value; // Use param
    this.rows = Math.floor(this.cols * 0.66);

    this.xoff = (p.width - this.wOff) / this.cols;
    this.yoff = (p.height - this.hOff) / this.rows;
    this.bloodColor = p.color(p.random(['#FFFFFF', '#CCCCCC', '#AAAAAA']));
    
    this.nodes = [];
    for(let r=0; r<this.rows; r++) {
      this.nodes[r] = [];
      for(let c=0; c<this.cols; c++) {
        // Absolute coords for P2D
        const baseX = (p.width - (this.cols * this.xoff))/2;
        const baseY = (p.height - (this.rows * this.yoff))/2;
        this.nodes[r][c] = new LambNode(baseX + c * this.xoff, baseY + r * this.yoff, p);
      }
    }
  }

  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    drawBackground(p, bgImage, 50);
    
    const ns = this.params.noiseScale.value;
    const react = this.params.reactivity.value;

    const t = (p.frameCount / 60) % 100; 
    const amp = audio.level * react;
    
    let weiCtrl = p.lerp(
      p.noise(t * 0.1, t * 0.1) * p.width + amp * 500,
      p.width / 2,
      Math.sin(t * 0.5) * 0.5 + 0.5
    );

    // No push/pop translate, nodes are absolute
    if (!this.bloodColor) this.bloodColor = p.color('#FFF');
    const dotColor = p.lerpColor(p.color(0), this.bloodColor, 0.5 - 0.5 * Math.cos(2 * t + amp * 5));
    dotColor.setAlpha(100 + amp * 155);
    p.stroke(dotColor);
    p.strokeWeight(2);

    const nz = p.frameCount * ns;
    
    for(let c=0; c<this.cols; c++) {
      for(let r=0; r<this.rows; r++) {
        const node = this.nodes[r][c];
        const nx = node.x * ns;
        const ny = node.y * ns;
        
        const dx = p.noise(nx + 300, ny + 500, nx + ny + nz) * 2 - 1;
        const dy = p.noise(nx + 100, ny + 300, nx + ny + nz) * 2 - 1;
        
        const range = 20 + audio.bass * 50;
        let wei = p.map(weiCtrl, 0, p.width, -range, range); 
        
        const osc = Math.sin(t + amp * Math.PI);
        node.mx = node.x + dx * wei * 2 * osc;
        node.my = node.y + dy * wei * 2 * osc;
        p.point(node.mx, node.my);
        
        if (audio.energy > 0.2) {
           node.x += dx * wei * amp * 0.1;
           node.y += dy * wei * amp * 0.1;
           node.life -= 0.05;
           if (node.life < 0) node.reset(p);
           p.strokeWeight(1);
           p.point(node.x, node.y);
           p.strokeWeight(2);
        }
      }
    }
  }
  
  cleanup() {}
}

// --- SKETCH 9: TRAVEL ---

const vertShader = `#version 300 es
  precision mediump float;
  in vec3 aPosition;
  in vec2 aTexCoord;
  uniform mat4 uProjectionMatrix;
  uniform mat4 uModelViewMatrix;
  out vec2 vTexCoord;
  void main() {
    vTexCoord = aTexCoord;
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
  }
`;

const fragShader = `#version 300 es
  precision mediump float;

  uniform sampler2D iImage0;
  uniform sampler2D iImage1;
  uniform sampler2D iImage2;
  uniform float iTime;
  uniform vec2 iDelta; 
  uniform float iAudio; 
  uniform float uDistStrength; // param

  in vec2 vTexCoord;
  out vec4 fragColor;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i); 
    vec4 p = permute( permute( permute( 
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  float noiseSample(vec2 uv, vec3 move, vec2 offset) {
     return snoise(vec3(uv.x + move.x + offset.x, uv.y + move.y + offset.y, move.z));
  }

  vec4 noiseImageRGB(vec2 uv, vec3 move) {
    vec2 offR = vec2(0.0, 0.0);
    vec2 offG = vec2(15.5, 3.4);
    vec2 offB = vec2(5.1, 20.2);

    float r = noiseSample((uv - vec2(421.0, 132.0)) * 1.0, move, offR);
    float g = noiseSample((uv - vec2(421.0, 132.0)) * 1.0, move, offG);
    float b = noiseSample((uv - vec2(421.0, 132.0)) * 1.0, move, offB);
    vec3 n = vec3(r, g, b);

    r = noiseSample((uv - vec2(834.0, 724.0)) * 4.0, move, offR);
    g = noiseSample((uv - vec2(834.0, 724.0)) * 4.0, move, offG);
    b = noiseSample((uv - vec2(834.0, 724.0)) * 4.0, move, offB);
    n += vec3(r, g, b) * 0.25;

    r = noiseSample((uv - vec2(387.0, 99.0)) * 16.0, move, offR);
    g = noiseSample((uv - vec2(387.0, 99.0)) * 16.0, move, offG);
    b = noiseSample((uv - vec2(387.0, 99.0)) * 16.0, move, offB);
    n += vec3(r, g, b) * 0.0625;

    n = n / 1.3125;
    n = n * 0.5 + 0.5;
    return vec4(n, 1.0);
  }

  vec2 mirror(vec2 uv) {
    return abs(fract(uv) * 2.0 - 1.0);
  }

  vec2 displace(vec2 uv, vec2 map, float scale, float strength) {
    return uv + (map - 0.5) * strength * scale;
  }

  void main() {
    vec2 uv = vTexCoord;
    uv.y = 1.0 - uv.y; 

    vec3 trans = vec3(iDelta.x, iDelta.y, iTime * 0.002);
    vec4 dimg = noiseImageRGB(uv, trans);

    float strength = uDistStrength + (iAudio * 5.0); 
    
    vec2 duv = displace(uv, dimg.rb, 0.5, strength);
    duv = mirror(duv);

    vec4 img0 = texture(iImage0, duv);
    vec4 img1 = texture(iImage1, duv);
    vec4 img2 = texture(iImage2, duv);

    float t = iTime * 0.005;
    float it = floor(t);
    float grad = 0.5 + 0.5 * sin((fract(t) - 0.5) * 3.14159);

    vec4 col;
    float cycle = mod(it, 3.0);
    if (cycle == 0.0) col = mix(img0, img1, grad);
    else if (cycle == 1.0) col = mix(img1, img2, grad);
    else col = mix(img2, img0, grad);

    fragColor = col;
  }
`;

export class TravelShader implements Sketch {
  id = 'travel';
  name = 'Voyage';
  
  params: SketchParams = {
      speed: { type: 'slider', value: 0.003, min: 0.0, max: 0.02, step: 0.0001, name: 'Vitesse Voyage' },
      baseDistortion: { type: 'slider', value: 3.0, min: 0.0, max: 10.0, step: 0.1, name: 'Distortion Base' }
  };

  private shaderProg: p5.Shader | null = null;
  private imgs: p5.Image[] = [];
  private deltaX = 0;
  private deltaY = 0;

  setup(p: p5) {
    this.shaderProg = p.createShader(vertShader, fragShader);
    
    const urls = [
      "https://raw.githubusercontent.com/ZRNOF/.ink/main/Package/Rain_Window_01.jpg",
      "https://raw.githubusercontent.com/ZRNOF/.ink/main/Package/Tunnel_01.jpg",
      "https://raw.githubusercontent.com/ZRNOF/.ink/main/Package/The_Dome_of_Light_02.jpg"
    ];
    
    // Cast to p5.Image to satisfy TypeScript if it infers Promise<Image>
    this.imgs = urls.map(url => p.loadImage(url) as unknown as p5.Image);
  }
  
  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    if (!this.shaderProg) return;
    
    const baseSpd = this.params.speed.value;
    const dist = this.params.baseDistortion.value;

    const speed = baseSpd + audio.bass * 0.05; 
    this.deltaX += speed;
    this.deltaY += speed * 0.5;

    p.shader(this.shaderProg);
    
    this.shaderProg.setUniform('iTime', p.frameCount);
    this.shaderProg.setUniform('iDelta', [this.deltaX, this.deltaY]);
    this.shaderProg.setUniform('iAudio', audio.energy); 
    this.shaderProg.setUniform('uDistStrength', dist);
    
    if (bgImage) {
        this.shaderProg.setUniform('iImage0', bgImage);
        this.shaderProg.setUniform('iImage1', bgImage);
        this.shaderProg.setUniform('iImage2', bgImage);
    } else {
        if (this.imgs[0] && this.imgs[0].width > 1) this.shaderProg.setUniform('iImage0', this.imgs[0]);
        if (this.imgs[1] && this.imgs[1].width > 1) this.shaderProg.setUniform('iImage1', this.imgs[1]);
        if (this.imgs[2] && this.imgs[2].width > 1) this.shaderProg.setUniform('iImage2', this.imgs[2]);
    }
    
    p.noStroke();
    p.rect(-p.width/2, -p.height/2, p.width, p.height); 
  }
  
  cleanup() {}
}

// --- LANDING PAGE (CLASSIC) ---
export class LandingPage implements Sketch {
  id = 'landing';
  name = 'Accueil';

  setup(p: p5) {
    // No specific setup needed, uses default font
  }

  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    p.background(10);
    
    // Interactive Sphere
    p.push();
    p.noFill();
    p.stroke(255);
    p.strokeWeight(1);
    
    // Rotate based on time and audio
    p.rotateX(p.frameCount * 0.01);
    p.rotateY(p.frameCount * 0.01);
    
    // Size reacts to bass
    const r = 150 + audio.bass * 50;
    p.sphere(r, 24, 16);
    p.pop();

    // Text Overlay
    p.push();
    p.fill(255);
    p.noStroke();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(16);
    
    // Slight floating text effect
    const yOff = Math.sin(p.frameCount * 0.05) * 5;
    p.translate(0, 200 + yOff, 0);
    
    p.text("merci de choisir une experience pour commencer", 0, 0);
    p.pop();
  }
  
  cleanup() {}
}
