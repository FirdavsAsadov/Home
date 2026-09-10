import * as THREE from 'three';
import {OBJLoader} from './vendor/OBJLoader.js';
import {MTLLoader} from './vendor/MTLLoader.js';

export const realRooms=[
 {id:'all',name:'Butun uy',area:'Modern Flat',icon:'⌂',center:[0,0]},
 {id:'living',name:'Mehmonxona',area:'Divan va dam olish',icon:'▧',center:[-1.8,-2.3]},
 {id:'kitchen',name:'Oshxona',area:'Oshxona va ovqatlanish',icon:'▥',center:[3.6,-2.2]},
 {id:'bedroom',name:'Yotoqxona',area:'Asosiy yotoqxona',icon:'▤',center:[-3.7,2.2]},
 {id:'bath',name:'Hammom',area:'Vanna va dush',icon:'▦',center:[.6,2.2]},
 {id:'study',name:'Bolalar xonasi',area:'Karavot va ish stoli',icon:'▥',center:[4.3,2.2]},
 {id:'terrace',name:'Balkon',area:'Ochiq havo',icon:'☀',center:[-6.7,2.2]}
];
export const templates=new Map();
const base='./assets/modern-flat/',cx=8.7,cz=6.35,textureLoader=new THREE.TextureLoader();
const translation={'Classic sectional sofa':'Burchakli divan','Modern kitchen set':'Oshxona garnituri','Bed':'Karavot','Black Dining table':'Ovqatlanish stoli','Light Gray Chair':'Yumshoq stul','Classic toilet':'Unitaz','Bidet classic':'Bide','Light wood base Sink':'Hammom rakovinasi','Angular Shower':'Dush kabinasi','Clothes washing machine':'Kir yuvish mashinasi','Modern door':'Kirish eshigi','Open door':'Xona eshigi','Round mirror with frame':'Dumaloq ko‘zgu','Classic floor lamp':'Pol chirog‘i','Green and gray Wardrobe':'Kiyim shkafi','Modern Wardrobe':'Shkaf','Bunk bed stairs':'Ikki qavatli karavot','Box Frame Table':'Jurnal stoli','TV':'Televizor','Black and Wood TV Stand':'Televizor tumba','Desk':'Yozuv stoli','Corner bathtub':'Burchakli vanna'};
function roomFor(x,z){if(x<-5.9&&z>0)return 'terrace';if(z<.2)return x<1?'living':'kitchen';return x<-1.4?'bedroom':x<2.4?'bath':'study'}
function pbr(m,info={}){const name=m.name.toLowerCase(),glass=/glass|window.*pane|vitre|verre/.test(name)||m.opacity<.8,metal=/metal|chrome|steel|inox|mirror|silver|alumin/.test(name);const ceramic=/ceramic|porcelain|pallet|enamel|bath|sink/.test(name);const mat=new THREE.MeshStandardMaterial({name:m.name,color:m.color,map:m.map||null,normalMap:m.normalMap||null,bumpMap:m.bumpMap||null,bumpScale:.025,alphaMap:m.alphaMap||null,roughness:glass?.08:Number(info.pr)|| (metal?.24:ceramic?.2:.78),metalness:glass?0:Number(info.pm)||(metal?.8:0),transparent:glass,opacity:glass?.22:1,depthWrite:!glass,side:THREE.DoubleSide});if(mat.map)mat.map.colorSpace=THREE.SRGBColorSpace;return mat}
const cache=new Map();
async function loadObj(path){if(cache.has(path))return cache.get(path);const promise=(async()=>{const url=base+path,text=await fetch(url).then(r=>{if(!r.ok)throw Error(path);return r.text()}),dir=url.slice(0,url.lastIndexOf('/')+1);const mtls=[...text.matchAll(/^mtllib\s+(.+)$/gm)].map(m=>m[1].trim());let creator;
 if(mtls.length){const mt=await fetch(dir+mtls[0]).then(r=>r.ok?r.text():'');creator=new MTLLoader().parse(mt,dir);creator.preload()}
 const loader=new OBJLoader();if(creator)loader.setMaterials(creator);const model=loader.parse(text);model.traverse(n=>{if(!n.isMesh)return;n.material=Array.isArray(n.material)?n.material.map(m=>pbr(m,creator?.materialsInfo[m.name])):pbr(n.material,creator?.materialsInfo[n.material.name]);n.castShadow=true;n.receiveShadow=true});return model})();cache.set(path,promise);return promise}
