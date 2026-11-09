/* Local preview only. Production uses nginx + ASP.NET Core. Start the API on 5080 first. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
// Optional ignored config for managed preview environments; never used in deployment.
const previewConfig=path.join(root,'.openai/local-api.json');
if(fs.existsSync(previewConfig)){
 const config=JSON.parse(fs.readFileSync(previewConfig,'utf8'));
 const child=require('node:child_process').spawn(config.dotnet,[path.join(root,'platform/Api/bin/Debug/net10.0/Api.dll')],{cwd:path.join(root,'platform/Api'),env:{...process.env,ASPNETCORE_ENVIRONMENT:'Development',ASPNETCORE_URLS:'http://127.0.0.1:5080'},stdio:'inherit'});
 process.on('exit',()=>child.kill());
}
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json','.txt':'text/plain'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const registration=url.pathname==='/portal/register'||url.pathname==='/portal/register/'||((url.pathname==='/portal'||url.pathname.startsWith('/portal/'))&&url.searchParams.get('register')==='1');
 if(registration||url.pathname==='/portal/login'||url.pathname==='/portal/login/'){
  res.writeHead(302,{Location:registration?'/register/':'/login/','Cache-Control':'no-store'});res.end();return;
 }
 if(url.pathname.startsWith('/api/')){const proxy=http.request({hostname:'127.0.0.1',port:5080,path:req.url,method:req.method,headers:{...req.headers,host:'localhost'}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});proxy.on('error',()=>{res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({title:'Start the local API on port 5080.'}));});req.pipe(proxy);return;}
 let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
 const portal=decoded.startsWith('/portal/'),base=path.join(root,portal?'platform/Portal/dist':'site');
 const relative=portal?decoded.slice('/portal'.length):decoded;
 let file=path.resolve(base,'.'+relative);
 if(!file.startsWith(base+path.sep)&&file!==base){res.writeHead(403);res.end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)&&portal&&!path.extname(relative))file=path.join(base,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT||4173),'0.0.0.0');
