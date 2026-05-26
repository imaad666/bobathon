/**
 * IBM Global — globe.gl (stable API only)
 */
(function () {
    const STRIPE_DEG = 5.5;
    const TEX_W = 2048;
    const TEX_H = 1024;
    const OCEAN = "#030308";
    const ANTARCTICA_WHITE = "#ffffff";

    function isAntarctica(f) {
        return f.id === "010" || f.properties?.name === "Antarctica";
    }
    const MAP_URLS = [
        "data/world-110m.json",
        "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
    ];

    function stripeHex(lat) {
        const band = Math.floor((lat + 90) / STRIPE_DEG);
        return band % 2 === 0 ? "#1b4d8c" : "#f4f0e8";
    }

    function equirectProjection(d3g, W, H) {
        return d3g
            .geoEquirectangular()
            .scale(W / (2 * Math.PI))
            .translate([W / 2, H / 2]);
    }

    /** Vector land + latitude stripes (no internal country border lines). */
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

        const bands = Math.ceil(180 / STRIPE_DEG);
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

        ctx.fillStyle = ANTARCTICA_WHITE;
        for (const f of features) {
            if (!isAntarctica(f)) continue;
            ctx.beginPath();
            path(f);
            ctx.fill();
        }

        return canvas.toDataURL("image/png");
    }

    function buildPoints(sites, types) {
        return sites.map((s) => ({
            lat: s.lat,
            lng: s.lon,
            site: s,
            color: (types[s.type] || { color: "#0f62fe" }).color,
            size: s.type === "office" ? 0.28 : 0.22,
        }));
    }

    function buildRings(sites, types) {
        return sites.map((s) => ({
            lat: s.lat,
            lng: s.lon,
            site: s,
            color: (types[s.type] || { color: "#0f62fe" }).color,
            maxRadius: s.type === "office" ? 2.8 : 2.2,
            propagationSpeed: 1,
            repeatPeriod: s.type === "office" ? 1100 : 900,
        }));
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
                .atmosphereColor("#2eb872")
                .atmosphereAltitude(0.2)
                .pointsData([])
                .pointLat("lat")
                .pointLng("lng")
                .pointColor("color")
                .pointAltitude((d) => d.size >= 0.28 ? 0.02 : 0.012)
                .pointRadius("size")
                .pointsMerge(true)
                .ringsData([])
                .ringLat("lat")
                .ringLng("lng")
                .ringColor("color")
                .ringAltitude(0.0015)
                .ringResolution(64)
                .ringMaxRadius("maxRadius")
                .ringPropagationSpeed("propagationSpeed")
                .ringRepeatPeriod("repeatPeriod");

            if (typeof this._g.onRingClick === "function") {
                this._g.onRingClick((ring) => {
                    if (ring?.site) this.onSiteFocus(ring.site);
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

        _updateLayers() {
            const visible = this._visibleSites();
            this._g.pointsData(buildPoints(visible, this._types));
            this._g.ringsData(buildRings(visible, this._types));
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
                altitude: filter === "office" ? 1.7 : 1.9,
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
