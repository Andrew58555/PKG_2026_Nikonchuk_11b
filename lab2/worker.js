// worker.js — каждый Worker является отдельным потоком выполнения.
self.onmessage = async e => {
  if(e.data.type==="parse"){
    const {file,index}=e.data;
    let result;
    try { result=await parseFile(file); }
    catch(err){ result=base(file,"Не удалось разобрать: "+(err.message||"ошибка")); }
    self.postMessage({type:"result",index,result});
  }
};
function base(f,status="OK"){return{name:f.name,fileSize:f.size,format:"UNKNOWN",width:0,height:0,resolution:"—",colorDepth:"—",compression:"—",status,details:""}}
async function read(f,start,len){const end=Math.min(f.size,start+len);return new Uint8Array(await f.slice(start,end).arrayBuffer())}
function u16(a,o,little=true){return little?a[o]|a[o+1]<<8:a[o]<<8|a[o+1]}
function u32(a,o,little=true){return little?(a[o]|a[o+1]<<8|a[o+2]<<16|a[o+3]*16777216):((a[o]*16777216)>>>0)|(a[o+1]<<16)|(a[o+2]<<8)|a[o+3]}
function str(a,o,n){return new TextDecoder().decode(a.slice(o,o+n))}
function need(ok,msg){if(!ok)throw Error(msg)}
async function parseFile(f){
  const r=base(f); const h=await read(f,0,16); if(h.length<2)return r;
  if(h[0]===0x89&&h[1]===0x50&&h[2]===0x4e&&h[3]===0x47)return parsePNG(f,r);
  if(h[0]===0xff&&h[1]===0xd8)return parseJPEG(f,r);
  if(h[0]===0x47&&h[1]===0x49&&h[2]===0x46)return parseGIF(f,r);
  if(h[0]===0x42&&h[1]===0x4d)return parseBMP(f,r);
  if((h[0]===0x49&&h[1]===0x49&&h[2]===42&&h[3]===0)||(h[0]===0x4d&&h[1]===0x4d&&h[2]===0&&h[3]===42))return parseTIFF(f,r);
  if(h[0]===0x0a&&h.length>=128)return parsePCX(f,r);
  return {...r,status:"Файл поврежден",details:"Неизвестная сигнатура / подмена расширения"};
}

// PNG: signature + IHDR + pHYs + IEND; chunk boundaries are validated.
async function parsePNG(f,r){
  r.format="PNG"; const a=await read(f,0,Math.min(f.size,1024*1024)); need(a.length>=33,"Слишком короткий PNG");
  const sig=[137,80,78,71,13,10,26,10];need(sig.every((v,i)=>a[i]===v),"Неверная PNG сигнатура");
  let p=8, phys=null, ihdr=null;
  // Header chunks are inspected from the beginning; IEND is validated at EOF.
  while(p+12<=a.length){
    const len=u32(a,p,false); const type=str(a,p+4,4);
    need(len<=f.size && p+12+len<=a.length,"Повреждённая структура PNG в заголовке");
    if(type==="IHDR"){need(len===13,"Некорректный IHDR");ihdr=a.slice(p+8,p+21)}
    if(type==="pHYs"&&len===9)phys=a.slice(p+8,p+17);
    if(type==="IEND")break;
    p+=12+len;
  }
  const tail=await read(f,Math.max(0,f.size-12),12);
  need(ihdr,"Отсутствует IHDR");
  need(tail.length===12 && tail[4]===73&&tail[5]===69&&tail[6]===78&&tail[7]===68,"Отсутствует IEND в конце PNG");
  r.width=u32(ihdr,0,false);r.height=u32(ihdr,4,false);const bit=ihdr[8],ct=ihdr[9];
  const channels={0:1,2:3,3:1,4:2,6:4}[ct]||0;r.colorDepth=bit+" bit"+(channels?" ("+channels+" канал"+(channels>1?"а":"")+")":"");
  r.compression=({0:"Deflate (zlib)",1:"неизвестно"}[ihdr[10]]||"неизвестно")+"; фильтрация: "+ihdr[11]+", interlace: "+ihdr[12];
  if(phys){const x=u32(phys,0,false),y=u32(phys,4,false),unit=phys[8];r.resolution=unit===1?`${Math.round(x*0.0254)} × ${Math.round(y*0.0254)} dpi`:`${x} × ${y} px/m`}
  r.details=`Color type ${ct}; bit depth ${bit}; IEND найден`;
  return r;
}

