import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { project, unproject, makeStreetGraph, nearestNode, cityRoute, advanceStep } from './city-routing.mjs';
import { buildCity } from './city-geometry.js';
import {mapTheme} from './map-theme.js';
import {resizeOutlines} from './map-outlines.js';
import {clusterMarkers} from './marker-clusters.mjs';
const C=mapTheme.colors;
let cityPromise;


async function mount(){
 const host=document.querySelector('#world'), bridge=window.BiteQuestBridge;
 if(!host||!bridge)return;window.biteWorld?.dispose();let city;try{cityPromise??=fetch('./data/nyc-city.json').then(r=>{if(!r.ok)throw Error('Map data unavailable');return r.json()});city=await cityPromise;}catch{cityPromise=null;host.innerHTML='<div class="world-fallback"><h2>The city map could not load.</h2><p>Use Nearby bites to browse real businesses, or reload to try again.</p></div>';return;}if(document.querySelector('#world')!==host)return;
 let renderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{host.innerHTML='<div class="world-fallback"><h2>Your bites are still here.</h2><p>This device could not start the 3D map. Use Nearby bites below to keep exploring.</p></div>';return;}
 host.replaceChildren(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(C.skyCyan);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D neighborhood. Drag to rotate, scroll or pinch to zoom. Tap streets or use arrow keys to walk.');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=mapTheme.rendering.shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.fog=mapTheme.rendering.fog?new THREE.Fog(C.skyCyan,mapTheme.buildings.fogNear,mapTheme.buildings.fogFar):null;
 const camera=new THREE.PerspectiveCamera(42,1,.1,900);camera.position.set(30,host.clientWidth<620?72:46,host.clientWidth<620?97:70);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=20;controls.maxDistance=310;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.43;controls.enablePan=true;controls.screenSpacePanning=false;controls.panSpeed=.6;controls.rotateSpeed=.55;controls.zoomSpeed=.75;
 scene.add(new THREE.HemisphereLight(C.paperCream,C.inkSoft,1.25));const sun=new THREE.DirectionalLight(C.paperWarm,1.75);sun.position.set(-70,120,45);sun.castShadow=mapTheme.rendering.shadows;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-90;sun.shadow.camera.right=90;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;sun.shadow.normalBias=.06;scene.add(sun);
 const water=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),new THREE.MeshBasicMaterial({color:C.skyCyan}));water.rotation.x=-Math.PI/2;water.position.y=-.12;scene.add(water);
 const cityScene=buildCity(scene,city);cityScene.buildings.scale.y=1;
 const graph=makeStreetGraph(city.roads);
 const mesh=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);scene.add(o);return o;};
 const mapPoint=p=>{const v=project(p.lon,p.lat);return new THREE.Vector3(v.x,0,v.z);};
 const avatar=new THREE.Group();const start=nearestNode(graph,{x:bridge.position.x,z:bridge.position.y});avatar.position.set(start?.x??0,start?.y??0,start?.z??0);scene.add(avatar);
 function buildingHeight(p){let best=0;for(const b of city.buildings){const r=b.rings[0];let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],c=r[j];if((a[1]>p.z)!==(c[1]>p.z)&&p.x<(c[0]-a[0])*(p.z-a[1])/(c[1]-a[1])+a[0])inside=!inside;}if(inside)best=Math.max(best,b.h*.1);}return best;}
 const loader=new THREE.TextureLoader();
 const owlTexture=loader.load('./rat-chef.png');owlTexture.colorSpace=THREE.SRGBColorSpace;
 const player=new THREE.Sprite(new THREE.SpriteMaterial({map:owlTexture,depthTest:true,depthWrite:false,alphaTest:.08}));player.renderOrder=3;player.center.set(.5,.08);player.scale.set(mapTheme.character.height,mapTheme.character.height,1);player.position.y=mapTheme.character.groundY;avatar.add(player);
 const contact=new THREE.Mesh(new THREE.CircleGeometry(.72,40),new THREE.MeshBasicMaterial({color:C.inkSoft,transparent:true,opacity:mapTheme.character.shadowOpacity,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.24;avatar.add(contact);
 const atlasSources=new Map(),foodArt=window.BITE_CONTENT.foodArt;
 function foodTexture(id){
   const a=foodArt[id]||{path:'food-atlas.png',slot:0};
   let source=atlasSources.get(a.path);
   if(!source){
     source={updates:[],texture:null};
     source.texture=loader.load('./'+a.path,loaded=>{for(const update of source.updates)update(loaded.image);});
     source.texture.colorSpace=THREE.SRGBColorSpace;
     atlasSources.set(a.path,source);
   }
   const index=a.slot,cols=mapTheme.discovery.atlasColumns,rows=mapTheme.discovery.atlasRows;
   let t,update;
   if(a.aspect===1){
     // Crop opaque square artwork to the same circular silhouette as the pin.
     const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
     const ctx=canvas.getContext('2d');
     t=new THREE.CanvasTexture(canvas);
     update=image=>{
       const w=image.width/cols,h=image.height/rows;
       ctx.clearRect(0,0,512,512);ctx.save();ctx.beginPath();
       ctx.arc(256,256,256,0,Math.PI*2);ctx.clip();
       ctx.drawImage(image,(index%cols)*w,Math.floor(index/cols)*h,w,h,0,0,512,512);
       ctx.restore();t.needsUpdate=true;
     };
   }else{
     t=source.texture.clone();
     t.repeat.set(1/cols,1/rows);
     t.offset.set((index%cols)/cols,1-(Math.floor(index/cols)+1)/rows);
     update=image=>{t.image=image;t.needsUpdate=true;};
   }
   t.colorSpace=THREE.SRGBColorSpace;
   source.updates.push(update);
   if(source.texture.image)update(source.texture.image);
   return t;
 }
 const ring=new THREE.Mesh(new THREE.RingGeometry(mapTheme.character.ringRadius,mapTheme.character.ringRadius+.045,64),new THREE.MeshBasicMaterial({color:C.taxiYellow,transparent:true,opacity:mapTheme.alpha.ring,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.38;avatar.add(ring);
 const aura=new THREE.Mesh(new THREE.CircleGeometry(mapTheme.character.ringRadius,64),new THREE.MeshBasicMaterial({color:C.paperCream,transparent:true,opacity:mapTheme.alpha.aura,depthWrite:false}));aura.rotation.x=-Math.PI/2;aura.position.y=.37;avatar.add(aura);
 const targets=[],floaters=[],labels=[];let activeLabel=bridge.focusId;const nearestBites=bridge.spots.slice().sort((a,b)=>mapPoint(a).distanceTo(avatar.position)-mapPoint(b).distanceTo(avatar.position)).slice(0,mapTheme.labels.nearbyCount).map(s=>s.id);
 for(const [i,s] of bridge.spots.entries()){
 const p=mapPoint(s),roof=buildingHeight(p),baseY=roof+mapTheme.discovery.roofLift;
 const base=mesh(new THREE.CylinderGeometry(.6,.8,.15,24),new THREE.MeshBasicMaterial({color:C.accentRed}),p.x,.22,p.z);
 const pinCanvas=document.createElement('canvas');pinCanvas.width=pinCanvas.height=256;const pinCtx=pinCanvas.getContext('2d');pinCtx.fillStyle=C.paperCream;pinCtx.strokeStyle=C.accentRed;pinCtx.lineWidth=10;pinCtx.beginPath();pinCtx.arc(128,128,113,0,Math.PI*2);pinCtx.fill();pinCtx.stroke();const pinTexture=new THREE.CanvasTexture(pinCanvas);pinTexture.colorSpace=THREE.SRGBColorSpace;
 const ball=new THREE.Sprite(new THREE.SpriteMaterial({map:pinTexture,depthTest:false}));ball.renderOrder=2;ball.position.set(p.x,baseY,p.z);ball.scale.set(3.1,3.1,1);scene.add(ball);ball.userData.id=s.id;targets.push(ball);
 const food=new THREE.Sprite(new THREE.SpriteMaterial({map:foodTexture(s.id),depthTest:false}));food.renderOrder=3;food.scale.set(2.25,2.25,1);food.position.set(p.x,baseY+.15,p.z);scene.add(food);food.userData.id=s.id;targets.push(food);
 const stem=mesh(new THREE.CylinderGeometry(.045,.045,baseY,6),new THREE.MeshBasicMaterial({color:C.ink,transparent:true,opacity:mapTheme.alpha.stem}),p.x,baseY/2,p.z);
 const label=document.createElement('button');label.className='world-label encounter-label';label.textContent=(bridge.collected.includes(s.id)?'✓ ':'')+s.name;label.onclick=()=>bridge.open(s.id);label.setAttribute('aria-label','Discover '+s.name);host.append(label);
 const lp=new THREE.Vector3(p.x,baseY+2.1,p.z);labels.push({el:label,p:lp,encounter:true,id:s.id,priority:2});floaters.push({id:s.id,base,ball,food,baseY,offset:i,roof,lp,stem,label});
 }
 const stopPos=mapPoint({lon:-73.9922,lat:40.718});
 const stopCanvas=document.createElement('canvas');stopCanvas.width=stopCanvas.height=512;const stopCtx=stopCanvas.getContext('2d');
 function paintStop(art){stopCtx.clearRect(0,0,512,512);stopCtx.save();stopCtx.beginPath();stopCtx.arc(256,256,224,0,Math.PI*2);stopCtx.clip();stopCtx.fillStyle=C.paperCream;stopCtx.fillRect(0,0,512,512);if(art){const size=Math.min(art.width,art.height);stopCtx.drawImage(art,(art.width-size)/2,(art.height-size)/2,size,size,32,32,448,448);}stopCtx.restore();stopCtx.beginPath();stopCtx.arc(256,256,224,0,Math.PI*2);stopCtx.lineWidth=24;stopCtx.strokeStyle=C.accentMagenta;stopCtx.stroke();}
 paintStop();const stopTexture=new THREE.CanvasTexture(stopCanvas);stopTexture.colorSpace=THREE.SRGBColorSpace;
 const stopRing=new THREE.Sprite(new THREE.SpriteMaterial({map:stopTexture,depthTest:true,depthWrite:false}));stopRing.position.set(stopPos.x,5,stopPos.z);stopRing.scale.set(5,5,1);stopRing.userData.id='stop';scene.add(stopRing);targets.push(stopRing);
 const stopArtwork=new Image();stopArtwork.onload=()=>{if(disposed)return;paintStop(stopArtwork);stopTexture.needsUpdate=true;};stopArtwork.src='./retro-sign.png';
 mesh(new THREE.CylinderGeometry(.1,.1,3,10),new THREE.MeshBasicMaterial({color:C.buildingB}),stopPos.x,1.6,stopPos.z);
 for(const [name,lon,lat] of [['SOHO',-74.002,40.7225],['NOLITA',-73.995,40.724],['CHINATOWN',-73.997,40.715],['LOWER EAST SIDE',-73.986,40.7213],['TRIBECA',-74.009,40.716],['EAST RIVER',-73.981,40.7055]]){const el=document.createElement('div');el.className='world-label district-label';el.textContent=name;host.append(el);const p=mapPoint({lon,lat});p.y=2;labels.push({el,p,priority:4});}
 const streetNames=new Set();for(const r of city.roads){if(!['Canal Street','Grand Street','Delancey Street','East Broadway','Essex Street','Allen Street','Bowery','Orchard Street','Rivington Street','Division Street'].includes(r.name)||streetNames.has(r.name)||r.points.length<2)continue;streetNames.add(r.name);const mid=r.points[Math.floor(r.points.length/2)],el=document.createElement('div');el.className='world-label street-name';el.textContent=r.name;host.append(el);labels.push({el,p:new THREE.Vector3(mid[0],.4,mid[1]),priority:mapTheme.labels.majorStreets.includes(r.name)?3:1});}
 const destination=mesh(new THREE.RingGeometry(.7,1,32),new THREE.MeshBasicMaterial({color:C.taxiYellow,side:THREE.DoubleSide}),0,.45,0);destination.rotation.x=-Math.PI/2;destination.visible=false;
 const trail=new THREE.Group();scene.add(trail);
 let route=[],pendingDistance=0,lastCredit=0,lastTime=0;
 function clearTrail(){while(trail.children.length){const o=trail.children[0];trail.remove(o);o.geometry.dispose();o.material.dispose();}}
 function setDestination(point){if(!bridge.move({x:avatar.position.x,y:avatar.position.z},0))return;route=cityRoute(graph,avatar.position,point);clearTrail();if(!route.length)return;let last=avatar.position.clone();for(const p of route){const d=Math.hypot(p.x-last.x,p.z-last.z),n=Math.floor(d/2);for(let i=1;i<=n;i++){const dot=new THREE.Mesh(new THREE.CircleGeometry(.22,8),new THREE.MeshBasicMaterial({color:C.taxiYellow}));dot.rotation.x=-Math.PI/2;dot.position.set(last.x+(p.x-last.x)*i/(n+1),.43,last.z+(p.z-last.z)*i/(n+1));trail.add(dot);}last.set(p.x,0,p.z);}destination.position.set(last.x,.45,last.z);destination.visible=true;}
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),pointers=new Set();let down=null,dragged=false;
 function pointerDown(e){pointers.add(e.pointerId);if(pointers.size>1)dragged=true;else{down={x:e.clientX,y:e.clientY};dragged=false;}}
 function pointerMove(e){if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)dragged=true;}
 function pointerUp(e){pointers.delete(e.pointerId);if(!down||dragged||pointers.size||document.querySelector('dialog')?.open){if(!pointers.size)down=null;return;}down=null;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(targets.filter(o=>o.visible),false)[0];if(hit){hit.object.userData.id==='stop'?bridge.stop():bridge.open(hit.object.userData.id);return;}const land=raycaster.intersectObjects(cityScene.lands)[0];if(land)setDestination(land.point);}
 function pointerCancel(e){pointers.delete(e.pointerId);down=null;dragged=true;}
 function keyDown(e){if(document.querySelector('dialog')?.open)return;const moves={ArrowUp:[0,-12],ArrowDown:[0,12],ArrowLeft:[-12,0],ArrowRight:[12,0]};if(moves[e.key]){e.preventDefault();setDestination({x:avatar.position.x+moves[e.key][0],z:avatar.position.z+moves[e.key][1]});}}
 renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',pointerCancel);renderer.domElement.addEventListener('keydown',keyDown);
 const projected=new THREE.Vector3();let frame=0,disposed=false;const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

 const resize=()=>{let w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();resizeOutlines(scene,w,h);};const ro=new ResizeObserver(resize);ro.observe(host);resize();
 let lastLabels=-Infinity;
 const collides=(a,b)=>a.left<b.right+mapTheme.labels.gap&&a.right>b.left-mapTheme.labels.gap&&a.top<b.bottom+mapTheme.labels.gap&&a.bottom>b.top-mapTheme.labels.gap;
 const clusterButtons=new Map(),clusteredIds=new Set();
 function layoutClusters(distance,rect,occupied){
 const cfg=mapTheme.clusters,shown=new Set();clusteredIds.clear();
 for(const f of floaters)f.ball.visible=f.food.visible=f.stem.visible=f.base.visible=true;
 if(distance<cfg.minDistance){for(const el of clusterButtons.values())el.hidden=true;return;}
 const points=floaters.filter(f=>f.id!==activeLabel).map(f=>{const p=f.ball.position.clone().project(camera);return {id:f.id,f,x:(p.x*.5+.5)*rect.width,y:(-p.y*.5+.5)*rect.height,z:p.z};}).filter(p=>p.z>=-1&&p.z<=1&&p.x>=0&&p.x<=rect.width&&p.y>=0&&p.y<=rect.height);
 for(const group of clusterMarkers(points,cfg.radiusPixels)){
 if(group.length<2)continue;
 const x=group.reduce((n,p)=>n+p.x,0)/group.length,y=group.reduce((n,p)=>n+p.y,0)/group.length;
 const box={left:rect.left+x-cfg.width/2,right:rect.left+x+cfg.width/2,top:rect.top+y-cfg.height/2,bottom:rect.top+y+cfg.height/2},edge=mapTheme.labels.edge;
 if(box.left<rect.left+edge||box.right>rect.right-edge||box.top<rect.top+edge||box.bottom>rect.bottom-edge||occupied.some(o=>collides(box,o)))continue;
 const key=group.map(p=>p.id).join('|');let el=clusterButtons.get(key);
 if(!el){el=document.createElement('button');el.className='bite-cluster';el.style.width=cfg.width+'px';el.style.height=cfg.height+'px';const names=group.map(p=>bridge.spots.find(s=>s.id===p.id).name);el.setAttribute('aria-label',`Zoom in to ${group.length} restaurants: ${names.join(', ')}`);el.title=names.join(' · ');el.innerHTML=`<span class="cluster-foods" aria-hidden="true">${group.slice(0,cfg.previewCount).map(p=>`<span class="cluster-food"><span class="food-art" style="--food-inset:${foodArt[p.id].aspect===1?'0':'-25% 0'};--food-atlas:url('${foodArt[p.id].path}');background-position:${foodArt[p.id].slot%3*50}% ${Math.floor(foodArt[p.id].slot/3)*100}%"></span></span>`).join('')}</span><span class="cluster-count">${group.length}<small>bites</small></span>`;el.onclick=()=>{const center=new THREE.Vector3();for(const p of group)center.add(mapPoint(bridge.spots.find(s=>s.id===p.id)));center.divideScalar(group.length);const direction=camera.position.clone().sub(controls.target).normalize();controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,cfg.focusDistance);lastLabels=-Infinity;renderer.domElement.focus();};host.append(el);clusterButtons.set(key,el);}
 shown.add(key);el.hidden=false;el.style.left=x+'px';el.style.top=y+'px';occupied.push(box);
 for(const p of group){clusteredIds.add(p.id);p.f.ball.visible=p.f.food.visible=p.f.stem.visible=p.f.base.visible=false;}
 }
 for(const [key,el] of clusterButtons)if(!shown.has(key))el.hidden=true;
 }
 function layoutLabels(t){if(t-lastLabels<mapTheme.labels.refreshMs)return;lastLabels=t;const distance=camera.position.distanceTo(controls.target),rect=host.getBoundingClientRect(),occupied=[...document.querySelectorAll('.district,.quest-pill,.world-tools,.map-dock,#nav,.world-instructions:not([hidden]),.map-source')].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect());
 layoutClusters(distance,rect,occupied);
 for(const l of labels.slice().sort((a,b)=>b.priority-a.priority)){
 const eligible=l.encounter?!clusteredIds.has(l.id)&&(l.id===activeLabel||nearestBites.includes(l.id))&&distance<mapTheme.labels.poiMaxDistance:l.priority===4?distance>=mapTheme.labels.districtMinDistance:distance<(l.priority===3?mapTheme.labels.streetMaxDistance:mapTheme.labels.minorMaxDistance);
 l.el.style.display=eligible?'block':'none';if(!eligible)continue;projected.copy(l.p).project(camera);if(projected.z>1||projected.z< -1){l.el.style.display='none';continue;}
 l.el.style.left=(projected.x*.5+.5)*rect.width+'px';l.el.style.top=(-projected.y*.5+.5)*rect.height+'px';const r=l.el.getBoundingClientRect(),edge=mapTheme.labels.edge;
 if(r.left<rect.left+edge||r.right>rect.right-edge||r.top<rect.top+edge||r.bottom>rect.bottom-edge||occupied.some(o=>collides(r,o)))l.el.style.display='none';else occupied.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom+(l.encounter?12:0)});
 }}
 const coach=document.querySelector('.world-instructions');const dismissCoach=()=>{if(coach)coach.hidden=true;try{sessionStorage.setItem('bitequest-coach-dismissed','1')}catch{}};try{if(sessionStorage.getItem('bitequest-coach-dismissed'))dismissCoach()}catch{}
 host.closest('.world-shell').addEventListener('pointerdown',dismissCoach,{once:true});renderer.domElement.addEventListener('keydown',dismissCoach,{once:true});renderer.domElement.addEventListener('wheel',dismissCoach,{once:true});
 function animate(t){if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min((t-lastTime)/1000,.06);lastTime=t;controls.update();if(route.length&&!document.hidden&&!document.querySelector('dialog')?.open){const step=advanceStep(avatar.position,route[0],dt*10);avatar.position.x=step.x;avatar.position.z=step.z;avatar.position.y=step.y;pendingDistance+=step.moved/100;player.position.y=mapTheme.character.groundY+(reducedMotion?0:Math.abs(Math.sin(t*.014))*mapTheme.character.stepLift);player.material.rotation=reducedMotion?0:Math.sin(t*.014)*mapTheme.character.stepTilt;if(step.arrived)route.shift();if(!route.length){destination.visible=false;clearTrail();player.position.y=mapTheme.character.groundY;player.material.rotation=0;}if(t-lastCredit>500||!route.length){bridge.move({x:avatar.position.x,y:avatar.position.z},pendingDistance);pendingDistance=0;lastCredit=t;}}for(const f of floaters){let offset=reducedMotion?0:Math.sin(t*.0015+f.offset)*mapTheme.discovery.floatAmount;f.ball.position.y=f.baseY+offset;f.food.position.y=f.baseY+offset;
 const view=f.ball.position.clone().applyMatrix4(camera.matrixWorldInverse),perPixel=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.max(1,-view.z)/host.clientHeight;const size=THREE.MathUtils.clamp(perPixel*mapTheme.discovery.markerPixels,mapTheme.discovery.markerWorldMin,mapTheme.discovery.markerWorldMax);f.ball.scale.set(size,size,1);f.food.scale.set(size*mapTheme.discovery.foodRatio,size*mapTheme.discovery.foodRatio*(foodArt[f.id]?.aspect??1.5),1);f.lp.copy(f.ball.position);f.lp.y+=size*.7;
}ring.scale.setScalar(reducedMotion?1:1+Math.sin(t*.0015)*.04);const owlView=avatar.position.clone().applyMatrix4(camera.matrixWorldInverse);const owlPerPixel=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.max(1,-owlView.z)/host.clientHeight;const owlSize=THREE.MathUtils.clamp(owlPerPixel*mapTheme.character.minPixels,mapTheme.character.height,mapTheme.character.maxHeight);player.scale.set(owlSize,owlSize,1);layoutLabels(t);const fogOffset=Math.max(0,camera.position.distanceTo(controls.target)-mapTheme.buildings.fogCameraReference);if(scene.fog){scene.fog.near=mapTheme.buildings.fogNear+fogOffset;scene.fog.far=mapTheme.buildings.fogFar+fogOffset;scene.traverse(o=>{if(o.userData.mapOutline){o.material.uniforms.uFogNear.value=scene.fog.near;o.material.uniforms.uFogFar.value=scene.fog.far;}});}renderer.render(scene,camera);}frame=requestAnimationFrame(animate);
 window.biteWorld={focus(id){activeLabel=id;const s=bridge.spots.find(s=>s.id===id);if(!s)return;const p=mapPoint(s);controls.target.copy(p);camera.position.copy(p).add(new THREE.Vector3(15,55,62));},recenter(){controls.target.copy(avatar.position);camera.position.copy(avatar.position).add(new THREE.Vector3(30,host.clientWidth<620?72:46,host.clientWidth<620?97:70));},zoom(dir){camera.position.sub(controls.target).multiplyScalar(dir>0?1.15:.85).add(controls.target);},dispose(){disposed=true;if(pendingDistance>0)bridge.move({x:avatar.position.x,y:avatar.position.z},pendingDistance);cancelAnimationFrame(frame);clearTrail();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointercancel',pointerCancel);renderer.domElement.removeEventListener('keydown',keyDown);ro.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.gradientMap?.dispose();m.dispose()}}});atlasSources.forEach(a=>a.texture.dispose());renderer.dispose();labels.forEach(l=>l.el.remove());clusterButtons.forEach(el=>el.remove());clusterButtons.clear();}};
 if(bridge.focusId)window.biteWorld.focus(bridge.focusId);
}
window.addEventListener('bitequest:mount',mount);mount();
