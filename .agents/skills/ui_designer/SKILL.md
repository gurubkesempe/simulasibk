---
name: ui_designer
description: Skill UI/UX Specialist untuk membuat antarmuka web modern, clean, dan profesional standar industri (Linear, Vercel, Stripe, Shadcn UI) agar tampilan TIDAK terlihat seperti AI/template murahan. Diaktifkan saat user memanggil `/ui_designer`, 'ui_designer', 'ui design', 'rapikan UI', atau meminta desain antarmuka profesional tanpa AI vibes.
---

# UI/UX Specialist — Clean Human SaaS Interface Standard

Panduan komprehensif untuk merancang dan membangun User Interface (UI) web aplikasi yang elegan, fungsional, dan bebas dari ciri khas "AI-generated UI" yang berantakan atau murahan.

---

## 🚫 1. Anti-AI Design Traps (HINDARI INI!)

| AI Anti-Pattern | Mengapa Buruk | Standar Modern yang Benar |
| :--- | :--- | :--- |
| **Neon Glowing Shadows** (`box-shadow: 0 0 20px #06b6d4`) | Terkesan norak dan fiksi ilmiah murah. | Gunakan subtle 1px border (`rgba(255,255,255,0.08)` / `border-zinc-800`) dan soft ambient shadow (`0 1px 3px rgba(0,0,0,0.4)`). |
| **Teks Tabel Terpotong/Wrapping Aneh** ("Nasi \n Goreng \n Biasa") | Kolom terlalu sempit, tabel tidak diatur lebarnya. | Terapkan `min-width` yang tepat, `white-space: nowrap` untuk kode/harga/status, dan `table-layout: fixed` atau layout fleksibel yang lega. |
| **Emoji Berlebihan di Tombol & Judul** (📋, ⚡, ✏️ di mana-mana) | Terlihat seperti demo cepat / prototype bot chat. | Gunakan icon SVG monokrom/outline yang presisi (Lucide / Heroicons / Feather). |
| **Warna Gradient Pelangi Acak** | Menghilangkan hierarki visual. | Gunakan palet netral (Zinc/Slate) dengan 1 aksen warna fungsional (e.g. Emerald `#10b981` atau Indigo `#6366f1`). |
| **Pill & Button Terlalu Bulat & Tebal** | Memakan ruang dan tidak proporsional. | Gunakan border radius konsisten: `6px` (sm), `8px` (md), `12px` (lg). Gunakan pill (`rounded-full`) hanya untuk badge status kecil. |

---

## 🎨 2. Palet Warna Modern (Neutral Dark & Light)

### Dark Mode (Slate / Zinc Standard - Linear / Shadcn Vibe)
```css
:root {
  /* Background layers */
  --bg-app: #09090b;             /* Zinc 950: background paling dasar */
  --bg-card: #121215;            /* Zinc 900 tone: kartu & panel */
  --bg-card-hover: #18181b;      /* Zinc 800 tone: hover state */
  --bg-input: #18181b;           /* Input field background */
  
  /* Borders */
  --border-subtle: #27272a;      /* 1px border pemisah utama */
  --border-strong: #3f3f46;      /* Border saat fokus/hover */
  
  /* Typography */
  --text-primary: #f4f4f5;       /* Zinc 100: teks utama */
  --text-secondary: #a1a1aa;     /* Zinc 400: subteks & deskripsi */
  --text-tertiary: #71717a;      /* Zinc 500: label kecil / placeholder */
  
  /* Semantic Accents */
  --accent-primary: #10b981;     /* Emerald 500 */
  --accent-primary-hover: #059669;
  --accent-danger: #ef4444;      /* Rose/Red 500 */
  --accent-danger-bg: rgba(239, 68, 68, 0.1);
  --accent-success-bg: rgba(16, 185, 129, 0.1);
  --accent-warning: #f59e0b;
}
```

---

## 📊 3. Desain Data Table Kelas Atas (Enterprise Table Rules)

1. **Atur Lebar Kolom Secara Eksplisit**:
   - Kolom No/ID: `width: 60px; text-align: center;`
   - Kolom Kode/SKU: `width: 140px; white-space: nowrap;`
   - Kolom Nama/Judul: `min-width: 200px; flex: 1;` (jangan biarkan terpotong per kata)
   - Kolom Kategori: `width: 120px;`
   - Kolom Harga: `width: 130px; text-align: right; font-variant-numeric: tabular-nums;`
   - Kolom Status: `width: 130px; text-align: center;`
   - Kolom Aksi: `width: 140px; text-align: right;`

2. **Padding & Alignment**:
   - Padding sel `12px 16px` untuk kenyamanan visual.
   - Angka dan Harga **wajib rata kanan** (`text-align: right`) atau menggunakan monospace font yang rapi.
   - Status badge menggunakan format: **Dot indikator kecil + Teks singkat**.

3. **Status Badge Minimalis**:
   ```html
   <!-- Tersedia -->
   <span class="badge badge-success">
     <span class="dot"></span> Tersedia
   </span>
   
   <!-- Habis -->
   <span class="badge badge-danger">
     <span class="dot"></span> Habis
   </span>
   ```

---

## 🖱️ 4. Komponen Tombol & Input (Clean Micro-Interactions)

1. **Button Hierarchy**:
   - **Primary Action**: Solid background (`--accent-primary`), teks kontras tinggi, radius `6px` / `8px`, subtle shadow.
   - **Secondary / Outline**: Background transparan atau `--bg-card`, border `1px solid --border-subtle`, hover ke `--bg-card-hover`.
   - **Destructive**: Background transparan/merah muda (`rgba(239, 68, 68, 0.1)`), teks merah, hover border merah solid.
   - **Icon Button**: Ukuran presisi `32x32px` atau `36x36px`, rounded `6px`, SVG icon berukuran `16x16px`.

2. **Form Input**:
   - Tinggi standar: `36px` atau `40px`.
   - Typography: `14px` (`0.875rem`).
   - Placeholder bersih warna `--text-tertiary`.
   - Focus ring: `outline: none; border-color: var(--accent-primary); box-shadow: 0 0 0 1px var(--accent-primary);`

---

## 📐 5. Layout & Spacing Rhythm (8pt Grid System)

- Gunakan kelipatan `4px` dan `8px` untuk semua margin, padding, dan gap:
  - `gap: 4px` (0.25rem), `gap: 8px` (0.5rem), `gap: 12px` (0.75rem), `gap: 16px` (1rem), `gap: 24px` (1.5rem), `gap: 32px` (2rem).
- Maksimalkan ruang horizontal: Kontainer utama max-width `1440px` dengan padding `24px` atau `32px`.
- Split Layout: Jika ada sidebar/command generator, berikan rasio `1fr` dan `360px` atau buat dalam panel drawer/tab yang tidak memakan lebar data table utama.

---

## ⚡ 6. Checklist Verifikasi Sebelum Selesai

- [ ] Apakah ada teks yang membungkus (*wrapping*) secara aneh di dalam tabel?
- [ ] Apakah warna latar belakang dan teks memiliki kontras rasio WCAG yang jelas (> 4.5:1)?
- [ ] Apakah icon menggunakan SVG outline yang bersih alih-alih emoji berantakan?
- [ ] Apakah font monospace hanya digunakan untuk kode/SKU/angka dan font sans-serif modern (Inter/Geist) untuk teks utama?
- [ ] Apakah hover state terasa halus (*transition: 0.15s ease*) tanpa efek zoom/scale yang norak?
