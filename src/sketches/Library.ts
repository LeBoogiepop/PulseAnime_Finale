
import p5 from 'p5';
import { Sketch, AudioData, PALETTES, SketchParams } from '../types';

const getPalette = (idx: number) => PALETTES[idx % PALETTES.length];

export const drawBackground = (p: p5, bgImage?: p5.Image | null, opacity: number = 20) => {
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

// --- SKETCH 5: PLEXUS VORONOI ---
export class PlexusVoronoi implements Sketch {
  id = 'plexus';
  name = 'Réseau Plexus';
  audioReactivity = 'Le volume sonore contrôle le seuil de connexion des lignes. Les aigus font vibrer les points de manière aléatoire.';

  params: SketchParams = {
    threshold: { type: 'slider', value: 150, min: 50, max: 300, step: 10, name: 'Seuil Connexion' },
    pointSize: { type: 'slider', value: 4, min: 1, max: 10, step: 0.5, name: 'Taille Points' },
    speed: { type: 'slider', value: 1, min: 0.1, max: 5, step: 0.1, name: 'Vitesse' },
    lineColor: { type: 'color', value: '#FFFFFF', name: 'Couleur' }
  };

  points: { pos: p5.Vector, vel: p5.Vector }[] = [];

  setup(p: p5) {
    this.points = [];
    for (let i = 0; i < 80; i++) {
      this.points.push({
        pos: p.createVector(p.random(p.width), p.random(p.height)),
        vel: p.createVector(p.random(-1, 1), p.random(-1, 1))
      });
    }
  }

  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    drawBackground(p, bgImage);

    const thresh = this.params.threshold.value + audio.level * 200;
    const pSize = this.params.pointSize.value;
    const spd = this.params.speed.value;
    const col = this.params.lineColor.value;

    // Convert hex color to p5 color for manipulation
    const baseC = p.color(col);

    for (let pt of this.points) {
      pt.pos.add(p5.Vector.mult(pt.vel, spd));

      if (pt.pos.x < 0 || pt.pos.x > p.width) pt.vel.x *= -1;
      if (pt.pos.y < 0 || pt.pos.y > p.height) pt.vel.y *= -1;

      if (audio.treble > 0.3) {
        pt.pos.x += p.random(-2, 2);
        pt.pos.y += p.random(-2, 2);
      }
      p.stroke(baseC);
      p.strokeWeight(pSize);
      p.point(pt.pos.x, pt.pos.y);
    }

    p.strokeWeight(1);

    for (let i = 0; i < this.points.length; i++) {
      for (let j = i + 1; j < this.points.length; j++) {
        let d = p.dist(this.points[i].pos.x, this.points[i].pos.y, this.points[j].pos.x, this.points[j].pos.y);
        if (d < thresh) {
          let alpha = p.map(d, 0, thresh, 255, 0);

          // Use chosen color with alpha
          const lineC = p.color(p.red(baseC), p.green(baseC), p.blue(baseC), alpha);
          p.stroke(lineC);

          p.line(this.points[i].pos.x, this.points[i].pos.y, this.points[j].pos.x, this.points[j].pos.y);
        }
      }
    }
  }
  cleanup() { }
}

// --- SKETCH 7: NOISE ABSTRACT ---
export class NoiseField implements Sketch {
  id = 'noise_abstract';
  name = 'Champ de Bruit';
  audioReactivity = 'Les basses propulsent le champ de bruit vers l\'avant. La grille réagit subtilement aux variations de volume.';

  params: SketchParams = {
    resolution: { type: 'slider', value: 20, min: 5, max: 50, step: 5, name: 'Résolution' },
    noiseScale: { type: 'slider', value: 0.1, min: 0.01, max: 0.5, step: 0.01, name: 'Échelle Bruit' },
    speed: { type: 'slider', value: 0.02, min: 0.001, max: 0.1, step: 0.001, name: 'Vitesse' }
  };

  setup(p: p5) { }

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

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const n = p.noise(x * ns, y * ns, t + audio.bass);

        p.fill(n * 255, 200);
        p.rect(x * res, y * res, res, res);
      }
    }
  }
  cleanup() { }
}

// --- LANDING PAGE ---
export class LandingPage implements Sketch {
  id = 'landing';
  name = 'Accueil';
  mode = 'WEBGL' as const;
  audioReactivity = 'La sphère centrale pulse en rythme avec les basses fréquences.';

  setup(p: p5) {
  }

  draw(p: p5, audio: AudioData, bgImage?: p5.Image | null) {
    if (bgImage) {
      p.push();
      p.translate(0, 0, -200); // Push bg back
      p.imageMode(p.CENTER);
      p.image(bgImage, 0, 0, p.width * 1.5, p.height * 1.5); // Cover
      p.pop();
      p.background(0, 150);
    } else {
      p.background(10);
    }

    // Interactive Sphere
    p.push();
    p.noFill();
    p.stroke(255);
    p.strokeWeight(1);

    p.rotateX(p.frameCount * 0.01);
    p.rotateY(p.frameCount * 0.01);

    const r = 150 + audio.bass * 50;
    p.sphere(r, 24, 16);
    p.pop();

    p.push();
    p.fill(255);
    p.noStroke();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(16);

    const yOff = Math.sin(p.frameCount * 0.05) * 5;
    p.translate(0, 200 + yOff, 0);

    p.text("merci de choisir une experience pour commencer", 0, 0);
    p.pop();
  }

  cleanup() { }
}
