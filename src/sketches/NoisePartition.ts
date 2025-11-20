
import { Sketch, AudioData } from '../types';
import p5 from 'p5';
import { MBR, pointInPolygon, polygonArea, findSplitChordInteriorPoint, curvePolygonSplit } from '../utils/geometry';
import { gradNoise } from '../utils/noise';

export class NoisePartition implements Sketch {
  id = 'partition';
  name = 'Partition de Bruit';
  audioReactivity = 'Les basses réinitialisent le canevas. L\'énergie déclenche les divisions.';

  params: any = {
    speed: { type: 'slider', name: 'Vitesse', value: 1.5, min: 0.1, max: 5.0, step: 0.1 },
    chaos: { type: 'slider', name: 'Chaos', value: 0.5, min: 0.0, max: 1.0, step: 0.01 },
    palette: { type: 'slider', name: 'Palette', value: 0, min: 0, max: 4, step: 1, onChange: () => this.mustRegenerate = true }
  };

  private polygons: any[] = [];
  private curveCount = 0;
  private maxPartitions = 150;
  private mustRegenerate = false;
  private regenerationTimer = 0;
  
  private palettes = [
    ["#F72585", "#7209B7", "#3A0CA3", "#4361EE", "#4CC9F0"], // Neon
    ["#000000", "#14213D", "#FCA311", "#E5E5E5", "#FFFFFF"], // Deep Contrast
    ["#264653", "#2A9D8F", "#E9C46A", "#F4A261", "#E76F51"], // Earth
    ["#CDB4DB", "#FFC8DD", "#FFAFCC", "#BDE0FE", "#A2D2FF"], // Pastel
    ["#7400B8", "#6930C3", "#5E60CE", "#5390D9", "#4EA8DE"]  // Cool
  ];

  setup(p: p5) {
    p.noiseDetail(2, 0.5);
    this.generate(p);
  }

  cleanup() {}

  generate(p: p5) {
    this.curveCount = 0;
    this.polygons = [];
    
    p.colorMode(p.HSB, 1);
    
    const pts = [
      p.createVector(0, 0),
      p.createVector(p.width, 0),
      p.createVector(p.width, p.height),
      p.createVector(0, p.height)
    ];

    const currentPaletteIndex = Math.floor(this.params.palette.value);
    const paletteColors = this.palettes[currentPaletteIndex % this.palettes.length];
    const baseColor = p.color(p.random(paletteColors));

    this.polygons.push({
      pts,
      mbr: new MBR(...pts),
      color: baseColor,
      area: polygonArea(pts)
    });
    
    this.mustRegenerate = false;
    this.regenerationTimer = 0;
  }

  draw(p: p5, audio: AudioData, bgImage: p5.Image | null) {
    // --- RESET LOGIC ---
    if (this.curveCount >= this.maxPartitions) {
      this.regenerationTimer++;
      if (this.regenerationTimer > 90 || (audio.bass > 0.8 && this.regenerationTimer > 30)) {
        this.generate(p);
        return;
      }
    } else if (this.mustRegenerate) {
      this.generate(p);
    }

    // --- SPLIT LOGIC ---
    if (this.curveCount < this.maxPartitions && (p.frameCount % 2 === 0) && (this.curveCount < 5 || audio.energy > 0.3)) {
      this.splitPolygon(p, audio);
    }

    // --- RENDER ---
    p.push();
    p.colorMode(p.HSB, 1);
    
    if (!bgImage) {
      p.background(0.96); 
    } else {
      p.background(0);
    }

    const ctx = (p as any).drawingContext as CanvasRenderingContext2D;

    for (let poly of this.polygons) {
      
      if (bgImage) {
        // === CLIPPING MASK (P2D Compatible) ===
        ctx.save();
        ctx.beginPath();
        if (poly.pts.length > 0) {
            ctx.moveTo(poly.pts[0].x, poly.pts[0].y);
            for (let i = 1; i < poly.pts.length; i++) {
                ctx.lineTo(poly.pts[i].x, poly.pts[i].y);
            }
        }
        ctx.closePath();
        ctx.clip(); 

        p.image(bgImage, 0, 0, p.width, p.height);

        ctx.restore();

        // Overlay tint
        const h = p.hue(poly.color);
        const s = p.saturation(poly.color);
        const b = p.brightness(poly.color);
        
        p.fill(h, s, b, 0.3);
        
      } else {
        p.fill(poly.color);
      }

      p.stroke(1, 0.8); 
      p.strokeWeight(1.5);

      p.beginShape();
      for (let pt of poly.pts) {
        p.vertex(pt.x, pt.y);
      }
      p.endShape(p.CLOSE);
    }
    p.pop();
  }

