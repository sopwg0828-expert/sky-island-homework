import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,getBlock} from '../world.js';
import {createCollection,advanceMining} from '../collection.js';
import {initWater,tickWater,waterBoxes} from '../water.js';
function basin(){
  const w={blocks:new Map(),river:[{x:10,y:2.025,z:10}],revision:0};
  for(let x=0;x<32;x++)for(let z=0;z<32;z++)w.blocks.set(`${x},0,${z}`,3);
  w.blocks.set('10,1,10',3);initWater(w);return w;
}
function run(w,n=40){for(let i=0;i<n;i++)tickWater(w,.15);}
test('兩座島每一柱最底格都是基岩，上方仍有草泥石',()=>{
  const w=createWorld(),columns=new Map();
  for(const [key,type]of w.blocks){const [x,y,z]=key.split(',').map(Number),k=`${x},${z}`;if(!columns.has(k)||y<columns.get(k).y)columns.set(k,{x,y,z,type});}
  assert.ok([...columns.values()].some(c=>c.x<18));assert.ok([...columns.values()].some(c=>c.x>23));
  for(const c of columns.values())assert.equal(c.type,4,`島底 ${c.x},${c.y},${c.z}`);
  for(const t of [1,2,3])assert.ok([...w.blocks.values()].includes(t));
});
test('基岩長按三十秒也不裂、不消失、不產生挖掉事件',()=>{
  const w={blocks:new Map([['2,2,2',4]])},s=createCollection(),t={x:2,y:2,z:2,distance:2};
  for(let i=0;i<600;i++)assert.equal(advanceMining(w,s,t,true,.05),null);
  assert.equal(getBlock(w,2,2,2),4);assert.equal(s.mining.progress,0);assert.equal(s.drops.length,0);
});
test('水有可見厚度，不是薄片，河流來源有立體水',()=>{
  const w=basin(),boxes=waterBoxes(w);assert.ok(boxes.length>0);
  const source=boxes.find(b=>b.x===10&&b.z===10);assert.ok(source.height>=.5&&source.height<=1);
});
test('水隨時間落下並向空洞散開，不向上爬',()=>{
  const w=basin();assert.equal(w.water.has('11,1,10'),false);run(w);
  assert.ok(w.water.has('11,1,10'));assert.equal(w.water.has('10,3,10'),false);
  assert.ok(w.water.has('11,2,10'));
});
test('挖掉河岸擋牆後水改道，放回牆後該格不再有水',()=>{
  const w=basin();for(let y=1;y<4;y++)for(let z=0;z<32;z++)w.blocks.set(`11,${y},${z}`,3);
  run(w);assert.equal(w.water.has('11,1,10'),false);assert.equal(w.water.has('12,1,10'),false);
  w.blocks.delete('11,1,10');w.blocks.delete('11,2,10');w.revision++;run(w);assert.ok(w.water.has('12,1,10'));
  w.blocks.set('11,1,10',2);w.blocks.set('11,2,10',2);w.revision++;run(w);assert.equal(w.water.has('11,1,10'),false);
});
test('水不能穿過基岩，所有流動格都維持在32立方範圍',()=>{
  const w=basin();w.blocks.set('11,1,10',4);run(w,80);
  assert.equal(w.water.has('11,1,10'),false);
  for(const key of w.water.keys())for(const n of key.split(',').map(Number))assert.ok(n>=0&&n<32);
  assert.ok(w.water.size<=32768);
});
test('瀑布在垂直空洞中形成相接的水方塊',()=>{
  const w=basin();w.blocks.delete('10,1,10');run(w);
  assert.ok(w.water.has('10,2,10'));assert.ok(w.water.has('10,1,10'));
  const falling=waterBoxes(w).find(b=>b.x===10&&b.y===1&&b.z===10);assert.equal(falling.height,1);
});
test('原始河道低於河岸，未挖河岸時不淹到出生點',()=>{
  const w=createWorld();run(w,100);
  assert.equal(w.water.has('14,10,21'),false);
  for(const t of w.river)assert.equal(getBlock(w,t.x,Math.floor(t.y),t.z),0);
});
test('山坡落差的河岸也能擋水，不會從上游側面漫到草地',()=>{
  const w=createWorld();run(w,100);
  assert.equal(w.water.has('14,10,20'),false);
  assert.equal(w.water.has('14,10,18'),false);
});
