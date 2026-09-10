import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {materials} from './catalog.js';
import {realRooms as rooms,templates,loadRealHouse,makeRealObject,normalise} from './real-house.js';
import {parseModelFiles,metreSize} from './import-model.js';
import {buildColliders,resolveMove,findFree} from './physics.js';
import {EffectComposer} from './vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/addons/postprocessing/RenderPass.js';
import {SSAOPass} from './vendor/addons/postprocessing/SSAOPass.js';
import {OutputPass} from './vendor/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
const $=s=>document.querySelector(s),viewport=$('#viewport');
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true})}catch(e){$('#loading').textContent='3D ishga tushmadi. Brauzeringizda apparat tezlashtirish (WebGL) ni yoqing va sahifani yangilang.';throw e}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0,0);viewport.append(renderer.domElement);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.05,180);camera.position.set(12,12,15);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.3,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=2;controls.maxDistance=45;
const pmrem=new THREE.PMREMGenerator(renderer);const roomEnv=new RoomEnvironment();scene.environment=pmrem.fromScene(roomEnv,.04).texture;roomEnv.dispose();pmrem.dispose();scene.environmentIntensity=.7;scene.add(new THREE.HemisphereLight(0xfff8ed,0x879da8,1.5));const sun=new THREE.DirectionalLight(0xfff5e3,2.4);sun.position.set(-8,16,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15});sun.shadow.bias=-.001;scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.12}));ground.rotation.x=-Math.PI/2;ground.position.y=-.2;ground.receiveShadow=true;scene.add(ground);
const grid=new THREE.GridHelper(30,30,0xb5c5cc,0xc6d2d7);grid.position.y=-.15;scene.add(grid);
// Soya xaritasi kamera harakatida emas, faqat sahna o‘zgarganda qayta chiziladi.
sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
let dirty=true,shadowDirty=true,colliders=[],collisionOn=true,doorAnim=null;
const doorBase=new Map();
let initial;try{initial=await loadRealHouse((n,total)=>$('#loading').textContent=`Haqiqiy uy modeli yuklanmoqda… ${n}/${total}`)}catch(error){$('#loading').textContent='Uy modeli yuklanmadi. Sahifani yangilab ko‘ring.';throw error}$('#loading').remove();
let objects=initial,selectedId=objects.find(o=>o.name==='Burchakli divan')?.id||objects[0].id,roomId='all',mode='orbit',showRoof=false,category='Barchasi',history=[],meshes=new Map(),yaw=0,pitch=0,drag=null;
const group=new THREE.Group();scene.add(group);const outline=new THREE.BoxHelper(new THREE.Object3D(),0x149cc7);outline.material.depthTest=false;outline.renderOrder=10;scene.add(outline);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,512,512,16);ao.kernelRadius=.6;ao.minDistance=.001;ao.maxDistance=.12;composer.addPass(ao);composer.addPass(new OutputPass());
// SSAO qimmat: harakat paytida o‘chadi, to‘xtagach qaytadi.
let aoTimer=0;function movingNow(){ao.enabled=false;clearTimeout(aoTimer);aoTimer=setTimeout(()=>{ao.enabled=true;dirty=true},200)}
controls.addEventListener('change',()=>{dirty=true;movingNow()});
const textures=new Map();
const photos={oak:'1/modern-door-1/Wood_17.jpg',walnut:'11/black-and-wood-tv-stand-2/Wood_169.jpg',pine:'34/light-wood-base-sink/Wood_189.jpg',parquet:'217',laminate:'217',blackmarble:'11/black-and-wood-tv-stand-2/Marble_16.jpg',marble:'170/soap-dispenser-3/Marble_59.jpg',fabric:'93/classic-sectional-sofa/Fabric_796.jpg',carpet:'44/rug/e4r.jpg'};
// createImageBitmap fon (ko‘rinmas) tabda ham tugaydi; img.decode() u yerda muzlab qoladi va ilovani ishga tushirmaydi.
await Promise.all(Object.entries(photos).map(async([id,path])=>{try{const res=await fetch('./assets/modern-flat/'+path);if(!res.ok)throw Error(res.status);const bitmap=await createImageBitmap(await res.blob());const c=document.createElement('canvas');c.width=c.height=512;c.getContext('2d').drawImage(bitmap,0,0,512,512);bitmap.close();textures.set(id,c)}catch{console.warn('Material rasmi yuklanmadi:',id)}}));
function swatch(m){if(textures.has(m.id))return textures.get(m.id);const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle=m.color;g.fillRect(0,0,256,256);let seed=17;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};g.lineWidth=3;
 if(['brick','block','tile','parquet'].includes(m.pattern)){const h=m.pattern==='brick'?32:m.pattern==='parquet'?32:64,w=m.pattern==='brick'?100:m.pattern==='parquet'?128:64;g.strokeStyle=m.pattern==='tile'?'#808b8655':'#e9e1d599';for(let y=0;y<256;y+=h){for(let x=-w;x<256;x+=w){const shift=m.pattern==='brick'&&(y/h)%2?w/2:0;g.strokeRect(x+shift,y,w,h);}}}
 if(['wood','parquet'].includes(m.pattern)){for(let i=0;i<130;i++){g.strokeStyle=`rgba(55,25,8,${rand()*.16})`;g.lineWidth=rand()*2;g.beginPath();const y=rand()*256;g.moveTo(0,y);g.bezierCurveTo(70,y+rand()*15,180,y-rand()*12,256,y+rand()*6);g.stroke();}}
 if(m.pattern==='marble'){for(let i=0;i<14;i++){g.strokeStyle=m.id==='blackmarble'?'#ffffff33':'#78838944';g.lineWidth=rand()*2;g.beginPath();g.moveTo(rand()*256,0);g.bezierCurveTo(rand()*256,75,rand()*256,150,rand()*256,256);g.stroke();}}
 if(m.pattern==='stone'){g.strokeStyle='#ffffff44';for(let y=0;y<256;y+=64)for(let x=-30;x<256;x+=85)g.strokeRect(x+((y/64)%2)*35,y,85,64);}
 if(m.pattern==='fabric'){g.strokeStyle='#ffffff22';g.lineWidth=1;for(let i=0;i<256;i+=3){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.moveTo(0,i);g.lineTo(256,i);g.stroke();}}
 if(m.pattern!=='plain'&&m.pattern!=='glass'){for(let i=0;i<3500;i++){g.fillStyle=rand()>.5?'#ffffff0b':'#0000000c';g.fillRect(rand()*256,rand()*256,1+rand()*2,1+rand()*2);}}
 textures.set(m.id,c);return c;
}
function materialFor(o){const m=materials.find(m=>m.id===o.material),canvas=swatch(m),map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(o.repeat,o.repeat);map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const base=new THREE.Color(m.color),tint=new THREE.Color(o.color);tint.r/=Math.max(base.r,.01);tint.g/=Math.max(base.g,.01);tint.b/=Math.max(base.b,.01);
 const result=new THREE.MeshStandardMaterial({map,color:tint,roughness:o.roughness,metalness:m.metalness,transparent:m.pattern==='glass',opacity:m.pattern==='glass'?.3:1,depthWrite:m.pattern!=='glass',side:THREE.DoubleSide});result.userData.generated=true;return result;}
