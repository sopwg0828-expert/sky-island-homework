import {SIZE,getBlock} from './world.js';
export function bridgeTarget(world,player,ray){
  if(!ray||player.grounded===false)return null;
  const {origin,direction}=ray,length=Math.hypot(direction.x,direction.y,direction.z);
  if(!length||direction.y>=-.0001)return null;
  const top=Math.floor(player.y+.0001),t=(top-origin.y)/direction.y,distance=t*length;
  if(t<=0||distance>4.5)return null;
  const x=Math.floor(origin.x+direction.x*t),y=top-1,z=Math.floor(origin.z+direction.z*t);
  if([x,y,z].some(axis=>axis<0||axis>=SIZE)||getBlock(world,x,y,z))return null;
  for(const [dx,dz]of [[-1,0],[1,0],[0,-1],[0,1]]){
    if(getBlock(world,x+dx,y,z+dz))return {x:x+dx,y,z:z+dz,distance,normal:{x:-dx||0,y:0,z:-dz||0},bridge:true};
  }
  return null;
}
export function placeBlock(world,state,player,target,normal,type){
  if(!target||!normal||![1,2,3].includes(type)||!(state.inventory[type]>0))return false;
  if(!Number.isFinite(target.distance)||target.distance>4.5)return false;
  if(![target.x,target.y,target.z,normal.x,normal.y,normal.z].every(Number.isInteger))return false;
  if(Math.abs(normal.x)+Math.abs(normal.y)+Math.abs(normal.z)!==1)return false;
  if(!getBlock(world,target.x,target.y,target.z))return false;
  const x=target.x+normal.x,y=target.y+normal.y,z=target.z+normal.z;
  if([x,y,z].some(axis=>axis<0||axis>=SIZE)||getBlock(world,x,y,z))return false;
  const e=.00001;
  if(player.x+.28>x+e&&player.x-.28<x+1-e&&player.y+1.7>y+e&&player.y<y+1-e&&player.z+.28>z+e&&player.z-.28<z+1-e)return false;
  world.blocks.set(`${x},${y},${z}`,type);world.revision=(world.revision||0)+1;state.inventory[type]--;
  return true;
}
