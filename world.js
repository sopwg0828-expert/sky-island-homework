export const SIZE = 32;
export const SPAWN = { x: 14.5, y: 10, z: 21.5 };
const key=(x,y,z)=>`${x},${y},${z}`;
export function createWorld() {
  const world={blocks:new Map(),river:[],revision:0};
  function island(cx,cz,rx,rz,mountain){
    for(let x=0;x<SIZE;x++)for(let z=0;z<SIZE;z++){
      const d=((x+.5-cx)/rx)**2+((z+.5-cz)/rz)**2;
      if(d>1)continue;
      const rise=mountain?Math.max(0,4-Math.floor(Math.hypot((x+.5-9)*1.05,z+.5-13))):0;
      const top=9+rise;
      const bottom=Math.max(2,7-Math.floor((1-d)*5));
      for(let y=bottom;y<=top;y++)world.blocks.set(key(x,y,z),y===top?1:y>=top-2?2:3);
    }
  }
  island(9.5,16,8.5,10,true);
  island(27.5,16.5,3.5,5.5,false);
  // 固定河道僅是景觀；水面沒有額外圖片材質。
  for(let z=13;z<=24;z++){
    const x=9+(z>=18?1:0)+(z>=22?1:0);
    for(let width=0;width<2;width++){
      let y=31;
      while(y>=0&&!getBlock(world,x+width,y,z))y--;
      if(y>=0)world.river.push({x:x+width,y:y+1.025,z});
    }
  }
  return world;
}
export function createPlayer(){return {...SPAWN,vy:0,grounded:true,resets:0};}
export function getBlock(world,x,y,z){
  if(x<0||x>=SIZE||y<0||y>=SIZE||z<0||z>=SIZE)return 0;
  return world.blocks.get(key(x,y,z))||0;
}
export function movement(right,forward,yaw){
  const length=Math.max(1,Math.hypot(right,forward));
  return {x:(right*Math.cos(yaw)-forward*Math.sin(yaw))/length||0,z:(-right*Math.sin(yaw)-forward*Math.cos(yaw))/length||0};
}
function hits(world,x,y,z){
  const e=.00001,r=.28;
  for(let bx=Math.floor(x-r+e);bx<=Math.floor(x+r-e);bx++)
    for(let by=Math.floor(y+e);by<=Math.floor(y+1.7-e);by++)
      for(let bz=Math.floor(z-r+e);bz<=Math.floor(z+r-e);bz++)if(getBlock(world,bx,by,bz))return true;
  return false;
}
export function tickPlayer(world,p,input,dt){
  dt=Math.min(Math.max(dt,0),.05);
  const grounded=p.grounded;
  for(const axis of ['x','z']){
    const delta=(input[axis]||0)*4.2*dt;
    if(!delta)continue;
    const value=p[axis]+delta, nx=axis==='x'?value:p.x,nz=axis==='z'?value:p.z;
    if(!hits(world,nx,p.y,nz))p[axis]=value;
    else if(grounded&&!hits(world,nx,p.y+1.001,nz)){
      p.y+=1.001;p[axis]=value;
    }
  }
  p.vy-=22*dt;
  const next=p.y+p.vy*dt;
  if(hits(world,p.x,next,p.z)){
    if(p.vy<0){p.y=Math.round(p.y);p.grounded=true;}
    p.vy=0;
  }else{p.y=next;p.grounded=false;}
  if(p.y<-3){
    const fresh=createWorld();
    world.blocks=fresh.blocks;world.river=fresh.river;world.revision=(world.revision||0)+1;
    const resets=p.resets+1;
    Object.assign(p,createPlayer(),{resets});
  }
}
export const FACES=[
  {d:[1,0,0],v:[[1,0,1],[1,0,0],[1,1,1],[1,1,0]],shade:.78},
  {d:[-1,0,0],v:[[0,0,0],[0,0,1],[0,1,0],[0,1,1]],shade:.64},
  {d:[0,1,0],v:[[0,1,1],[1,1,1],[0,1,0],[1,1,0]],shade:1},
  {d:[0,-1,0],v:[[0,0,0],[1,0,0],[0,0,1],[1,0,1]],shade:.48},
  {d:[0,0,1],v:[[0,0,1],[1,0,1],[0,1,1],[1,1,1]],shade:.87},
  {d:[0,0,-1],v:[[1,0,0],[0,0,0],[1,1,0],[0,1,0]],shade:.7}
];
export function exposedFaces(world){
  const result=[];
  for(const [position,type]of world.blocks){
    const [x,y,z]=position.split(',').map(Number);
    for(let face=0;face<6;face++){
      const [dx,dy,dz]=FACES[face].d;
      if(!getBlock(world,x+dx,y+dy,z+dz))result.push({x,y,z,type,face});
    }
  }
  return result;
}
