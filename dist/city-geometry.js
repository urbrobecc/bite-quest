import * as THREE from './vendor/three.module.js';
import {mapTheme} from './map-theme.js';
import {inkOutline} from './map-outlines.js';
const C=mapTheme.colors;
export function shouldRenderBuilding(b){const r=b.rings[0];const area=Math.abs(r.reduce((sum,p,i)=>{const q=r[(i+1)%r.length];return sum+p[0]*q[1]-q[0]*p[1]},0))*50;return Boolean(b.landmark||b.tags?.landmark)||(b.h>=mapTheme.buildings.minHeightMeters&&area>=mapTheme.buildings.minAreaMeters);}
export function buildCity(scene,city){
 const material=(color)=>new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide});
 const landMat=material(C.paperCream),parkMat=material(C.buildingB),roofMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
 const wallsMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
 wallsMat.onBeforeCompile=shader=>{shader.uniforms.uInk={value:new THREE.Color(C.ink)};shader.uniforms.uGlass={value:new THREE.Color(C.skyCyanDeep)};shader.uniforms.uGlassLight={value:new THREE.Color(C.skyCyan)};shader.uniforms.uShop={value:new THREE.Color(C.inkSoft)};shader.uniforms.uShade={value:mapTheme.rendering.wallShade};shader.vertexShader='varying vec2 vBuildingUv;varying vec3 vMapNormal;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBuildingUv=uv;vMapNormal=normal;');shader.fragmentShader='varying vec2 vBuildingUv;varying vec3 vMapNormal;uniform vec3 uInk;uniform vec3 uGlass;uniform vec3 uGlassLight;uniform vec3 uShop;uniform float uShade;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec3 flatColor=diffuseColor.rgb;
 diffuseColor.rgb*=mix(uShade,1.,step(0.,vMapNormal.x+vMapNormal.z*.4));
 vec2 grid=fract(vBuildingUv/vec2(3.1,3.25));
 float aboveShop=step(3.0,vBuildingUv.y);
 float frame=step(.19,grid.x)*step(grid.x,.76)*step(.18,grid.y)*step(grid.y,.85)*aboveShop;
 float pane=step(.25,grid.x)*step(grid.x,.69)*step(.24,grid.y)*step(grid.y,.78)*aboveShop;
 vec3 ink=uInk;
 vec3 glass=mix(uGlass,uGlassLight,step(.48,grid.x));
 diffuseColor.rgb=mix(diffuseColor.rgb,ink,frame*${mapTheme.facade.frame});
 diffuseColor.rgb=mix(diffuseColor.rgb,glass,pane);
 float mullion=(1.-step(.025,abs(grid.x-.47)))*pane;
 diffuseColor.rgb=mix(diffuseColor.rgb,ink,mullion*${mapTheme.facade.mullion});
 float course=step(.968,grid.y)*aboveShop;
 diffuseColor.rgb=mix(diffuseColor.rgb,ink,course*${mapTheme.facade.course});
 float brickLine=(step(.97,fract(vBuildingUv.y/.24))+step(.97,fract(vBuildingUv.x/.57+floor(vBuildingUv.y/.24)*.5)))*${mapTheme.facade.brick.toFixed(3)};
 diffuseColor.rgb*=1.-clamp(brickLine,0.,.12)*(1.-frame);
 float shop=step(.15,grid.x)*step(grid.x,.88)*(1.-aboveShop)*step(.25,vBuildingUv.y);
 diffuseColor.rgb=mix(diffuseColor.rgb,uShop,shop*${mapTheme.facade.shop});
 float detail=1.-smoothstep(${mapTheme.buildings.detailNear.toFixed(2)},${mapTheme.buildings.detailFar.toFixed(2)},vFogDepth);
 diffuseColor.rgb=mix(flatColor,diffuseColor.rgb,detail);
