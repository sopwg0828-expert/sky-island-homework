import * as THREE from './vendor/three.module.js';
import {createWorld,createPlayer,tickPlayer,movement,exposedFaces,FACES} from './world.js';
import {createCollection,advanceMining,spawnDrop,tickDrops,resetCollection} from './collection.js';

const $=id=>document.getElementById(id);
const canvas=$('world'),world=createWorld(),player=createPlayer();
const collection=createCollection(),names={1:'草地方塊',2:'泥土',3:'石頭'};
let renderer,terrain,running=false,yaw=.55,pitch=-.35,dragging=false,lastPointer=null,lastTime=0,accumulator=0,frames=0,fpsTime=0,miningHeld=false;
const aim=new THREE.Vector2(0,0),raycaster=new THREE.Raycaster();raycaster.far=4.5;
const dropMeshes=new Map(),dropMaterials={},crackTextures=[];
const dropGeometry=new THREE.BoxGeometry(.34,.34,.34);
const selection=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.008,1.008,1.008)),new THREE.LineBasicMaterial({color:'#fff7c9',transparent:true,opacity:.9}));
const cracks=new THREE.Mesh(new THREE.BoxGeometry(1.006,1.006,1.006),new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
selection.visible=false;cracks.visible=false;cracks.renderOrder=2;
const keys=new Set(),touch=new Set();
const scene=new THREE.Scene();
scene.add(selection,cracks);
scene.background=new THREE.Color('#bfe0f4');
scene.fog=new THREE.Fog('#bfe0f4',75,145);
const camera=new THREE.PerspectiveCamera(44,1,.08,180);
const water=new THREE.Group();
scene.add(water);

function buildTerrain(texture){
  const positions=[],uvs=[],colors=[],indices=[];
  for(const block of exposedFaces(world)){
    const {x,y,z,type,face}=block,def=FACES[face];
    const tile=type===1?(face===2?0:face===3?2:1):type===2?2:3;
    const col=tile%4,row=Math.floor(tile/4),inset=.15/64;
    const u0=col/4+inset,u1=(col+1)/4-inset,v0=1-(row+1)/4+inset,v1=1-row/4-inset;
    const index=positions.length/3;
    for(const v of def.v){positions.push(x+v[0],y+v[1],z+v[2]);colors.push(def.shade,def.shade,def.shade);}
    uvs.push(u0,v0,u1,v0,u0,v1,u1,v1);
    indices.push(index,index+1,index+2,index+2,index+1,index+3);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeBoundingSphere();
  if(terrain){scene.remove(terrain);terrain.geometry.dispose();terrain.material.dispose();}
  terrain=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,vertexColors:true}));
  scene.add(terrain);
  const oldWaterMaterials=new Set(water.children.map(child=>child.material));
  for(const child of [...water.children]){water.remove(child);child.geometry.dispose();}
  for(const material of oldWaterMaterials)material.dispose();
  const waterMaterial=new THREE.MeshBasicMaterial({color:'#68bce0',transparent:true,opacity:.8});
  for(const tile of world.river){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,.045,1),waterMaterial);
    mesh.position.set(tile.x+.5,tile.y,tile.z+.5);water.add(mesh);
  }
  // 階梯河道的垂直落差，使用純色幾何，不引入其他圖片材質。
  for(let i=0;i<world.river.length-2;i++){
    const a=world.river[i],b=world.river[i+2];
    if(a.x===b.x&&a.y>b.y){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,a.y-b.y,.05),waterMaterial);
      mesh.position.set(a.x+.5,(a.y+b.y)/2,a.z+1);water.add(mesh);
    }
  }
}
function sky(){
  const white=new THREE.MeshBasicMaterial({color:'#f5fbfd'}),shade=new THREE.MeshBasicMaterial({color:'#dfedf1'});
  const cloudPositions=[[-12,22,4],[5,27,-13],[31,22,-4],[45,25,19],[2,21,39],[-20,26,26],[28,30,41]];
  for(const [x,y,z]of cloudPositions){
    const cloud=new THREE.Group();
    for(const [cx,cy,cz,sx,sy,sz]of [[0,0,0,7,1.1,3],[2,.8,0,4,1.5,2.7],[-2,.3,.5,3,1.2,3.2]]){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),[white,white,white,shade,white,white]);
      mesh.position.set(cx,cy,cz);cloud.add(mesh);
    }
    cloud.position.set(x,y,z);scene.add(cloud);
  }
  const sun=new THREE.Mesh(new THREE.BoxGeometry(4,4,.3),new THREE.MeshBasicMaterial({color:'#fff2bd'}));
  sun.position.set(7,19,1);scene.add(sun);
}
function resize(){
  const width=innerWidth,height=innerHeight;
  renderer.setSize(width,height,false);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  camera.aspect=width/height;camera.updateProjectionMatrix();
}
function overview(){
  if(innerWidth<600){camera.position.set(44,33,49);camera.lookAt(17,9,16);camera.setViewOffset(innerWidth,innerHeight,0,innerHeight*.22,innerWidth,innerHeight);}
  else{camera.clearViewOffset();camera.position.set(42,29,44);camera.lookAt(10,7.5,15);camera.setViewOffset(innerWidth,innerHeight,-innerWidth*.14,0,innerWidth,innerHeight);}
}
function active(value){
  running=value;keys.clear();touch.clear();dragging=false;miningHeld=false;
  advanceMining(world,collection,null,false,0);selection.visible=false;cracks.visible=false;
  $('welcome').hidden=value;$('crosshair').hidden=!value;$('pause').hidden=!value;$('walk-guide').hidden=!value;
  $('inventory').hidden=!value;$('mining-panel').hidden=!value;
  $('touch-controls').hidden=!value||!matchMedia('(pointer:coarse)').matches;
  $('touch-mine').hidden=!value||!matchMedia('(pointer:coarse)').matches;
  document.body.classList.toggle('walking',value);
  if(value){camera.clearViewOffset();canvas.focus();}else overview();
}
function notice(text){$('notice').textContent=text;$('notice').hidden=false;setTimeout(()=>$('notice').hidden=true,3500);}
function updateInventory(){
  for(const type of [1,2,3])$('count-'+type).textContent=collection.inventory[type];
}
function updateDrops(){
  const existing=new Set();
  for(const drop of collection.drops){
    existing.add(drop.id);
    let mesh=dropMeshes.get(drop.id);
    if(!mesh){mesh=new THREE.Mesh(dropGeometry,dropMaterials[drop.type]);dropMeshes.set(drop.id,mesh);scene.add(mesh);}
    mesh.position.set(drop.x,drop.y,drop.z);mesh.rotation.set(0,drop.angle,0);
    mesh.scale.setScalar(drop.collecting?Math.max(.25,1-drop.age*2):1);
  }
  for(const [id,mesh]of dropMeshes)if(!existing.has(id)){scene.remove(mesh);dropMeshes.delete(id);}
}
function currentTarget(){
  camera.updateMatrixWorld();terrain.updateMatrixWorld();
  raycaster.setFromCamera(aim,camera);
  const hit=raycaster.intersectObject(terrain,false)[0];
  if(!hit)return null;
  const point=hit.point.clone().addScaledVector(hit.face.normal,-.001);
  const target={x:Math.floor(point.x),y:Math.floor(point.y),z:Math.floor(point.z),distance:hit.distance};
  target.type=world.blocks.get(`${target.x},${target.y},${target.z}`);
  return target.type?target:null;
}
function miningFrame(dt){
  const target=currentTarget();
  selection.visible=!!target;
  if(target)selection.position.set(target.x+.5,target.y+.5,target.z+.5);
  const broken=advanceMining(world,collection,target,miningHeld,dt);
  if(broken){spawnDrop(collection,broken);buildTerrain(atlas);selection.visible=false;}
  cracks.visible=!!target&&collection.mining.progress>0;
  if(cracks.visible){
    cracks.position.copy(selection.position);
    const texture=crackTextures[collection.mining.stage];
    if(cracks.material.map!==texture){cracks.material.map=texture;cracks.material.needsUpdate=true;}
  }
  $('mining-label').textContent=target?`${names[target.type]} · 按住左鍵 ${target.type===3?'2':'0.8'} 秒`:'把準星移到附近的方塊';
  const percent=Math.round(collection.mining.progress*100);
  $('mining-progress').style.width=percent+'%';$('mining-meter').setAttribute('aria-valuenow',percent);
  $('mining-hint').textContent=percent>0?'持續按住，放開就要重挖':target?'挖碎後，走近掉落的小方塊就能收進背包':'按住右鍵拖曳轉向，也可以用方向鍵';
  const picked=tickDrops(world,collection,player,dt);
  if(picked.length){updateInventory();notice(picked.map(type=>`${names[type]} +1`).join('、'));}
  updateDrops();
}
function update(time){
  const dt=Math.min((time-lastTime)/1000||0,.1);lastTime=time;
  if(running){
    const turn=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));
    yaw-=turn*dt*1.6;
    pitch=THREE.MathUtils.clamp(pitch+(Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')))*dt, -1.35,1.35);
    const right=Number(keys.has('KeyD')||touch.has('right'))-Number(keys.has('KeyA')||touch.has('left'));
    const forward=Number(keys.has('KeyW')||touch.has('forward'))-Number(keys.has('KeyS')||touch.has('back'));
    accumulator+=dt;
    const resets=player.resets;
    while(accumulator>=1/120){tickPlayer(world,player,movement(right,forward,yaw),1/120);accumulator-=1/120;}
    if(player.resets!==resets){
      resetCollection(collection);updateDrops();updateInventory();miningHeld=false;buildTerrain(atlas);
      notice('掉下島了，材料歸零，回到起點重新開始。');yaw=.55;pitch=-.35;
    }
    camera.position.set(player.x,player.y+1.55,player.z);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
    miningFrame(dt);
  }
  renderer.render(scene,camera);
  frames++;fpsTime+=dt;
  if(fpsTime>=1){$('fps').textContent=`${Math.round(frames/fpsTime)} FPS`;frames=0;fpsTime=0;}
  requestAnimationFrame(update);
}
let atlas;
async function init(){
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    atlas=await new THREE.TextureLoader().loadAsync('./assets/source/sky-island-assets/atlas.png');
    atlas.magFilter=THREE.NearestFilter;atlas.minFilter=THREE.NearestFilter;atlas.generateMipmaps=false;atlas.colorSpace=THREE.SRGBColorSpace;
    const loader=new THREE.TextureLoader();
    const loadedCracks=await Promise.all(Array.from({length:10},(_,i)=>loader.loadAsync(`./assets/source/sky-island-assets/textures/16px/destroy_stage_${i}.png`)));
    for(const texture of loadedCracks){texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;crackTextures.push(texture);}
    const tiles={};
    for(const tile of [0,1,2,3]){
      const texture=atlas.clone();texture.repeat.set(.25,.25);texture.offset.set(tile*.25,.75);texture.needsUpdate=true;
      tiles[tile]=new THREE.MeshBasicMaterial({map:texture});
    }
    dropMaterials[1]=[tiles[1],tiles[1],tiles[0],tiles[2],tiles[1],tiles[1]];
    dropMaterials[2]=tiles[2];dropMaterials[3]=tiles[3];
    updateInventory();
    buildTerrain(atlas);sky();resize();overview();
    $('start').disabled=false;$('start-label').textContent='走進小島';$('world-status').textContent='32 × 32 × 32 的小世界';
    requestAnimationFrame(update);
  }catch(error){
    console.error(error);$('error').hidden=false;
    $('error-message').textContent='請使用支援 WebGL 2 的瀏覽器，並透過專案的啟動方式開啟。如果仍無法載入，請確認素材檔案完整。';
  }
}
$('start').addEventListener('click',()=>active(true));
$('pause').addEventListener('click',()=>{active(false);$('start-label').textContent='繼續探索';});
$('fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{notice('目前瀏覽器無法切換全螢幕，可改用瀏覽器的全螢幕功能。');}
});
addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(e.code)){
    if(running)e.preventDefault();
    if(e.code==='Escape'&&running){active(false);$('start-label').textContent='繼續探索';}else keys.add(e.code);
  }
});
addEventListener('keyup',e=>keys.delete(e.code));
function releaseInputs(){keys.clear();touch.clear();dragging=false;miningHeld=false;advanceMining(world,collection,null,false,0);cracks.visible=false;}
addEventListener('blur',releaseInputs);
document.addEventListener('visibilitychange',()=>{releaseInputs();accumulator=0;lastTime=performance.now();});
function pointAim(e){
  const rect=canvas.getBoundingClientRect();
  aim.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
  $('crosshair').style.left=(e.clientX-rect.left)+'px';$('crosshair').style.top=(e.clientY-rect.top)+'px';
}
canvas.addEventListener('pointerdown',e=>{
  if(!running)return;
  pointAim(e);dragging=e.button===2||e.pointerType==='touch';
  if(e.button===0&&e.pointerType!=='touch')miningHeld=true;
  lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(running)pointAim(e);
  if(!running||!dragging)return;
  yaw-=(e.clientX-lastPointer.x)*.004;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-lastPointer.y)*.004,-1.35,1.35);
  lastPointer={x:e.clientX,y:e.clientY};
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{dragging=false;miningHeld=false;advanceMining(world,collection,null,false,0);cracks.visible=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.querySelectorAll('[data-move]').forEach(button=>{
  button.addEventListener('pointerdown',e=>{e.preventDefault();touch.add(button.dataset.move);button.setPointerCapture(e.pointerId);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>touch.delete(button.dataset.move));
});
$('touch-mine').addEventListener('pointerdown',e=>{e.preventDefault();aim.set(0,0);$('crosshair').style.left='50%';$('crosshair').style.top='50%';miningHeld=true;$('touch-mine').setPointerCapture(e.pointerId);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('touch-mine').addEventListener(event,()=>{miningHeld=false;advanceMining(world,collection,null,false,0);});
addEventListener('resize',()=>{if(renderer){resize();if(!running)overview();}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();active(false);notice('繪圖暫時中斷，請重新載入頁面。');});
init();
