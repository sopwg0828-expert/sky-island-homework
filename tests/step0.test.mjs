import test from 'node:test';
import assert from 'node:assert/strict';
import { SIZE, SPAWN, createWorld, createPlayer, tickPlayer, getBlock, movement, exposedFaces } from '../world.js';

const key = (x,y,z) => `${x},${y},${z}`;
function simulate(world, player, input, seconds) {
  for(let i=0;i<Math.round(seconds*120);i++) tickPlayer(world,player,input,1/120);
}

test('STEP 0-5：所有方塊都在 32³ 以內，範圍外為空', () => {
  const world=createWorld();
  assert.equal(SIZE,32);
  assert.ok(world.blocks.size>100);
  for (const pos of world.blocks.keys()) for(const axis of pos.split(',').map(Number)) assert.ok(axis>=0&&axis<SIZE);
  assert.equal(getBlock(world,-1,10,10),0);
  assert.equal(getBlock(world,32,10,10),0);
});
test('STEP 0-4：草地、泥土、石頭都存在，小山比平地高',()=>{
  const world=createWorld();
  for(const type of [1,2,3]) assert.ok([...world.blocks.values()].includes(type));
  assert.ok([...world.blocks.keys()].some(p=>Number(p.split(',')[1])>=12));
});
test('STEP 0-4：兩座島各有地面，中間至少五格沒有連接',()=>{
  const world=createWorld();
  assert.ok(getBlock(world,14,9,18));
  assert.ok(getBlock(world,27,9,16));
  for(let x=18;x<=23;x++) for(let y=0;y<32;y++) for(let z=0;z<32;z++) assert.equal(getBlock(world,x,y,z),0);
});
test('STEP 0-1：出生在有地面的草地，身體不嵌入方塊',()=>{
  const world=createWorld(), player=createPlayer();
  assert.equal(getBlock(world,Math.floor(player.x),Math.floor(player.y)-1,Math.floor(player.z)),1);
  assert.equal(getBlock(world,Math.floor(player.x),Math.floor(player.y),Math.floor(player.z)),0);
});
test('STEP 0-1：站在地面三秒不會下墜',()=>{
  const world=createWorld(),player=createPlayer();
  simulate(world,player,{x:0,z:0},3);
  assert.ok(Math.abs(player.y-SPAWN.y)<0.001);
});
test('STEP 0-2：前後左右對應視角，斜走不額外加速',()=>{
  assert.deepEqual(movement(0,1,0),{x:0,z:-1});
  assert.deepEqual(movement(0,-1,0),{x:0,z:1});
  assert.deepEqual(movement(1,0,0),{x:1,z:0});
  const diagonal=movement(1,1,Math.PI/3);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-1)<1e-8);
});
test('STEP 0-2：走路會前進，放開後停止',()=>{
  const world=createWorld(),player=createPlayer();
  simulate(world,player,{x:1,z:0},0.25);
  assert.ok(player.x>SPAWN.x+0.5);
  const x=player.x;
  simulate(world,player,{x:0,z:0},0.25);
  assert.equal(player.x,x);
});
function fixture(){
  const world={blocks:new Map()};
  for(let x=0;x<8;x++)for(let z=0;z<8;z++)world.blocks.set(key(x,0,z),3);
  return world;
}
test('STEP 0-3：對著三格高的牆走三秒不穿牆',()=>{
  const world=fixture(),player={...createPlayer(),x:2.5,y:1,z:3.5};
  for(let y=1;y<=3;y++)for(let z=0;z<8;z++)world.blocks.set(key(4,y,z),3);
  simulate(world,player,{x:1,z:0},3);
  assert.ok(player.x<=3.721&&player.x>=3.6);
  assert.equal(player.y,1);
});
test('STEP 0-2：可以步行上一格高的階梯，不需要跳躍',()=>{
  const world=fixture(),player={...createPlayer(),x:2.5,y:1,z:3.5};
  for(let z=0;z<8;z++)world.blocks.set(key(4,1,z),3);
  simulate(world,player,{x:1,z:0},0.5);
  assert.ok(player.x>4.3);
  assert.ok(player.y>=2-0.001);
});
test('STEP 0-9：從島邊走出去會下墜，低於島底後回到出發點',()=>{
  const world=createWorld(),player={...createPlayer(),x:17.5,z:17.5,y:10};
  simulate(world,player,{x:1,z:0},0.6);
  assert.ok(player.y<10);
  simulate(world,player,{x:0,z:0},3);
  assert.equal(player.resets,1);
  assert.equal(player.x,SPAWN.x);
  assert.equal(player.z,SPAWN.z);
  assert.ok(Math.abs(player.y-SPAWN.y)<0.001);
});
test('STEP 0-9：重新開始會恢復初始地形',()=>{
  const world=createWorld(),original=new Map(world.blocks),player=createPlayer();
  world.blocks.delete(world.blocks.keys().next().value);
  world.blocks.set(key(20,10,16),3);
  player.y=-5;
  tickPlayer(world,player,{x:0,z:0},1/120);
  assert.deepEqual(world.blocks,original);
});
test('STEP 0 效能基礎：兩個相鄰方塊不產生內部面',()=>{
  const world={blocks:new Map([[key(1,1,1),3],[key(2,1,1),3]])};
  assert.equal(exposedFaces(world).length,10);
});
