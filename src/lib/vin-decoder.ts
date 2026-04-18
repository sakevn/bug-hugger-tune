// VIN decoding logic - shared between server function and public API route.
// Combines NHTSA vPIC (free, public) with offline WMI table for richer Vietnam coverage.

export interface VinResult {
  vin: string;
  make: string | null;
  model: string | null;
  model_year: string | null;
  country: string | null;
  manufacturer: string | null;
  body_class: string | null;
  vehicle_type: string | null;
  plant: string | null;
  engine: string | null;
  serial_number: string | null;
  source: string;
}

const WMI_TABLE: Record<
  string,
  { make: string; country: string; manufacturer: string; model?: string; vehicle_type?: string }
> = {
  KMH: { make: "Hyundai", country: "Hàn Quốc", manufacturer: "Hyundai Motor Company", vehicle_type: "Xe con" },
  KMJ: { make: "Hyundai", country: "Hàn Quốc", manufacturer: "Hyundai Motor Company", model: "Grand Starex / H-1", vehicle_type: "MPV / Van" },
  KNA: { make: "Kia", country: "Hàn Quốc", manufacturer: "Kia Motors", vehicle_type: "Xe con" },
  KND: { make: "Kia", country: "Hàn Quốc", manufacturer: "Kia Motors", vehicle_type: "SUV / MPV" },
  JHM: { make: "Honda", country: "Nhật Bản", manufacturer: "Honda Motor Co." },
  JT2: { make: "Toyota", country: "Nhật Bản", manufacturer: "Toyota" },
  JTD: { make: "Toyota", country: "Nhật Bản", manufacturer: "Toyota" },
  JN1: { make: "Nissan", country: "Nhật Bản", manufacturer: "Nissan" },
  JM1: { make: "Mazda", country: "Nhật Bản", manufacturer: "Mazda" },
  JF1: { make: "Subaru", country: "Nhật Bản", manufacturer: "Subaru" },
  WBA: { make: "BMW", country: "Đức", manufacturer: "BMW AG" },
  WDB: { make: "Mercedes-Benz", country: "Đức", manufacturer: "Mercedes-Benz" },
  WDD: { make: "Mercedes-Benz", country: "Đức", manufacturer: "Mercedes-Benz" },
  WAU: { make: "Audi", country: "Đức", manufacturer: "Audi AG" },
  WVW: { make: "Volkswagen", country: "Đức", manufacturer: "Volkswagen" },
  WP0: { make: "Porsche", country: "Đức", manufacturer: "Porsche AG" },
  VF1: { make: "Renault", country: "Pháp", manufacturer: "Renault" },
  VF3: { make: "Peugeot", country: "Pháp", manufacturer: "Peugeot" },
  ZFF: { make: "Ferrari", country: "Ý", manufacturer: "Ferrari" },
  ZHW: { make: "Lamborghini", country: "Ý", manufacturer: "Lamborghini" },
  SAJ: { make: "Jaguar", country: "Vương Quốc Anh", manufacturer: "Jaguar" },
  SAL: { make: "Land Rover", country: "Vương Quốc Anh", manufacturer: "Land Rover" },
  "1FA": { make: "Ford", country: "Hoa Kỳ", manufacturer: "Ford Motor Company" },
  "1G1": { make: "Chevrolet", country: "Hoa Kỳ", manufacturer: "Chevrolet" },
  "1HG": { make: "Honda", country: "Hoa Kỳ", manufacturer: "Honda USA" },
  "5YJ": { make: "Tesla", country: "Hoa Kỳ", manufacturer: "Tesla, Inc." },
  // Vietnam
  RL4: { make: "VinFast", country: "Việt Nam", manufacturer: "VinFast Trading & Production JSC", vehicle_type: "Xe con / SUV" },
  RL8: { make: "VinFast", country: "Việt Nam", manufacturer: "VinFast Auto Ltd.", vehicle_type: "Xe điện" },
  RLU: { make: "VinFast", country: "Việt Nam", manufacturer: "VinFast (xe máy điện)", vehicle_type: "Xe máy điện" },
  RLM: { make: "Thaco", country: "Việt Nam", manufacturer: "Trường Hải Auto", vehicle_type: "Xe lắp ráp CKD" },
  RLH: { make: "Hyundai Thành Công", country: "Việt Nam", manufacturer: "Hyundai Thành Công VN" },
  RLC: { make: "Toyota Việt Nam", country: "Việt Nam", manufacturer: "Toyota Motor Vietnam" },
  RLD: { make: "Ford Việt Nam", country: "Việt Nam", manufacturer: "Ford Vietnam Limited" },
};

