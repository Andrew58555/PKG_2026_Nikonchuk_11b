export function drawChart(canvas,series,xKey,yKey,{unit='мс',titleX=''}={}){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);c.fillStyle='#fff';c.fillRect(0,0,w,h);
 if(!series||!series.length){c.fillStyle='#8995a3';c.font='14px system-ui';c.textAlign='center';c.fillText('График появится после измерения',w/2,h/2);c.textAlign='start';return;}
 const left=65,top=16,right=18,bottom=45,plotW=w-left-right,plotH=h-top-bottom;const xs=series.map(x=>x[xKey]),ys=series.map(x=>x[yKey]);let xmin=Math.min(...xs),xmax=Math.max(...xs),ymax=Math.max(...ys)*1.13;
 if(xmax===xmin)xmax=xmin+1;if(ymax<.1)ymax=.1;
 c.lineWidth=1;c.font='12px system-ui';c.strokeStyle='#e2e7eb';c.fillStyle='#667689';for(let i=0;i<=4;i++){const yy=top+plotH*(1-i/4),value=ymax*i/4;c.beginPath();c.moveTo(left,yy);c.lineTo(w-right,yy);c.stroke();c.textAlign='right';c.fillText(value.toFixed(value>20?1:2),left-9,yy+4);}c.textAlign='center';
 for(let i=0;i<series.length;i++){const xx=left+plotW*(xs[i]-xmin)/(xmax-xmin);const num=xs[i],label=num>=10000?(num/1000)+'k':String(num);c.fillText(label,xx,h-bottom+18);}
 c.fillStyle='#8190a0';c.textAlign='left';c.fillText(unit,10,top+3);c.textAlign='center';c.fillText(titleX,w/2,h-7);c.strokeStyle='#2f8a76';c.lineWidth=2.5;c.beginPath();series.forEach((s,i)=>{const x=left+plotW*(s[xKey]-xmin)/(xmax-xmin),y=top+plotH*(1-s[yKey]/ymax);i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();c.fillStyle='#2f8a76';series.forEach(s=>{const x=left+plotW*(s[xKey]-xmin)/(xmax-xmin),y=top+plotH*(1-s[yKey]/ymax);c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();});
}
