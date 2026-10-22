import test from 'node:test';
import assert from 'node:assert/strict';
import {createCollection,advanceMining} from '../collection.js';
const target={x:2,y:2,z:2,distance:2};
function setup(type=2){return {world:{blocks:new Map([['2,2,2',type],['3,2,2',type]]),revision:0},state:createCollection()};}
function hold(world,state,t,seconds){let broken=null;for(let i=0;i<Math.round(seconds*100);i++)broken=advanceMining(world,state,t,true,.01)||broken;return broken;}
test('STEP 1：短點擊 0.1 秒不挖掉方塊',()=>{
  const {world,state}=setup();hold(world,state,target,.1);
  assert.equal(world.blocks.get('2,2,2'),2);assert.ok(state.mining.progress>0);
});
test('STEP 1：泥土持續挖 0.8 秒才消失，進度會逐漸增加',()=>{
  const {world,state}=setup();hold(world,state,target,.3);const before=state.mining.progress;
  hold(world,state,target,.4);assert.ok(state.mining.progress>before);assert.ok(world.blocks.has('2,2,2'));
  const broken=hold(world,state,target,.1);assert.equal(world.blocks.has('2,2,2'),false);assert.equal(broken.type,2);
});
test('STEP 1：放開後裂痕進度歸零，再挖必須重新計時',()=>{
  const {world,state}=setup();hold(world,state,target,.5);
  advanceMining(world,state,target,false,.01);assert.equal(state.mining.progress,0);
  hold(world,state,target,.4);assert.ok(world.blocks.has('2,2,2'));
});
test('使用者新規格：石頭挖不到兩秒不碎，持續挖滿兩秒才消失',()=>{
  const {world,state}=setup(3);hold(world,state,target,1);assert.ok(world.blocks.has('2,2,2'));
  hold(world,state,target,.9);assert.ok(world.blocks.has('2,2,2'));
  const broken=hold(world,state,target,.1);assert.equal(world.blocks.has('2,2,2'),false);assert.equal(broken.type,3);
});
test('STEP 1：換目標會從頭挖，不共用進度',()=>{
  const {world,state}=setup();hold(world,state,target,.6);
  hold(world,state,{x:3,y:2,z:2,distance:2},.3);
  assert.ok(world.blocks.has('2,2,2'));assert.ok(world.blocks.has('3,2,2'));
  assert.ok(state.mining.progress<.5);
});
test('STEP 1：離開可挖距離或對著空氣，不能挖掘並清除進度',()=>{
  const {world,state}=setup();hold(world,state,target,.4);hold(world,state,{...target,distance:8},1);
  assert.ok(world.blocks.has('2,2,2'));assert.equal(state.mining.progress,0);
  hold(world,state,null,1);assert.equal(state.mining.progress,0);
});
test('STEP 1：同一格只回傳一次挖掉事件',()=>{
  const {world,state}=setup();assert.ok(hold(world,state,target,.8));assert.equal(hold(world,state,target,1),null);
});
