/* Only foreground GPS samples advance lunchboxes. Map movement stays separate. */
(function(){
 const config={maxAccuracyM:30,minStepM:8,maxSpeedMps:2.5,maxGapMs:30000,art:'school-lunchbox.png'};
 function meters(a,b){const r=Math.PI/180,dlat=(b.latitude-a.latitude)*r,dlon=(b.longitude-a.longitude)*r,x=Math.sin(dlat/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(dlon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
 function migrate(state){if(!Number.isFinite(state.walkingKm)||state.walkingKm<0)state.walkingKm=0;state.boxes.forEach(b=>{if(!Number.isFinite(b.walkingStart))b.walkingStart=state.walkingKm;});}
 function progress(state,box){return Math.max(0,Math.min(box.tier,state.walkingKm-box.walkingStart));}
 function tracker(){let last=null;return {reset(){last=null},sample(p){const c=p.coords;if(!c||![c.latitude,c.longitude,c.accuracy,p.timestamp].every(Number.isFinite)||c.accuracy<0||c.accuracy>config.maxAccuracyM){last=null;return 0}const next={latitude:c.latitude,longitude:c.longitude,time:p.timestamp};if(!last){last=next;return 0}const ms=next.time-last.time;if(ms<=0)return 0;const d=meters(last,next);if(ms>config.maxGapMs||d/(ms/1000)>config.maxSpeedMps||(c.speed!=null&&c.speed>config.maxSpeedMps)){last=next;return 0}if(d<config.minStepM)return 0;last=next;return d/1000;}};}
 window.BITE_WALKING={config,migrate,progress,tracker};
})();
