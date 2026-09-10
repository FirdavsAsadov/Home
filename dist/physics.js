// Uy ichida yurish uchun 2D to‘qnashuv: har bir qism XZ tekisligida burchakli to‘rtburchak.
const STEP_OVER=.28;      // gilam, pol — ustidan qadam tashlanadi
const FLOOR_CONTACT=.35;  // faqat polda turgan narsa to‘sadi; stol ustidagi kitob, devordagi chiroq — yo‘q
const INSET=.94;          // bounding box modeldan kengroq bo‘ladi, biroz toraytiramiz

export function buildColliders(objects,isOpen=()=>false){
 const out=[];
 for(const o of objects){
  if(o.roof)continue;
  const [w,h,d]=o.size,[x,y,z]=o.pos;
  const y0=y-h/2,y1=y+h/2;
  if(y1<=STEP_OVER)continue;                    // ustidan qadam tashlanadi
  if(y0>FLOOR_CONTACT)continue;                 // boshqa mebel yoki devorga tayangan — o‘zi to‘smaydi
  if(w<.12&&d<.12)continue;                     // juda ingichka narsalar to‘sqinlik qilmaydi
  out.push({id:o.id,x,z,hw:w/2*INSET,hd:d/2*INSET,rot:o.rotation*Math.PI/180,open:!!isOpen(o)});
 }
 return out;
}

// Nuqta qismning ichidami? (qism koordinatasiga o‘tkazib tekshiramiz)
function hits(c,x,z,r){
 if(c.open)return false;
 const cos=Math.cos(c.rot),sin=Math.sin(c.rot),dx=x-c.x,dz=z-c.z;
 const lx=dx*cos-dz*sin,lz=dx*sin+dz*cos;
 return Math.abs(lx)<c.hw+r&&Math.abs(lz)<c.hd+r;
}
function push(colliders,x,z,r){
 for(let pass=0;pass<6;pass++){
  let moved=false;
  for(const c of colliders){
   if(!hits(c,x,z,r))continue;
   const cos=Math.cos(c.rot),sin=Math.sin(c.rot),dx=x-c.x,dz=z-c.z;
   const lx=dx*cos-dz*sin,lz=dx*sin+dz*cos;
   const ex=c.hw+r,ez=c.hd+r,ox=ex-Math.abs(lx),oz=ez-Math.abs(lz);
   let nlx=lx,nlz=lz;
   if(ox<oz)nlx=(lx<0?-1:1)*ex; else nlz=(lz<0?-1:1)*ez;   // eng qisqa yo‘nalishda chiqarish
   x=c.x+(nlx*cos+nlz*sin);
   z=c.z+(-nlx*sin+nlz*cos);
   moved=true;
  }
  if(!moved)return [x,z,true];
 }
 return [x,z,!colliders.some(c=>hits(c,x,z,r))];
}

// Haqiqiy yurish: to‘g‘ridan-to‘g‘ri bo‘lmasa, devor bo‘ylab sirpanadi; iloji bo‘lmasa joyida qoladi.
export function resolveMove(colliders,fromX,fromZ,toX,toZ,radius){
 const stuck=colliders.some(c=>hits(c,fromX,fromZ,radius));
 let [x,z,ok]=push(colliders,toX,toZ,radius);
 if(ok||stuck)return [x,z];   // ichida qolib ketgan bo‘lsa, chiqib ketishiga to‘sqinlik qilmaymiz
 [x,z,ok]=push(colliders,toX,fromZ,radius);      // faqat X bo‘yicha sirpanish
 if(ok)return [x,z];
 [x,z,ok]=push(colliders,fromX,toZ,radius);      // faqat Z bo‘yicha sirpanish
 if(ok)return [x,z];
 return [fromX,fromZ];                            // yo‘l yo‘q
}

export function isBlocked(colliders,x,z,radius){return colliders.some(c=>hits(c,x,z,radius))}

// Xonaga kirganda odam mebel ichida paydo bo‘lmasligi uchun eng yaqin bo‘sh nuqta.
export function findFree(colliders,x,z,radius){
 if(!colliders.some(c=>hits(c,x,z,radius)))return [x,z];
 for(let ring=1;ring<=24;ring++){
  const rad=ring*.18;
  for(let a=0;a<16;a++){
   const t=a*Math.PI/8,px=x+Math.cos(t)*rad,pz=z+Math.sin(t)*rad;
   if(!colliders.some(c=>hits(c,px,pz,radius)))return [px,pz];
  }
 }
 return [x,z];
}
