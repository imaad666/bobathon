/**
 * IBM WRLD — globe.gl (stable API only)
 */
(function () {
    const STRIPE_DEG = 5.5;
    const TEX_W = 2048;
    const TEX_H = 1024;
    const OCEAN = "#030308";
    const LAND_BASE = "#121a2c";
    const ANTARCTICA = "#e6ecf4";
    const STRIPE_OPACITY = 0.11;

    function isAntarctica(f) {
        return f.id === "010" || f.properties?.name === "Antarctica";
    }

    const MAP_URLS = [
        "data/world-110m.json",
        "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
    ];

    function stripeHex(lat) {
        const band = Math.floor((lat + 90) / STRIPE_DEG);
        return band % 2 === 0 ? "#1b4d8c" : "#e8e4dc";
    }

    function markerMeta(types, type) {
        const m = types[type] || types.office;
        return {
            core: m.markerCore || m.color,
            glow: m.markerGlow || m.color,
        };
    }

    function equirectProjection(d3g, W, H) {
        return d3g
            .geoEquirectangular()
            .scale(W / (2 * Math.PI))
            .translate([W / 2, H / 2]);
    }

    /** Dark land base + faint IBM latitude stripes so blips stay readable */
    function buildGlobeTexture(features, d3g) {
        const W = TEX_W;
        const H = TEX_H;
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        const projection = equirectProjection(d3g, W, H);
        const path = d3g.geoPath(projection).context(ctx);

        ctx.fillStyle = OCEAN;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = LAND_BASE;
        for (const f of features) {
            if (isAntarctica(f)) continue;
            ctx.beginPath();
            path(f);
            ctx.fill();
        }

        const bands = Math.ceil(180 / STRIPE_DEG);
        ctx.globalAlpha = STRIPE_OPACITY;
        for (let b = 0; b < bands; b++) {
            const latNorth = 90 - b * STRIPE_DEG;
            const latSouth = Math.max(-90, latNorth - STRIPE_DEG);
            const yTop = ((90 - latNorth) / 180) * H;
            const yBot = ((90 - latSouth) / 180) * H;
            const midLat = (latNorth + latSouth) / 2;

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, yTop, W, Math.max(1, yBot - yTop));
            ctx.clip();
            ctx.fillStyle = stripeHex(midLat);
            for (const f of features) {
                if (isAntarctica(f)) continue;
                ctx.beginPath();
                path(f);
                ctx.fill();
            }
            ctx.restore();
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = ANTARCTICA;
        for (const f of features) {
            if (!isAntarctica(f)) continue;
            ctx.beginPath();
            path(f);
            ctx.fill();
        }

        return canvas.toDataURL("image/png");
    }

    const MARKER_R = {
        office: { all: 0.2, filtered: 0.27 },
        client: { all: 0.18, filtered: 0.25 },
        partner: { all: 0.18, filtered: 0.25 },
        initiative: { all: 0.22, filtered: 0.28 },
    };

    function buildPoints(sites, types, filtered, scale = 1) {
        return sites.map((s) => {
            const { core, glow } = markerMeta(types, s.type);
            const radii = MARKER_R[s.type] || MARKER_R.office;
            return {
                lat: s.lat,
                lng: s.lon,
                site: s,
                core,
                glow,
                type: s.type,
                r: (filtered ? radii.filtered : radii.all) * scale,
            };
        });
    }

    function configureSmoothControls(ctrl, { autoRotateSpeed = 0.22 } = {}) {
        ctrl.enableDamping = true;
        ctrl.dampingFactor = 0.14;
        ctrl.rotateSpeed = 0.32;
        ctrl.autoRotateSpeed = autoRotateSpeed;
    }

    function applyGlobeTransitions(g) {
        if (typeof g.pointsTransitionDuration === "function") g.pointsTransitionDuration(700);
        if (typeof g.ringsTransitionDuration === "function") g.ringsTransitionDuration(700);
    }

    function wirePointLayer(g) {
        g.pointLat("lat")
            .pointLng("lng")
            .pointColor((d) => d.core)
            .pointAltitude(0.028)
            .pointRadius((d) => d.r)
            .pointsMerge(false);
        if (typeof g.pointResolution === "function") g.pointResolution(10);
    }

    function wireRingLayer(g) {
        g.ringLat("lat")
            .ringLng("lng")
            .ringColor((d) => d.core)
            .ringAltitude(0.006)
            .ringResolution(48)
            .ringMaxRadius("maxRadius")
            .ringPropagationSpeed("propagationSpeed")
            .ringRepeatPeriod("repeatPeriod");
    }

    function mulberry32(seed) {
        return function () {
            let t = (seed += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* Same assets as https://globe.gl/example/moon-landing-sites/ */
    const MOON_SURFACE_URL = "data/lunar_surface.jpg";
    const MOON_BUMP_URL = "data/lunar_bumpmap.jpg";
    const MOON_SKY_URL = "data/night-sky.png";
    const APOLLO_ARTICLE_URL = "https://www.ibm.com/history/apollo";

    function buildMoonTexture() {
        // Offline fallback only — prefer bundled NASA-style maps in data/.
        const W = 2048;
        const H = 1024;
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        const rand = mulberry32(0xA11CE);

        const base = ctx.createLinearGradient(0, 0, 0, H);
        base.addColorStop(0, "#d8d6c8");
        base.addColorStop(0.5, "#c8c5b0");
        base.addColorStop(1, "#b8b5a0");
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, W, H);

        // Maria (dark basalt plains).
        for (let m = 0; m < 14; m++) {
            const cx = rand() * W;
            const cy = rand() * H;
            const rx = 80 + rand() * 220;
            const ry = 50 + rand() * 140;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rand() * Math.PI);
            const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
            mg.addColorStop(0, "rgba(55,55,48,0.55)");
            mg.addColorStop(0.7, "rgba(85,85,75,0.2)");
            mg.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = mg;
            ctx.beginPath();
            ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        for (let i = 0; i < 520; i++) {
            const x = rand() * W;
            const y = rand() * H;
            const rr = 4 + rand() * 38;
            const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
            g.addColorStop(0, "rgba(45,45,38,0.35)");
            g.addColorStop(0.4, "rgba(110,110,98,0.12)");
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, rr, 0, Math.PI * 2);
            ctx.fill();
        }

        const img = ctx.getImageData(0, 0, W, H);
        const data = img.data;
        for (let i = 0; i < data.length; i += 4) {
            const n = (rand() - 0.5) * 10;
            data[i] = Math.max(0, Math.min(255, data[i] + n));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
        }
        ctx.putImageData(img, 0, 0);
        return canvas.toDataURL("image/jpeg", 0.9);
    }

    function applyMoonGlobeTextures(g) {
        g.globeImageUrl(MOON_SURFACE_URL);
        if (typeof g.bumpImageUrl === "function") g.bumpImageUrl(MOON_BUMP_URL);
        if (typeof g.backgroundImageUrl === "function") g.backgroundImageUrl(MOON_SKY_URL);
    }

    function buildRings(sites, types) {
        return sites.map((s) => {
            const { core, glow } = markerMeta(types, s.type);
            return {
                lat: s.lat,
                lng: s.lon,
                site: s,
                core,
                glow,
                maxRadius: 1.55,
                propagationSpeed: 0.45,
                repeatPeriod: 1900,
            };
        });
    }

    async function fetchMap() {
        for (const url of MAP_URLS) {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 8000);
            try {
                const res = await fetch(url, { signal: ctrl.signal });
                clearTimeout(t);
                if (!res.ok) continue;
                const w = await res.json();
                if (w?.objects?.countries) return w;
            } catch (e) {
                clearTimeout(t);
            }
        }
        throw new Error("Map data failed to load");
    }

    function setStatus(msg, err) {
        const el = document.getElementById("globe-loading");
        if (!el) return;
        el.hidden = false;
        el.textContent = msg;
        el.classList.toggle("globe-loading--error", !!err);
    }

    class IBMGlobe {
        constructor(container, options = {}) {
            if (typeof Globe !== "function") throw new Error("globe.gl not loaded");

            this.onSiteFocus = options.onSiteFocus || (() => {});
            this._sites = [];
            this._types = {};
            this._filter = "all";
            this._pov = { lat: 12, lng: -20, altitude: 2.5 };
            this._g = Globe()(container)
                .backgroundColor("rgba(3, 3, 8, 1)")
                .showAtmosphere(true)
                .atmosphereColor("rgba(125, 23, 244, 0.28)")
                .atmosphereAltitude(0.18)
                .pointsData([])
                .ringsData([]);
            wirePointLayer(this._g);
            wireRingLayer(this._g);
            applyGlobeTransitions(this._g);

            if (typeof this._g.onRingClick === "function") {
                this._g.onRingClick((ring) => {
                    if (ring?.site) this.onSiteFocus(ring.site);
                });
            }
            if (typeof this._g.onPointClick === "function") {
                this._g.onPointClick((pt) => {
                    if (pt?.site) this.onSiteFocus(pt.site);
                });
            }
            if (typeof this._g.onPointHover === "function") {
                this._g.onPointHover((pt) => {
                    const site = pt?.site || null;
                    const ctrl = this._g.controls();
                    clearTimeout(this._hoverResumeTimer);
                    if (site) {
                        ctrl.autoRotate = false;
                    } else if (this._filter === "all") {
                        this._hoverResumeTimer = setTimeout(() => {
                            ctrl.autoRotate = true;
                        }, 500);
                    }
                    window.dispatchEvent(
                        new CustomEvent("ibm-site-hover", { detail: site })
                    );
                });
            }

            const ctrl = this._g.controls();
            ctrl.autoRotate = true;
            configureSmoothControls(ctrl);
            this._hoverResumeTimer = null;

            this._g.pointOfView(this._pov, 0);

            const box = container.parentElement || container;
            const fit = () => {
                const w = box.clientWidth;
                const h = box.clientHeight;
                if (w > 0 && h > 0) this._g.width(w).height(h);
            };
            fit();
            new ResizeObserver(fit).observe(box);
            window.addEventListener("resize", fit);

            this._bindMoonOcclusion();
            this._init();
        }

        async _init() {
            setStatus("Loading map…");
            try {
                const d3g = globalThis.d3;
                const topo = globalThis.topojson;
                if (!d3g?.geoPath || !topo) throw new Error("D3 / TopoJSON missing");

                const world = await fetchMap();
                const land = topo.feature(world, world.objects.countries);

                this._g.globeImageUrl(buildGlobeTexture(land.features, d3g));
                this._updateLayers();
                window.dispatchEvent(new Event("ibm-globe-ready"));

                document.getElementById("globe-loading").hidden = true;
            } catch (e) {
                console.error(e);
                setStatus(e.message || "Globe failed", true);
            }
        }

        _visibleSites() {
            return this._filter === "all"
                ? this._sites
                : this._sites.filter((s) => s.type === this._filter);
        }

        _isFiltered() {
            return this._filter !== "all";
        }

        _updateLayers() {
            const visible = this._visibleSites();
            const filtered = this._isFiltered();
            this._g.pointsData(buildPoints(visible, this._types, filtered));
            /* Soft pulse rings only when a nav filter is active — avoids 50+ ripples at once */
            this._g.ringsData(filtered ? buildRings(visible, this._types) : []);
        }

        _focusViewForFilter(filter) {
            const ctrl = this._g.controls();
            if (filter === "all") {
                ctrl.autoRotate = true;
                this._g.pointOfView(this._pov, 1400);
                setTimeout(() => this._moonOcclusionSync?.(), 1500);
                return;
            }

            const visible = this._visibleSites();
            if (!visible.length) return;

            const avgLat = visible.reduce((sum, s) => sum + s.lat, 0) / visible.length;
            const avgLng = visible.reduce((sum, s) => sum + s.lon, 0) / visible.length;

            ctrl.autoRotate = false;
            this._g.pointOfView({
                lat: avgLat,
                lng: avgLng,
                altitude: filter === "office" ? 2.05 : 2.15,
            }, 1600);
            setTimeout(() => this._moonOcclusionSync?.(), 1700);
        }

        setSites(sites, types, filter) {
            this._sites = sites;
            this._types = types;
            this._filter = filter;
            this._updateLayers();
            this._focusViewForFilter(filter);
        }

        _bindMoonOcclusion() {
            const hero = document.querySelector(".hero");
            if (!hero) return;

            const sync = () => {
                if (hero.classList.contains("moon-active")) {
                    hero.classList.remove("earth-zoomed");
                    return;
                }
                const pov = this._g.pointOfView?.();
                const alt = typeof pov?.altitude === "number" ? pov.altitude : 2.5;
                /* Only hide mini-moon when Earth is zoomed in close (manual scroll), not on filter presets */
                hero.classList.toggle("earth-zoomed", alt < 1.92);
            };

            sync();
            const ctrl = this._g.controls();
            ctrl.addEventListener("change", sync);
            window.addEventListener("ibm-globe-ready", sync);
            this._moonOcclusionSync = sync;
        }

        pause() {
            const ctrl = this._g?.controls?.();
            if (ctrl) ctrl.autoRotate = false;
        }

        resume() {
            const ctrl = this._g?.controls?.();
            if (!ctrl) return;
            ctrl.autoRotate = true;
            ctrl.autoRotateSpeed = 0.35;
        }

        focusForCurrentFilter() {
            this._focusViewForFilter(this._filter);
        }

        reset() {
            this._g.pointOfView(this._pov, 1400);
            this._g.controls().autoRotate = true;
        }
    }

    window.IBMGlobe = IBMGlobe;

    function start() {
        if (location.protocol === "file:") {
            setStatus("Run ./start.sh → http://localhost:8766/", true);
            return;
        }
        const el = document.getElementById("globe");
        if (!el || typeof Globe !== "function") {
            setStatus(typeof Globe !== "function" ? "globe.gl CDN blocked" : "No globe element", true);
            return;
        }

        // Apollo 11 landing: 0.67408°N, 23.47297°E (lunar coordinate convention).
        const APOLLO_11 = { lat: 0.67408, lng: 23.47297 };
        const moonSite = {
            type: "initiative",
            name: "Apollo 11 Landing Site",
            city: "Mare Tranquillitatis, Moon",
            region: "Moon",
            source: "IBM and the Apollo Program",
            url: APOLLO_ARTICLE_URL,
        };

        const hero = document.querySelector(".hero");
        const moonEl = document.getElementById("moon");
        let moonActive = false;

        function setMoonMode(on) {
            moonActive = !!on;
            if (hero) hero.classList.toggle("moon-active", moonActive);
            if (moonActive) {
                window.__ibmGlobe?.pause?.();
                moonGlobe?.focusLanding?.(false, false);
            } else {
                moonGlobe?.focusLanding?.(false, true);
                window.__ibmGlobe?.resume?.();
                window.__ibmGlobe?.focusForCurrentFilter?.();
            }
        }

        // Allow the rest of the UI to exit moon mode (filters, reset, etc.).
        window.__ibmSetMoonMode = setMoonMode;

        const apolloSiteRecord = {
            lon: APOLLO_11.lng,
            lat: APOLLO_11.lat,
            type: "initiative",
            ...moonSite,
        };

        class MoonGlobe {
            constructor(container) {
                this._g = Globe()(container)
                    .backgroundColor("rgba(3, 3, 8, 1)")
                    .showAtmosphere(true)
                    .atmosphereColor("rgba(180, 175, 200, 0.14)")
                    .atmosphereAltitude(0.1)
                    .globeImageUrl(MOON_SURFACE_URL)
                    .bumpImageUrl(MOON_BUMP_URL)
                    .backgroundImageUrl(MOON_SKY_URL);
                wirePointLayer(this._g);
                wireRingLayer(this._g);
                applyGlobeTransitions(this._g);
                this._g
                    .pointsData(buildPoints([apolloSiteRecord], SITE_TYPES, true, 2.4))
                    .ringsData(buildRings([apolloSiteRecord], SITE_TYPES));

                const probe = new Image();
                probe.onerror = () => this._g.globeImageUrl(buildMoonTexture());
                probe.src = MOON_SURFACE_URL;

                const ctrl = this._g.controls();
                ctrl.autoRotate = true;
                configureSmoothControls(ctrl, { autoRotateSpeed: 0.14 });

                this.focusLanding(true, true);

                const box = container.closest(".moon-dock") || container.parentElement || container;
                const fit = () => {
                    const w = box.clientWidth;
                    const h = box.clientHeight;
                    if (w > 0 && h > 0) this._g.width(w).height(h);
                };
                fit();
                new ResizeObserver(fit).observe(box);
                window.addEventListener("resize", fit);

                if (typeof this._g.onPointClick === "function") {
                    this._g.onPointClick((pt) => {
                        if (!pt?.site) return;
                        window.dispatchEvent(
                            new CustomEvent("ibm-site-focus", { detail: pt.site })
                        );
                    });
                }

                if (typeof this._g.onGlobeClick === "function") {
                    this._g.onGlobeClick(() => setMoonMode(!moonActive));
                }

                if (typeof this._g.onPointHover === "function") {
                    this._g.onPointHover((pt) => {
                        window.dispatchEvent(
                            new CustomEvent("ibm-site-hover", { detail: pt?.site || null })
                        );
                    });
                }
            }

            focusLanding(skipAnim = false, miniDock = true) {
                const ctrl = this._g.controls();
                ctrl.autoRotate = miniDock;
                const alt = miniDock ? 2.08 : 1.35;
                this._g.pointOfView(
                    { lat: APOLLO_11.lat, lng: APOLLO_11.lng, altitude: alt },
                    skipAnim ? 0 : 1200
                );
                // Resume a touch of auto-rotate after switching modes.
                if (moonActive) {
                    setTimeout(() => {
                        const c = this._g.controls();
                        if (c) {
                            c.autoRotate = true;
                            c.autoRotateSpeed = 0.22;
                        }
                    }, 900);
                }
            }
        }

        let moonGlobe = null;
        if (moonEl && typeof Globe === "function") {
            try {
                moonGlobe = new MoonGlobe(moonEl);
            } catch (e) {
                console.warn("Moon globe failed:", e);
            }
        }

        try {
            window.__ibmGlobe = new IBMGlobe(el, {
                onSiteFocus: (s) =>
                    window.dispatchEvent(new CustomEvent("ibm-site-focus", { detail: s })),
            });
            if (globalThis.IBM_SITES) {
                window.__ibmGlobe.setSites(IBM_SITES, SITE_TYPES, "all");
            }
            window.dispatchEvent(new Event("ibm-globe-inited"));
        } catch (e) {
            setStatus("Globe failed: " + e.message, true);
            console.error(e);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
