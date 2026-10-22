import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,createPlayer,tickPlayer,SPAWN} from '../world.js';
import {lookFromMovement,cameraFromPlayer} from '../view.js';
function floor(){const world={blocks:new Map()};for(let x=0;x<8;x++)for(let z=0;z<8;z++)world.blocks.set(`${x},0,${z}`,3);return world;}
function player(){return {...createPlayer(),x:2.5,y:1,z:2.5};}
function run(world,p,input,seconds){for(let i=0;i<Math.round(seconds*120);i++)tickPlayer(world,p,input,1/120);}
test('滑鼠：不用按住按鍵，位移就能左右轉及上下看',()=>{
  const next=lookFromMovement({yaw:0,pitch:0},120,-60);
  assert.ok(next.yaw<0);assert.ok(next.pitch>0);
  const back=lookFromMovement(next,-120,60);assert.ok(Math.abs(back.yaw)<1e-9);assert.ok(Math.abs(back.pitch)<1e-9);
});
test('滑鼠：抬頭低頭限制角度，不會把畫面翻過來',()=>{
  const up=lookFromMovement({yaw:0,pitch:0},0,-100000),down=lookFromMovement({yaw:0,pitch:0},0,100000);
  assert.ok(up.pitch>1&&up.pitch<Math.PI/2);assert.ok(down.pitch< -1&&down.pitch> -Math.PI/2);
});
test('空白鍵：起跳、攝影機一起上升，最後落回地面',()=>{
  const world=floor(),p=player(),before=cameraFromPlayer(p);
  tickPlayer(world,p,{x:0,z:0,jump:true},1/120);
  assert.ok(p.y>1);assert.ok(p.vy>0);assert.ok(cameraFromPlayer(p).y>before.y);
  run(world,p,{x:0,z:0},1.5);assert.equal(p.y,1);assert.equal(p.grounded,true);
  assert.equal(cameraFromPlayer(p).y,before.y);
});
test('空白鍵：空中不能再次起跳，按住不會一直連跳',()=>{
  const world=floor(),p=player();run(world,p,{x:0,z:0,jump:true},1.5);
  assert.equal(p.y,1);
  tickPlayer(world,p,{x:0,z:0,jump:false},1/120);tickPlayer(world,p,{x:0,z:0,jump:true},1/120);
  assert.ok(p.y>1);const velocity=p.vy;
  tickPlayer(world,p,{x:0,z:0,jump:false},1/120);tickPlayer(world,p,{x:0,z:0,jump:true},1/120);
  assert.ok(p.vy<velocity);
});
test('空白鍵：跳起碰到上方方塊時不會穿過天花板',()=>{
  const world=floor(),p=player();for(let x=0;x<8;x++)for(let z=0;z<8;z++)world.blocks.set(`${x},3,${z}`,3);
  let highest=1;
  for(let i=0;i<180;i++){tickPlayer(world,p,{x:0,z:0,jump:i===0},1/120);highest=Math.max(highest,p.y);}
  assert.ok(highest>1);assert.ok(highest+1.7<=3.0001);assert.equal(p.y,1);
});
function riverPlayer(world){const tile=world.river.find(t=>t.x===9&&t.z===15);return {...createPlayer(),x:tile.x+.5,y:tile.y-.025,z:tile.z+.5};}
test('河流：踩到水面後沿下游移動，不能用走路或跳躍逆流逃脫',()=>{
  const world=createWorld(),p=riverPlayer(world),start=p.z;
  tickPlayer(world,p,{x:0,z:0},1/120);assert.equal(p.swept,true);
  run(world,p,{x:-1,z:-1,jump:true},.5);assert.ok(p.z>start+1);assert.equal(p.swept,true);
});
test('河流：沿下游沖出島外，掉入虛空後地形與位置重新開始',()=>{
  const world=createWorld(),p=riverPlayer(world),original=new Map(world.blocks);
  world.blocks.delete(world.blocks.keys().next().value);
  run(world,p,{x:0,z:0},6);
  assert.equal(p.resets,1);assert.equal(p.swept,false);assert.equal(p.x,SPAWN.x);assert.equal(p.z,SPAWN.z);assert.equal(p.y,SPAWN.y);
  assert.deepEqual(world.blocks,original);
});
test('河流：在河流上方跳過時，腳還沒碰水就不會被沖走',()=>{
  const world=createWorld(),p=riverPlayer(world);p.y+=2;p.grounded=false;
  tickPlayer(world,p,{x:0,z:0},1/120);assert.equal(p.swept,false);
});