const YEAR_BASE: Record<string, number> = {
  A: 1980, B: 1981, C: 1982, D: 1983, E: 1984, F: 1985, G: 1986, H: 1987,
  J: 1988, K: 1989, L: 1990, M: 1991, N: 1992, P: 1993, R: 1994, S: 1995,
  T: 1996, V: 1997, W: 1998, X: 1999, Y: 2000,
  "1": 2001, "2": 2002, "3": 2003, "4": 2004, "5": 2005,
  "6": 2006, "7": 2007, "8": 2008, "9": 2009,
};

export const VIN_REGEX = /^[A-HJ-NPR-Z0-9]+$/;

function decodeYear(vin: string): string | null {
  if (vin.length < 10) return null;
  const c = vin[9].toUpperCase();
  const base = YEAR_BASE[c];
  if (base === undefined) return null;
  const currentYear = new Date().getFullYear();
  const candidates = [base, base + 30].filter((y) => y <= currentYear + 1);
  return String(candidates.length ? Math.max(...candidates) : base);
}

function offlineDecode(vin: string): VinResult {
  const wmi = vin.slice(0, 3).toUpperCase();
  const info = WMI_TABLE[wmi];
  return {
    vin,
    make: info?.make ?? null,
    model: info?.model ?? null,
    model_year: decodeYear(vin),
    country: info?.country ?? null,
    manufacturer: info?.manufacturer ?? null,
    body_class: null,
    vehicle_type: info?.vehicle_type ?? null,
    plant: null,
    engine: null,
    serial_number: vin.length >= 17 ? vin.slice(11) : null,
    source: "wmi-offline",
  };
}

function pick(rows: any[], variable: string): string | null {
  const r = rows.find((x) => x?.Variable === variable);
  const v = r?.Value;
  if (!v || v === "Not Applicable" || v === "0") return null;
  return String(v).trim() || null;
}

export async function decodeVin(rawVin: string): Promise<VinResult> {
  const vin = rawVin.trim().toUpperCase();
  const offline = offlineDecode(vin);

  // Try NHTSA vPIC
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vin)}?format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) {
      const json: any = await res.json();
      const rows: any[] = json?.Results ?? [];
      if (rows.length) {
        return {
          vin,
          make: pick(rows, "Make") ?? offline.make,
          model: pick(rows, "Model") ?? offline.model,
          model_year: pick(rows, "Model Year") ?? offline.model_year,
          country: pick(rows, "Plant Country") ?? offline.country,
          manufacturer: pick(rows, "Manufacturer Name") ?? offline.manufacturer,
          body_class: pick(rows, "Body Class"),
          vehicle_type: pick(rows, "Vehicle Type") ?? offline.vehicle_type,
          plant: [pick(rows, "Plant City"), pick(rows, "Plant Country")].filter(Boolean).join(", ") || null,
          engine: [
            pick(rows, "Engine Model"),
            pick(rows, "Displacement (L)") ? `${pick(rows, "Displacement (L)")}L` : null,
            pick(rows, "Fuel Type - Primary"),
          ].filter(Boolean).join(" · ") || null,
          serial_number: offline.serial_number,
          source: "nhtsa+wmi",
        };
      }
    }
  } catch {
    // network failure → fallback offline
  }
  return offline;
}
