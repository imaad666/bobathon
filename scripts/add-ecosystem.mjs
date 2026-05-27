/**
 * Add verified IBM ecosystem entries (subsidiaries, partners, quantum hubs, clients).
 * Sources: IBM 10-K/AR 2025, newsroom, SEC filings, company HQ addresses.
 */
import fs from "fs";

const ADDITIONS = [
    // IBM subsidiaries (recent acquisitions)
    { id: "partner-datastax", lon: -121.9746, lat: 37.3839, type: "partner", name: "DataStax", city: "Santa Clara, California, United States", region: "Americas", source: "IBM Subsidiary" },
    { id: "partner-apptio", lon: -122.1956, lat: 47.6197, type: "partner", name: "Apptio", city: "Bellevue, Washington, United States", region: "Americas", source: "IBM Subsidiary" },
    { id: "partner-turbonomic", lon: -71.2356, lat: 42.3765, type: "partner", name: "Turbonomic", city: "Waltham, Massachusetts, United States", region: "Americas", source: "IBM Subsidiary" },
    { id: "partner-txture", lon: 15.4395, lat: 47.0707, type: "partner", name: "Txture", city: "Graz, Styria, Austria", region: "EMEA", source: "IBM Subsidiary" },
    // IBM 10-K strategic partners + AI ecosystem
    { id: "partner-servicenow", lon: -121.977, lat: 37.391, type: "partner", name: "ServiceNow", city: "Santa Clara, California, United States", region: "Americas", source: "IBM Partner" },
    { id: "partner-nvidia", lon: -121.9665, lat: 37.3709, type: "partner", name: "NVIDIA", city: "Santa Clara, California, United States", region: "Americas", source: "IBM Partner" },
    { id: "partner-amd", lon: -121.9724, lat: 37.4852, type: "partner", name: "AMD", city: "Santa Clara, California, United States", region: "Americas", source: "IBM Partner" },
    { id: "partner-anthropic", lon: -122.399, lat: 37.7925, type: "partner", name: "Anthropic", city: "San Francisco, California, United States", region: "Americas", source: "IBM Partner" },
    { id: "partner-groq", lon: -122.0516, lat: 37.4063, type: "partner", name: "Groq", city: "Mountain View, California, United States", region: "Americas", source: "IBM Partner" },
    { id: "partner-accenture", lon: -87.6229, lat: 41.8857, type: "partner", name: "Accenture", city: "Chicago, Illinois, United States", region: "Americas", source: "IBM Partner" },
    // Semiconductor / Albany ecosystem
    { id: "partner-rapidus", lon: 139.7671, lat: 35.6812, type: "partner", name: "Rapidus", city: "Tokyo, Tokyo, Japan", region: "APAC", source: "IBM Semiconductor" },
    { id: "partner-applied-materials", lon: -121.9745, lat: 37.403, type: "partner", name: "Applied Materials", city: "Santa Clara, California, United States", region: "Americas", source: "IBM Semiconductor" },
    { id: "partner-asml", lon: 5.4069, lat: 51.4423, type: "partner", name: "ASML", city: "Veldhoven, North Brabant, Netherlands", region: "EMEA", source: "IBM Semiconductor" },
    { id: "partner-siemens", lon: 11.5755, lat: 48.1372, type: "partner", name: "Siemens", city: "Munich, Bavaria, Germany", region: "EMEA", source: "IBM Semiconductor" },
    { id: "partner-imec", lon: 4.6938, lat: 50.9866, type: "partner", name: "imec", city: "Leuven, Flemish Brabant, Belgium", region: "EMEA", source: "IBM Semiconductor" },
    // IBM spinoff (historical infrastructure arm)
    { id: "partner-kyndryl", lon: -73.9782, lat: 40.7527, type: "partner", name: "Kyndryl", city: "New York, New York, United States", region: "Americas", source: "IBM Spinoff" },
    // Flagship clients (IBM / watsonx public references)
    { id: "client-verizon", lon: -74.4915, lat: 40.7056, type: "client", name: "Verizon", city: "Basking Ridge, New Jersey, United States", region: "Americas", source: "IBM Case Study" },
    { id: "client-fedex", lon: -90.0518, lat: 35.1526, type: "client", name: "FedEx", city: "Memphis, Tennessee, United States", region: "Americas", source: "IBM Case Study" },
    { id: "client-home-depot", lon: -84.4881, lat: 33.8704, type: "client", name: "The Home Depot", city: "Atlanta, Georgia, United States", region: "Americas", source: "IBM Case Study" },
    { id: "client-bmw", lon: 11.559, lat: 48.1771, type: "client", name: "BMW Group", city: "Munich, Bavaria, Germany", region: "EMEA", source: "IBM Case Study" },
    { id: "client-bank-of-america", lon: -80.8431, lat: 35.2271, type: "client", name: "Bank of America", city: "Charlotte, North Carolina, United States", region: "Americas", source: "IBM Case Study" },
    { id: "client-walmart", lon: -94.2218, lat: 36.3659, type: "client", name: "Walmart", city: "Bentonville, Arkansas, United States", region: "Americas", source: "IBM Case Study" },
    // Quantum Network hubs (beyond Omaha/Munich)
    { id: "initiative-quantum-poughkeepsie", lon: -73.9317, lat: 41.6501, type: "initiative", name: "IBM Quantum Data Center", city: "Poughkeepsie, New York, United States", region: "Americas", source: "IBM Quantum" },
    { id: "initiative-quantum-ehningen", lon: 8.9416, lat: 48.6575, type: "initiative", name: "IBM Quantum Data Center", city: "Ehningen, Baden-Württemberg, Germany", region: "EMEA", source: "IBM Quantum" },
    { id: "initiative-quantum-melbourne", lon: 144.9614, lat: -37.7963, type: "initiative", name: "IBM Quantum Innovation Center", city: "Melbourne, Victoria, Australia", region: "APAC", source: "IBM Quantum" },
    { id: "initiative-quantum-madras", lon: 80.2339, lat: 12.9915, type: "initiative", name: "IBM Quantum Innovation Center", city: "Chennai, Tamil Nadu, India", region: "APAC", source: "IBM Quantum" },
    { id: "initiative-quantum-ncstate", lon: -78.6744, lat: 35.7872, type: "initiative", name: "IBM Quantum Innovation Center", city: "Raleigh, North Carolina, United States", region: "Americas", source: "IBM Quantum" },
];

