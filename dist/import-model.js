import * as THREE from 'three';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {OBJLoader} from './vendor/OBJLoader.js';
import {MTLLoader} from './vendor/MTLLoader.js';

// Foydalanuvchi o‘z modelini yuklaydi: GLB/GLTF yoki OBJ (+MTL va tekstura fayllari).
export const importAccept='.glb,.gltf,.obj,.mtl,.bin,.png,.jpg,.jpeg,.webp';
const maxBytes=60*1024*1024;

// Model ichidagi havolalar (tekstura, .bin, .mtl) fayl nomi bo‘yicha blob manzillariga bog‘lanadi.
function blobManager(files){
 const urls=new Map(),created=[];
 for(const f of files){const url=URL.createObjectURL(f);created.push(url);urls.set(f.name.toLowerCase(),url)}
 const manager=new THREE.LoadingManager();
 manager.setURLModifier(url=>{
  if(url.startsWith('blob:')||url.startsWith('data:'))return url;
  const name=decodeURIComponent(url.split(/[?#]/)[0].split(/[\/]/).pop()||'').toLowerCase();
  return urls.get(name)||url;
 });
 // MTL teksturalari parse tugagach ham yuklanadi, shuning uchun manzillar keyinroq bo‘shatiladi.
 setTimeout(()=>created.forEach(URL.revokeObjectURL),30000);
 return manager;
}

function prepare(root){
 let meshes=0;
 root.traverse(n=>{
  if(!n.isMesh)return;
  meshes++;n.castShadow=true;n.receiveShadow=true;
  for(const m of Array.isArray(n.material)?n.material:[n.material])if(m)m.side=THREE.DoubleSide;
 });
 if(!meshes)throw Error('Modelda ko‘rinadigan geometriya yo‘q.');
 const size=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
 if(!(Math.max(size.x,size.y,size.z)>0))throw Error('Model o‘lchamlari aniqlanmadi.');
 return {root,size};
}

export async function parseModelFiles(fileList){
 const files=[...fileList];
 if(!files.length)throw Error('Fayl tanlanmadi.');
 if(files.reduce((sum,f)=>sum+f.size,0)>maxBytes)throw Error('Fayllar hajmi 60 MB dan oshmasin.');
 const main=files.find(f=>/\.(glb|gltf)$/i.test(f.name))||files.find(f=>/\.obj$/i.test(f.name));
 if(!main)throw Error('GLB, GLTF yoki OBJ fayl tanlang.');
 const manager=blobManager(files),name=main.name.replace(/\.[^.]+$/,'').slice(0,60)||'Model';
 if(/\.(glb|gltf)$/i.test(main.name)){
  const gltf=await new GLTFLoader(manager).parseAsync(await main.arrayBuffer(),'');
  return {...prepare(gltf.scene),name};
 }
 const text=await main.text(),mtlName=(text.match(/^mtllib\s+(.+)$/m)?.[1]||'').trim();
 let creator=null;
 if(mtlName){
  const mtl=files.find(f=>f.name.toLowerCase()===mtlName.toLowerCase());
  if(mtl){creator=new MTLLoader(manager).parse(await mtl.text(),'');creator.preload()}
 }
 const loader=new OBJLoader(manager);
 if(creator)loader.setMaterials(creator);
 return {...prepare(loader.parse(text)),name};
}

// Noma’lum birlikdagi model (ko‘pincha OBJ santimetrda) real o‘lchamga keltiriladi.
export function metreSize(size){
 const max=Math.max(size.x,size.y,size.z),unit=(max>12||max<.05)?2.2/max:1;
 return [size.x,size.y,size.z].map(v=>Math.min(30,Math.max(.05,v*unit)));
}
