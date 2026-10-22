import {SIZE,getBlock} from './world.js';
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