export function normalise(model){const b=new THREE.Box3().setFromObject(model),center=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3());const g=new THREE.Group();model.position.sub(center);g.add(model);const parent=new THREE.Group();g.scale.set(1/Math.max(size.x,.001),1/Math.max(size.y,.001),1/Math.max(size.z,.001));parent.add(g);return parent}
function standardObject(id,name,room,size,pos,source,extra={}){return{id,name,room,size,pos,source,material:'paint',original:true,color:'#ffffff',roughness:.75,repeat:1,rotation:0,...extra}}
export async function loadRealHouse(progress){const data=await fetch(base+'house.json').then(r=>r.json()),objects=[];let loaded=0;const unique=[...new Set(data.furniture.map(f=>f.model))];let queue=0;
 await Promise.all(Array.from({length:5},async()=>{while(queue<unique.length){const path=unique[queue++];await loadObj(path);progress(++loaded,unique.length)}}));
 for(const f of data.furniture){if(f.visible==='false'||f.name==='Angular Shower')continue;let model=(await loadObj(f.model)).clone(true);if(f.modelRotation){const r=f.modelRotation.split(/\s+/).map(Number);if(r.length===9)model.applyMatrix4(new THREE.Matrix4().set(r[0],r[1],r[2],0,r[3],r[4],r[5],0,r[6],r[7],r[8],0,0,0,0,1))}
 model.traverse(n=>{if(!n.isMesh)return;const convert=m=>{m=m.clone();const override=f.children?.find(c=>c.tag==='material'&&c.name===m.name);if(override?.color)m.color.set('#'+override.color.slice(-6));if(override?.shininess!==undefined)m.roughness=1-Number(override.shininess)*.8;return m};n.material=Array.isArray(n.material)?n.material.map(convert):convert(n.material)});
 const source='asset:'+f.id,template=normalise(model);if(f.modelMirrored==='true')template.scale.x=-1;templates.set(source,template);const x=Number(f.x)/100-cx,z=Number(f.y)/100-cz,h=Number(f.height)/100;objects.push(standardObject(f.id,translation[f.name]||f.name,roomFor(x,z),[Number(f.width)/100,h,Number(f.depth)/100],[x,Number(f.elevation||0)/100+h/2,z],source,{rotation:-Number(f.angle||0)*180/Math.PI,kind:f.tag==='doorOrWindow'?(/door/i.test(f.name)?'door':'window'):null}));}
 // Polygon floors retain the architect's actual room outlines and texture scale.
 data.rooms.forEach((r,i)=>{const pts=r.children.filter(c=>c.tag==='point').map(p=>new THREE.Vector2(Number(p.x)/100-cx,-(Number(p.y)/100-cz)));const shape=new THREE.Shape(pts),geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);geo.computeBoundingBox();const box=geo.boundingBox.clone(),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());geo.translate(-center.x,0,-center.z);const texture=r.children.find(c=>c.tag==='texture'&&c.attribute==='floorTexture');let map=null;if(texture){map=textureLoader.load(base+texture.image);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;const scale=Number(texture.scale||1);map.repeat.set(1/(Number(texture.width)/100*scale),1/(Number(texture.height)/100*scale));map.rotation=-Number(texture.angle||0)}const mat=new THREE.MeshStandardMaterial({color:r.floorColor?'#'+r.floorColor.slice(-6):'#ffffff',map,roughness:.62,side:THREE.DoubleSide});const floor=new THREE.Mesh(geo,mat);floor.scale.set(1/size.x,1,1/size.z);const source='floor:'+i;templates.set(source,floor);objects.push(standardObject(source,'Pol · '+(i+1),roomFor(center.x,center.z),[size.x,.05,size.z],[center.x,.015,center.z],source));const ceilingSource='ceiling:'+i;templates.set(ceilingSource,new THREE.Mesh(geo.clone(),new THREE.MeshStandardMaterial({color:'#f2f0ec',roughness:.9,side:THREE.DoubleSide})));templates.get(ceilingSource).scale.set(1/size.x,1,1/size.z);objects.push(standardObject(ceilingSource,'Shift · '+(i+1),roomFor(center.x,center.z),[size.x,.05,size.z],[center.x,2.5,center.z],ceilingSource,{roof:true}));});
 const tub=normalise((await loadObj('../bathtub/corner_bathtub.obj')).clone(true));templates.set('asset:bathtub',tub);objects.push(standardObject('bathtub','Burchakli vanna','bath',[1.25,.64,1.25],[-.75,.35,3.22],'asset:bathtub',{rotation:180}));
 const openings=data.furniture.filter(f=>f.tag==='doorOrWindow');
 plan.nodes.length=0;plan.edges.length=0;plan.openings.length=0;
 for(const w of data.walls){
  const a=nodeAt(Number(w.xStart)/100-cx,Number(w.yStart)/100-cz),b=nodeAt(Number(w.xEnd)/100-cx,Number(w.yEnd)/100-cz);
  plan.edges.push({a,b,thickness:Number(w.thickness)/100,height:Number(w.height||250)/100,color:'#'+(w.leftSideColor||w.rightSideColor||'FFF0EDE6').slice(-6)});
 }
 // Har bir eshik/deraza eng yaqin devorga biriktiriladi va shu devor bo'ylab (t, perp) sifatida saqlanadi,
 // shuning uchun devor ko'chirilganda u ham birga ko'chadi.
 for(const f of openings){
  const x=Number(f.x)/100-cx,z=Number(f.y)/100-cz;let best=-1,bestD=Infinity,bestT=0,bestP=0;
  plan.edges.forEach((e,i)=>{const g=edgeGeom(e),t=(x-g.ax)*g.dx+(z-g.az)*g.dz;if(t<-.05||t>g.len+.05)return;
   const sgn=(x-g.ax)*g.dz-(z-g.az)*g.dx;if(Math.abs(sgn)<bestD){bestD=Math.abs(sgn);best=i;bestT=t;bestP=sgn}});
  if(best<0||bestD>Math.max(.4,Number(f.depth)/200+.15))continue;
  const g=edgeGeom(plan.edges[best]);
  plan.openings.push({id:f.id,edge:best,t:bestT,perp:bestP,
   angleOffset:(-Number(f.angle||0)*180/Math.PI)-(-Math.atan2(g.dz,g.dx)*180/Math.PI),
   width:Number(f.width)/100,height:Number(f.height)/100,elevation:Number(f.elevation||0)/100});
 }
 objects.push(...buildWalls());
 return objects;
}
export function makeRealObject(o,materialFor){if(!o.source)return null;const template=templates.get(o.source);if(!template)throw Error('Model manbasi topilmadi');const model=template.clone(true),outer=new THREE.Group();outer.add(model);outer.scale.set(...o.size);outer.position.set(...o.pos);outer.rotation.y=o.rotation*Math.PI/180;outer.traverse(n=>{n.userData.id=o.id;if(!n.isMesh)return;n.castShadow=!o.roof&&Math.max(o.size[0],o.size[1],o.size[2])>=.28;n.receiveShadow=true;n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();if(!o.original){const mats=Array.isArray(n.material)?n.material:[n.material];for(const m of mats)m.dispose();n.material=materialFor(o)}if(o.original&&o.repeat!==1){for(const m of Array.isArray(n.material)?n.material:[n.material]){if(m.map){m.map=m.map.clone();m.map.repeat.multiplyScalar(o.repeat);m.map.wrapS=m.map.wrapT=THREE.RepeatWrapping;m.userData.ownedMap=true}}}if(o.original&&o.roughnessOverride){for(const m of Array.isArray(n.material)?n.material:[n.material])m.roughness=o.roughness}if(o.original&&o.tint){const mats=Array.isArray(n.material)?n.material:[n.material];for(const m of mats)m.color.multiply(new THREE.Color(o.color))}});outer.visible=!o.roof;return outer}

