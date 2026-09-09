# Uy Studio 3D

O‘zbekcha interfeysli 3D uy dizayni muharriri. Three.js 0.180.0 asosida.

## Ishga tushirish

Node.js o‘rnatilgan kompyuterda `npm start`, keyin http://127.0.0.1:4173 ni oching. Kutubxonalar va model fayllari `dist` ichida. `dist` papkasini statik hostingga joylash mumkin.

## Real interyer

Sweet Home 3D galereyasidagi Modern Flat namunasi: 105 xil OBJ model, jihozlangan xonalar, asl fotografik teksturalar. Scopia burchakli vannasi ichki havzasi, egri chetlari va krani bilan kiritilgan. Yoritish, soyalar va sirt akslari Three.js materiallari orqali hisoblanadi.

Manbalar va mualliflar `dist/credits.html` hamda `dist/assets/modern-flat/credits.json` ichida. Model resurslari o‘z litsenziyalariga ega; barcha resurslar uchun bir xil ochiq litsenziya da’vo qilinmaydi.

## Boshqaruv

- Sudrab aylantirish, scroll bilan yaqinlashish; uy ichida WASD yoki yo‘nalish tugmalari bilan yurish.
- Xona tugmalari, yuqoridan reja va shiftni ko‘rsatish.
- Mebel, pol yoki devorni tanlab rang, material, dag‘allik va tekstura takrorini almashtirish.
- Asl model materiallarini qaytarish.
- O‘lcham, joylashuv va burilish; nusxalash, o‘chirish, oddiy yangi panel qo‘shish; 60 qadamni bekor qilish.
- JSON formatida saqlash va qayta ochish. Sahifani yangilashdan oldin loyihani saqlang. Yangi model fayllari formatning 2-versiyasidan foydalanadi.

30 materialli katalogda fotografik va dasturiy teksturalar mavjud. Modelning o‘z teksturalari boshlang‘ich holatda saqlanadi. Materialni almashtirish tanlangan jihozning butun guruhiga ta’sir qiladi. Yangi qo‘shiladigan oddiy mebel blok shaklida; tayyor modeldagi mebellar batafsil geometriyaga ega. Yurish kamerasi devorlardan o‘ta oladi. Bu qurilish hisobi yoki CAD/BIM dasturi emas.

## Kod va tekshiruv

- `dist/real-house.js`: OBJ/MTL yuklash, haqiqiy xonalar va geometriya.
- `dist/app.js`: sahna, muharrir, fayllar va boshqaruv.
- `dist/catalog.js`: almashtiriladigan materiallar katalogi.
- `dist/assets`: model, tekstura va manba kreditlari.

`npm run check` — sintaksis. `node validate-real.mjs` — model geometriyasi va tekstura fayllarining yaxlitligi (npm install kerak).

Ixtiyoriy WebMCP: `read_home_design`, `set_home_material`.
