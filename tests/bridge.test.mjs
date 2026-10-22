import test from 'node:test';
import assert from 'node:assert/strict';
import {bridgeTarget,placeBlock} from '../placement.js';
import {createCollection} from '../collection.js';
import {createWorld,createPlayer,tickPlayer} from '../world.js';
function fixture(){return {blocks:new Map([['17,9,16',1]]),revision:0};}
const ray={origin:{x:17.5,y:11.55,z:16.5},direction:{x:.5,y:-.7,z:0}};
test('橋面修正：站島邊朝空隙看，能選到與島相連的下一格',()=>{
  const world=fixture(),player={...createPlayer(),x:17.5,y:10,z:16.5};
  const target=bridgeTarget(world,player,ray);
  assert.ok(target);assert.deepEqual(target.normal,{x:1,y:0,z:0});assert.equal(target.x,17);
  const state=createCollection();state.inventory[2]=1;
  assert.equal(placeBlock(world,state,player,target,target.normal,2),true);
  assert.equal(world.blocks.get('18,9,16'),2);assert.equal(state.inventory[2],0);
});
test('橋面修正：不能在與島不相連的遠方空中生出方塊',()=>{
  const player={...createPlayer(),x:17.5,y:10,z:16.5};
  assert.equal(bridgeTarget(fixture(),player,{origin:ray.origin,direction:{x:1,y:-.4,z:0}}),null);
  assert.equal(bridgeTarget(fixture(),player,{origin:ray.origin,direction:{x:1,y:0,z:0}}),null);
});
test('橋面修正：逐格放五塊，橋面連續、材料減五，而且走上去不掉落',()=>{
  const world=fixture(),state=createCollection(),player={...createPlayer(),x:17.5,y:10,z:16.5};state.inventory[2]=5;
  for(let i=0;i<5;i++){
    player.x=17.5+i;
    const target=bridgeTarget(world,player,{origin:{x:player.x,y:11.55,z:16.5},direction:ray.direction});
    assert.ok(target);assert.equal(placeBlock(world,state,player,target,target.normal,2),true);
  }
  assert.equal(state.inventory[2],0);
  for(let x=18;x<=22;x++)assert.equal(world.blocks.get(`${x},9,16`),2);
  player.x=17.5;
  for(let i=0;i<120;i++)tickPlayer(world,player,{x:1,z:0},1/120);
  assert.ok(player.x>21.5);assert.equal(player.y,10);assert.equal(player.resets,0);
});
test('橋面修正：邊界外、已有方塊或超過可放距離時不提供預覽',()=>{
  const world=fixture(),player={...createPlayer(),x:17.5,y:10,z:16.5};
  world.blocks.set('18,9,16',1);assert.equal(bridgeTarget(world,player,ray),null);
  assert.equal(bridgeTarget(fixture(),player,{origin:ray.origin,direction:{x:1,y:-.1,z:0}}),null);
  assert.equal(bridgeTarget({blocks:new Map([['31,9,16',1]])},{...player,x:31.5},{origin:{x:31.5,y:11.55,z:16.5},direction:ray.direction}),null);
});
test('橋面修正：實際雙島地形搭六格接到對岸，能走到另一座島並站穩三秒',()=>{
  const world=createWorld(),state=createCollection(),player={...createPlayer(),x:17.5,y:10,z:16.5};state.inventory[2]=6;
  for(let i=0;i<6;i++){
    player.x=17.5+i;
    const target=bridgeTarget(world,player,{origin:{x:player.x,y:11.55,z:16.5},direction:ray.direction});
    assert.ok(target);assert.equal(placeBlock(world,state,player,target,target.normal,2),true);
  }
  player.x=17.5;
  for(let i=0;i<240;i++)tickPlayer(world,player,{x:1,z:0},1/120);
  assert.ok(player.x>24&&player.x<30);
  for(let i=0;i<360;i++)tickPlayer(world,player,{x:0,z:0},1/120);
  assert.equal(player.y,10);assert.equal(player.resets,0);assert.equal(state.inventory[2],0);
});