function disposeMesh(item){item.traverse(mesh=>{if(!mesh.isMesh)return;const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const m of mats){if(m.userData.generated||m.userData.ownedMap)m.map?.dispose();m.dispose()}if(!item.userData.source)mesh.geometry.dispose()})}
function buildMesh(o){let mesh=makeRealObject(o,materialFor);if(!mesh){mesh=new THREE.Mesh(new THREE.BoxGeometry(...o.size),materialFor(o));mesh.position.set(...o.pos);mesh.rotation.y=o.rotation*Math.PI/180;mesh.castShadow=Math.max(...o.size)>=.28;mesh.receiveShadow=true}mesh.userData.id=o.id;mesh.userData.source=o.source;mesh.traverse(n=>n.userData.id=o.id);mesh.visible=!o.roof||showRoof;return mesh}
// Sahna geometriyasi o‘zgardi: soya va to‘qnashuv jadvalini yangilash kerak.
// Ochiq eshik to‘sqinlik qilmaydi: uning bounding box‘i rom bilan birga bo‘lgani uchun burilgach ham o‘tish joyini egallaydi.
function sceneChanged(){shadowDirty=true;colliders=buildColliders(objects,o=>o.kind==='door'&&o.open);dirty=true}
function rebuild(){for(const item of meshes.values())disposeMesh(item);group.clear();meshes.clear();for(const o of objects){const mesh=buildMesh(o);group.add(mesh);meshes.set(o.id,mesh)}sceneChanged();updateOutline();renderObjectList();syncInspector();}
// Bitta qism o‘zgarganda 204 ta obyektni qayta qurmaymiz.
function updateOne(id){const o=objects.find(x=>x.id===id);if(!o){rebuild();return}const old=meshes.get(id);if(old){group.remove(old);disposeMesh(old)}const mesh=buildMesh(o);group.add(mesh);meshes.set(id,mesh);sceneChanged();updateOutline();syncInspector();}

