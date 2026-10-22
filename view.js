export function lookFromMovement(look,dx,dy){
  const sensitivity=.0025;
  return {yaw:look.yaw-dx*sensitivity,pitch:Math.max(-1.45,Math.min(1.45,look.pitch-dy*sensitivity))};
}
export function cameraFromPlayer(player){return {x:player.x,y:player.y+1.55,z:player.z};}
