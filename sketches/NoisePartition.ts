
import p5 from 'p5';
import { Sketch, AudioData, SketchParams } from '../types';
import { drawBackground } from './Library';
import { MBR, polygonArea, findSplitChordInteriorPoint, pointInPolygon, curvePolygonSplit } from '../utils/geometry';
import { gradNoise } from '../utils/noise';

const PARTITION_PALETTES = [
    ["#4f501e", "#507c37", "#329888", "#40a6e0", "#c697f7", "#fbaca8", "#e5de41"],
    ["#205750", "#277a85", "#3d88d8", "#bd77ee", "#f88c91", "#e4c237", "#52f5d9"],
    ["#244e80", "#5d5bce", "#bf4eca", "#ee6d6e", "#d3ab31", "#44e3ae", "#bcdbfd"],
    ["#702d72", "#b33679", "#d25d3d", "#b5992d", "#45cc94", "#89cdfb", "#f2c6f7"],
    ["#773823", "#975f24", "#8c8b2c", "#3eb38a", "#56bcf0", "#dab0f9", "#fdcabd"]
];

export class NoisePartition implements Sketch {
  id = 'partition';
  name = 'Partition de Bruit';
  audioReactivity = 'Les basses réinitialisent le canevas une fois terminé. L\'énergie globale déclenche les divisions. Les aigus font varier les couleurs.';

  params: SketchParams = {
      maxPolys: { type: 'slider', value: 150, min: 50, max: 300, step: 10, name: 'Max Partitions' },
  };

  private polygons: any[] = [];
  private curveCount = 0;
  private currentPalette: string[] = [];
  private stagnationFrames = 0; // Compteur pour le reset auto

  setup(p: p5) {
    p.noiseDetail(1, 0.5);
    this.generate(p);
  }

  generate(p: p5) {
    p.push();
    p.colorMode(p.HSB, 1);
    
    this.curveCount = 0;
    this.stagnationFrames = 0;
    this.currentPalette = p.random(PARTITION_PALETTES);
    const pts = [
        p.createVector(0, 0), 
        p.createVector(p.width, 0), 
        p.createVector(p.width, p.height), 
        p.createVector(0, p.height)
    ];
    
    const initColor = p.color(p.random(this.currentPalette));
    
    const mbr = new MBR();
    pts.forEach(pt => mbr.add(pt));

    this.polygons = [{
        pts,
        mbr,
        color: varyColor(p, initColor),
        area: polygonArea(pts)
    }];
    
    p.pop();
  }

  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    p.push();
    p.colorMode(p.HSB, 1);
    
    if (bgImage) {
         // Si image : Fond noir pour faire ressortir les éclats texturés
         p.background(0);
         p.textureMode(p.NORMAL); // UV mapping normalisé (0-1)
    } else {
         // Si pas d'image : Fond clair style papier
         p.background(0, 0, 0.96); 
    }
    
    const maxP = this.params.maxPolys.value;

    // LOGIQUE DE RESET
    // Si on a atteint le max de polygones
    if (this.curveCount >= maxP) {
        this.stagnationFrames++;
        
        // Reset automatique après ~1 seconde (60 frames) de stagnation
        // OU Reset immédiat sur une grosse basse
        if (this.stagnationFrames > 60 || audio.bass > 0.8) {
            this.generate(p);
        }
    } else {
        this.stagnationFrames = 0;
    }
    
    const shouldSplit = this.curveCount < maxP && audio.energy > 0.25; 

    if (shouldSplit) {
        this.curveCount++;
        this.polygons.sort((a, b) => b.area - a.area);
        
        const seedIndex = 0; 
        let seedPoly = this.polygons[seedIndex];
        
        if (seedPoly) {
            let seed = findSplitChordInteriorPoint(seedPoly.pts);
            let curvePts = genCurve(p, seed, audio.mid); 
            
            for (let poly of this.polygons) {
                if (poly.mbr.contains(seed) && pointInPolygon(seed, poly.pts)) {
                    let parts = curvePolygonSplit(curvePts, poly.pts);
                    if (parts.length === 2) {
                        for (let part of parts) {
                            let partMbr = new MBR();
                            part.forEach((pt: p5.Vector) => partMbr.add(pt));
                            
                            this.polygons.push({
                                pts: part,
                                mbr: partMbr,
                                color: varyColor(p, poly.color, 0.05 + audio.treble * 0.1),
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
    
    p.stroke(0, 0, 1, 0.8); 
    p.strokeWeight(1.5);
    
    for (let poly of this.polygons) {
        if (bgImage) {
            // Mode Image : On texture avec l'image de fond
            // On applique une légère teinte colorée basée sur la palette pour garder le style
            const h = p.hue(poly.color);
            const s = p.saturation(poly.color);
            // Saturation réduite pour bien voir l'image, luminosité max
            p.tint(h, s * 0.4, 1, 1);
            p.texture(bgImage);
        } else {
            // Mode Standard : Couleur pleine
            p.fill(poly.color);
        }

        p.beginShape();
        for (let v of poly.pts) {
            if (bgImage) {
                // Mapping UV basé sur la position relative à l'écran
                p.vertex(v.x, v.y, v.x / p.width, v.y / p.height);
            } else {
                p.vertex(v.x, v.y);
            }
        }
        p.endShape(p.CLOSE);
    }
    
    p.pop();
  }
  
  cleanup() {}
}

// --- LOCALLY USED GENERATORS ---

function randomWalkers(p: p5, startPoint: p5.Vector, segLen: number, maxSteps = 1000, audioNoiseMod = 0.0) {
    const seed = p.random(10000);
    const noiseScale = 0.1;
    
    const makeWalker = (dAng: number, sgn: number) => function*() {
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
    return [makeWalker(angSeed, 1)(), makeWalker(angSeed + p.PI, 1)()];
}

function varyColor(p: p5, c: p5.Color, amt = 0.1) {
    let h = p.hue(c);
    let s = p.saturation(c);
    let b = p.brightness(c);
    return p.color(
        p.constrain(h + p.random(-amt, amt), 0, 1), 
        p.constrain(s + p.random(-amt, amt), 0, 1), 
        p.constrain(b + p.random(-amt, amt), 0, 1)
    );
}

function genCurve(p: p5, startPoint: p5.Vector, audioMod: number) {
    let start = startPoint;
    let [fwd, bck] = randomWalkers(p, start, 20, 100, audioMod); 
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
