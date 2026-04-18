import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface VehicleRow {
  id: string;
  user_id: string;
  vin: string;
  owner_name: string | null;
  address: string | null;
  engine_number: string | null;
  color: string | null;
  license_plate: string | null;
  seats: number | null;
  registration_date: string | null;
  registration_photo_url: string | null;
  notes: string | null;
  decoded: any;
  created_at: string;
  updated_at: string;
}

const HEADERS: { key: keyof VehicleRow | string; label: string }[] = [
  { key: "vin", label: "VIN" },
  { key: "make", label: "Hãng" },
  { key: "model", label: "Mẫu" },
  { key: "model_year", label: "Năm" },
  { key: "owner_name", label: "Chủ xe" },
  { key: "license_plate", label: "Biển số" },
  { key: "engine_number", label: "Số máy" },
  { key: "color", label: "Màu xe" },
  { key: "seats", label: "Số chỗ" },
  { key: "registration_date", label: "Ngày đăng ký" },
  { key: "address", label: "Địa chỉ" },
  { key: "notes", label: "Ghi chú" },
  { key: "country", label: "Quốc gia" },
  { key: "manufacturer", label: "Nhà SX" },
  { key: "created_at", label: "Tạo lúc" },
];

function flatten(r: VehicleRow): Record<string, string | number> {
  const d = (r.decoded ?? {}) as any;
  const get = (k: string): any => {
    if (k in r) return (r as any)[k];
    return d[k];
  };
  const obj: Record<string, string | number> = {};
  for (const h of HEADERS) {
    const v = get(h.key as string);
    obj[h.label] = v == null ? "" : typeof v === "number" ? v : String(v);
  }
  return obj;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

export function exportVehicles(rows: VehicleRow[], format: "csv" | "json" | "xlsx" | "pdf") {
  if (!rows.length) return;
  const flat = rows.map(flatten);

  if (format === "json") {
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    return download(blob, `vehicles-${stamp()}.json`);
  }

  if (format === "csv") {
    const headers = HEADERS.map((h) => h.label);
    const escape = (v: any) => {
      const s = v == null ? "" : String(v);
      if (/["\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [headers.join(",")];
    for (const r of flat) lines.push(headers.map((h) => escape(r[h])).join(","));
    // BOM for UTF-8 Excel compatibility
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    return download(blob, `vehicles-${stamp()}.csv`);
  }

  if (format === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(flat, { header: HEADERS.map((h) => h.label) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vehicles");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return download(
      new Blob([out], { type: "application/octet-stream" }),
      `vehicles-${stamp()}.xlsx`
    );
  }

  if (format === "pdf") {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text("VinSight Scan – Danh sach xe", 40, 36);
    doc.setFontSize(9);
    doc.text(`Xuat luc: ${new Date().toLocaleString()}`, 40, 52);
    // jsPDF default font does not support Vietnamese diacritics, keep ASCII headers
    const headers = ["VIN", "Make", "Model", "Year", "Owner", "Plate", "Engine#", "Color", "Seats", "RegDate"];
    const body = rows.map((r) => {
      const d = (r.decoded ?? {}) as any;
      return [
        r.vin,
        d.make ?? "",
        d.model ?? "",
        d.model_year ?? "",
        r.owner_name ?? "",
        r.license_plate ?? "",
        r.engine_number ?? "",
        r.color ?? "",
        r.seats ?? "",
        r.registration_date ?? "",
      ];
    });
    autoTable(doc, {
      head: [headers],
      body,
      startY: 70,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [245, 158, 11], textColor: 20 },
    });
    doc.save(`vehicles-${stamp()}.pdf`);
    return;
  }
}
