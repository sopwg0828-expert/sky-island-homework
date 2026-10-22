import test from 'node:test';
import assert from 'node:assert/strict';
import {createCollection,advanceMining,spawnDrop,tickDrops,resetCollection} from '../collection.js';
function ground(){const blocks=new Map();for(let x=0;x<8;x++)for(let z=0;z<8;z++)blocks.set(`${x},0,${z}`,3);return {blocks};}
function drop(state,type=2){spawnDrop(state,{x:2,y:1,z:2,type});}
function run(world,state,player,seconds){for(let i=0;i<Math.round(seconds*120);i++)tickDrops(world,state,player,1/120);}
test('STEP 3：一格內的掉落物先飛向玩家，再消失且材料只加一',()=>{
  const state=createCollection(),world=ground(),player={x:3,y:1,z:2.5};drop(state);
  tickDrops(world,state,player,1/120);assert.equal(state.drops[0].collecting,true);assert.equal(state.inventory[2],0);
  const x=state.drops[0].x;tickDrops(world,state,player,1/120);assert.ok(state.drops[0].x>x);
  run(world,state,player,1);assert.equal(state.drops.length,0);assert.equal(state.inventory[2],1);
  run(world,state,player,3);assert.equal(state.inventory[2],1);
});
test('STEP 3：三格以上不會被吸走',()=>{
  const state=createCollection(),world=ground();drop(state);run(world,state,{x:5.6,y:1,z:2.5},3);
  assert.equal(state.drops.length,1);assert.equal(state.inventory[2],0);
});
test('STEP 3：上下隔很遠不會隔著地形吸走',()=>{
  const state=createCollection();drop(state);run(ground(),state,{x:2.5,y:10,z:2.5},1);
  assert.equal(state.inventory[2],0);
});
test('STEP 3：撿石頭不會改變泥土數量',()=>{
  const state=createCollection();state.inventory[2]=4;drop(state,3);run(ground(),state,{x:3,y:1,z:2.5},1);
  assert.equal(state.inventory[3],1);assert.equal(state.inventory[2],4);
});
test('STEP 3：挖五個、掉五個、撿五個，數字剛好加五',()=>{
  const state=createCollection(),world=ground(),target={x:2,y:1,z:2,distance:2};
  for(let n=0;n<5;n++){
    world.blocks.set('2,1,2',2);
    for(let i=0;i<100;i++){
      const broken=advanceMining(world,state,target,true,.01);if(broken)spawnDrop(state,broken);
    }
    run(world,state,{x:3,y:1,z:2.5},1);
  }
  assert.equal(state.inventory[2],5);assert.equal(state.drops.length,0);
});
test('STEP 0 重設：清除背包、掉落物及挖掘進度',()=>{
  const state=createCollection();drop(state);state.inventory[3]=5;state.mining.progress=.7;
  resetCollection(state);
  assert.equal(state.drops.length,0);assert.deepEqual(state.inventory,{1:0,2:0,3:0});assert.equal(state.mining.progress,0);
});
test('STEP 3：挖出一格深的坑，站在坑旁仍能撿起材料',()=>{
  const world={blocks:new Map()},state=createCollection();
  for(let x=0;x<8;x++)for(let z=0;z<8;z++)for(let y=1;y<=2;y++)world.blocks.set(`${x},${y},${z}`,3);
  world.blocks.delete('2,2,2');spawnDrop(state,{x:2,y:2,z:2,type:2});
  state.drops[0].y=2.17;state.drops[0].vy=0;
  run(world,state,{x:3.2,y:3,z:2.5},1);
  assert.equal(state.inventory[2],1);assert.equal(state.drops.length,0);
});
