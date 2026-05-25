/** IBM global presence — offices, clients, dependencies, initiatives */

const SITE_TYPES = {
    office: { label: "Office", color: "#0f62fe", glow: "rgba(15, 98, 254, 0.9)", abbr: "O" },
    client: { label: "Client", color: "#ee5396", glow: "rgba(238, 83, 150, 0.9)", abbr: "C" },
    partner: { label: "Dependency", color: "#ff832b", glow: "rgba(255, 131, 43, 0.9)", abbr: "D" },
    initiative: { label: "Initiative", color: "#8a3ffc", glow: "rgba(138, 63, 252, 0.9)", abbr: "I" },
};

const IBM_SITES = [
    { lon: -73.72, lat: 41.11, type: "office", name: "Armonk Headquarters", city: "New York, USA", region: "Americas" },
    { lon: -73.99, lat: 40.75, type: "office", name: "NYC Metro", city: "New York, USA", region: "Americas" },
    { lon: -122.03, lat: 37.39, type: "office", name: "Silicon Valley Lab", city: "California, USA", region: "Americas" },
    { lon: -97.74, lat: 30.27, type: "office", name: "Austin Campus", city: "Texas, USA", region: "Americas" },
    { lon: -79.38, lat: 43.65, type: "office", name: "Markham Lab", city: "Ontario, Canada", region: "Americas" },
    { lon: -46.63, lat: -23.55, type: "office", name: "São Paulo", city: "Brazil", region: "Americas" },
    { lon: -0.12, lat: 51.51, type: "office", name: "London South Bank", city: "United Kingdom", region: "EMEA" },
    { lon: 2.35, lat: 48.86, type: "office", name: "Paris La Défense", city: "France", region: "EMEA" },
    { lon: 8.68, lat: 50.11, type: "office", name: "Frankfurt", city: "Germany", region: "EMEA" },
    { lon: 12.49, lat: 41.90, type: "office", name: "Rome", city: "Italy", region: "EMEA" },
    { lon: 37.62, lat: 55.75, type: "office", name: "Moscow", city: "Russia", region: "EMEA" },
    { lon: 77.59, lat: 12.97, type: "office", name: "Bangalore", city: "India", region: "APAC" },
    { lon: 72.88, lat: 19.08, type: "office", name: "Mumbai", city: "India", region: "APAC" },
    { lon: 103.85, lat: 1.30, type: "office", name: "Singapore", city: "Singapore", region: "APAC" },
    { lon: 139.69, lat: 35.69, type: "office", name: "Tokyo", city: "Japan", region: "APAC" },
    { lon: 121.47, lat: 31.23, type: "office", name: "Shanghai", city: "China", region: "APAC" },
    { lon: 151.21, lat: -33.87, type: "office", name: "Sydney", city: "Australia", region: "APAC" },
    { lon: -73.81, lat: 41.03, type: "initiative", name: "IBM Research Yorktown", city: "New York, USA", region: "Americas" },
    { lon: -95.99, lat: 41.26, type: "initiative", name: "IBM Quantum — Omaha", city: "Nebraska, USA", region: "Americas" },
    { lon: 11.58, lat: 48.14, type: "initiative", name: "Quantum — Munich", city: "Germany", region: "EMEA" },
    { lon: 116.40, lat: 39.90, type: "client", name: "Beijing Financial District", city: "China", region: "APAC" },
    { lon: -87.63, lat: 41.88, type: "client", name: "Chicago Enterprise Hub", city: "USA", region: "Americas" },
    { lon: 4.90, lat: 52.37, type: "client", name: "Amsterdam Client Center", city: "Netherlands", region: "EMEA" },
    { lon: 55.27, lat: 25.20, type: "client", name: "Dubai", city: "UAE", region: "EMEA" },
    { lon: -99.13, lat: 19.43, type: "client", name: "Mexico City", city: "Mexico", region: "Americas" },
    { lon: 18.42, lat: -33.92, type: "client", name: "Cape Town", city: "South Africa", region: "EMEA" },
    { lon: -122.42, lat: 37.77, type: "partner", name: "Red Hat — San Francisco", city: "USA", region: "Americas" },
    { lon: -77.04, lat: 38.91, type: "partner", name: "HashiCorp — Washington DC", city: "USA", region: "Americas" },
    { lon: 13.40, lat: 52.52, type: "partner", name: "SAP Alliance — Berlin", city: "Germany", region: "EMEA" },
    { lon: 100.50, lat: 13.75, type: "partner", name: "AWS Interconnect — Bangkok", city: "Thailand", region: "APAC" },
    { lon: 126.98, lat: 37.57, type: "partner", name: "Samsung Foundry — Seoul", city: "South Korea", region: "APAC" },
    { lon: -0.10, lat: 51.52, type: "partner", name: "Vodafone — London", city: "UK", region: "EMEA" },
    { lon: 144.96, lat: -37.81, type: "initiative", name: "Sustainability — Melbourne", city: "Australia", region: "APAC" },
    { lon: -43.17, lat: -22.91, type: "initiative", name: "Green Data Center — Rio", city: "Brazil", region: "Americas" },
];

const REGIONS = ["Americas", "EMEA", "APAC"];

const IBM_ACTIVITIES = [
    { icon: "O", type: "office", name: "Watson IoT — Munich", location: "Germany", metric: "Opened", value: "2025" },
    { icon: "C", type: "client", name: "JPMorgan Chase", location: "New York", metric: "Contract", value: "Renewed" },
    { icon: "D", type: "partner", name: "Microsoft Azure", location: "Global", metric: "Integration", value: "Active" },
    { icon: "I", type: "initiative", name: "watsonx.ai rollout", location: "APAC", metric: "Phase", value: "3/5" },
];

const IBM_STATS = {
    offices: "175+",
    countries: "170+",
    sites: "420+",
    cloudRegions: 34,
    labs: 12,
    employees: "~288K",
    enterpriseClients: "12.4K",
    consulting: "3.2K",
    dependencies: 840,
    quantum: 5,
    sustainability: 67,
    revenue: "$62.8B",
    growth: "14.2",
    patents: "150K+",
};
