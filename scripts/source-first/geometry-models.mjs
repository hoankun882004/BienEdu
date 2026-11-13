// Source relationships are not pixel measurements. All free coordinates below
// belong to explicitly labelled constrained schematics, never source exercises.
const allReal={min:'-inf',max:'inf',minIncluded:false,maxIncluded:false};
const positive={min:0,max:'inf',minIncluded:false,maxIncluded:false};
export function geometryConstruction(key){
  let dimension=2,classification='GEOMETRY_2D',description='',exact=false;
  const objects=[],relationships=[],formulae=[];
  let views;
  const o=(type,id,data,label='',color='blue')=>{objects.push({id,type,view:'main',label,color,...data});return id;};
  const p=(id,coords,label=id,visible=true)=>o('point',id,{coords,visible},label);
  const s=(id,from,to,label='',color='blue',dashed=false)=>o('segment',id,{from,to,dashed},label,color);
  const v=(id,from,to,label=id)=>o('vector',id,{from,to},label);
  const l=(id,from,to,label=id)=>o('line',id,{from,to},label);
  const polygon=(id,vertices,label='',color='blue')=>o('polygon',id,{vertices},label,color);
  const plane=(id,origin,u=[1,0,0],w=[0,1,0],extent=[-3,3,-2,2],label='(P)')=>o('plane',id,{origin,u,v:w,extent},label);
  const circle=(id,center,radius,label='',normal)=>o('circle',id,{center,radius,...(normal?{normal}:{})},label);
  const sphere=(id,center,radius)=>o('sphere',id,{center,radius});
  const relation=(type,data)=>relationships.push({type,...data});
  const f=(id,expression,label,domain=allReal,view='main')=>o('function',id,{expression,domain,view},label,id.endsWith('Fall')?'teal':'blue');
  const annotation=(id,coords,label)=>{p(id+'Anchor',coords,'',false);o('annotation',id,{at:id+'Anchor'},label);};
  const spatial=()=>{dimension=3;classification='GEOMETRY_3D';};
  const box=(orthogonal=false)=>{
    const u=[3,0,0],w=orthogonal?[0,2,0]:[1,2,0],t=orthogonal?[0,0,2]:[.5,.5,2];
    const plus=(...xs)=>xs.reduce((a,b)=>a.map((x,i)=>x+b[i]),[0,0,0]);
    for(const [id,c,label]of [['A',[0,0,0],'A'],['B',u,'B'],['D',w,'D'],['C',plus(u,w),'C'],['Ap',t,'A′'],['Bp',plus(u,t),'B′'],['Dp',plus(w,t),'D′'],['Cp',plus(u,w,t),'C′']])p(id,c,label);
    for(const [id,vertices]of [['base',['A','B','C','D']],['top',['Ap','Bp','Cp','Dp']],['side',['B','C','Cp','Bp']]])polygon(id,vertices);
    for(const [a,b]of [['A','Ap'],['D','Dp'],['A','B'],['A','D'],['Ap','Bp'],['Ap','Dp']])s(a+b,a,b);
    s('BC','B','C');s('DC','D','C');s('BBp','B','Bp');
    relation('parallel',{a:'AB',b:'ApBp'});relation('parallel',{a:'AD',b:'BC'});relation('parallel',{a:'AAp',b:'BBp'});
    if(orthogonal){relation('perpendicular',{a:'AB',b:'AD'});relation('perpendicular',{a:'AB',b:'AAp'});relation('perpendicular',{a:'AD',b:'AAp'});}
  };
  const skew=()=>{spatial();p('H',[0,0,0]);p('K',[0,0,2]);p('U',[2,0,0],'',false);p('V',[0,2,2],'',false);l('d1','H','U','d₁');l('d2','K','V','d₂');s('HK','H','K','HK','amber',true);relation('perpendicular',{a:'HK',b:'d1'});relation('perpendicular',{a:'HK',b:'d2'});};
  switch(key){
    case '13.6':
      exact=true;description='Hai miền tam giác của đồ thị: miền trên Ox có đáy [0,2], cao 3; miền dưới có đáy [2,5], cao 2. Không nối thành một hàm liên tục tại x=2.';
      for(const [id,c]of [['O',[0,0]],['T',[2,3]],['J',[2,0]],['N',[5,0]],['B',[5,-2]]])p(id,c,'',false);
      polygon('upper',['O','J','T'],'','blue');polygon('lower',['J','N','B'],'','amber');
      s('rise','O','T');s('fall','J','B');relation('area',{polygon:'upper',value:3});relation('area',{polygon:'lower',value:3});
      annotation('positiveArea',[1.25,.7],'S+ = 3');annotation('negativeArea',[3.5,-.5],'S− = 3');
      formulae.push(String.raw`S_+=\frac12\times2\times3=3`,String.raw`S_-=\frac12\times3\times2=3`);
      views=[{id:'main',bounds:[[-.6,5.8],[-2.8,3.8]],axes:true,title:'Diện tích đại số — hai miền riêng biệt'}];break;
    case 'CD08-CD11':
      exact=true;classification='FUNCTION_GRAPH';description='Đồ thị của y=2^x, y=(1/2)^x và y=log₂x, y=log₁/₂x. Lôgarit chỉ được vẽ trên x>0.';
      views=[{id:'exponential',bounds:[[-3.5,3.5],[-.5,6]],axes:true,title:'Hàm số mũ'},{id:'logarithmic',bounds:[[-.4,5.5],[-4,4]],axes:true,title:'Hàm số lôgarit'}];
      f('expRise','2^x','y = 2ˣ',allReal,'exponential');f('expFall','(1/2)^x','y = (1/2)ˣ',allReal,'exponential');
      f('logRise','ln(x)/ln(2)','y = log₂x',positive,'logarithmic');f('logFall','ln(x)/ln(1/2)','y = log₁/₂x',positive,'logarithmic');
      // Exact evaluations are verified offline alongside the plotted domains.
      p('origin',[0,0],'',false);p('one',[1,0],'',false);s('unit','origin','one');relation('length',{a:'origin',b:'one',value:1});
      objects.filter(x=>x.view==='main').forEach(x=>x.view='exponential');
      formulae.push(String.raw`y=2^x,\quad y=(1/2)^x`,String.raw`y=\log_2x,\quad y=\log_{1/2}x,\quad x>0`);break;
    case '28.1':
      classification='VECTOR_DIAGRAM';description='Quy tắc hình bình hành: hai vectơ u, v cùng gốc O và vectơ tổng u+v.';
      p('O',[0,0]);p('U',[3,0],'',false);p('V',[1,2],'',false);p('W',[4,2],'',false);v('u','O','U','u');v('v','O','V','v');v('sum','O','W','u + v');s('sideU','V','W','','muted',true);s('sideV','U','W','','muted',true);
      relation('vectorSum',{first:'u',second:'v',result:'sum'});formulae.push(String.raw`\overrightarrow{AB}+\overrightarrow{BC}=\overrightarrow{AC}`);break;
    case '28.7':
      classification='VECTOR_DIAGRAM';description='Góc θ giữa hai vectơ có cùng gốc; H là hình chiếu đầu mút của v lên hướng u. Góc vectơ không lấy trị tuyệt đối tích vô hướng.';
      p('O',[0,0],'',false);p('U',[3,0],'',false);p('V',[1,2],'',false);p('H',[1,0]);v('u','O','U','u');v('v','O','V','v');s('projection','V','H','','muted',true);relation('perpendicular',{a:'projection',b:'u'});formulae.push(String.raw`\cos\theta=\frac{u\cdot v}{|u||v|},\quad0\le\theta\le\pi`);break;
    case '28.8':spatial();classification='SPATIAL_FIGURE';description='Hình hộp xiên ABCD.A′B′C′D′: các cạnh đối song song. Không giả thiết các cạnh kề vuông góc.';box();break;
    case '29.1':
      spatial();classification='COORDINATE_SYSTEM';description='Hệ trục Oxyz và điểm M(x;y;z); H là hình chiếu M trên Oxy. Tọa độ dùng để dựng hình không phải số liệu đề bài.';
      p('O',[0,0,0]);p('M',[2,1.5,2.5],'M(x; y; z)');p('H',[2,1.5,0]);s('MH','M','H','','muted',true);p('basis',[1,0,0],'',false);s('xDirection','O','basis');plane('P','O',[1,0,0],[0,1,0],[-3,3,-3,3],'Oxy');relation('pointOnPlane',{point:'H',plane:'P'});relation('perpendicular',{a:'MH',b:'xDirection'});break;
    case '29.3':
      description='Trung điểm I của đoạn AB.';p('A',[-3,-1]);p('B',[3,1]);p('I',[0,0]);s('AB','A','B');relation('midpoint',{point:'I',a:'A',b:'B'});formulae.push(String.raw`I=\frac{A+B}{2}`);break;
    case '29.4':
      description='G là trọng tâm tam giác ABC, I là trung điểm BC; AG:GI=2:1.';
      p('A',[0,3]);p('B',[-3,-1.5]);p('C',[3,-1.5]);p('I',[0,-1.5]);p('G',[0,0]);polygon('triangle',['A','B','C']);s('median','A','I');s('AG','A','G');s('GI','G','I');relation('midpoint',{point:'I',a:'B',b:'C'});relation('centroid',{point:'G',vertices:['A','B','C']});relation('ratio',{first:'AG',second:'GI',value:2});formulae.push(String.raw`AG:GI=2:1`);break;
    case '29.5':
      spatial();description='M và M′ đối xứng qua mặt phẳng (P), H là trung điểm MM′ và chân vuông góc.';
      p('O',[0,0,0],'',false);plane('P','O');p('M',[1,1,2]);p('Mp',[1,1,-2],'M′');p('H',[1,1,0]);s('mirrorSegment','M','Mp','','amber',true);relation('reflection',{point:'M',image:'Mp',plane:'P'});relation('midpoint',{point:'H',a:'M',b:'Mp'});break;
    case '30.1':
      spatial();description='Vectơ pháp tuyến n tại A vuông góc mặt phẳng (P). Điểm X thuộc (P) thỏa n·(X−A)=0.';
      p('A',[-1,-1,0]);p('N',[-1,-1,3],'',false);p('X',[2,1,0],'',false);plane('P','A');v('n','A','N','n');relation('planeNormal',{plane:'P',vector:'n'});relation('pointOnPlane',{point:'X',plane:'P'});formulae.push(String.raw`n\cdot(X-A)=0`);break;
    case '30.4':
    case '30.5':
      spatial();description=key==='30.4'?'Hai mặt phẳng (P), (Q) cắt nhau theo đường d.':'Góc giữa hai mặt phẳng được xác định từ các vectơ pháp tuyến nP, nQ, lấy góc không vượt 90°.';
      p('O',[0,0,0],'',false);p('X',[2,0,0],'',false);p('NP',[0,0,2],'',false);p('NQ',[0,-1.6,1.2],'',false);plane('P','O');plane('Q','O',[1,0,0],[0,.6,.8],[-3,3,-2,2],'(Q)');l('d','O','X','d');
      relation('pointOnPlane',{point:'X',plane:'P'});relation('pointOnPlane',{point:'X',plane:'Q'});
      if(key==='30.5'){v('nP','O','NP','nP');v('nQ','O','NQ','nQ');relation('planeNormal',{plane:'P',vector:'nP'});relation('planeNormal',{plane:'Q',vector:'nQ'});formulae.push(String.raw`\cos\varphi=\frac{|n_1\cdot n_2|}{|n_1||n_2|}`);}break;
    case '30.6':
      spatial();description='Đoạn MH vuông góc (P); khoảng cách từ M đến (P) là độ dài MH.';
      p('A',[-1,-1,0]);p('H',[1,1,0]);p('M',[1,1,3]);plane('P','A');s('height','H','M','d(M, P)','amber',true);relation('pointOnPlane',{point:'H',plane:'P'});relation('planeNormal',{plane:'P',vector:'height'});break;
    case '31.2':
      spatial();classification='VECTOR_DIAGRAM';description='Đường d qua A có hướng u; X=A+tu. Vectơ từ A tới X được ghi tu.';
      p('A',[-2,-1,0]);p('X',[0,1,2]);p('U',[-1,0,1],'',false);l('d','A','U','d');v('u','A','U','');v('tu','A','X','tu');relation('linearPoint',{origin:'A',direction:'u',point:'X',parameter:2});formulae.push(String.raw`X=A+tu`);break;
    case '31.4':case '31.9':skew();description='Hai đường chéo nhau d₁, d₂ có đoạn vuông góc chung HK. HK vuông góc cả hai hướng, không làm hai đường trở thành cắt nhau.';formulae.push(String.raw`HK\perp d_1,\quad HK\perp d_2`);break;
    case '31.6':
      spatial();description='Góc α giữa đường AK và mặt phẳng (P) là góc giữa AK và hình chiếu HK. AH vuông góc (P).';
      p('A',[0,0,2]);p('H',[0,0,0]);p('K',[3,0,0]);plane('P','H');s('AK','A','K');s('HK','H','K','','muted',true);s('AH','A','H','','amber',true);relation('pointOnPlane',{point:'K',plane:'P'});relation('planeNormal',{plane:'P',vector:'AH'});formulae.push(String.raw`\sin\alpha=\frac{|u\cdot n|}{|u||n|}`);break;
    case '31.8':
      spatial();description='H là hình chiếu của M trên đường d qua A có hướng u: (M−H)·u=0.';
      p('A',[-2,0,0]);p('H',[1,0,0]);p('M',[1,2,2]);l('d','A','H','d');s('MH','M','H','','amber',true);relation('pointOnLine',{point:'H',line:'d'});relation('perpendicular',{a:'MH',b:'d'});formulae.push(String.raw`(M-H)\cdot u=0`);break;
    case '32.1':
      spatial();description='Mặt cầu tâm I bán kính R và điểm M trên mặt cầu, IM=R.';
      p('I',[0,0,0]);p('M',[3,0,0]);sphere('S','I',3);s('radius','I','M','R','amber');relation('pointOnRound',{point:'M',round:'S'});formulae.push(String.raw`|X-I|^2=R^2`);break;
    case '32.4':
      spatial();description='Mặt phẳng (P) cắt mặt cầu tâm I theo đường tròn tâm H, bán kính r; IH=d và r²=R²−d². Các số dùng để dựng chỉ là một hiện thực minh họa.';
      p('I',[0,0,1.5]);p('H',[0,0,0]);p('A',[2,0,0],'',false);sphere('S','I',2.5);plane('P','H',[1,0,0],[0,1,0],[-3,3,-3,3]);circle('section','H',2,'r',[0,0,1]);s('IH','I','H','d','amber',true);s('HA','H','A','r');relation('pointOnRound',{point:'A',round:'S'});relation('pointOnPlane',{point:'A',plane:'P'});relation('planeNormal',{plane:'P',vector:'IH'});formulae.push(String.raw`r^2=R^2-d^2`);break;
    case '32.5':
      description='Mặt cắt qua tâm I của mặt cầu: đường d cách I một đoạn d, cắt cầu tại A,B; dây AB=2√(R²−d²).';
      p('I',[0,0]);p('A',[-4,3]);p('B',[4,3]);p('H',[0,3],'',false);circle('S','I',5);l('d','A','B','d');s('distance','I','H','d','amber',true);relation('pointOnRound',{point:'A',round:'S'});relation('pointOnRound',{point:'B',round:'S'});relation('perpendicular',{a:'distance',b:'d'});formulae.push(String.raw`AB=2\sqrt{R^2-d^2}`);break;
    case '32.6':
      description='Mặt cắt qua tâm I: tiếp tuyến MT từ điểm M ngoài cầu; IT vuông góc MT và MT²=MI²−R². Trong hình này T là tiếp điểm.';
      p('I',[0,0]);p('M',[5,0]);p('T',[1.8,2.4]);circle('S','I',3);s('IT','I','T','','muted',true);s('MT','M','T','','amber');s('IM','I','M','','muted',true);relation('tangent',{round:'S',external:'M',contact:'T'});formulae.push(String.raw`MT^2=MI^2-R^2`);break;
    case '32.7':
      description='Mặt cắt qua tâm I: cát tuyến từ M ngoài cầu gặp A,B; tích vô hướng MA·MB bằng MI²−R².';
      p('I',[0,0]);p('M',[5,0]);p('A',[3,0]);p('B',[-3,0]);circle('S','I',3);s('secant','M','B');relation('pointOnRound',{point:'A',round:'S'});relation('pointOnRound',{point:'B',round:'S'});relation('power',{point:'M',a:'A',b:'B',center:'I',radius:3});formulae.push(String.raw`\overrightarrow{MA}\cdot\overrightarrow{MB}=MI^2-R^2`);break;
    case '33.1':spatial();classification='SPATIAL_FIGURE';description='Hình hộp chữ nhật ABCD.A′B′C′D′; gốc tại A, ba hướng cạnh đôi một vuông góc.';box(true);break;
    case '33.3':
      spatial();classification='COORDINATE_SYSTEM';description='Vectơ chuyển động từ A đến B trong Oxyz, với mặt phẳng (P) làm mốc tham chiếu. Dựng một đường bay cắt (P), không dùng số liệu của bài tập.';
      p('O',[0,0,0],'',false);p('A',[-1,-1,2.5]);p('B',[1.5,1.5,.5]);p('P0',[0,0,1.5],'',false);p('J',[.25,.25,1.5],'',false);plane('P','P0');v('flight','A','B','');relation('linePlaneIntersection',{line:'flight',plane:'P',point:'J'});break;
    case '33.4':
      spatial();description='Điểm bay M có vectơ vận tốc v; đoạn vuông góc xuống mặt phẳng z=0 biểu diễn độ cao h. Không suy ra số đo từ sơ đồ.';
      p('O',[0,0,0],'',false);p('M',[0,0,3]);p('V',[2,1,3],'',false);plane('P','O',[1,0,0],[0,1,0],[-3,3,-2,2],'z = 0');v('velocity','M','V','v');s('height','O','M','h','amber',true);relation('planeNormal',{plane:'P',vector:'height'});break;
    case '33.5':
      spatial();classification='SPATIAL_FIGURE';description='Đường bay cắt khối cầu radar tại hai thời điểm t₁,t₂. Vùng nhận tín hiệu thỏa |X(t)−I|≤R; không gán thời gian đo từ PDF.';
      p('I',[0,0,0]);p('E',[-3,0,0],'t₁');p('F',[3,0,0],'t₂');sphere('S','I',3);l('trajectory','E','F','');s('inside','E','F','','amber');relation('pointOnRound',{point:'E',round:'S'});relation('pointOnRound',{point:'F',round:'S'});formulae.push(String.raw`|X(t)-I|\le R`);break;
    case '33.7':
      spatial();classification='SPATIAL_FIGURE';description='Nón tròn xoay đỉnh K, chân đường cao H, chiều cao h và bán kính đáy r. Quan hệ r=h tan(θ/2); góc không được đo từ ảnh.';
      p('K',[0,0,3]);p('H',[0,0,0]);p('E',[2,0,0],'',false);plane('P','H',[1,0,0],[0,1,0],[-3,3,-3,3],'');o('cone','cone',{apex:'K',center:'H',radius:2});s('height','K','H','h','muted',true);s('radius','H','E','r','amber');relation('coneRightSection',{cone:'cone'});relation('planeNormal',{plane:'P',vector:'height'});formulae.push(String.raw`r=h\tan(\theta/2)`);break;
    case '33.8':
      spatial();description='A,B cùng phía Oxy; phản xạ A thành A*, đường A*B cắt Oxy tại M. Khi đó MA+MB=A*B.';
      p('O',[0,0,0],'',false);p('A',[-2,0,3]);p('B',[2,0,1]);p('As',[-2,0,-3],'A*');p('M',[1,0,0]);plane('P','O',[1,0,0],[0,1,0],[-3,3,-2,2],'Oxy');s('mirror','A','As','','muted',true);s('AM','A','M');s('MB','M','B');l('imageLine','As','B','');relation('reflection',{point:'A',image:'As',plane:'P'});relation('linePlaneIntersection',{line:'imageLine',plane:'P',point:'M'});break;
    case '33.9':
      classification='FUNCTION_GRAPH';description='Sơ đồ một parabol D²=at²+bt+c, a>0, có cực tiểu tại t₀. Các hệ số dựng là tự do, không phải hệ số được suy ra từ hình PDF.';
      f('distanceSquared','(x-2)^2+1','D²');p('minimum',[2,1],'t₀');relation('minimum',{curve:'distanceSquared',x:2,value:1});formulae.push(String.raw`D^2=at^2+bt+c,\ a>0`,String.raw`t_0=-\frac{r_0\cdot v}{|v|^2}`);views=[{id:'main',bounds:[[-.5,4.5],[-.3,6]],axes:false,title:'Bình phương khoảng cách — sơ đồ dạng hàm'}];break;
    default:throw Error('No source-backed construction for '+key);
  }
  if(key==='28.7')annotation('angleTheta',[.5,.35],'θ');
  if(key==='31.6')annotation('angleAlpha',[2.15,0,.25],'α');
  if(key==='33.9'){
    p('axisOrigin',[0,0],'',false);p('timeAxis',[4.25,0],'',false);p('squareAxis',[0,5.2],'',false);
    v('tAxis','axisOrigin','timeAxis','t');v('dAxis','axisOrigin','squareAxis','D²');
  }
  if(!views){
    const coords=objects.filter(o=>o.type==='point').map(o=>o.coords);
    const pad=dimension===3?1.8:1.1;
    const bounds=Array.from({length:dimension},(_,i)=>[Math.min(...coords.map(c=>c[i]))-pad,Math.max(...coords.map(c=>c[i]))+pad]);
    for(const round of objects.filter(o=>['circle','sphere'].includes(o.type))){const center=objects.find(o=>o.id===round.center).coords;for(let i=0;i<dimension;i++){bounds[i][0]=Math.min(bounds[i][0],center[i]-round.radius-pad);bounds[i][1]=Math.max(bounds[i][1],center[i]+round.radius+pad);}}
    views=[{id:'main',bounds,axes:['29.1','33.1','33.3'].includes(key),title:description.split('.')[0],...(dimension===3?{camera:{azimuth:.8,elevation:.38,projection:'parallel'}}:{})}];
  }
  return {dimension,classification,description,objects,relationships,formulae,views,
    realization:{kind:exact?'source-determined':'constrained-schematic',freeChoices:exact?[]:['Tọa độ và kích thước dựng được chọn để thỏa quan hệ nguồn; không phải số đo đề bài.'],
      notice:exact?'Dựng theo biểu thức hoặc dữ kiện hình học ghi rõ trong PDF.':'Sơ đồ minh họa, không theo tỉ lệ. Không đọc số đo từ vị trí các điểm.'}};
}
