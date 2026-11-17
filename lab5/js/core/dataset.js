export const WORLD={xmin:-850,ymin:-600,xmax:850,ymax:600};
export function seeded(seed=123456789){let s=seed>>>0;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
export function generateSegments(n,{seed=2026,mode='mixed',world=WORLD}={}){
 const rand=seeded(seed),data=new Float64Array(n*4),w=world.xmax-world.xmin,h=world.ymax-world.ymin;
 const centers=[[-480,-275],[-20,70],[390,260],[260,-320],[-430,250]];
 for(let i=0;i<n;i++){
  let x,y;const t=rand();
  if(mode==='clustered'||(mode==='mixed'&&t<0.64)){
   const c=centers[Math.floor(rand()*centers.length)];x=c[0]+(rand()+rand()+rand()-1.5)*205;y=c[1]+(rand()+rand()+rand()-1.5)*145;
  }else{x=world.xmin+rand()*w;y=world.ymin+rand()*h;}
  const long=rand()<.025,L=long?70+rand()*220:3+rand()*49,ang=rand()*Math.PI*2;
  data[i*4]=x;data[i*4+1]=y;data[i*4+2]=x+L*Math.cos(ang);data[i*4+3]=y+L*Math.sin(ang);
 }
 return data;
}
export const defaultSegments=[
 [-54,-30,62,42],[-68,40,67,-40],[-50,0,61,0],[0,-55,0,50],[-18,-31,-18,35],[-42,39,40,39],
 [-30,-19,-30,-19],[-30,25,-30,25],[-80,-50,-55,-29],[55,35,75,60],[-40,-27,42,26],[-52,28,58,-36],
 [12,14,34,-9],[-28,30,28,-36],[0,45,42,2]
].flat();
export function parseSegmentText(text){
 const tokens=text.replace(/\*[^\n]*/g,' ').trim().split(/\s+/).filter(Boolean).map(Number);
 if(!tokens.length||!tokens.every(Number.isFinite))throw Error('Текст должен содержать только числа и комментарии после *');
 const n=tokens[0];if(!Number.isInteger(n)||n<0||n>1e6)throw Error('Некорректное количество отрезков');
 const needed=1+4*n+4;if(tokens.length<needed)throw Error(`Ожидается ${needed} чисел, получено ${tokens.length}`);
 const arr=new Float64Array(n*4);for(let i=0;i<n*4;i++)arr[i]=tokens[i+1];
 let [xmin,ymin,xmax,ymax]=tokens.slice(1+n*4,needed);if(xmin>=xmax||ymin>=ymax)throw Error('Необходимо Xmin < Xmax и Ymin < Ymax');
 return {data:arr,rect:{xmin,ymin,xmax,ymax}};
}
export function generateExampleText(){const a=defaultSegments;return `${a.length/4}\n${Array.from({length:a.length/4},(_,i)=>a.slice(i*4,i*4+4).join(' ')).join('\n')}\n-30 -24 30 24\n`;}