`);};
 function flat(rings,mat,y){const outer=rings[0].map(p=>new THREE.Vector2(p[0],-p[1]));const shape=new THREE.Shape(outer);for(const ring of rings.slice(1))shape.holes.push(new THREE.Path(ring.map(p=>new THREE.Vector2(p[0],-p[1]))));const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat);m.position.y=y;scene.add(m);const segments=[];for(const ring of rings)for(let i=1;i<ring.length;i++)segments.push(ring[i-1][0],y+.005,ring[i-1][1],ring[i][0],y+.005,ring[i][1]);scene.add(inkOutline(segments));return m;}
 const lands=city.land.map(r=>flat([r],landMat,.03));for(const p of city.parks)flat([p.ring],parkMat,.09);
 const rp=[],rn=[],rc=[],roadInk=[];const roadColor=new THREE.Color(C.taxiYellow),minorColor=new THREE.Color(C.paperCream),inkColor=new THREE.Color(C.ink);
 function roadTri(a,b,c,col){rp.push(...a,...b,...c);rn.push(0,1,0,0,1,0,0,1,0);for(let i=0;i<3;i++)rc.push(col.r,col.g,col.b);}
 for(const r of city.roads){const narrow=['footway','path','cycleway','pedestrian'].includes(r.kind),major=['primary','secondary','trunk'].includes(r.kind);const w=narrow?.22:major?1.2:.73;const y=r.bridge?.65:.13;const col=major?roadColor:minorColor;for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01)continue;for(const [width,layer,color] of [[w+.12,y,inkColor],[w,y+.008,col]]){const ox=-dz/len*width/2,oz=dx/len*width/2;const aa=[a[0]+ox,layer,a[1]+oz],ab=[a[0]-ox,layer,a[1]-oz],ba=[b[0]+ox,layer,b[1]+oz],bb=[b[0]-ox,layer,b[1]-oz];roadTri(aa,ba,ab,color);roadTri(ba,bb,ab,color);}const ox=-dz/len*w/2,oz=dx/len*w/2;roadInk.push(a[0]+ox,y+.012,a[1]+oz,b[0]+ox,y+.012,b[1]+oz,a[0]-ox,y+.012,a[1]-oz,b[0]-ox,y+.012,b[1]-oz);}}
 function buffer(p,n,c,uv){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));if(uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeBoundingSphere();return g;}
 const roadsMesh=new THREE.Mesh(buffer(rp,rn,rc),new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));scene.add(roadsMesh);scene.add(inkOutline(roadInk));
 const wp=[],wn=[],wc=[],wu=[],tp=[],tn=[],tc=[],inkLines=[];
 let rendered=0;
 const palette=mapTheme.buildingPalette.map(key=>C[key]);
 for(const [i,b] of city.buildings.entries()){
   if(!shouldRenderBuilding(b))continue;rendered++;
   const hash=String(b.id??i).split('').reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,0);
   const h=b.h*.1;const color=new THREE.Color(palette[hash%palette.length]);const roof=color.clone();let rings=b.rings.map(r=>r.slice(0,-1));if(rings[0].length<3)continue;
   const contour=rings[0].map(p=>new THREE.Vector2(...p)),holes=rings.slice(1).map(r=>r.map(p=>new THREE.Vector2(...p))),all=rings.flat();
   for(const tri of THREE.ShapeUtils.triangulateShape(contour,holes)){for(const idx of [tri[0],tri[2],tri[1]]){tp.push(all[idx][0],h+.16,all[idx][1]);tn.push(0,1,0);tc.push(roof.r,roof.g,roof.b);}}
   for(const [ri,r] of rings.entries()){let area=0;for(let k=0;k<r.length;k++){let a=r[k],b=r[(k+1)%r.length];area+=a[0]*b[1]-b[0]*a[1];}let direction=(area>0?1:-1)*(ri? -1:1);
     for(let k=0;k<r.length;k++){const a=r[k],b=r[(k+1)%r.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01)continue;inkLines.push(a[0],h+.18,a[1],b[0],h+.18,b[1]);if(ri===0&&len>.12)inkLines.push(a[0],.16,a[1],a[0],h+.17,a[1]);const normal=[direction*dz/len,0,-direction*dx/len],verts=[[a[0],.16,a[1]],[b[0],h+.16,b[1]],[b[0],.16,b[1]],[a[0],.16,a[1]],[a[0],h+.16,a[1]],[b[0],h+.16,b[1]]],uv=[[0,0],[len*10,h*10],[len*10,0],[0,0],[0,h*10],[len*10,h*10]];
       for(let v=0;v<6;v++){wp.push(...verts[v]);wn.push(...normal);wc.push(color.r,color.g,color.b);wu.push(...uv[v]);}
     }
   }
 }
 const walls=new THREE.Mesh(buffer(wp,wn,wc,wu),wallsMat),roofs=new THREE.Mesh(buffer(tp,tn,tc),roofMat);const buildings=new THREE.Group();buildings.add(walls,roofs);buildings.add(inkOutline(inkLines));scene.add(buildings);
 return {lands,buildings,stats:{buildings:rendered,totalBuildings:city.buildings.length,vertices:wp.length/3+tp.length/3}};
}
