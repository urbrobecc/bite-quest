import * as THREE from './vendor/three.module.js';
import {mapTheme} from './map-theme.js';
// Screen-space ink keeps strokes crisp and independent of device pixel ratio.
export function inkOutline(segments){
 const count=segments.length/6,g=new THREE.InstancedBufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute([0,-1,0,1,-1,0,0,1,0,1,-1,0,1,1,0,0,1,0],3));
 const starts=new Float32Array(count*3),ends=new Float32Array(count*3);for(let i=0;i<count;i++){starts.set(segments.slice(i*6,i*6+3),i*3);ends.set(segments.slice(i*6+3,i*6+6),i*3);}
 g.setAttribute('aStart',new THREE.InstancedBufferAttribute(starts,3));g.setAttribute('aEnd',new THREE.InstancedBufferAttribute(ends,3));g.instanceCount=count;
 const m=new THREE.ShaderMaterial({uniforms:{uResolution:{value:new THREE.Vector2(1000,700)},uWidth:{value:mapTheme.rendering.outlinePixels},uInkNear:{value:mapTheme.buildings.inkFadeNear},uInkFar:{value:mapTheme.buildings.inkFadeFar},uFogNear:{value:mapTheme.buildings.fogNear},uFogFar:{value:mapTheme.buildings.fogFar},uSky:{value:new THREE.Color(mapTheme.colors.skyCyan)},uInk:{value:new THREE.Color(mapTheme.colors.ink)}},vertexShader:`varying float vDepth;attribute vec3 aStart;attribute vec3 aEnd;uniform vec2 uResolution;uniform float uWidth;void main(){vec4 a=projectionMatrix*modelViewMatrix*vec4(aStart,1.);vec4 b=projectionMatrix*modelViewMatrix*vec4(aEnd,1.);vec2 delta=(b.xy/max(b.w,.001)-a.xy/max(a.w,.001))*uResolution;vec2 normal=vec2(-delta.y,delta.x)/max(length(delta),.001);vec4 p=mix(a,b,position.x);p.xy+=normal*position.y*uWidth/uResolution*p.w;p.z-=.0000001*p.w;vDepth=p.w;gl_Position=p;}`,fragmentShader:'varying float vDepth;uniform float uInkNear;uniform float uInkFar;uniform float uFogNear;uniform float uFogFar;uniform vec3 uInk;uniform vec3 uSky;void main(){float fade=smoothstep(uFogNear,uFogFar,vDepth);gl_FragColor=vec4(mix(uInk,uSky,fade),1.-smoothstep(uInkNear,uInkFar,vDepth));\n#include <colorspace_fragment>\n}',transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide});
 // Shader chunks must begin on their own line.
 m.fragmentShader=m.fragmentShader.replace('; #include',';\n#include');
 const lines=new THREE.Mesh(g,m);lines.frustumCulled=false;lines.userData.mapOutline=true;
 return lines;
}
export function resizeOutlines(scene,w,h){scene.traverse(o=>{if(o.userData.mapOutline)o.material.uniforms.uResolution.value.set(w,h)});}