// ——— Uy rejasi: tugun + qirra grafi ———
// Devorlar mustaqil qutilar emas, umumiy burchak tugunlariga ulangan qirralar.
// Bitta devorni ko'chirsangiz, unga ulangan devorlar cho'ziladi va burchakda teshik qolmaydi.
export const plan={nodes:[],edges:[],openings:[]};

function nodeAt(x,z){
 const k=plan.nodes.findIndex(n=>Math.abs(n.x-x)<.04&&Math.abs(n.z-z)<.04);
 if(k>=0)return k;
 plan.nodes.push({x,z});return plan.nodes.length-1;
}
export function edgeGeom(e){const A=plan.nodes[e.a],B=plan.nodes[e.b];
 const len=Math.hypot(B.x-A.x,B.z-A.z)||1e-6;
 return {ax:A.x,az:A.z,bx:B.x,bz:B.z,len,dx:(B.x-A.x)/len,dz:(B.z-A.z)/len};}

// Grafdan devor qutilarini qayta yasaydi. keep — avvalgi material/rangni saqlash uchun (qirra raqami bo'yicha).
export function buildWalls(keep=new Map()){
 const out=[];
 plan.edges.forEach((e,ei)=>{
  if(e.removed)return;
  const g=edgeGeom(e),{ax,az,len,dx,dz}=g,height=e.height,thick=e.thickness;
  const cuts=plan.openings.filter(o=>o.edge===ei).map(o=>({a:Math.max(0,o.t-o.width/2),b:Math.min(len,o.t+o.width/2),low:o.elevation,high:Math.min(height,o.elevation+o.height)}));
  const bounds=[...new Set([0,len,...cuts.flatMap(c=>[c.a,c.b])])].sort((a,b)=>a-b);
  const prev=keep.get(ei)||{};let k=0;
  const add=(start,end,low,high)=>{
   if(end-start<.01||high-low<.01)return;
   const id='wall:'+ei+':'+k,mid=(start+end)/2,x=ax+dx*mid,z=az+dz*mid;k++;
   out.push(standardObject(id,'Devor · '+(ei+1)+(k>1?'/'+k:''),roomFor(x,z),[end-start,high-low,thick],[x,(low+high)/2,z],null,
    {original:false,color:prev.color||e.color,material:prev.material||'paint',roughness:prev.roughness??.75,repeat:prev.repeat??1,
     rotation:-Math.atan2(dz,dx)*180/Math.PI,wall:ei}));
  };
  for(let i=0;i<bounds.length-1;i++){const a=bounds[i],b=bounds[i+1],op=cuts.find(c=>(a+b)/2>=c.a&&(a+b)/2<=c.b);
   if(op){add(a,b,0,op.low);add(a,b,op.high,height)}else add(a,b,0,height)}
 });
 return out;
}

// Eshik va derazalarni o'z devori bo'ylab joyiga qo'yadi.
export function placeOpenings(objects){
 const byId=new Map(objects.map(o=>[o.id,o]));
 for(const op of plan.openings){
  const e=plan.edges[op.edge];if(!e||e.removed)continue;
  const o=byId.get(op.id);if(!o)continue;
  const g=edgeGeom(e);
  o.pos[0]=g.ax+g.dx*op.t+op.perp*g.dz;
  o.pos[2]=g.az+g.dz*op.t-op.perp*g.dx;
  o.rotation=(-Math.atan2(g.dz,g.dx)*180/Math.PI)+op.angleOffset;
 }
}

// Devorni normal yo'nalishi bo'yicha ko'chirish: ikkala tuguni ham siljiydi,
// shu tugunlarga ulangan boshqa devorlar avtomatik cho'ziladi.
export function moveWall(ei,dist){
 const e=plan.edges[ei];if(!e)return;
 const g=edgeGeom(e),nx=g.dz,nz=-g.dx;
 for(const n of new Set([e.a,e.b])){plan.nodes[n].x+=nx*dist;plan.nodes[n].z+=nz*dist}
}
export function removeWall(ei){const e=plan.edges[ei];if(e)e.removed=true}