const selected=()=>objects.find(o=>o.id===selectedId);
function updateOutline(){const mesh=meshes.get(selectedId);outline.visible=!!mesh?.visible;if(outline.visible)outline.setFromObject(mesh);dirty=true}
function remember(){history.push(JSON.stringify(objects));if(history.length>60)history.shift();$('#undo').disabled=false}
function status(s){$('#status').textContent=s}
function select(id){if(!meshes.has(id))return;selectedId=id;const o=selected();if(o.roof&&!showRoof){showRoof=true;updateRoof()}updateOutline();syncInspector();$('#object-list').value=id;status(o.name+' tanlandi')}
function change(patch){remember();Object.assign(selected(),patch);updateOne(selectedId);status('O‘zgarish qo‘llandi')}
function renderObjectList(){$('#object-list').replaceChildren();for(const o of objects){const option=document.createElement('option');option.value=o.id;option.textContent=o.name;option.selected=o.id===selectedId;$('#object-list').append(option)}}
function syncInspector(){const o=selected();if(!o)return;$('#selected-name').textContent=o.name;$('#selected-room').textContent=rooms.find(r=>r.id===o.room)?.name||'Uy';$('#color').value=o.color;$('#color-value').textContent=o.color.toUpperCase();$('#roughness').value=o.roughness;$('#texture-scale').value=o.repeat;for(const [i,k]of ['sx','sy','sz'].entries())$('#'+k).value=o.size[i];for(const [i,k]of ['px','py','pz'].entries())$('#'+k).value=o.pos[i];$('#rotation').value=o.rotation;renderMaterials();$('#delete').disabled=objects.length<=1;$('#undo').disabled=!history.length;
 const db=$('#door-toggle');db.hidden=o.kind!=='door';if(!db.hidden)db.textContent=o.open?'Eshikni yopish':'Eshikni ochish';}
