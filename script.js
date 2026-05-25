/* IBM Global — gmonads-style UI, glowy globe */

(function () {
    const DEG2RAD = Math.PI / 180;
    const LAND_GRID_STEP = 1.25 * DEG2RAD;
    const OCEAN_COUNT = 6500;
    const BUCKETS = 48;
    const IBM_BLUE = "#1b4d8c";
    const IBM_CREAM = "#f4f0e8";
    const IBM_BORDER = "#0c2340";
    const STRIPE_BAND_DEG = 5.5;

    let countriesFeatures = [];
    let oceanPoints = [];
    let landSet = null;
    let globeReady = false;
    let globeError = null;
    let activeFilter = "all";

    let globeCanvas, gCtx, gW = 800, gH = 400, gR = 180, dpr = 1;
    let lambda = 0.55, phi = 0.2;
    let autoRotate = true, dragging = false, lastX, lastY;

    function lonLatToXYZ([lon, lat]) {
        const la = lat * DEG2RAD, lo = lon * DEG2RAD, cl = Math.cos(la);
        return [cl * Math.cos(lo), Math.sin(la), cl * Math.sin(lo)];
    }

    function rotateXYZ([x, y, z], l, p) {
        const cL = Math.cos(l), sL = Math.sin(l), cP = Math.cos(p), sP = Math.sin(p);
        const x1 = cL * x + sL * z, z1 = -sL * x + cL * z;
        return [x1, cP * y - sP * z1, sP * y + cP * z1];
    }

    function sampleRing(ring) {
        const out = [];
        for (let i = 0; i < ring.length - 1; i++) {
            const a = ring[i], b = ring[i + 1];
            const n = Math.max(1, Math.ceil(d3.geoDistance(a, b) / LAND_GRID_STEP));
            for (let j = 0; j < n; j++) out.push(d3.geoInterpolate(a, b)(j / n));
        }
        return out;
    }

    function stripeAtLat(lat) {
        const band = Math.floor((lat + 90) / STRIPE_BAND_DEG);
        return band % 2 === 0 ? IBM_BLUE : IBM_CREAM;
    }

    const latStripCache = new Map();

    function latStripGeom(lat0, lat1) {
        const key = `${lat0}|${lat1}`;
        if (latStripCache.has(key)) return latStripCache.get(key);
        const geom = {
            type: "Polygon",
            coordinates: [[
                [-180, lat0], [180, lat0], [180, lat1], [-180, lat1], [-180, lat0],
            ]],
        };
        latStripCache.set(key, geom);
        return geom;
    }

    function buildLandSet(geojson) {
        const grid = new Set();
        for (const f of geojson.features) {
            const g = f.geometry;
            if (!g) continue;
            const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
            for (const poly of polys)
                for (const ring of poly)
                    for (const c of sampleRing(ring)) {
                        grid.add(`${(c[0] * 2) | 0},${(c[1] * 2) | 0}`);
                    }
        }
        landSet = grid;
    }

    const latStripFeature = (lat0, lat1) => ({
        type: "Feature",
        geometry: latStripGeom(lat0, lat1),
        properties: {},
    });

    function drawLand(gCtx, path, features) {
        const sorted = [...features].sort((a, b) => d3.geoArea(b) - d3.geoArea(a));
        gCtx.globalAlpha = 1;
        gCtx.globalCompositeOperation = "source-over";

        for (const feature of sorted) {
            const [[, minLat], [, maxLat]] = d3.geoBounds(feature);
            const latStart = Math.floor((minLat + 90) / STRIPE_BAND_DEG) * STRIPE_BAND_DEG - 90;

            for (let lat0 = latStart; lat0 <= maxLat; lat0 += STRIPE_BAND_DEG) {
                const lat1 = lat0 + STRIPE_BAND_DEG;
                gCtx.save();
                gCtx.beginPath();
                path(feature);
                gCtx.clip();
                gCtx.fillStyle = stripeAtLat(lat0 + STRIPE_BAND_DEG * 0.5);
                gCtx.beginPath();
                path(latStripFeature(lat0, lat1));
                gCtx.fill();
                gCtx.restore();
            }
        }

        gCtx.strokeStyle = IBM_BORDER;
        gCtx.lineWidth = 0.4;
        gCtx.lineJoin = "round";
        gCtx.globalAlpha = 0.88;
        for (const feature of sorted) {
            gCtx.beginPath();
            path(feature);
            gCtx.stroke();
        }
        gCtx.globalAlpha = 1;
    }

    function fibonacciSphere(n) {
        const pts = [];
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < n; i++) {
            const y = 1 - (i / Math.max(n - 1, 1)) * 2;
            const r = Math.sqrt(Math.max(0, 1 - y * y));
            const th = golden * i;
            const lon = (th * 180 / Math.PI + 180) % 360 - 180;
            const lat = Math.asin(Math.max(-1, Math.min(1, y))) / DEG2RAD;
            if (landSet?.has(`${(lon * 2) | 0},${(lat * 2) | 0}`)) continue;
            pts.push({ xyz: lonLatToXYZ([lon, lat]), kind: "ocean" });
        }
        return pts;
    }

    function globeResize() {
        if (!globeCanvas?.parentElement) return;
        const rect = globeCanvas.parentElement.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        gW = Math.max(rect.width, 320);
        gH = Math.max(rect.height, 280);
        gR = Math.min(gW, gH) * 0.42;
        globeCanvas.width = Math.round(gW * dpr);
        globeCanvas.height = Math.round(gH * dpr);
        globeCanvas.style.width = `${gW}px`;
        globeCanvas.style.height = `${gH}px`;
        if (gCtx) gCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawDot(ctx, x, y, r, color, alpha) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawGlobe() {
        if (!gCtx) return;

        gCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        gCtx.globalAlpha = 1;
        gCtx.globalCompositeOperation = "source-over";
        gCtx.fillStyle = "#030308";
        gCtx.fillRect(0, 0, gW, gH);

        const cx = gW / 2, cy = gH / 2;

        const halo = gCtx.createRadialGradient(cx, cy, gR * 0.05, cx, cy, gR * 1.15);
        halo.addColorStop(0, "rgba(36, 164, 72, 0.14)");
        halo.addColorStop(0.4, "rgba(15, 98, 254, 0.1)");
        halo.addColorStop(0.7, "rgba(69, 137, 255, 0.04)");
        halo.addColorStop(1, "transparent");
        gCtx.fillStyle = halo;
        gCtx.beginPath();
        gCtx.arc(cx, cy, gR * 1.12, 0, Math.PI * 2);
        gCtx.fill();

        if (globeError) {
            gCtx.fillStyle = "#f4f4f8";
            gCtx.font = "500 13px IBM Plex Sans, sans-serif";
            gCtx.textAlign = "center";
            gCtx.fillText("Globe failed to load", cx, cy - 8);
            gCtx.fillStyle = "#8b8ca8";
            gCtx.font = "400 11px IBM Plex Sans, sans-serif";
            gCtx.fillText(globeError, cx, cy + 12);
            return;
        }

        if (!globeReady) {
            gCtx.fillStyle = "rgba(36, 164, 72, 0.08)";
            gCtx.beginPath();
            gCtx.arc(cx, cy, gR * 0.9, 0, Math.PI * 2);
            gCtx.fill();
            gCtx.fillStyle = "#8b8ca8";
            gCtx.font = "400 12px IBM Plex Sans, sans-serif";
            gCtx.textAlign = "center";
            gCtx.fillText("Loading globe…", cx, cy);
            return;
        }

        const projection = d3.geoOrthographic()
            .scale(gR * 0.995)
            .translate([cx, cy])
            .clipAngle(90)
            .rotate([(lambda * 180) / Math.PI, (-phi * 180) / Math.PI, 0]);

        const path = d3.geoPath(projection, gCtx);

        gCtx.save();
        gCtx.beginPath();
        gCtx.arc(cx, cy, gR, 0, Math.PI * 2);
        gCtx.clip();

        const buckets = Array.from({ length: BUCKETS }, () => []);
        for (const p of oceanPoints) {
            const [x, y, z] = rotateXYZ(p.xyz, lambda, phi);
            if (z < 0.03) continue;
            buckets[Math.min(BUCKETS - 1, z * BUCKETS | 0)].push({
                x: cx + x * gR,
                y: cy - y * gR,
                z,
            });
        }

        gCtx.globalCompositeOperation = "lighter";
        for (const bucket of buckets) {
            for (const { x, y, z } of bucket) {
                const t = (z + 1) / 2;
                drawDot(gCtx, x, y, 2.4 + t, "#5ee89a", 0.08 + t * 0.12);
            }
        }
        gCtx.globalCompositeOperation = "source-over";
        for (const bucket of buckets) {
            for (const { x, y, z } of bucket) {
                const t = (z + 1) / 2;
                drawDot(gCtx, x, y, 1 + t * 0.55, "#2eb872", 0.45 + t * 0.4);
            }
        }

        drawLand(gCtx, path, countriesFeatures);

        gCtx.strokeStyle = "rgba(12, 35, 64, 0.55)";
        gCtx.lineWidth = 1.2;
        gCtx.beginPath();
        gCtx.arc(cx, cy, gR, 0, Math.PI * 2);
        gCtx.stroke();

        gCtx.restore();

        const rim = gCtx.createRadialGradient(cx, cy, gR * 0.82, cx, cy, gR * 1.08);
        rim.addColorStop(0, "transparent");
        rim.addColorStop(0.85, "transparent");
        rim.addColorStop(0.97, "rgba(46, 184, 114, 0.12)");
        rim.addColorStop(1, "rgba(27, 77, 140, 0.18)");
        gCtx.fillStyle = rim;
        gCtx.beginPath();
        gCtx.arc(cx, cy, gR * 1.06, 0, Math.PI * 2);
        gCtx.fill();

        const sites = activeFilter === "all"
            ? IBM_SITES
            : IBM_SITES.filter((s) => s.type === activeFilter);

        for (const site of sites) {
            const [x, y, z] = rotateXYZ(lonLatToXYZ([site.lon, site.lat]), lambda, phi);
            if (z < 0.1) continue;
            const sx = cx + x * gR, sy = cy - y * gR;
            const meta = SITE_TYPES[site.type];

            drawDot(gCtx, sx, sy, 8, meta.color, 0.25);
            drawDot(gCtx, sx, sy, 3.5, "#ffffff", 1);
            gCtx.strokeStyle = meta.color;
            gCtx.lineWidth = 1.5;
            gCtx.stroke();

            if (z > 0.3) {
                gCtx.font = "600 9px IBM Plex Sans, sans-serif";
                const label = meta.abbr;
                const tw = gCtx.measureText(label).width + 8;
                gCtx.fillStyle = "rgba(8, 6, 18, 0.92)";
                gCtx.beginPath();
                gCtx.roundRect(sx + 7, sy - 9, tw, 16, 4);
                gCtx.fill();
                gCtx.fillStyle = "#fff";
                gCtx.textAlign = "center";
                gCtx.fillText(label, sx + 7 + tw / 2, sy + 2);
            }
        }

        gCtx.globalAlpha = 1;
    }

    function globeTick() {
        if (autoRotate && !dragging) lambda += 0.00035;
        drawGlobe();
        requestAnimationFrame(globeTick);
    }

    function loadGlobeData() {
        if (typeof d3 === "undefined") {
            globeError = "D3 failed to load (check network)";
            return;
        }
        if (typeof topojson === "undefined") {
            globeError = "TopoJSON failed to load";
            return;
        }

        function onWorld(world) {
            if (!world?.objects?.countries) throw new Error("Invalid map data");
            const countries = topojson.feature(world, world.objects.countries);
            countriesFeatures = countries.features;
            buildLandSet(countries);
            oceanPoints = fibonacciSphere(OCEAN_COUNT);
            globeReady = true;
            globeError = null;
            globeResize();
        }

        const mapUrls = ["data/world-110m.json", "./data/world-110m.json",
            "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"];

        (async () => {
            for (const url of mapUrls) {
                try {
                    const world = await d3.json(url);
                    onWorld(world);
                    return;
                } catch (e) {
                    console.warn("Map load failed:", url, e);
                }
            }
            globeError = "Could not load map data";
        })();
    }

    function initGlobe() {
        globeCanvas = document.getElementById("globe");
        if (!globeCanvas) return;
        gCtx = globeCanvas.getContext("2d", { alpha: false });

        globeResize();
        window.addEventListener("resize", globeResize);
        new ResizeObserver(globeResize).observe(globeCanvas.parentElement);

        globeCanvas.addEventListener("pointerdown", (e) => {
            dragging = true;
            autoRotate = false;
            lastX = e.clientX;
            lastY = e.clientY;
            globeCanvas.setPointerCapture(e.pointerId);
        });
        globeCanvas.addEventListener("pointermove", (e) => {
            if (!dragging) return;
            lambda += (e.clientX - lastX) * 0.005;
            phi = Math.max(-1.1, Math.min(1.1, phi + (e.clientY - lastY) * 0.005));
            lastX = e.clientX;
            lastY = e.clientY;
        });
        globeCanvas.addEventListener("pointerup", () => { dragging = false; });
        globeCanvas.addEventListener("dblclick", () => { autoRotate = true; phi = 0.2; });

        requestAnimationFrame(() => {
            globeResize();
            globeTick();
            loadGlobeData();
        });
    }

    // ── Focus panel ────────────────────────────────────────────────
    function setFocus(site) {
        const meta = SITE_TYPES[site.type];
        document.getElementById("focus-name").textContent = site.name;
        document.getElementById("focus-city").textContent = site.city;
        document.getElementById("focus-type").textContent = meta.label;
        document.getElementById("focus-icon").textContent = meta.abbr;
        document.getElementById("focus-icon").style.background =
            `linear-gradient(135deg, ${meta.color}, #4f70ef)`;
        document.getElementById("focus-pct").textContent = site.region?.slice(0, 3) || "—";
        document.querySelector(".ring-fg").style.stroke = meta.color;
    }

    const FILTERS = [
        { id: "all", label: "All sites" },
        { id: "office", label: "Offices" },
        { id: "client", label: "Clients" },
        { id: "partner", label: "Dependencies" },
        { id: "initiative", label: "Initiatives" },
    ];
    let filterIdx = 0;

    // ── Charts ─────────────────────────────────────────────────────
    const ACCENTS = {
        blue: ["#0043ce", "#0f62fe", "#4589ff"],
        purple: ["#4f70ef", "#7d17f4", "#b840d3"],
        teal: ["#0d3d3a", "#2dd4bf", "#5eead4"],
        orange: ["#8a3800", "#ff832b", "#ffb784"],
        green: ["#166534", "#24a148", "#4ade80"],
    };

    function drawSpark(canvas) {
        const ctx = canvas.getContext("2d");
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (!w) return;
        const s = 2;
        canvas.width = w * s;
        canvas.height = h * s;
        ctx.scale(s, s);
        ctx.clearRect(0, 0, w, h);

        const type = canvas.dataset.chart || "bars";
        const pal = ACCENTS[canvas.dataset.accent || "purple"];
        const n = type === "flat" ? 28 : 24;
        const data = Array.from({ length: n }, (_, i) => {
            if (type === "flat") return 0.32 + Math.random() * 0.1;
            if (type === "peak") return 0.25 + Math.sin(i * 0.35) * 0.25 + Math.random() * 0.3;
            return 0.12 + Math.random() * 0.88;
        });

        const barW = (w - 4) / n;
        data.forEach((v, i) => {
            const bh = v * (h - 6);
            const g = ctx.createLinearGradient(0, h, 0, 0);
            g.addColorStop(0, pal[0]);
            g.addColorStop(0.5, pal[1]);
            g.addColorStop(1, pal[2]);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.roundRect(2 + i * barW, h - bh, barW - 1.5, bh, [2, 2, 0, 0]);
            ctx.fill();
        });
    }

    function drawRegionChart() {
        const canvas = document.getElementById("region-chart");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const w = canvas.clientWidth;
        const h = canvas.height;
        if (!w) return;
        canvas.width = w * 2;
        ctx.scale(2, 2);
        ctx.clearRect(0, 0, w, h);

        const counts = REGIONS.map((r) => ({
            offices: IBM_SITES.filter((s) => s.region === r && s.type === "office").length,
            clients: IBM_SITES.filter((s) => s.region === r && s.type === "client").length,
            partners: IBM_SITES.filter((s) => s.region === r && s.type === "partner").length,
        }));

        const barW = w / (REGIONS.length * 4);
        REGIONS.forEach((_, ri) => {
            const base = ri * (barW * 4) + 4;
            [
                { v: counts[ri].offices, c: "#0f62fe" },
                { v: counts[ri].clients, c: "#ee5396" },
                { v: counts[ri].partners, c: "#ff832b" },
            ].forEach((col, ci) => {
                const bh = (col.v / 8) * (h - 10);
                ctx.fillStyle = col.c;
                ctx.globalAlpha = 0.85;
                ctx.fillRect(base + ci * barW, h - bh - 4, barW - 2, bh);
            });
            ctx.globalAlpha = 1;
        });
    }

    function renderActivities() {
        const ul = document.getElementById("activity-list");
        if (!ul) return;
        ul.innerHTML = IBM_ACTIVITIES.map((a) => {
            const meta = SITE_TYPES[a.type] || SITE_TYPES.office;
            return `
            <li class="block-item">
                <div class="block-icon" style="border-color:${meta.color}55;background:linear-gradient(135deg,${meta.color}33,#1a1630)">${a.icon}</div>
                <div class="block-fields">
                    <div class="block-row"><span class="block-label">SITE</span><span class="block-val">${a.name}</span></div>
                    <div class="block-row"><span class="block-label">LOCATION</span><span class="block-val">${a.location}</span></div>
                    <div class="block-row"><span class="block-label">TYPE</span><span class="block-val">${meta.label}</span></div>
                </div>
                <div class="block-txs">
                    <span class="block-label">${a.metric.toUpperCase()}</span>
                    <strong>${a.value}</strong>
                </div>
            </li>`;
        }).join("");
    }

    function initApp() {
        initGlobe();
        setFocus(IBM_SITES[0]);

        document.getElementById("btn-reset")?.addEventListener("click", () => {
            autoRotate = true;
            lambda = 0.55;
            phi = 0.2;
        });
        document.getElementById("btn-legend")?.addEventListener("click", () => {
            const el = document.getElementById("globe-legend");
            if (el) el.hidden = !el.hidden;
        });
        document.getElementById("view-filter")?.addEventListener("click", () => {
            filterIdx = (filterIdx + 1) % FILTERS.length;
            activeFilter = FILTERS[filterIdx].id;
            document.getElementById("view-label").textContent = FILTERS[filterIdx].label;
        });
        document.querySelector(".menu-btn")?.addEventListener("click", () => {
            document.querySelector(".nav-pill")?.classList.toggle("nav-open");
        });

        renderActivities();
        drawRegionChart();
        document.querySelectorAll(".spark-chart").forEach(drawSpark);

        const so = document.getElementById("stat-offices");
        const sc = document.getElementById("stat-countries");
        const ss = document.getElementById("stat-sites");
        if (so) so.textContent = IBM_STATS.offices;
        if (sc) sc.textContent = IBM_STATS.countries;
        if (ss) ss.textContent = IBM_STATS.sites;

        window.addEventListener("resize", () => {
            drawRegionChart();
            document.querySelectorAll(".spark-chart").forEach(drawSpark);
        });

        setInterval(() => {
            document.querySelectorAll(".spark-chart").forEach(drawSpark);
            setFocus(IBM_SITES[(Math.random() * IBM_SITES.length) | 0]);
        }, 8000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initApp);
    } else {
        initApp();
    }
})();
