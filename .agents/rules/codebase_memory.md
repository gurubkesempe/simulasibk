# Codebase Memory Guidelines & Rules for wa-store_bot

Dokumen ini berisi aturan wajib bagi AI Agent saat menganalisis, merancang, dan memodifikasi kode di project **`wa-store_bot`**.

---

## 1. Penggunaan Codebase Memory (Wajib)

Sebelum menulis fitur baru, melakukan refactoring, atau memodifikasi file kode yang ada, Agent **WAJIB** menganalisis struktur dan relasi ketergantungan kode menggunakan **Codebase Memory**.

> [!IMPORTANT]
> Jangan berasumsi atau langsung mengedit file tanpa memahami relasi pemanggil (*callers*), dependensi (*dependencies*), serta arsitektur modul di graf Codebase Memory.

### Project Identifier
- **Project Name**: `Users-arfin-Documents-work-apps-jualan-wa-store_bot`
- **Repo Path**: `/Users/arfin/Documents/work/apps/jualan/wa-store_bot`

### Format Eksekusi CLI
```bash
~/.local/bin/codebase-memory-mcp cli <tool> '<arguments_json>'
```

---

## 2. Urutan Prioritas Tool Codebase Memory

### 1. Memahami Arsitektur & Gambaran Modul
Gunakan sebelum memulai task skala menengah-besar atau memahami susunan layer:
```bash
~/.local/bin/codebase-memory-mcp cli get_architecture '{"project": "Users-arfin-Documents-work-apps-jualan-wa-store_bot"}'
```

### 2. Mencari Simbol, Fungsi, Class, atau Route
Gunakan regex pattern untuk menemukan letak definisi fungsi/variabel/route:
```bash
~/.local/bin/codebase-memory-mcp cli search_graph '{"project": "Users-arfin-Documents-work-apps-jualan-wa-store_bot", "name_pattern": ".*handle.*"}'
```

### 3. Trace Hubungan Pemanggil (Impact Analysis)
Sebelum mengubah fungsi/method, cek siapa saja yang memanggil (*inbound*) atau fungsi apa saja yang dipanggil (*outbound*):
```bash
# Inbound (siapa yang memanggil fungsi ini):
~/.local/bin/codebase-memory-mcp cli trace_path '{"project": "Users-arfin-Documents-work-apps-jualan-wa-store_bot", "function_name": "handleCommand", "direction": "inbound"}'

# Outbound (apa yang dipanggil oleh fungsi ini):
~/.local/bin/codebase-memory-mcp cli trace_path '{"project": "Users-arfin-Documents-work-apps-jualan-wa-store_bot", "function_name": "handleCommand", "direction": "outbound"}'
```

### 4. Mengambil Definisi / Cuplikan Kode Tertentu
```bash
~/.local/bin/codebase-memory-mcp cli get_code_snippet '{"project": "Users-arfin-Documents-work-apps-jualan-wa-store_bot", "qualified_name": "src/handlers/commandHandler.js"}'
```

### 5. Deteksi Perubahan & Re-Index
Setelah melakukan perubahan file dalam jumlah signifikan, cek perubahan atau trigger re-index:
```bash
~/.local/bin/codebase-memory-mcp cli detect_changes '{"project": "Users-arfin-Documents-work-apps-jualan-wa-store_bot"}'
~/.local/bin/codebase-memory-mcp cli index_repository '{"repo_path": "/Users/arfin/Documents/work/apps/jualan/wa-store_bot"}'
```

---

## 3. Fallback Procedure

Gunakan `grep_search` atau `view_file` manual **hanya** jika:
1. Mencari raw string literals (misal: pesan error spesifik, variabel `.env`, template markdown/HTML statis).
2. Codebase Memory CLI tidak memberikan hasil yang cukup spesifik.
3. Menulis file baru yang belum terindeks.

---

## 4. Batasan Keamanan & Standar Coding Proyek

- **Database Integrity**: Jangan pernah menjalankan perintah yang menghapus database atau merusak struktur tabel (`database.sqlite` / PostgreSQL).
- **WhatsApp Anti-Banned**: Patuhi delay/interval pengiriman pesan dan jangan mengubah flow pengiriman pesan bot menjadi spamming agresif (lihat [ANTI_BANNED_GUIDE.md](file:///Users/arfin/Documents/work/apps/jualan/wa-store_bot/ANTI_BANNED_GUIDE.md)).
- **Clean Architecture & Separation of Concerns**: Pisahkan layer Controller/Handler (`src/handlers`), Database/Model (`src/db`), dan Service/Integrasi pihak ketiga (`src/services`).
