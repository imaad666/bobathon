/**
 * Prune unverified IBM offices using:
 * - IBM NA CIC blog (Lansing, Baton Rouge, Monroe, Buffalo, Halifax, Calgary, Quebec)
 * - IBM India 12 CIC newsroom list
 * - Documented closure: Southbury CT (2025)
 * - Clay/IBM major US sites (Charlotte, San Francisco, research labs)
 * - Country-level hubs on ibm.com/careers/locations
 */
import fs from "fs";

const VERIFIED_OFFICE_IDS = new Set([
    // India — 12 IBM Consulting CICs (newsroom, Nov 2023)
    "ibm-kochi-wtc",
    "ibm-noida",
    "ibm-coimbatore",
    "ibm-gurugram",
    "ibm-kolkata",
    "ibm-bhubaneswar",
    "ibm-mysuru",
    "ibm-gandhinagar",
    // North America CICs + verified US sites
    "ibm-halifax",
    "ibm-baton-rouge",
    "ibm-monroe-la",
    "ibm-lansing",
    "ibm-buffalo",
    "ibm-calgary",
    "ibm-quebec-city",
    "ibm-gatineau",
    "ibm-charlotte",
    "ibm-san-francisco",
    "ibm-yorktown-research",
    "ibm-almaden-research",
    "ibm-rochester",
    "ibm-boulder",
    "ibm-littleton",
    "ibm-washington-dc",
    "ibm-nyc-astor",
    "ibm-ottawa",
    "ibm-bromont",
    "ibm-waterloo",
    "ibm-ashburn",
    "ibm-queretaro",
    "ibm-northcastle",
    // Research labs
    "ibm-haifa-research",
    "ibm-nairobi-research",
    "ibm-rio-research",
    // APAC hubs (country / major delivery)
    "ibm-hong-kong",
    "ibm-jakarta",
    "ibm-bangkok",
    "ibm-brisbane",
    "ibm-wellington",
    "ibm-perth",
    "ibm-cyberjaya",
    "ibm-ho-chi-minh",
    "ibm-colombo",
    "ibm-dhaka",
    "ibm-islamabad",
    "ibm-manila-eastwood",
    "ibm-penang",
    "ibm-yamato-lab",
    "ibm-nagoya",
    // EMEA — delivery centers & country HQs (careers / IBM country sites)
    "ibm-ehningen-hq",
    "ibm-warsaw",
    "ibm-brno",
    "ibm-ostrava",
    "ibm-budapest",
    "ibm-bucharest",
    "ibm-bratislava",
    "ibm-kosice",
    "ibm-sofia",
    "ibm-wroclaw",
    "ibm-katowice",
    "ibm-szekesfehervar",
    "ibm-leicester",
    "ibm-warwick",
    "ibm-groningen",
    "ibm-montpellier",
    "ibm-barcelona",
    "ibm-lyon",
    "ibm-berlin",
    "ibm-hamburg",
    "ibm-vienna",
    "ibm-brussels",
    "ibm-helsinki",
    "ibm-oslo",
    "ibm-lisbon",
    "ibm-athens",
    "ibm-istanbul",
    "ibm-stockholm",
    "ibm-copenhagen",
    "ibm-turin",
    "ibm-riyadh",
    "ibm-jeddah",
    "ibm-abu-dhabi",
    "ibm-doha",
    "ibm-kuwait-city",
    "ibm-al-khobar",
    "ibm-manama",
    "ibm-muscat",
    "ibm-cairo",
    "ibm-casablanca",
    "ibm-tunis",
    "ibm-algiers",
    "ibm-lagos",
    "ibm-accra",
    "ibm-dakar",
    "ibm-abidjan",
    "ibm-luanda",
    "ibm-dar-es-salaam",
    "ibm-capetown",
    "ibm-tallinn",
    "ibm-riga",
    "ibm-vilnius",
    "ibm-ljubljana",
    "ibm-belgrade",
    "ibm-zagreb",
    "ibm-kiev",
    "ibm-almaty",
    "ibm-tashkent",
    // Americas — country / major campuses
    "ibm-hortolandia",
    "ibm-santiago",
    "ibm-lima",
    "ibm-costa-rica",
    "ibm-brasilia",
    "ibm-monterrey",
    "ibm-medellin",
    "ibm-campinas",
    "ibm-montevideo",
    "ibm-quito",
    "ibm-asuncion",
    "ibm-san-juan",
]);

// Documented closed — always remove even if previously listed
const FORCE_REMOVE_IDS = new Set(["ibm-southbury"]);

const dataPath = new URL("../data.js", import.meta.url);
let src = fs.readFileSync(dataPath, "utf8");

const start = src.indexOf("const IBM_SITES = [");
const end = src.indexOf("\n];", start) + 3;
const sitesBlock = src.slice(start, end);

const sites = new Function(`${sitesBlock}; return IBM_SITES;`)();

const removed = [];
const kept = sites.filter((s) => {
    if (s.type !== "office") return true;
    if (FORCE_REMOVE_IDS.has(s.id)) {
        removed.push({ id: s.id, name: s.name, reason: "Documented closure (Southbury CT, 2025)" });
        return false;
    }
    if (!s.id) return true; // core curated offices
    if (VERIFIED_OFFICE_IDS.has(s.id)) return true;
    removed.push({
        id: s.id,
        name: s.name,
        reason: "No verified IBM office/CIC source",
    });
    return false;
});

const offices = kept.filter((s) => s.type === "office").length;
const total = kept.length;

function formatSite(s) {
    let line = "    { ";
    if (s.id) line += `id: "${s.id}", `;
    line += `lon: ${s.lon}, lat: ${s.lat}, type: "${s.type}", name: "${s.name}", city: "${s.city}", region: "${s.region}"`;
    if (s.source) line += `, source: "${s.source}"`;
    if (s.subtype) line += `, subtype: "${s.subtype}"`;
    return line + " },\n";
}

const newBlock = "const IBM_SITES = [\n" + kept.map(formatSite).join("") + "];\n";
src = src.slice(0, start) + newBlock + src.slice(end);
src = src.replace(/offices: "\d+"/, `offices: "${offices}"`);
src = src.replace(/sites: "\d+"/, `sites: "${total}"`);

fs.writeFileSync(dataPath, src);
fs.writeFileSync(
    new URL("../data/removed-offices.json", import.meta.url),
    JSON.stringify(removed, null, 2)
);

console.log(`Kept ${offices} offices, ${total} total sites`);
console.log(`Removed ${removed.length} offices`);
console.log("Removed list written to data/removed-offices.json");