  private splitPolygon(p: p5, audio: AudioData) {
    this.polygons.sort((a, b) => b.area - a.area);
    
    let seedPoly = this.polygons[0];
    if (!seedPoly) return;

    let seed = findSplitChordInteriorPoint(seedPoly.pts);
    
    // Curve Generation using local helper
    // 20 = segment length, 150 = max steps
    let curvePts = genCurve(p, seed, 20, 150, audio.mid * this.params.chaos.value); 

    for (let poly of this.polygons) {
      if (poly.mbr.contains(seed) && pointInPolygon(seed, poly.pts)) {
        let parts = curvePolygonSplit(curvePts, poly.pts);
        
        if (parts && parts.length === 2) {
          this.curveCount++;
          
          for (let part of parts) {
            let mbr = new MBR(...part);
            let newColor = varyColor(p, poly.color, 0.05 + (audio.treble * 0.1));
            
            this.polygons.push({
              pts: part,
              mbr,
              color: newColor,
              area: polygonArea(part)
            });
          }
          
          this.polygons.splice(this.polygons.indexOf(poly), 1);
          break;
        }
      }
    }
  }
}

// --- LOCAL HELPER FUNCTIONS ---

function randomWalkers(p: p5, startPoint: p5.Vector, segLen: number, maxSteps: number, audioNoiseMod: number) {
    const seed = p.random(10000);
    const noiseScale = 0.01; 
    
    const makeWalker = (dAng: number) => function*() {
        let pos = startPoint.copy();
        let q = startPoint.copy();
        const hgt = (x: number, y: number) => gradNoise(x * noiseScale, y * noiseScale, seed + audioNoiseMod);
        const nrm = (x: number, y: number) => p.createVector(1, 0).rotate(hgt(x, y) * p.TWO_PI);
        
        for (let i = 0; i < maxSteps; i++) {
            const v = nrm(q.x, q.y).rotate(dAng);
            q.add(v);
            pos.add(v.copy().mult(segLen));
            yield pos;
        }
    }
    
    let angSeed = p.random(p.TWO_PI);
    return [makeWalker(angSeed)(), makeWalker(angSeed + p.PI)()];
}

function varyColor(p: p5, c: p5.Color, amt: number) {
    p.colorMode(p.HSB, 1);
    let h = p.hue(c);
    let s = p.saturation(c);
    let b = p.brightness(c);
    return p.color(
      p.constrain(h + p.random(-amt, amt), 0, 1),
      p.constrain(s + p.random(-amt, amt), 0, 1),
      p.constrain(b + p.random(-amt, amt), 0, 1)
    );
}

function genCurve(p: p5, startPoint: p5.Vector, segLen: number, maxSteps: number, audioMod: number) {
    let start = startPoint;
    let [fwd, bck] = randomWalkers(p, start, segLen, maxSteps, audioMod); 
    let pts = [start];
    for (let q of fwd) {
        pts.push(q.copy());
        if (q.x < 0 || q.y < 0 || q.x > p.width || q.y > p.height) break;
    }
    pts.reverse();
    for (let q of bck) {
        pts.push(q.copy());
        if (q.x < 0 || q.y < 0 || q.x > p.width || q.y > p.height) break;
    }
    return pts;
}
