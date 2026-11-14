# 🍱 MJ (Mama Jualan) v2.1

![Expo](https://img.shields.io/badge/Expo-SDK_57-000020?logo=expo)
![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![NativeWind](https://img.shields.io/badge/NativeWind-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-FFCA28?logo=firebase&logoColor=black)
![Platform](https://img.shields.io/badge/Android-only-3DDC84?logo=android&logoColor=white)

Aplikasi pencatat pesanan untuk usaha kuliner rumahan. Dipakai di dua HP (HP Mama dan HP Anda) tanpa login: cukup satu **Kode Toko**. Data disimpan di HP lebih dulu (jalan tanpa internet), lalu disinkronkan ke Firebase Realtime Database.

## ✨ Fitur

- **Sinkron tanpa login.** HP kedua masuk dengan kode `MJ-XXXXXX` atau pindai QR dari HP Mama.
- **Offline-first.** Semua perubahan ditulis ke AsyncStorage dulu; dikirim otomatis saat online.
- **Input pesanan cepat.** Cari pelanggan, pilih menu, total dihitung otomatis, beberapa pesanan sekaligus (*Add Another Order*).
- **Import Chat WA (Gemini AI).** Tempel pesan pesanan dari WhatsApp untuk otomatis mengenali pelanggan, menu, dan jumlah (mengabaikan ongkir & mencocokkan varian).   
- **Mode Kurir / Pengantaran.** Kartu pengantaran tunggal di layar Home untuk menandai titik antar selesai satu per satu.   
- **Teks untuk kurir** (GoSend / Grab / kurir pribadi) lewat tombol *Kirim ke Kurir*.
- **Rute antar otomatis.** Urutan titik dengan Nearest Neighbor (Haversine), dipecah per 10 titik, dibuka di Google Maps.
- **Poster promo.** 8 template (Story 9:16 dan Feed 3:4), sampai 4 foto dengan bentuk berbeda (bulat, kotak membulat, daun, lengkung), plus template daftar menu. Tanpa harga. Hasil 1080 px, siap kirim ke WhatsApp / Instagram.
- **Tempat sampah 7 hari**, kompresi foto otomatis (800×800 WebP), ekspor cadangan `.json`.

## 🧰 Prasyarat

- Node.js 20 LTS atau lebih baru, Git, VS Code
- HP Android dengan aplikasi **Expo Go** (versi terbaru dari Play Store)
- Akun Google (Firebase) dan akun [expo.dev](https://expo.dev) (untuk build APK)

## 🚀 Instalasi

### Opsi A: dari folder proyek ini

```bash
cd MajuApp
npm install
cp .env.example .env     # lalu isi nilai Firebase (lihat bagian berikut)
npx expo start
```

Pindai QR di terminal dengan Expo Go. Tanpa `.env`, aplikasi tetap jalan dalam **mode lokal** (tanpa sinkron).

### Opsi B: dari nol (semua perintah yang dipakai)

```bash
npx create-expo-app@latest MajuApp --template blank-typescript
cd MajuApp

# modul native (versi dipilihkan Expo agar cocok dengan SDK)
npx expo install @react-native-async-storage/async-storage react-native-view-shot expo-sharing \
  expo-file-system expo-image-picker expo-image-manipulator expo-clipboard expo-camera expo-font \
  expo-splash-screen react-native-reanimated react-native-worklets react-native-gesture-handler \
  react-native-safe-area-context react-native-screens react-native-svg react-native-qrcode-svg \
  @expo/vector-icons @expo-google-fonts/dm-sans @expo-google-fonts/kaushan-script babel-preset-expo

# navigasi, Firebase, styling (NativeWind v4 butuh Tailwind v3)
npm install firebase @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npm install nativewind tailwindcss@^3.4.17
```

Lalu salin `App.tsx`, `src/`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`, `tsconfig.json`, `app.json`, `eas.json`, dan `database.rules.json` dari proyek ini.

## 🔥 Konfigurasi Firebase

Aplikasi memakai **Firebase JS SDK** (bukan `@react-native-firebase`), jadi **tidak perlu `google-services.json`** dan jalan di Expo Go.

1. [Firebase Console](https://console.firebase.google.com) → *Add project* → nama `Maju-App`.
2. **Build → Realtime Database → Create database** (pilih region Singapore) → mode *locked*.
3. **Build → Authentication → Sign-in method → Anonymous → Enable**.
4. **Realtime Database → Rules**: tempel isi `database.rules.json` → *Publish*.
5. **Project settings → Your apps → Web (`</>`)** → daftarkan app → salin `firebaseConfig`.
6. Isi `.env`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://NAMA-PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...   
# EXPO_PUBLIC_GEMINI_MODEL=nama-model-terbaru   # opsional jika model bawaan mati  
```

7. Restart Metro: `npx expo start -c`.

> `apiKey` Firebase Web memang bukan rahasia. Yang menjaga data adalah **Security Rules** pada langkah 4. Jangan memakai rules `".read": true, ".write": true`.

## 📱 Cara pakai

1. **HP Mama:** buka aplikasi → *Belum punya toko? Buat Toko Baru* → isi nama toko. Kode Toko muncul di Home; QR-nya ada di **⚙ → Pengaturan Toko**.
2. **Pengaturan Toko:** tempel link Google Maps rumah Mama (titik awal rute).
3. **HP Anda:** *Hubungkan* → ketik kode atau tekan ikon QR dan pindai.
4. Tambah pelanggan (tempel link Google Maps pelanggan) dan menu (foto, nama, harga) di tab **Menu**.
5. Catat pesanan di tab **Tambah**.

## 🗂️ Struktur folder

```
MajuApp/
├── App.tsx                      # Provider, font, splash
├── index.ts
├── global.css                   # direktif Tailwind
├── tailwind.config.js           # preset NativeWind + font
├── babel.config.js · metro.config.js · tsconfig.json
├── app.json · eas.json
├── database.rules.json          # Security Rules Firebase
├── .env.example
└── src/
    ├── navigation/
    │   ├── AppNavigator.tsx     # Native Stack (Auth ↔ aplikasi)
    │   ├── MainTabs.tsx         # Bottom Tabs
    │   ├── CustomTabBar.tsx     # tab bar + tombol Tambah di tengah
    │   └── types.ts
    ├── screens/
    │   ├── AuthScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── AddScreen.tsx
    │   ├── OrderEditorScreen.tsx    # pelanggan + menu + jam + catatan
    │   ├── MenuScreen.tsx
    │   ├── CustomerFormScreen.tsx
    │   ├── MenuFormScreen.tsx
    │   ├── HistoryScreen.tsx
    │   ├── SpaceScreen.tsx          # poster tersimpan + tempat sampah
    │   ├── PosterStudioScreen.tsx   # editor poster
    │   └── SettingsScreen.tsx       # profil, kode toko/QR, backup
    ├── components/
    │   ├── AppHeader.tsx · OrderCard.tsx · PosterTemplate.tsx · CustomerDropdown.tsx
    │   ├── poster/ (PhotoFrame.tsx, parts.tsx)   # bentuk foto, header, footer
    │   ├── QRScannerModal.tsx · Splash.tsx
    │   └── ui.tsx                   # Txt, Input, AppIcon, Screen, dll.
    ├── services/
    │   ├── firebaseSync.ts · firebaseConfig.ts
    │   ├── storage.ts               # AsyncStorage
    │   ├── routeCalculator.ts       # Haversine, Nearest Neighbor, parser Maps
    │   ├── courierFormat.ts · imageService.ts · backup.ts
    ├── context/
    │   ├── StoreContext.tsx         # state lokal + sinkron + CRUD
    │   └── DraftContext.tsx         # draf multi-pesanan
    ├── poster/templates.ts          # definisi 8 template + rasio
    ├── types/index.ts
    ├── utils/ (format.ts, merge.ts)
    └── theme/colors.ts
```

## 🧪 Pengujian (Tahap 4)

Perintah: `npm run typecheck`. Hal yang perlu dicoba di HP:

- [ ] Tempel link Maps panjang (`.../@-0.49,117.14,17z`), pendek (`maps.app.goo.gl/...`), dan `?q=lat,lng`. Link pendek butuh internet.
- [ ] Dua HP: buat pesanan di satu HP, muncul di HP lain dalam hitungan detik.
- [ ] Mode pesawat: catat pesanan, nyalakan internet, pesanan muncul di HP lain.
- [ ] Buat 12 pelanggan berkoordinat → tombol *Rute Antar Otomatis* menawarkan 2 rute.
- [ ] Hapus pesanan → Space → Pulihkan di salah satu HP, cek HP lain ikut berubah.
- [ ] Ganti foto menu di HP A → foto ikut berganti di HP B.

## 📦 Build APK

```bash
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

> ⚠️ `.env` ada di `.gitignore`, jadi **tidak ikut terunggah ke EAS**. Tanpa langkah ini APK berjalan tanpa sinkron. Isi nilai Firebase di build profile `preview` pada `eas.json`:
>
> ```json
> "preview": { "distribution": "internal", "android": { "buildType": "apk" },
>   "env": { "EXPO_PUBLIC_FIREBASE_API_KEY": "...", "EXPO_PUBLIC_FIREBASE_DATABASE_URL": "...", "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "...", "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "...", "EXPO_PUBLIC_FIREBASE_APP_ID": "...", "EXPO_PUBLIC_GEMINI_API_KEY": "..." } }
> ```
>
> Atau isi lewat expo.dev → Project → Environment variables.

Unduh `.apk`, unggah ke Google Drive, buka tautannya di HP Mama, izinkan *Install unknown apps*.

**Perintah update:** 
```bash
npx eas-cli update --channel preview --platform android --message "ringkasan perubahan" 
```
(hanya untuk perubahan kode di src/, tanpa mengubah version atau paket native).   

**Cara update di HP**: Tutup aplikasi sepenuhnya, buka (mengunduh update), tutup lagi, lalu buka kembali. 

## 🩺 Troubleshooting Firebase

**`PERMISSION_DENIED` di HP pertama dan "Kode toko tidak ditemukan" di HP kedua.** Penyebab paling umum: toko dibuat saat `.env` belum terbaca (mode lokal), sehingga profil toko tidak pernah dikirim ke Firebase. Versi ini mendaftarkan perangkat otomatis dan mengunggah data lokal saat sinkron aktif. Langkah:

1. Pastikan `.env` terisi, lalu **restart Metro dengan cache bersih**: `npx expo start -c` (nilai `EXPO_PUBLIC_*` hanya dibaca saat bundling).
2. Buka ulang aplikasi di HP pertama. Cek Firebase Console → Realtime Database → Data: harus muncul `stores/MJ-XXXXXX/profile` dan `members/<uid>`.
3. Di HP kedua, masukkan kode lagi.
4. **"API key Gemini belum diisi / ditolak"** → Cek `EXPO_PUBLIC_GEMINI_API_KEY` di `.env` (lalu `npx expo start -c`) atau di `eas.json` / EAS Environment (lalu build ulang).   
5. **"Semua model Gemini tidak tersedia"** → Isi `EXPO_PUBLIC_GEMINI_MODEL` dengan nama model terbaru di `.env`, lalu kirim OTA update.   
6. **"OTA update tidak muncul di HP"** → Buka-tutup aplikasi 2 kali; pastikan versi APK sama (`2.1.0`) dan channel `preview`.

Bila tetap gagal: periksa (a) Rules sudah di-*Publish*, (b) Authentication → Anonymous = *Enabled*, (c) `EXPO_PUBLIC_FIREBASE_DATABASE_URL` sama persis dengan URL di halaman Realtime Database (region Singapore memakai `...asia-southeast1.firebasedatabase.app`).

**Expo tunnel tidak perlu.** Tunnel hanya mengatur bagaimana HP menjangkau Metro di laptop (saat Wi-Fi berbeda atau diblokir). Trafik Firebase langsung ke server Google dan tidak terpengaruh.

## 🧭 Penyimpangan dari blueprint PDF (dan alasannya)

| Blueprint | Di aplikasi ini | Alasan |
|---|---|---|
| `@react-native-firebase/*` + `google-services.json` | `firebase` (JS SDK) | Paket native butuh development build dan tidak jalan di Expo Go; PDF sendiri menyebut "Firebase Web SDK". |
| Rules `.read/.write: true` | Rules berbasis keanggotaan (`members/$uid`) | Rules terbuka membuat siapa pun dengan URL database bisa membaca/menghapus semua toko. Login anonim tanpa pengecekan rules tidak melindungi apa pun. |
| `image_uri` (path `file:///...`) di database | `image_version` di database; foto 360px dikirim ke `menu_images/` | Path lokal tidak ada di HP lain, foto menu tidak akan muncul di perangkat kedua. |
| Parser regex URL Maps | Regex + ikuti redirect untuk link pendek | `maps.app.goo.gl/...` tidak memuat koordinat; harus di-resolve lewat jaringan. |
| Kode `MJ-7892` (4 digit) | `MJ-` + 6 karakter acak | 4 digit hanya 10.000 kemungkinan, mudah ditebak; kode ini satu-satunya kunci akses toko. |
| Hapus langsung | Soft delete (`deleted_at`) | Tanpa penanda hapus, record yang dihapus di satu HP akan muncul lagi dari HP lain. Juga dasar fitur Tempat Sampah 7 hari. |
| Kompresi lewat `expo-file-system` | `expo-image-manipulator` | `expo-file-system` hanya mengelola berkas, tidak bisa mengubah ukuran/format gambar. |

## ⚠️ Batasan yang perlu diketahui

- **Siapa pun yang tahu Kode Toko punya akses penuh** ke data toko. Bagikan hanya ke orang tepercaya.
- **Konflik:** bila dua HP mengubah record yang sama saat offline, yang `updated_at`-nya lebih baru menang (last-write-wins).
- HP yang offline **lebih dari 7 hari** lalu online bisa memunculkan kembali item yang sudah dihapus permanen di HP lain.
- Nearest Neighbor memakai jarak garis lurus; hasilnya urutan yang masuk akal, bukan rute optimal dan bukan jarak jalan raya.
- Cadangan `.json` hanya ekspor; fitur impor/restore belum ada. Foto menu tidak ikut dicadangkan.
- Firebase Spark: 100 koneksi bersamaan, 10 GB transfer per bulan. Foto menu dikirim sebagai thumbnail kecil agar hemat kuota.

## 📄 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE) — bebas digunakan untuk referensi pembelajaran dan pengembangan. Dibuat khusus untuk membantu operasional usaha kuliner rumahan sekaligus sebagai proyek portofolio.