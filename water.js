// 有限格子水流：每 0.15 秒向下或向旁邊傳播一格，不往上流。
const SIZE=32,key=(x,y,z)=>`${x},${y},${z}`;
const solid=(w,x,y,z)=>w.blocks.has(key(x,y,z));
const inside=(x,y,z)=>x>=0&&x<SIZE&&y>=0&&y<SIZE&&z>=0&&z<SIZE;
export function initWater(world){
  world.water=new Map();world.waterTime=0;world.waterRevision=0;
  for(const t of world.river||[]){const y=Math.floor(t.y);if(!solid(world,t.x,y,t.z))world.water.set(key(t.x,y,t.z),{x:t.x,y,z:t.z,level:7,dx:0,dz:1});}
}
export function tickWater(world,dt){
  if(!world.water)initWater(world);
  world.waterTime+=Math.max(0,Math.min(dt,.15));
  if(world.waterTime<.15-1e-9)return false;
  world.waterTime=0;
  const next=new Map();
  function offer(x,y,z,level,dx,dz){
    if(!inside(x,y,z)||solid(world,x,y,z))return;
    const k=key(x,y,z),old=next.get(k);
    if(!old||old.level<level)next.set(k,{x,y,z,level,dx,dz});
  }
  for(const t of world.river||[])offer(t.x,Math.floor(t.y),t.z,7,0,1);
  for(const t of world.water.values()){
    if(solid(world,t.x,t.y,t.z))continue;
    if(!solid(world,t.x,t.y-1,t.z)){
      offer(t.x,t.y-1,t.z,8,t.dx,t.dz);
    }else if(t.level>1){
      for(const [dx,dz]of [[0,1],[1,0],[-1,0],[0,-1]])offer(t.x+dx,t.y,t.z+dz,t.level-1,dx,dz);
    }
  }
  // 比較實際格子與水位，沒變時不重建畫面。
  const changed=next.size!==world.water.size||[...next].some(([k,v])=>world.water.get(k)?.level!==v.level);
  world.water=next;
  if(changed)world.waterRevision++;
  return changed;
}
export function waterBoxes(world){
  return [...(world.water?.values()||[])].map(t=>({...t,height:t.level/8}));
}