function renderMaterials(){const search=$('#search').value.toLocaleLowerCase();$('#materials').replaceChildren();for(const m of materials.filter(m=>(category==='Barchasi'||m.category===category)&&m.name.toLocaleLowerCase().includes(search))){const b=document.createElement('button');b.className='material'+(!selected()?.original&&selected()?.material===m.id?' active':'');b.setAttribute('aria-label',m.name+' materialini qo‘llash');b.setAttribute('aria-pressed',String(!selected()?.original&&selected()?.material===m.id));const img=document.createElement('img');img.src=swatch(m).toDataURL();img.alt='';const label=document.createElement('span');label.textContent=m.name;b.append(img,label);b.onclick=()=>applyMaterial(m.id);$('#materials').append(b)}if(!$('#materials').children.length)$('#materials').textContent='Material topilmadi';}
function applyMaterial(id){const m=materials.find(m=>m.id===id);if(!m)throw Error('Material topilmadi');change({material:m.id,color:m.color,roughness:m.roughness,original:false,tint:false});status(m.name+' qo‘llandi')}
$('#material-count').textContent=materials.length;const restore=document.createElement('button');restore.textContent='Asl materialni qaytarish';restore.className='wide';restore.onclick=()=>{if(selected().source)change({original:true,tint:false,roughnessOverride:false,repeat:1,color:'#ffffff'})};$('#materials').after(restore);
for(const name of ['Barchasi',...new Set(materials.map(m=>m.category))]){const b=document.createElement('button');b.textContent=name;b.className=name===category?'active':'';b.onclick=()=>{category=name;for(const n of $('#categories').children)n.classList.toggle('active',n===b);renderMaterials()};$('#categories').append(b)}
for(const r of rooms){const b=document.createElement('button');b.className=r.id==='all'?'active':'';const icon=document.createElement('span');icon.className='room-icon';icon.textContent=r.icon;const label=document.createElement('span');label.textContent=r.name;const area=document.createElement('span');area.className='room-area';area.textContent=r.area;label.append(area);b.append(icon,label);b.dataset.room=r.id;b.onclick=()=>goRoom(r.id);$('#rooms').append(b)}
function goRoom(id){const r=rooms.find(r=>r.id===id);roomId=id;$('#room-name').textContent=r.name;for(const b of $('#rooms').children)b.classList.toggle('active',b.dataset.room===id);const [x,z]=r.center;if(mode==='walk'){const [fx,fz]=collisionOn?findFree(colliders,x,z,BODY):[x,z];camera.position.set(fx,1.65,fz);yaw=id==='bath'?Math.PI:0;pitch=-.06;look()}else{controls.target.set(x,0,z);camera.position.set(x+(id==='all'?14:5),id==='all'?14:8,z+(id==='all'?18:7));if(mode==='plan')camera.position.set(x,24,z+.01);controls.update()}status(r.name+' ko‘rinishi')}
function setMode(next){mode=next;controls.enabled=mode!=='walk';grid.visible=mode!=='walk';for(const id of ['orbit','walk','plan'])$('#'+id).classList.toggle('active',id===mode);$('.walk-pad').hidden=mode!=='walk';$('#hint').textContent=mode==='walk'?'Scroll / W A S D — yurish · Sudrang — atrofga qarash · Bosing — tanlash':'Sudrang — aylantirish · Scroll — yaqinlashish · Bosing — tanlash';goRoom(roomId);viewport.focus()}
function look(){camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);dirty=true}
const BODY=.22;// odam radiusi
function move(forward=0,side=0){const nx=camera.position.x+(-Math.sin(yaw)*forward+Math.cos(yaw)*side),nz=camera.position.z+(-Math.cos(yaw)*forward-Math.sin(yaw)*side);
 const [x,z]=collisionOn?resolveMove(colliders,camera.position.x,camera.position.z,nx,nz,BODY):[nx,nz];
 camera.position.x=THREE.MathUtils.clamp(x,-14,12);camera.position.z=THREE.MathUtils.clamp(z,-11,11);dirty=true}
// Walk is a free design camera: it deliberately passes through internal partitions.
const keys=new Set();viewport.addEventListener('keydown',e=>{if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();keys.add(e.key)}});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());viewport.addEventListener('blur',()=>keys.clear());
for(const b of document.querySelectorAll('[data-move]')){b.onclick=()=>{const v={forward:[.45,0],back:[-.45,0],left:[0,-.45],right:[0,.45]}[b.dataset.move];move(...v)}}
viewport.addEventListener('wheel',e=>{if(mode==='walk'){e.preventDefault();move(Math.sign(e.deltaY)*.4)}},{passive:false});
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();viewport.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};viewport.focus()});viewport.addEventListener('pointermove',e=>{if(!drag)return;if(mode==='walk'){yaw-=(e.clientX-drag.lastX)*.005;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag.lastY)*.004,-1.25,1.25);look()}drag.lastX=e.clientX;drag.lastY=e.clientY});
viewport.addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6){const rect=viewport.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects([...meshes.values()].filter(m=>m.visible),true)[0];if(hit){const id=hit.object.userData.id,o=objects.find(x=>x.id===id);
  if(o&&o.kind==='door'&&!doorAnim&&(mode==='walk'||id===selectedId))toggleDoor(o);else select(id)}}drag=null});viewport.addEventListener('pointerleave',()=>drag=null);viewport.addEventListener('pointercancel',()=>drag=null);
