# Uy Studio 3D

O‘zbekcha interfeysli, brauzerda ishlaydigan 3D uy dizayni muharriri. Three.js 0.180.0 asosida. Tashqi servis yoki API kaliti talab qilinmaydi; 3D kutubxona `dist/vendor` ichida mavjud.

## Ishga tushirish

Node.js o‘rnatilgan kompyuterda `npm start`, keyin http://127.0.0.1:4173 ni oching. Ishga tushirish uchun npm install shart emas. `dist` papkasini istalgan statik hostingga joylash mumkin. HTML faylni bevosita file:// orqali ochmang: ES modullar uchun HTTP server kerak.

## Imkoniyatlar

- To‘rt xonali 96 m² namunaviy uy: mehmonxona, oshxona, yotoqxona, hammom.
- 3D aylantirish va yaqinlashish; yuqoridan reja; xona tugmalari orqali tez o‘tish.
- Uy ichida scroll, WASD yoki ekrandagi yo‘nalish tugmalari bilan yurish, sudrab qarash.
- Har bir devor, pol, shift, deraza, eshik va mebel qismini tanlash.
- 30 material: g‘isht, gazobeton, suvoq, bo‘yoq, mikrosement, yog‘och turlari, parket, laminat, beton, tosh, marmar, kafel, shisha, metall, mato, charm, gilam va tom qoplamasi.
- Rang, sirt dag‘alligi, tekstura takrori, o‘lcham, koordinata va burilishni o‘zgartirish.
- Qism qo‘shish, nusxalash, o‘chirish va oxirgi 60 o‘zgarishni bekor qilish.
- Loyihani JSON faylga yuklab olish va keyin qayta ochish. Serverga foydalanuvchi loyihasi yuborilmaydi; sahifa yangilanishidan oldin faylga saqlang.

## Tuzilishi

- `dist/catalog.js`: materiallar katalogi va boshlang‘ich uyning qismlari.
- `dist/app.js`: sahna, tanlash, muharrir, yurish va loyiha fayllari.
- `dist/style.css`: responsive interfeys.
- `server.cjs`: mahalliy statik server.

Material qo‘shish uchun katalogga yangi yozuv kiriting. Teksturalar dasturiy yaratilgan; rang tanlagich har bir materialni qayta bo‘yash imkonini beradi.

## Chegaralar

Bu vizual dizayn muharriri: materiallar almashtirilishi konstruksiya mustahkamligi, issiqlik hisobi yoki qurilish smetasini hisoblamaydi. Geometriya tahrirlanadigan to‘g‘ri burchakli qismlardan tuzilgan; CAD/BIM modeli importi yo‘q. Yurish kamerasi ichki devorlardan erkin o‘tadi. Barcha dunyo ishlab chiqaruvchilari katalogi emas, kengaytiriladigan 30 asosiy material mavjud. Tom ko‘rsatish boshqaruvi hozir tekis shift/tom panellarini ko‘rsatadi.

Chrome/Edge/Firefox/Safari’da WebGL qo‘llovi kerak. Internet bo‘lmasa ham barcha 3D resurslar mahalliy ishlaydi; tashqi shrift o‘rniga tizim shrifti ishlatiladi.

## Tekshirish

`npm run check` — JavaScript sintaksisi. `node validate.mjs` — boshlang‘ich model, materiallar va fayllarning yaxlitligi.

Ixtiyoriy WebMCP interfeysi: `read_home_design` va `set_home_material`; brauzer bu imkoniyatni qo‘llamasa muharrir odatdagidek ishlaydi.

Three.js litsenziyasi: `dist/vendor/LICENSE`.
