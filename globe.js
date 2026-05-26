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

    function buildPoints(sites, types, filtered) {
        return sites.map((s) => {
            const { core } = markerMeta(types, s.type);
            return {
                lat: s.lat,
                lng: s.lon,
                site: s,
                core,
                /* Visual size vs generous hover hit area */
                r: filtered ? 0.26 : 0.2,
            };
        });
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
                .pointLat("lat")
                .pointLng("lng")
                .pointColor((d) => d.core)
                .pointAltitude(0.026)
                .pointRadius((d) => d.r)
                .pointsMerge(false)
                .ringsData([])
                .ringLat("lat")
                .ringLng("lng")
                .ringColor((d) => d.core)
                .ringAltitude(0.004)
                .ringResolution(48)
                .ringMaxRadius("maxRadius")
                .ringPropagationSpeed("propagationSpeed")
                .ringRepeatPeriod("repeatPeriod");

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
                    if (site) {
                        ctrl.autoRotate = false;
                    } else if (this._filter === "all") {
                        ctrl.autoRotate = true;
                    }
                    window.dispatchEvent(
                        new CustomEvent("ibm-site-hover", { detail: site })
                    );
                });
            }

            const ctrl = this._g.controls();
            ctrl.autoRotate = true;
            ctrl.autoRotateSpeed = 0.35;
            ctrl.enableDamping = true;

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
                this._g.pointOfView(this._pov, 1000);
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
            }, 1200);
        }

        setSites(sites, types, filter) {
            this._sites = sites;
            this._types = types;
            this._filter = filter;
            this._updateLayers();
            this._focusViewForFilter(filter);
        }

        reset() {
            this._g.pointOfView(this._pov, 1000);
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
