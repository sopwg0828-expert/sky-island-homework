import test from 'node:test';
import assert from 'node:assert/strict';
import {createCollection,spawnDrop,tickDrops} from '../collection.js';
const far={x:20,y:1,z:20};
function ground(){const blocks=new Map();for(let x=0;x<8;x++)for(let z=0;z<8;z++)blocks.set(`${x},0,${z}`,3);return {blocks};}
test('STEP 2：一個挖掉事件產生一個同種類掉落物',()=>{
  const state=createCollection();spawnDrop(state,{x:2,y:1,z:2,type:2});
  assert.equal(state.drops.length,1);assert.equal(state.drops[0].type,2);assert.ok(state.drops[0].vy>0);
});
test('STEP 2：掉落物彈起、旋轉，兩秒內落在地面上且不穿地',()=>{
  const state=createCollection(),world=ground();spawnDrop(state,{x:2,y:1,z:2,type:2});
  const startY=state.drops[0].y;tickDrops(world,state,far,.05);assert.ok(state.drops[0].y>startY);
  for(let i=0;i<240;i++)tickDrops(world,state,far,1/120);
  const drop=state.drops[0];assert.ok(drop.angle>0);assert.ok(drop.y>=1.16&&drop.y<=1.2);assert.equal(drop.vy,0);
});
test('STEP 2：下方沒有地面會繼續掉落，不在空中停住',()=>{
  const state=createCollection();spawnDrop(state,{x:2,y:1,z:2,type:3});
  for(let i=0;i<120;i++)tickDrops({blocks:new Map()},state,far,1/120);
  assert.ok(state.drops.length===0||state.drops[0].y<1);
});