const DOOR_SWING=80;
function doorBaseOf(o){if(!doorBase.has(o.id))doorBase.set(o.id,{pos:[...o.pos],rotation:o.rotation});return doorBase.get(o.id)}
// Eshik o‘z markazi atrofida emas, petlya (ilmoq) qirrasi atrofida buriladi.
function doorPose(o,open){const base=doorBaseOf(o),hw=o.size[0]/2,r0=base.rotation*Math.PI/180;
 const hx=base.pos[0]-hw*Math.cos(r0),hz=base.pos[2]+hw*Math.sin(r0);
 const a=base.rotation+(open?DOOR_SWING:0),r=a*Math.PI/180;
 return {pos:[hx+hw*Math.cos(r),base.pos[1],hz-hw*Math.sin(r)],rotation:a}}
function toggleDoor(o){const mesh=meshes.get(o.id);if(!mesh)return;const open=!o.open,t=doorPose(o,open);
 remember();o.open=open;
 doorAnim={id:o.id,from:{p:[mesh.position.x,mesh.position.y,mesh.position.z],r:mesh.rotation.y},to:{p:t.pos,r:t.rotation*Math.PI/180},pose:t,t0:performance.now(),dur:380};
 status(open?'Eshik ochildi':'Eshik yopildi')}
function stepDoor(now){const a=doorAnim,mesh=meshes.get(a.id);if(!mesh){doorAnim=null;return}
 const k=Math.min(1,(now-a.t0)/a.dur),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
 mesh.position.set(a.from.p[0]+(a.to.p[0]-a.from.p[0])*e,a.from.p[1]+(a.to.p[1]-a.from.p[1])*e,a.from.p[2]+(a.to.p[2]-a.from.p[2])*e);
 mesh.rotation.y=a.from.r+(a.to.r-a.from.r)*e;dirty=true;
 if(k>=1){const o=objects.find(x=>x.id===a.id);if(o){o.pos=[...a.pose.pos];o.rotation=a.pose.rotation}doorAnim=null;sceneChanged();updateOutline();syncInspector()}}
