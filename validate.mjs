import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialObjects,materials,rooms} from './dist/catalog.js';
const objects=initialObjects();assert(objects.length>40);assert.equal(materials.length,30);assert.equal(new Set(objects.map(o=>o.id)).size,objects.length);
for(const o of objects){assert(materials.some(m=>m.id===o.material));assert(rooms.some(r=>r.id===o.room));assert(o.size.every(v=>Number.isFinite(v)&&v>=.01));assert(o.pos.every(Number.isFinite));assert(/^#[0-9a-f]{6}$/i.test(o.color));assert(o.roughness>=0&&o.roughness<=1)}
const serialized=JSON.parse(JSON.stringify({format:'uy-studio',version:1,objects}));assert.deepEqual(serialized.objects,objects);
for(const f of ['index.html','style.css','app.js','catalog.js','vendor/three.module.js','vendor/three.core.js','vendor/OrbitControls.js','vendor/LICENSE'])assert(fs.statSync('dist/'+f).size>0);
console.log(`Validated ${objects.length} editable parts, ${materials.length} materials, project serialization and local assets.`);
