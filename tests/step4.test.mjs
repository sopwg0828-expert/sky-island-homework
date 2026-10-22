import test from 'node:test';
import assert from 'node:assert/strict';
import {placeBlock} from '../placement.js';
import {createCollection,advanceMining,spawnDrop,tickDrops} from '../collection.js';
const face={x:1,y:0,z:0},target={x:2,y:1,z:2,distance:2};
function setup(){const world={blocks:new Map([['2,1,2',3]]),revision:0},state=createCollection();state.inventory[2]=3;return {world,state,player:{x:.5,y:1,z:2.5}};}
test('STEP 4：在相鄰空格放出所選材料並扣一，不覆蓋原方塊',()=>{
  const {world,state,player}=setup();assert.equal(placeBlock(world,state,player,target,face,2),true);
  assert.equal(world.blocks.get('3,1,2'),2);assert.equal(world.blocks.get('2,1,2'),3);assert.equal(state.inventory[2],2);assert.equal(world.revision,1);
});
test('STEP 4：數字為零不能放置，也不能變成負數',()=>{
  const {world,state,player}=setup();state.inventory[2]=0;
  assert.equal(placeBlock(world,state,player,target,face,2),false);assert.equal(state.inventory[2],0);assert.equal(world.blocks.has('3,1,2'),false);
});
test('STEP 4：已有方塊的位置不可覆蓋，數量保持不變',()=>{
  const {world,state,player}=setup();world.blocks.set('3,1,2',1);
  assert.equal(placeBlock(world,state,player,target,face,2),false);assert.equal(world.blocks.get('3,1,2'),1);assert.equal(state.inventory[2],3);
});
test('STEP 4：不可把方塊放進玩家身體裡',()=>{
  const {world,state}=setup();assert.equal(placeBlock(world,state,{x:3.5,y:1,z:2.5},target,face,2),false);assert.equal(state.inventory[2],3);
});
test('STEP 4：32³ 範圍外不能放置也不扣材料',()=>{
  const {world,state,player}=setup();world.blocks.set('31,1,2',3);
  assert.equal(placeBlock(world,state,player,{x:31,y:1,z:2,distance:2},face,2),false);assert.equal(state.inventory[2],3);assert.equal(world.blocks.has('32,1,2'),false);
});
test('STEP 4：太遠、沒有目標或不是相鄰面的請求不能放置',()=>{
  const {world,state,player}=setup();
  for(const [t,f]of [[{...target,distance:7},face],[null,face],[target,{x:2,y:0,z:0}]])assert.equal(placeBlock(world,state,player,t,f,2),false);
  assert.equal(state.inventory[2],3);
});
test('STEP 4：選另一種材料，只扣該種類的數字',()=>{
  const {world,state,player}=setup();state.inventory[1]=2;
  assert.equal(placeBlock(world,state,player,target,face,1),true);assert.equal(world.blocks.get('3,1,2'),1);assert.equal(state.inventory[1],1);assert.equal(state.inventory[2],3);
});
test('STEP 4：完整挖→掉→撿→放，材料數量回到原本 N',()=>{
  const world={blocks:new Map([['2,0,2',3],['2,1,2',2]]),revision:0},state=createCollection(),player={x:3.3,y:1,z:2.5};state.inventory[2]=4;
  for(let i=0;i<100;i++){const broken=advanceMining(world,state,target,true,.01);if(broken)spawnDrop(state,broken);}
  for(let i=0;i<120;i++)tickDrops(world,state,player,1/120);
  assert.equal(state.inventory[2],5);
  assert.equal(placeBlock(world,state,player,{x:2,y:0,z:2,distance:2},{x:0,y:1,z:0},2),true);
  assert.equal(state.inventory[2],4);assert.equal(world.blocks.get('2,1,2'),2);
});