const path = new URL("../data.js", import.meta.url);
let src = fs.readFileSync(path, "utf8");

const existingIds = new Set([...src.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]));
const toAdd = ADDITIONS.filter((e) => {
    if (existingIds.has(e.id)) {
        console.log("skip duplicate", e.id);
        return false;
    }
    return true;
});

const lines = toAdd.map((e) => {
    let s = `    { id: "${e.id}", lon: ${e.lon}, lat: ${e.lat}, type: "${e.type}", name: "${e.name}", city: "${e.city}", region: "${e.region}", source: "${e.source}"`;
    return s + " },";
});

const marker = "    { id: \"initiative-watsonx\"";
const idx = src.indexOf(marker);
const lineEnd = src.indexOf("\n", src.indexOf("},", idx));
src = src.slice(0, lineEnd) + "\n" + lines.join("\n") + src.slice(lineEnd);

const IBM_SITES = new Function(`${src.match(/const IBM_SITES = \[[\s\S]*?\n\];/)[0]}; return IBM_SITES;`)();
const offices = IBM_SITES.filter((s) => s.type === "office").length;
const partners = IBM_SITES.filter((s) => s.type === "partner").length;
const total = IBM_SITES.length;

src = src.replace(/offices: "\d+"/, `offices: "${offices}"`);
src = src.replace(/sites: "\d+"/, `sites: "${total}"`);
src = src.replace(/dependencies: \d+/, `dependencies: ${partners}`);
src = src.replace(/quantum: \d+/, `quantum: ${IBM_SITES.filter((s) => s.type === "initiative").length}`);

fs.writeFileSync(path, src);
console.log(`Added ${toAdd.length} sites. Total: ${total} (${offices} offices, ${partners} partners)`);
