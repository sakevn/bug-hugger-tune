

## Bugs identified

**1. Update silently fails / no feedback (`dashboard.vehicles.$id.tsx` `save()`):**
- `.update({...}).eq("id", v.id)` is called without `.select()`. If RLS blocks the row or no row matches, Supabase returns `error: null` AND `data: null`, but the code shows "Đã lưu" anyway → user sees success even when nothing was saved.
- `seats` is converted with `Number(s)` which produces `NaN` for non-numeric input → DB rejects insert/update silently in some clients.
- `registration_date` empty string can be sent as `""` instead of `null`.
- The `update` payload doesn't include `user_id` (fine), but to make RLS friendly we should also `.eq("user_id", user.id)` to be explicit.

**Fix:** chain `.select().maybeSingle()`, validate seats (`isNaN` → null), normalize dates, error if no row returned, refresh local state from returned row.

**2. (minor) `removePhoto` / `uploadPhoto` also lack `.select()` checks, but they refresh via subsequent calls so visible. Will add the same safeguard.

## Bundle optimization

Currently `dashboard.vehicles.tsx` imports `vehicle-export.ts` synchronously, which statically imports `xlsx`, `jspdf`, `jspdf-autotable` → ~1.3MB chunk. `tesseract.js` is imported by `VinScanner` (used in `dashboard.index.tsx`).

**Plan:**

- **`src/lib/vehicle-export.ts`** → convert to async function `exportVehicles(...)` that **dynamically imports** `xlsx`, `jspdf`, and `jspdf-autotable` only when the user actually clicks an export format (CSV/JSON paths stay sync since they have no heavy deps).
- **`src/components/VinScanner.tsx`** → already uses `tesseract.js`. Convert the OCR call to `await import("tesseract.js")` inside the OCR handler so Tesseract chunk loads only when user triggers OCR (not on initial scan page render).
- Update `ExportMenu` in `dashboard.vehicles.tsx` to `await exportVehicles(...)` and add a small loading state on click.

Expected result: `dashboard.vehicles` chunk drops from ~1.3MB to <100KB; `xlsx`/`jspdf`/`tesseract` become on-demand chunks.

## Files to change

1. `src/routes/dashboard.vehicles.$id.tsx` — fix `save()` (use `.select().maybeSingle()`, normalize seats/date, surface "no row updated" error, sync state from returned row).
2. `src/lib/vehicle-export.ts` — make `exportVehicles` async, dynamic-import `xlsx`, `jspdf`, `jspdf-autotable` per branch.
3. `src/routes/dashboard.vehicles.tsx` — `ExportMenu` awaits the async export and shows a brief loading toast.
4. `src/components/VinScanner.tsx` — dynamic-import `tesseract.js` inside the OCR handler (no API surface change).

No DB changes needed — the RLS update policy is correct; the visible "no save" was a UX/validation issue, not a permissions one.

