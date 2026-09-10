// Screen-space grouping keeps clusters consistent as the map rotates.
export function clusterMarkers(points, radius) {
 const pending=[...points].sort((a,b)=>a.id.localeCompare(b.id)), groups=[];
 while(pending.length){const group=[pending.shift()];for(let i=0;i<group.length;i++){for(let j=pending.length-1;j>=0;j--){if(Math.hypot(group[i].x-pending[j].x,group[i].y-pending[j].y)<=radius)group.push(pending.splice(j,1)[0]);}}groups.push(group.sort((a,b)=>a.id.localeCompare(b.id)));}
 return groups;
}