// JPEG: SOF gives geometry/precision, JFIF/EXIF may give DPI. EOI is mandatory.
async function parseJPEG(f,r){
  r.format="JPEG";let pos=2, found=false, eoi=false, dpiX=0,dpiY=0; const head=await read(f,0,Math.min(f.size,1024*1024));
  need(head[0]===255&&head[1]===216,"Неверная JPEG сигнатура");
  while(pos+3<head.length){
    while(pos<head.length&&head[pos]!==255)pos++;
    if(pos+1>=head.length)break; while(pos<head.length&&head[pos]===255)pos++;
    const marker=head[pos++]; if(marker===0xd9){eoi=true;break} if(marker===0xda)break;
    if(marker===0xd8||marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
    need(pos+2<=head.length,"Неполный JPEG marker");const len=u16(head,pos,false);need(len>=2&&pos+len<=head.length,"Повреждённый JPEG segment");
    if(marker>=0xc0&&marker<=0xc3||marker>=0xc5&&marker<=0xc7||marker>=0xc9&&marker<=0xcb||marker>=0xcd&&marker<=0xcf){
      const precision=head[pos+2],h=u16(head,pos+3,false),w=u16(head,pos+5,false),comps=head[pos+7];
      r.width=w;r.height=h;r.colorDepth=precision+" bit на компоненту ("+comps+" компонент)";
      found=true;
    }
    if(marker===0xe0&&len>=16&&str(head,pos+2,5)==="JFIF\0"){const units=head[pos+9],x=u16(head,pos+10,false),y=u16(head,pos+12,false);if(units===1){dpiX=x;dpiY=y}else if(units===2){dpiX=Math.round(x*2.54);dpiY=Math.round(y*2.54)}}
    pos+=len;
  }
  // EOI can be beyond the first 1 MiB, so check only the final bytes as required.
  const tail=await read(f,Math.max(0,f.size-2),2);eoi=eoi||(tail.length===2&&tail[0]===255&&tail[1]===217);
  need(found,"JPEG SOF не найден");need(eoi,"Отсутствует маркер EOI (FF D9)");
  r.resolution=dpiX?`${dpiX} × ${dpiY} dpi`:"не задано";r.compression="JPEG DCT";
  r.details="SOF + JFIF анализ; EOI подтверждён";
  return r;
}

async function parseGIF(f,r){
  r.format="GIF";const a=await read(f,0,13);need(a.length>=13&&((str(a,0,6)==="GIF87a")||(str(a,0,6)==="GIF89a")),"Неверный GIF заголовок");
  r.width=u16(a,6,true);r.height=u16(a,8,true);const packed=a[10],gct=(packed&128)!==0,size=2**((packed&7)+1);
  r.colorDepth=((packed&7)+1)+" bit (таблица "+(gct?size:"без глобальной таблицы")+" цветов)";
  r.compression="LZW";r.resolution="—";
  const tail=await read(f,Math.max(0,f.size-1),1);need(tail[0]===0x3b,"Отсутствует GIF Trailer");
  r.details=`Версия ${str(a,0,6)}; глобальная палитра: ${gct?"да":"нет"}; LZW`;
  return r;
}

async function parseBMP(f,r){
  r.format="BMP";const a=await read(f,0,64);need(a.length>=54&&a[0]===66&&a[1]===77,"Неверный BMP заголовок");
  const bfSize=u32(a,2,true),off=u32(a,10,true),dib=u32(a,14,true);need(dib>=40,"Неподдерживаемый DIB");
  const w=u32(a,18,true), hs=u32(a,22,true), planes=u16(a,26,true),bpp=u16(a,28,true),comp=u32(a,30,true),xppm=u32(a,38,true),yppm=u32(a,42,true);
  need(w>0&&hs>0&&off<f.size,"Некорректные размеры/offset");r.width=w;r.height=hs;r.colorDepth=bpp+" bit";
  const cm={0:"BI_RGB (без сжатия)",1:"BI_RLE8",2:"BI_RLE4",3:"BI_BITFIELDS",4:"BI_JPEG",5:"BI_PNG"};r.compression=cm[comp]||("Код "+comp);
  r.resolution=`${Math.round(xppm/39.3701)} × ${Math.round(yppm/39.3701)} dpi`;
  const palette=(bpp<=8)?2**bpp:0;r.details=`DIB ${dib} B; planes=${planes}; палитра до ${palette||"—"} цветов; pixel offset=${off}`;
  need(bfSize===0||bfSize<=f.size,"Размер в заголовке больше файла");
  return r;
}

async function parsePCX(f,r){
  r.format="PCX";const a=await read(f,0,128);need(a.length>=128&&a[0]===10&&a[2]===1&&a[3]===8,"Неподдерживаемый PCX заголовок");
  const xmin=u16(a,4,true),ymin=u16(a,6,true),xmax=u16(a,8,true),ymax=u16(a,10,true),hdpi=u16(a,12,true),vdpi=u16(a,14,true);
  const planes=a[65],bpl=u16(a,66,true);r.width=xmax-xmin+1;r.height=ymax-ymin+1;r.resolution=`${hdpi} × ${vdpi} dpi`;r.colorDepth=(a[3]*planes)+" bit ("+planes+" plane"+(planes>1?"s":"")+")";r.compression="RLE";
  need(r.width>0&&r.height>0,"Некорректные размеры PCX");
  r.details=`Version ${a[1]}; encoding ${a[2]}; bytes/line=${bpl}`;
  return r;
}

// TIFF: classic TIFF IFD parser. Reads only header + IFD + referenced scalar/array values.
async function parseTIFF(f,r){
  r.format="TIFF";const h=await read(f,0,8);need(h.length===8,"Короткий TIFF");const little=h[0]===0x49&&h[1]===0x49;
  need(little||(h[0]===0x4d&&h[1]===0x4d),"Неверный byte order");need(u16(h,2,little)===42,"Поддерживается Classic TIFF (magic 42)");
  const ifdOff=u32(h,4,little);need(ifdOff>=8&&ifdOff+2<=f.size,"Некорректный IFD offset");
  const nbuf=await read(f,ifdOff,2);const n=u16(nbuf,0,little);need(ifdOff+2+n*12+4<=f.size,"IFD выходит за пределы файла");
  const a=await read(f,ifdOff,2+n*12+4),tags={};
  const types={1:1,2:1,3:2,4:4,5:8,6:1,7:1,8:2,9:4,10:8,11:4,12:8};
  for(let i=0;i<n;i++){const o=2+i*12,tag=u16(a,o,little),type=u16(a,o+2,little),count=u32(a,o+4,little),unit=types[type]||0,total=unit*count; if(!unit)continue;
    let off=total<=4?o+8:u32(a,o+8,little); need(total<=4||off+total<=f.size,"TIFF tag выходит за файл");
    let b=total<=4?a.slice(o+8,o+8+total):await read(f,off,total);
    tags[tag]={type,count,value:readTIFFValue(b,type,count,little)};
  }
  const get=t=>tags[t]?.value;
  r.width=Number(get(256)||0);r.height=Number(get(257)||0);need(r.width>0&&r.height>0,"TIFF ImageWidth/ImageLength отсутствуют");
  const bits=get(258);const spp=Number(get(277)||1);r.colorDepth=(Array.isArray(bits)?bits.join("+"):bits)+" bit"+(spp>1?" × "+spp+" samples":"");
  const comp=get(259);const cmap={1:"None (1)",2:"CCITT Group 3",3:"CCITT Group 3 Fax",4:"CCITT Group 4 Fax",5:"LZW",6:"JPEG",7:"JPEG",8:"Deflate",32773:"PackBits"};r.compression=cmap[comp]||("TIFF compression "+comp);
  const unit=get(296),xr=get(282),yr=get(283);if(xr&&yr){const mul=unit===3?2.54:1;r.resolution=`${Math.round(xr/mul)} × ${Math.round(yr/mul)} ${unit===3?"dpcm":"dpi"}`}
  r.details=`IFD entries: ${n}; PhotometricInterpretation=${get(262)??"—"}; SamplesPerPixel=${spp}; Compression tag 259`;
  return r;
}
function readTIFFValue(b,type,count,little){
  const one=()=>type===1||type===2||type===6||type===7?b[0]:type===3?u16(b,0,little):type===4?u32(b,0,little):type===5?u32(b,0,little)/(u32(b,4,little)||1):type===8?u16(b,0,little):type===9?(u32(b,0,little)|0):type===10?(u32(b,0,little)/(u32(b,4,little)||1)):type===11?new DataView(b.buffer,b.byteOffset,4).getFloat32(0,!little):new DataView(b.buffer,b.byteOffset,8).getFloat64(0,!little);
  if(count===1)return one();
  const unit={1:1,2:1,3:2,4:4,5:8,6:1,7:1,8:2,9:4,10:8,11:4,12:8}[type]||1, out=[];for(let i=0;i<count;i++)out.push(readTIFFValue(b.slice(i*unit,(i+1)*unit),type,1,little));return out;
}

// Сообщаем главному потоку, что Worker загружен и готов получать задания.
self.postMessage({type:"ready"});
