/* IBM Global — dashboard UI + WebGL globe hookup */

(function () {
    let globe = null;
    let activeFilter = "all";

    function initGlobe() {
        if (location.protocol === "file:") {
            const el = document.getElementById("globe-loading");
            if (el) {
                el.hidden = false;
                el.textContent = "Run ./start.sh then open http://localhost:8766/";
            }
            return;
        }
        globe = window.__ibmGlobe || null;
    }

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

    function renderRegionStats() {
        const ul = document.getElementById("region-stats");
        if (!ul) return;
        ul.innerHTML = REGIONS.map((region) => {
            const offices = IBM_SITES.filter((s) => s.region === region && s.type === "office").length;
            const clients = IBM_SITES.filter((s) => s.region === region && s.type === "client").length;
            const partners = IBM_SITES.filter((s) => s.region === region && s.type === "partner").length;
            return `
            <li class="region-stat-row">
                <span class="region-stat-name">${region}</span>
                <span class="region-stat-nums">
                    <span class="region-num region-num-office">${offices}</span> offices ·
                    <span class="region-num region-num-client">${clients}</span> clients ·
                    <span class="region-num region-num-partner">${partners}</span> partners
                </span>
            </li>`;
        }).join("");
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
        setFocus(IBM_SITES[0]);
        window.addEventListener("ibm-site-focus", (e) => setFocus(e.detail));

        document.getElementById("btn-reset")?.addEventListener("click", () => globe?.reset());
        document.getElementById("btn-legend")?.addEventListener("click", () => {
            const el = document.getElementById("globe-legend");
            if (el) el.hidden = !el.hidden;
        });
        document.getElementById("view-filter")?.addEventListener("click", () => {
            filterIdx = (filterIdx + 1) % FILTERS.length;
            activeFilter = FILTERS[filterIdx].id;
            document.getElementById("view-label").textContent = FILTERS[filterIdx].label;
            if (globe?.setSites) globe.setSites(IBM_SITES, SITE_TYPES, activeFilter);
        });
        document.querySelector(".menu-btn")?.addEventListener("click", () => {
            document.querySelector(".nav-pill")?.classList.toggle("nav-open");
        });

        renderActivities();
        renderRegionStats();

        const so = document.getElementById("stat-offices");
        const sc = document.getElementById("stat-countries");
        const ss = document.getElementById("stat-sites");
        if (so) so.textContent = IBM_STATS.offices;
        if (sc) sc.textContent = IBM_STATS.countries;
        if (ss) ss.textContent = IBM_STATS.sites;

        setInterval(() => {
            setFocus(IBM_SITES[(Math.random() * IBM_SITES.length) | 0]);
        }, 8000);
    }

    function boot() {
        initGlobe();
        initApp();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    window.addEventListener("ibm-globe-inited", () => {
        globe = window.__ibmGlobe;
        if (globe?.setSites) globe.setSites(IBM_SITES, SITE_TYPES, activeFilter);
    });
})();
