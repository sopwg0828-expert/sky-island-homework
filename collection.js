import {getBlock} from './world.js';
const blankMining=()=>({key:null,elapsed:0,progress:0,stage:0});
export function createCollection(){return {mining:blankMining(),drops:[],inventory:{1:0,2:0,3:0},nextId:1};}
export function advanceMining(world,state,target,held,dt){
  const type=target?getBlock(world,target.x,target.y,target.z):0;
  if(!held||!type||!Number.isFinite(target.distance)||target.distance>4.5){state.mining=blankMining();return null;}
  const key=`${target.x},${target.y},${target.z}`;
  if(state.mining.key!==key)state.mining=blankMining();
  const m=state.mining;m.key=key;m.elapsed+=Math.max(0,Math.min(dt,.05));
  m.progress=Math.min(1,m.elapsed/(type===3?10:.8));m.stage=Math.min(9,Math.floor(m.progress*10));
  if(m.progress<1-1e-9)return null;
  world.blocks.delete(key);world.revision=(world.revision||0)+1;state.mining=blankMining();
  return {x:target.x,y:target.y,z:target.z,type};
}
export function spawnDrop(state,block){
  const drop={id:state.nextId++,type:block.type,x:block.x+.5,y:block.y+.5,z:block.z+.5,vy:3,angle:0,collecting:false,age:0};
  state.drops.push(drop);return drop;
}
function clearPath(world,from,to){
  const distance=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z);
  const steps=Math.ceil(distance/.12);
  for(let i=1;i<steps;i++){
    const t=i/steps;
    if(getBlock(world,Math.floor(from.x+(to.x-from.x)*t),Math.floor(from.y+(to.y-from.y)*t),Math.floor(from.z+(to.z-from.z)*t)))return false;
  }
  return true;
}
export function tickDrops(world,state,player,dt){
  const picked=[],remaining=[];
  dt=Math.max(0,Math.min(dt,.05));
  for(const drop of state.drops){
    drop.angle+=dt*.85;
    const destination={x:player.x,y:player.y+1.15,z:player.z};
    const eye={x:player.x,y:player.y+1.55,z:player.z};
    if(!drop.collecting&&Math.hypot(drop.x-player.x,drop.z-player.z)<=1&&Math.abs(drop.y-destination.y)<=2.05&&clearPath(world,drop,eye)){
      drop.collecting=true;drop.age=0;drop.from={x:drop.x,y:drop.y,z:drop.z};
    }
    if(drop.collecting){
      drop.age+=dt;const t=Math.min(1,drop.age/.26),ease=t*t;
      for(const axis of ['x','y','z'])drop[axis]=drop.from[axis]+(destination[axis]-drop.from[axis])*ease;
      if(t>=1){state.inventory[drop.type]++;picked.push(drop.type);continue;}
    }else{
      // 細分下墜計算，避免慢畫面下穿過一格厚的地板。
      const steps=Math.max(1,Math.ceil(dt/(1/120))),step=dt/steps;
      for(let i=0;i<steps;i++){
        drop.vy-=18*step;const nextY=drop.y+drop.vy*step;
        const floorY=Math.floor(nextY-.17);
        if(drop.vy<0&&getBlock(world,Math.floor(drop.x),floorY,Math.floor(drop.z))){drop.y=floorY+1.17;drop.vy=0;}
        else drop.y=nextY;
      }
    }
    if(drop.y>=-3)remaining.push(drop);
  }
  state.drops=remaining;return picked;
}
export function resetCollection(state){Object.assign(state,createCollection());}
