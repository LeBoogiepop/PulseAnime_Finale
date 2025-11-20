
import p5 from 'p5';

const gradConstants = {
    hash1: new p5.Vector(127.1, 311.7, 74.7),
    hash2: new p5.Vector(269.5, 183.3, 246.1),
    hash3: new p5.Vector(113.5, 271.9, 124.6),
    hash4: 43758.5453123,
    octaves: 4,
    falloff: 0.5
};

const vec = (x: number, y: number, z: number) => new p5.Vector(x, y, z);

// Safe mix function
const mix = (x: any, y: any, amt: number): any => {
    if (x instanceof p5.Vector && y instanceof p5.Vector) {
        return new p5.Vector(
            (1 - amt) * x.x + amt * y.x,
            (1 - amt) * x.y + amt * y.y,
            (1 - amt) * x.z + amt * y.z
        );
    }
    return Number(x) * (1 - amt) + Number(y) * amt;
};

const fract = (x: number) => x - Math.floor(x);

function hash(p: p5.Vector) {
    const a = p.dot(gradConstants.hash1);
    const b = p.dot(gradConstants.hash2);
    const c = p.dot(gradConstants.hash3);
    return vec(
        -1 + 2 * fract(Math.sin(a) * gradConstants.hash4),
        -1 + 2 * fract(Math.sin(b) * gradConstants.hash4),
        -1 + 2 * fract(Math.sin(c) * gradConstants.hash4)
    );
}

let _seedx = 0, _seedy = 0, _seedz = 0;

export function gradNoiseDetail(octaves = 4, falloff = 0.5) {
    gradConstants.octaves = octaves;
    gradConstants.falloff = falloff;
}

export function gradNoiseSeed(x = 0, y = 0, z = 0) {
    _seedx = x; _seedy = y; _seedz = z;
}

function _gradNoise(x: number, y: number, z: number) {
    x += _seedx; y += _seedy; z += _seedz;

    const i = vec(Math.floor(x), Math.floor(y), Math.floor(z));
    const f = vec(x - i.x, y - i.y, z - i.z);

    // Explicit casting to Number to avoid ANY arithmetic errors
    const fx = Number(f.x);
    const fy = Number(f.y);
    const fz = Number(f.z);

    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const uz = fz * fz * (3 - 2 * fz);
    
    const u = vec(ux, uy, uz);

    return mix(
        mix(
            mix(hash(i).dot(f),
                hash(vec(i.x + 1, i.y, i.z)).dot(vec(f.x - 1, f.y, f.z)), u.x),
            mix(hash(vec(i.x, i.y + 1, i.z)).dot(vec(f.x, f.y - 1, f.z)),
                hash(vec(i.x + 1, i.y + 1, i.z)).dot(vec(f.x - 1, f.y - 1, f.z)), u.x),
            u.y),
        mix(
            mix(hash(vec(i.x, i.y, i.z + 1)).dot(vec(f.x, f.y, f.z - 1)),
                hash(vec(i.x + 1, i.y, i.z + 1)).dot(vec(f.x - 1, f.y, f.z - 1)), u.x),
            mix(hash(vec(i.x, i.y + 1, i.z + 1)).dot(vec(f.x, f.y - 1, f.z - 1)),
                hash(vec(i.x + 1, i.y + 1, i.z + 1)).dot(vec(f.x - 1, f.y - 1, f.z - 1)), u.x),
            u.y),
        u.z) / 1.5 + 0.5;
}

export function gradNoise(x: number, y = 0, z = 0) {
    let total = 0;
    let sum = 0;
    let { falloff, octaves } = gradConstants;
    let fo = 1; 
    let mult = 1; 

    for (let o = 0; o < octaves; o++) {
        sum += fo * _gradNoise(x * mult, y * mult, z * mult);
        total += fo;
        fo *= falloff;
        mult *= 2;
    }
    return sum / total;
}
