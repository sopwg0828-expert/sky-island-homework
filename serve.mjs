// 僅供本機預覽的靜態檔案服務；網站本身不需要後端。
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.txt':'text/plain; charset=utf-8'};
const files=new Set(['/index.html','/app.js','/world.js','/collection.js','/style.css']);
const server=http.createServer(async(req,res)=>{
  try{
    let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(name==='/')name='/index.html';
    if(name==='/favicon.ico'){res.writeHead(204);res.end();return;}
    if((!files.has(name)&&!name.startsWith('/assets/source/sky-island-assets/')&&!name.startsWith('/vendor/'))||name.includes('..'))throw new Error('not allowed');
    const file=path.resolve(root,'.'+name);
    if(!file.startsWith(root))throw new Error('outside root');
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