function updateRoof(){for(const o of objects)if(o.roof)meshes.get(o.id).visible=showRoof;$('#roof').textContent=showRoof?'Tomni yashirish':'Tomni ko‘rsatish';$('#roof').setAttribute('aria-pressed',String(showRoof));updateOutline()}
$('#roof').onclick=()=>{showRoof=!showRoof;updateRoof()};
$('#door-toggle').onclick=()=>{const o=selected();if(o?.kind==='door'&&!doorAnim)toggleDoor(o)};
$('#collide').onclick=()=>{collisionOn=!collisionOn;$('#collide').textContent=collisionOn?'Devordan o‘tmaslik':'Devordan o‘tish';$('#collide').setAttribute('aria-pressed',String(collisionOn));status(collisionOn?'Real yurish: to‘siqlardan o‘tib bo‘lmaydi':'Erkin kamera: to‘siqlardan o‘tadi')};for(const id of ['orbit','walk','plan'])$('#'+id).onclick=()=>setMode(id);
$('#object-list').onchange=e=>select(e.target.value);$('#search').oninput=renderMaterials;$('#color').onchange=e=>change({color:e.target.value,tint:true});$('#roughness').onchange=e=>change({roughness:Number(e.target.value),roughnessOverride:true});$('#texture-scale').onchange=e=>change({repeat:Number(e.target.value)});
for(const [i,k]of ['sx','sy','sz'].entries())$('#'+k).onchange=e=>{const v=Number(e.target.value);if(!Number.isFinite(v)||v<.05||v>Number(e.target.max)){syncInspector();return}const size=[...selected().size];size[i]=v;change({size})};
for(const [i,k]of ['px','py','pz'].entries())$('#'+k).onchange=e=>{const v=Number(e.target.value);if(!Number.isFinite(v)||v<Number(e.target.min)||v>Number(e.target.max)){syncInspector();return}const pos=[...selected().pos];pos[i]=v;change({pos})};$('#rotation').onchange=e=>{const v=Number(e.target.value);if(Number.isFinite(v)&&Math.abs(v)<=360)change({rotation:v});else syncInspector()};
$('#undo').onclick=()=>{if(!history.length)return;objects=JSON.parse(history.pop());if(!objects.some(o=>o.id===selectedId))selectedId=objects[0].id;rebuild();status('Oxirgi o‘zgarish bekor qilindi')};
$('#duplicate').onclick=()=>{remember();const o=structuredClone(selected());o.id=crypto.randomUUID();o.name+=' nusxa';o.pos[0]+=.4;objects.push(o);selectedId=o.id;rebuild();status('Qism nusxalandi')};$('#delete').onclick=()=>{if(objects.length<=1)return;remember();objects=objects.filter(o=>o.id!==selectedId);selectedId=objects[0].id;rebuild();status('Qism o‘chirildi. Bekor qilish orqali qaytarish mumkin.')};
$('#add').onclick=()=>{remember();const type=$('#add-type').value,[x,z]=rooms.find(r=>r.id===roomId).center,m=materials[0];const o={id:crypto.randomUUID(),name:type==='wall'?'Yangi devor':type==='floor'?'Yangi panel':'Yangi mebel',room:roomId==='all'?'living':roomId,size:type==='wall'?[2,3,.15]:type==='floor'?[2,.15,2]:[1,1,1],pos:[x,type==='wall'?1.5:type==='floor'?.05:.6,z],material:m.id,color:m.color,roughness:m.roughness,repeat:3,rotation:0};objects.push(o);selectedId=o.id;rebuild()};
$('#save').onclick=()=>{const imported=objects.filter(o=>o.source?.startsWith('import:')).length,saved=objects.map(o=>o.source?.startsWith('import:')?{...o,source:null,original:false}:o);const blob=new Blob([JSON.stringify({format:'uy-studio',version:2,model:'modern-flat',objects:saved},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mening-uyim.uy.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status(imported?`Loyiha saqlandi. ${imported} ta yuklangan model blok sifatida saqlandi — qayta ochgach modelni yana qo‘shing.`:'Loyiha faylga saqlandi')};
function validProject(data){if(data?.format!=='uy-studio'||data.version!==2||data.model!=='modern-flat'||!Array.isArray(data.objects)||!data.objects.length||data.objects.length>1500)throw Error('Loyiha formati noto‘g‘ri (1–1500 qism kerak).');const ids=new Set();return data.objects.map(o=>{if(typeof o.id!=='string'||ids.has(o.id)||typeof o.name!=='string'||o.name.length>100||!rooms.some(r=>r.id===o.room)||!materials.some(m=>m.id===o.material)||!/^#[0-9a-f]{6}$/i.test(o.color)||!Array.isArray(o.size)||o.size.length!==3||o.size.some(v=>!Number.isFinite(v)||v<.001||v>30)||!Array.isArray(o.pos)||o.pos.length!==3||o.pos.some(v=>!Number.isFinite(v)||Math.abs(v)>30)||!Number.isFinite(o.rotation)||Math.abs(o.rotation)>360||!Number.isFinite(o.roughness)||o.roughness<0||o.roughness>1||!Number.isFinite(o.repeat)||o.repeat<1||o.repeat>12)throw Error('Loyihada yaroqsiz qiymat bor.');if(o.source&&!templates.has(o.source))throw Error('Noma’lum model qismi');ids.add(o.id);return {source:o.source||null,original:!!o.original,tint:!!o.tint,roughnessOverride:!!o.roughnessOverride,id:o.id,name:o.name,room:o.room,size:[...o.size],pos:[...o.pos],material:o.material,color:o.color,roughness:o.roughness,repeat:o.repeat,rotation:o.rotation,roof:!!o.roof,kind:o.kind==='door'||o.kind==='window'?o.kind:null,open:!!o.open}})}
function frameObject(o){if(mode!=='orbit')return;const r=Math.max(...o.size);controls.target.set(...o.pos);camera.position.set(o.pos[0]+r*1.9,o.pos[1]+r*1.5,o.pos[2]+r*2.3);controls.update()}
$('#import-model').onchange=async e=>{const files=e.target.files;if(!files.length)return;status('Model o‘qilmoqda…');
 try{const {root,size,name}=await parseModelFiles(files),source='import:'+crypto.randomUUID();templates.set(source,normalise(root));
  const dims=metreSize(size),[x,z]=rooms.find(r=>r.id===roomId).center,m=materials[0];
  const o={id:crypto.randomUUID(),name,room:roomId==='all'?'living':roomId,size:dims,pos:[x,dims[1]/2,z],source,original:true,tint:false,roughnessOverride:false,material:m.id,color:'#ffffff',roughness:.75,repeat:1,rotation:0};
  remember();objects.push(o);selectedId=o.id;rebuild();frameObject(o);
  status(`${name} qo‘shildi · ${dims.map(v=>v.toFixed(2)).join(' × ')} m. O‘lcham va materialni o‘ng paneldan o‘zgartiring.`);
 }catch(err){status('Model yuklanmadi: '+err.message)}
 e.target.value='';
};
$('#load').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>2000000)throw Error('Fayl 2 MB dan katta.');const next=validProject(JSON.parse(await f.text()));remember();objects=next;selectedId=objects[0].id;rebuild();status('Loyiha ochildi')}catch(err){status('Ochilmadi: '+err.message)}e.target.value=''};
new ResizeObserver(()=>{const {width,height}=viewport.getBoundingClientRect();renderer.setSize(width,height);composer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();dirty=true}).observe(viewport);
let previous=performance.now();
function frame(now){const dt=Math.min((now-previous)/1000,.05);previous=now;
 if(doorAnim)stepDoor(now);
 if(mode==='walk'){const f=(keys.has('w')||keys.has('ArrowUp')?1:0)-(keys.has('s')||keys.has('ArrowDown')?1:0),s=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0);if(f||s){move(f*dt*3,s*dt*3);movingNow()}}
 else if(controls.update())dirty=true;
 // Faqat nimadir o‘zgarganda chizamiz — bo‘sh turganda GPU yuklanmaydi.
 if(dirty){if(shadowDirty){sun.shadow.needsUpdate=true;shadowDirty=false}composer.render();dirty=false}
 requestAnimationFrame(frame)}
rebuild();for(const o of objects)if(o.kind==='door')doorBase.set(o.id,{pos:[...o.pos],rotation:o.rotation});requestAnimationFrame(frame);
window.__uy={THREE,scene,camera,renderer,composer,meshes,group,toggleDoor,stepDoor,move,get objects(){return objects},get doorAnim(){return doorAnim},get mode(){return mode},get colliders(){return colliders},set collisionOn(v){collisionOn=v}};
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();status('3D ulanishi uzildi. Sahifani yangilang; saqlanmagan o‘zgarishlar yo‘qolishi mumkin.')});
// Optional agent-facing interface uses exactly the same editor actions.
const mc=document.modelContext,lifecycle=new AbortController();
if(mc?.registerTool){const tools=[{name:'read_home_design',description:'Read editable house parts and available material IDs.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({objects:structuredClone(objects),materials:materials.map(({id,name})=>({id,name}))})},{name:'set_home_material',description:'Change one house part material and optional color in this editor.',inputSchema:{type:'object',properties:{partId:{type:'string'},materialId:{type:'string'},color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'}},required:['partId','materialId'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!objects.some(o=>o.id===input.partId)||!materials.some(m=>m.id===input.materialId)||(input.color&&!/^#[0-9a-f]{6}$/i.test(input.color)))throw Error('Invalid part, material or color');select(input.partId);const m=materials.find(m=>m.id===input.materialId);change({material:m.id,color:input.color||m.color,roughness:m.roughness,original:false});return {partId:selectedId,materialId:m.id,color:selected().color}}}];for(const tool of tools){try{Promise.resolve(mc.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true})}

