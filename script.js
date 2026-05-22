const canvas = document.getElementById("globe");
const ctx = canvas.getContext("2d");

const DEG2RAD = Math.PI / 180;
const SAMPLE_STEP = 0.4 * DEG2RAD;
const DOT_SIZE = 1.5;
const ROTATION_SPEED = 0.00035;
const BUCKETS = 48;

const IBM_BLUE = {
    back: [0, 29, 108],
    mid: [0, 67, 206],
    front: [15, 98, 254],
    highlight: [69, 137, 255],
};

function ibmDotColor(depth) {
    const t = (depth + 1) / 2;
    let r, g, b;
    if (t < 0.5) {
        const u = t / 0.5;
        r = IBM_BLUE.back[0] + (IBM_BLUE.mid[0] - IBM_BLUE.back[0]) * u;
        g = IBM_BLUE.back[1] + (IBM_BLUE.mid[1] - IBM_BLUE.back[1]) * u;
        b = IBM_BLUE.back[2] + (IBM_BLUE.mid[2] - IBM_BLUE.back[2]) * u;
    } else {
        const u = (t - 0.5) / 0.5;
        r = IBM_BLUE.mid[0] + (IBM_BLUE.highlight[0] - IBM_BLUE.mid[0]) * u;
        g = IBM_BLUE.mid[1] + (IBM_BLUE.highlight[1] - IBM_BLUE.mid[1]) * u;
        b = IBM_BLUE.mid[2] + (IBM_BLUE.highlight[2] - IBM_BLUE.mid[2]) * u;
    }
    return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

let width = 800;
let height = 600;
let radius = 200;
let points = [];
let lambda = 0;
let phi = 0;
let autoRotate = true;
let dragging = false;
let lastX = 0;
let lastY = 0;
let ready = false;

function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    width = Math.max(rect.width || window.innerWidth || 800, 320);
    height = Math.max(rect.height || window.innerHeight || 600, 320);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    radius = Math.min(width, height) * 0.38;
}

function lonLatToXYZ([lon, lat]) {
    const la = lat * DEG2RAD;
    const lo = lon * DEG2RAD;
    const cl = Math.cos(la);
    return [cl * Math.cos(lo), Math.sin(la), cl * Math.sin(lo)];
}

function rotateXYZ([x, y, z], lambdaRad, phiRad) {
    const cosL = Math.cos(lambdaRad);
    const sinL = Math.sin(lambdaRad);
    const cosP = Math.cos(phiRad);
    const sinP = Math.sin(phiRad);

    const x1 = cosL * x + sinL * z;
    const z1 = -sinL * x + cosL * z;
    const y2 = cosP * y - sinP * z1;
    const z2 = sinP * y + cosP * z1;

    return [x1, y2, z2];
}

function sampleRing(ring) {
    const samples = [];
    for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i];
        const b = ring[i + 1];
        const dist = d3.geoDistance(a, b);
        const segments = Math.max(1, Math.ceil(dist / SAMPLE_STEP));
        for (let j = 0; j < segments; j++) {
            samples.push(d3.geoInterpolate(a, b)(j / segments));
        }
    }
    return samples;
}

function extractPoints(geojson) {
    const all = [];
    for (const feature of geojson.features) {
        const geom = feature.geometry;
        if (!geom) continue;

        const processPolygon = (coordinates) => {
            for (const ring of coordinates) {
                for (const coord of sampleRing(ring)) {
                    all.push(lonLatToXYZ(coord));
                }
            }
        };

        if (geom.type === "Polygon") {
            processPolygon(geom.coordinates);
        } else if (geom.type === "MultiPolygon") {
            for (const polygon of geom.coordinates) {
                processPolygon(polygon);
            }
        }
    }
    return all;
}

function draw() {
    ctx.fillStyle = "#161616";
    ctx.fillRect(0, 0, width, height);
    if (!ready) return;

    const cx = width / 2;
    const cy = height / 2;
    const buckets = Array.from({ length: BUCKETS }, () => []);

    for (const point of points) {
        const [x, y, z] = rotateXYZ(point, lambda, phi);
        if (z < 0.02) continue;
        const bucket = Math.min(BUCKETS - 1, (z * BUCKETS) | 0);
        buckets[bucket].push({ x: cx + x * radius, y: cy - y * radius, z });
    }

    for (const bucket of buckets) {
        for (const { x, y, z } of bucket) {
            ctx.fillStyle = ibmDotColor(z);
            ctx.fillRect(x - DOT_SIZE / 2, y - DOT_SIZE / 2, DOT_SIZE, DOT_SIZE);
        }
    }
}

function tick() {
    if (autoRotate && !dragging) {
        lambda += ROTATION_SPEED;
    }
    draw();
    requestAnimationFrame(tick);
}

canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    autoRotate = false;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lambda += dx * 0.005;
    phi = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, phi + dy * 0.005));
    lastX = e.clientX;
    lastY = e.clientY;
});

canvas.addEventListener("pointerup", () => {
    dragging = false;
});

canvas.addEventListener("dblclick", () => {
    autoRotate = true;
    phi = 0;
});

resize();
window.addEventListener("resize", resize);
new ResizeObserver(resize).observe(canvas);
tick();

d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then((world) => {
        const countries = topojson.feature(world, world.objects.countries);
        points = extractPoints(countries);
        ready = true;
        resize();
    })
    .catch((err) => {
        console.error(err);
        ready = true;
        ctx.fillStyle = "#4589ff";
        ctx.font = '14px "IBM Plex Sans", sans-serif';
        ctx.fillText("Failed to load GeoJSON", 20, 40);
    });
