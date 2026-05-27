/* IBM WRLD — dashboard UI + WebGL globe hookup */

(function () {
    let globe = null;
    let activeFilter = "all";
    let previewSite = null;
    const VIEW_PARAM_MAP = {
        offices: "office",
        office: "office",
        clients: "client",
        client: "client",
        partners: "partner",
        partner: "partner",
        all: "all",
    };

    function connectGlobe() {
        if (location.protocol === "file:") return;
        globe = window.__ibmGlobe || null;
        if (globe?.setSites) {
            globe.setSites(IBM_SITES, SITE_TYPES, activeFilter);
        }
    }

    function applyFilterFromQuery() {
        const view = new URLSearchParams(location.search).get("view");
        if (!view) return;
        const filter = VIEW_PARAM_MAP[view.toLowerCase()];
        if (filter) applyFilter(filter);
    }

    function setFocus(site) {
        const isMoon = (site.region || "").toLowerCase() === "moon";
        const meta = SITE_TYPES[site.type] || SITE_TYPES.office;
        document.getElementById("focus-name").textContent = site.name;
        document.getElementById("focus-city").textContent = site.city;
        document.getElementById("focus-type").textContent = isMoon ? "Apollo" : meta.label;
        document.getElementById("focus-icon").textContent = isMoon ? "A11" : meta.abbr;
        document.getElementById("focus-icon").style.background =
            `linear-gradient(135deg, ${meta.color}, #4f70ef)`;
        document.getElementById("focus-pct").textContent =
            isMoon ? "Moon" : (site.region?.slice(0, 3) || "—");
        document.querySelector(".ring-fg").style.stroke = meta.color;
    }

    function renderSitePreview(site) {
        const el = document.getElementById("office-preview");
        if (!el) return;

        if (site) previewSite = site;
        const currentSite = site || previewSite;

        if (!currentSite) {
            el.innerHTML = `
                <div class="office-preview-inner office-preview-empty">
                    <p class="office-preview-hint">Hover a site on the globe</p>
                    <p class="office-preview-sub">Details appear here</p>
                </div>`;
            return;
        }

        const meta = SITE_TYPES[currentSite.type] || SITE_TYPES.office;
        const siteLink =
            currentSite.url || (currentSite.region === "Moon" ? "https://www.ibm.com/history/apollo" : "");
        el.innerHTML = `
            <div class="office-preview-inner">
                <div class="office-preview-top">
                    <div class="office-preview-avatar" style="background:linear-gradient(135deg,${meta.color},#4f70ef)">${meta.abbr}</div>
                    <div>
                        <p class="office-preview-type" style="color:${meta.markerCore}">${meta.label}</p>
                        <h4 class="office-preview-name">${currentSite.name}</h4>
                    </div>
                </div>
                <dl class="office-preview-meta">
                    <div><dt>Location</dt><dd>${currentSite.city}</dd></div>
                    <div><dt>Region</dt><dd>${currentSite.region || "—"}</dd></div>
                    ${currentSite.source ? `<div><dt>Source</dt><dd>${currentSite.source}</dd></div>` : ""}
                </dl>
                ${siteLink ? `<p class="office-preview-link"><a href="${siteLink}" data-story-link="true" target="_blank" rel="noopener noreferrer" style="color:${meta.markerCore}">IBM &amp; Apollo — read the story</a></p>` : ""}
            </div>`;
    }

    const FILTERS = [
        { id: "all", label: "All sites" },
        { id: "office", label: "Offices" },
        { id: "client", label: "Clients" },
        { id: "partner", label: "Dependencies" },
        { id: "initiative", label: "Initiatives" },
    ];
    let filterIdx = 0;

    function setActiveNav(filter) {
        document.querySelectorAll(".nav-link[data-filter]").forEach((link) => {
            link.classList.toggle("active", link.dataset.filter === filter);
        });
    }

    function applyFilter(filter) {
        const nextIdx = FILTERS.findIndex((item) => item.id === filter);
        activeFilter = nextIdx >= 0 ? FILTERS[nextIdx].id : "all";
        filterIdx = nextIdx >= 0 ? nextIdx : 0;
        const viewLabel = document.getElementById("view-label");
        if (viewLabel) viewLabel.textContent = FILTERS[filterIdx].label;
        // If user changes view while in moon mode, go back to Earth globe.
        window.__ibmSetMoonMode?.(false);
        setActiveNav(activeFilter);
        connectGlobe();
    }

    function bindFilterControls() {
        document.querySelectorAll("[data-filter]").forEach((el) => {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                applyFilter(el.dataset.filter);
                const url = new URL(location.href);
                if (el.dataset.filter === "all") {
                    url.searchParams.delete("view");
                } else {
                    url.searchParams.set("view", el.dataset.filter);
                }
                history.replaceState(null, "", url.pathname + url.search);
            });
        });
    }

    function renderDashboardLegend() {
        const el = document.getElementById("dashboard-legend");
        if (!el || typeof SITE_TYPES === "undefined") return;
        el.innerHTML = Object.entries(SITE_TYPES)
            .map(
                ([key, meta]) =>
                    `<span class="dashboard-legend-item"><span class="dot dot-${key}" style="background:${meta.markerCore};box-shadow:0 0 8px ${meta.markerGlow}" aria-hidden="true"></span>${meta.label}</span>`
            )
            .join("");
    }

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
            <li class="block-item" style="--block-accent:${meta.color}">
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
        renderDashboardLegend();
        if (IBM_SITES.length) setFocus(IBM_SITES[0]);
        setActiveNav(activeFilter);
        document.getElementById("office-preview")?.addEventListener("click", (e) => {
            const link = e.target?.closest?.("a[data-story-link='true']");
            if (!link) return;
            e.preventDefault();
            e.stopPropagation();
            const href = link.getAttribute("href");
            if (href) window.open(href, "_blank", "noopener,noreferrer");
        });
        window.addEventListener("ibm-site-focus", (e) => {
            renderSitePreview(e.detail);
        });
        window.addEventListener("ibm-site-hover", (e) => {
            if (e.detail) renderSitePreview(e.detail);
            document.getElementById("globe")?.classList.toggle("globe-hovering", !!e.detail);
        });

        bindFilterControls();

        renderActivities();
        renderRegionStats();
        renderSitePreview(null);

        const so = document.getElementById("stat-offices");
        const sc = document.getElementById("stat-countries");
        const ss = document.getElementById("stat-sites");
        if (so) so.textContent = IBM_STATS.offices;
        if (sc) sc.textContent = IBM_STATS.countries;
        if (ss) ss.textContent = IBM_STATS.sites;
    }

    /** Strip legacy office list if an old cached index.html is still served */
    function removeLegacyOfficeList() {
        document.getElementById("offices-section")?.remove();
        document.querySelector(".offices-row")?.remove();
        const list = document.getElementById("office-list");
        if (list) {
            list.closest("article")?.remove();
            list.remove();
        }
        document.querySelectorAll(".offices-list-card").forEach((el) => el.remove());
    }

    function boot() {
        removeLegacyOfficeList();
        initApp();
        applyFilterFromQuery();
        connectGlobe();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    window.addEventListener("ibm-globe-inited", connectGlobe);
    window.addEventListener("ibm-globe-ready", connectGlobe);
})();
