# Run Studio

PWA untuk poster dan animasi rute (2D dan peta 3D) dari aktivitas Strava atau file GPX.
Next.js 14 (App Router) + MapLibre GL. Deploy ke Vercel dari GitHub.

## 1. Siapkan Strava API
1. Buka https://www.strava.com/settings/api dan buat aplikasi.
2. **Authorization Callback Domain**: isi domain Vercel Anda (contoh `run-studio.vercel.app`). Untuk lokal isi `localhost`.
3. Catat Client ID dan Client Secret.

## 2. Siapkan peta (MapTiler, gratis)
Buat key di https://cloud.maptiler.com/account/keys/ lalu pakai sebagai `NEXT_PUBLIC_MAPTILER_KEY`.
Di pengaturan key, batasi ke domain Anda (Allowed HTTP origins) karena key ini terlihat di browser.

## 3. Jalankan lokal
```bash
cp .env.example .env.local   # isi nilainya
npm install
npm run dev                   # http://localhost:3000
```

## 4. Deploy
```bash
git init && git add . && git commit -m "Run Studio"
git branch -M main
git remote add origin git@github.com:USERNAME/run-studio.git
git push -u origin main
```
Di Vercel: **Add New > Project > Import** repo ini, isi Environment Variables
(`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `NEXT_PUBLIC_MAPTILER_KEY`), lalu Deploy.
Setelah itu setiap `git push` ke `main` otomatis ter-deploy.

## 5. Install sebagai PWA
Buka situs di HP: Chrome > Tambahkan ke layar utama (iOS: Share > Add to Home Screen).

## Catatan teknis
- Token Strava disimpan di cookie httpOnly (aman dari JavaScript). Cocok untuk satu pengguna.
- Auto-sync: aplikasi menyinkronkan ulang tiap 5 menit dan saat tab dibuka kembali.
- Galeri, video, dan GPX unggahan disimpan di IndexedDB browser (per perangkat).
- Export MP4 (H.264) dibuat di browser lewat WebCodecs + mp4-muxer, tanpa server dan tanpa ffmpeg. Peta 3D dirender frame demi frame di kanvas tersembunyi 1920×1080 (atau 1080×1920 untuk Story), lalu overlay statistik ditempel. Butuh Chrome/Edge/Safari terbaru.
- Export MP4 memakai tile peta dari MapTiler: pastikan kuota key Anda cukup (30 dtk video bisa memuat banyak tile).

- Statistik mingguan (mulai Senin), bulanan, dan tahunan dihitung di browser dari daftar aktivitas Strava dan GPX. Kalori tidak ditampilkan karena Strava hanya mengirimnya pada detail aktivitas, bukan pada daftar.
