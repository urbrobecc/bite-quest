export const mapTheme = Object.freeze({
  colors: {
    skyCyan:'#B5D9DE', skyCyanDeep:'#2C9CC4', paperCream:'#F4E9D8', paperWarm:'#E8D3B0',
    buildingA:'#C69D91', buildingB:'#9CB9AB', buildingC:'#D3BC83', buildingD:'#B8B3C3', buildingE:'#C6C8B2', accentRed:'#E0473E',
    accentMagenta:'#D64C8B', accentOrange:'#F08A3C', taxiYellow:'#FFD11A', ink:'#1A1A1A', inkSoft:'#3A3330'
  },
  font: '"Zen Maru Gothic", ui-rounded, system-ui, sans-serif',
  emojiFont:'"Apple Color Emoji", "Segoe UI Emoji", sans-serif',
  fontUrl:'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap',
  textures:{halftone:true,grain:true,vignette:true,halftoneOpacity:.05,grainOpacity:.018,vignetteOpacity:.07,pitch:5,grainSize:128},
  rendering:{outlinePixels:.85,wallShade:.84,shadows:false,fog:true,markerHighlight:true,clouds:false},
  alpha:{ring:.75,aura:.12,stem:.7},
  facade:{frame:.45,mullion:.25,course:.15,shop:.45,brick:0},
  buildingPalette:['buildingA','buildingB','buildingC','buildingD','buildingE'],
  buildings:{minHeightMeters:18,minAreaMeters:150,detailNear:35,detailFar:95,fogNear:95,fogFar:285,fogCameraReference:80,inkFadeNear:70,inkFadeFar:180},
  labels:{districtMinDistance:115,streetMaxDistance:110,minorMaxDistance:55,poiMaxDistance:125,nearbyCount:2,gap:8,edge:12,refreshMs:100,majorStreets:['Canal Street','Delancey Street','Bowery','East Broadway']},
  ui:{safeMargin:16,cardRadius:14,scrimOpacity:.8,borderOpacity:.35,shadowOpacity:.12,coachOpacity:.95,mobileBreakpoint:620},
  character:{height:6.3,minPixels:52,maxHeight:11,occludedOpacity:.92,groundY:.28,stepLift:.11,stepTilt:.055,shadowOpacity:.2,ringRadius:2.2},
  discovery:{markerPixels:64,markerWorldMin:4.5,markerWorldMax:15,foodRatio:.82,roofLift:3.5,floatAmount:.12,atlasColumns:3,atlasRows:2},
  clusters:{minDistance:90,radiusPixels:86,width:116,height:64,focusDistance:55,previewCount:2},
  markers:['taxiYellow','accentRed'],
});
const kebab=s=>s.replace(/[A-Z]/g,m=>'-'+m.toLowerCase());
if(typeof document!=='undefined'){
 const root=document.documentElement;
 for(const [key,value] of Object.entries(mapTheme.colors))root.style.setProperty('--'+kebab(key),value);
 root.style.setProperty('--map-font',mapTheme.font);root.style.setProperty('--map-emoji-font',mapTheme.emojiFont);
 for(const key of ['halftoneOpacity','grainOpacity','vignetteOpacity'])root.style.setProperty('--'+kebab(key),mapTheme.textures[key]);
 root.style.setProperty('--halftone-pitch',mapTheme.textures.pitch+'px');
 root.style.setProperty('--halftone-display',mapTheme.textures.halftone?'block':'none');
 root.style.setProperty('--grain-display',mapTheme.textures.grain?'block':'none');
 root.style.setProperty('--vignette-display',mapTheme.textures.vignette?'block':'none');
 for(const [key,value] of Object.entries(mapTheme.ui))root.style.setProperty('--ui-'+kebab(key),value+(typeof value==='number'&&['safeMargin','cardRadius'].includes(key)?'px':''));
 const link=document.createElement('link');link.rel='stylesheet';link.href=mapTheme.fontUrl;document.head.append(link);
 if(mapTheme.textures.grain){const c=document.createElement('canvas');c.width=c.height=mapTheme.textures.grainSize;const ctx=c.getContext('2d'),data=ctx.createImageData(c.width,c.height);let seed=127;const ink=mapTheme.colors.ink.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16));for(let i=0;i<data.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;data.data[i]=ink[0];data.data[i+1]=ink[1];data.data[i+2]=ink[2];data.data[i+3]=seed%256;}ctx.putImageData(data,0,0);root.style.setProperty('--paper-noise',`url("${c.toDataURL()}")`);}
}
