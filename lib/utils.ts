import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-SG", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-SG", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    approved: "green",
    completed: "green",
    passed: "green",
    passed_with_remarks: "green",
    active: "green",
    submitted: "blue",
    under_review: "blue",
    in_progress: "blue",
    unlocked: "blue",
    scheduled: "blue",
    draft: "gray",
    locked: "gray",
    pending: "yellow",
    not_started: "gray",
    rejected: "red",
    failed: "red",
    open: "red",
    expired: "red",
    high: "red",
    medium: "yellow",
    low: "green",
    cancelled: "gray",
    not_required: "gray",
    not_applicable: "gray",
  };
  return map[status] || "gray";
}

export const STATUS_BADGES: Record<string, string> = {
  green: "bg-green-100 text-green-800 border-green-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  red: "bg-red-100 text-red-800 border-red-200",
  gray: "bg-gray-100 text-gray-700 border-gray-200",
};

export function getStatusBadgeClass(status: string): string {
  return STATUS_BADGES[statusColor(status)] || STATUS_BADGES.gray;
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    super_admin: "Super Admin",
    company_admin: "Company Admin",
    project_manager: "Project Manager",
    supervisor: "Site Supervisor",
    safety_officer: "Safety Officer",
    worker: "Worker",
    consultant: "Consultant",
    tc_officer: "TC Officer",
  };
  return map[role] || role;
}

export function phaseIcon(phaseNo: number): string {
  const icons = ["", "📋", "🚧", "🔧", "🧱", "🎨", "🔍", "🧹"];
  return icons[phaseNo] || "📌";
}

export const PHASE_NAMES: Record<number, string> = {
  1: "Pre-Start / Planning",
  2: "Site Setup & Protection",
  3: "Surface Preparation",
  4: "Repair Works",
  5: "Painting Application",
  6: "Inspection & Touch-Up",
  7: "Cleaning & Dismantling",
};

export const HDB_TOWNS = [
  "Ang Mo Kio","Bedok","Bishan","Bukit Batok","Bukit Merah","Bukit Panjang",
  "Bukit Timah","Central","Choa Chu Kang","Clementi","Geylang","Hougang",
  "Jurong East","Jurong West","Kallang","Marine Parade","Pasir Ris","Punggol",
  "Queenstown","Sembawang","Sengkang","Serangoon","Tampines","Toa Payoh",
  "Woodlands","Yishun","Others",
];

export const PROJECT_TYPES = [
  { value: "external_painting", label: "External Painting" },
  { value: "internal_painting", label: "Internal Painting" },
  { value: "waterproofing", label: "Waterproofing" },
  { value: "spalling_repair", label: "Spalling Concrete Repair" },
  { value: "full_refurbishment", label: "Full Refurbishment" },
  { value: "corridor_painting", label: "Corridor Painting" },
  { value: "void_deck", label: "Void Deck" },
  { value: "roof_top", label: "Roof Top" },
  { value: "others", label: "Others" },
];

export const PAINT_BRANDS = ["Jotun","Nippon Paint","Dulux","Sika","Fosroc","Mapei","Others"];

export const MATERIAL_CATEGORIES = [
  { value: "primer", label: "Primer" },
  { value: "sealer", label: "Sealer" },
  { value: "finishing_paint", label: "Finishing Paint" },
  { value: "weathercoat", label: "Weathercoat" },
  { value: "elastomeric", label: "Elastomeric Coat" },
  { value: "emulsion", label: "Emulsion Paint" },
  { value: "cement_filler", label: "Cement Filler" },
  { value: "crack_filler", label: "Crack Filler" },
  { value: "skim_coat", label: "Skim Coat" },
  { value: "sealant", label: "Sealant" },
  { value: "waterproofing_membrane", label: "Waterproofing Membrane" },
  { value: "anti_fungal", label: "Anti-Fungal Wash" },
  { value: "others", label: "Others" },
];

export const PERMIT_TYPES = [
  { value: "tc_approval", label: "Town Council Approval" },
  { value: "wah_permit", label: "Work at Height (WAH) Permit" },
  { value: "road_closure", label: "Road Closure Permit (LTA)" },
  { value: "noise_waiver", label: "Noise Waiver (NEA)" },
  { value: "scaffold_cert", label: "Scaffold Certificate" },
  { value: "gondola_cert", label: "Gondola / BMU Certificate" },
  { value: "ptw", label: "Permit to Work" },
  { value: "others", label: "Others" },
];

export const DEFECT_TYPES = [
  { value: "peeling_paint", label: "Peeling Paint" },
  { value: "uneven_colour", label: "Uneven Colour" },
  { value: "crack", label: "Crack" },
  { value: "hollow_plaster", label: "Hollow Plaster" },
  { value: "spalling", label: "Spalling Concrete" },
  { value: "efflorescence", label: "Efflorescence / Staining" },
  { value: "water_stain", label: "Water Stain" },
  { value: "dirty_surface", label: "Dirty Surface" },
  { value: "missed_area", label: "Missed Area" },
  { value: "bleed_through", label: "Bleed Through" },
  { value: "others", label: "Others" },
];

export const WEATHER_OPTIONS = [
  { value: "sunny", label: "Sunny ☀️" },
  { value: "partly_cloudy", label: "Partly Cloudy ⛅" },
  { value: "cloudy", label: "Cloudy ☁️" },
  { value: "light_rain", label: "Light Rain 🌦️" },
  { value: "heavy_rain", label: "Heavy Rain 🌧️" },
  { value: "thunderstorm", label: "Thunderstorm ⛈️" },
];
