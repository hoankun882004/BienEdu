// Independently inspected original full PDF pages. Expected mathematical
// structures are handwritten here, never obtained by invoking the converter.
// These fixtures are machine verification, NOT human editorial approval.
export const sourceOracles=[
  ['cd08-cd11-exponential-logarithm:CD08-CD11:knowledge',5,3,[String.raw`a^{0}=1,a^{-n}=\frac{1}{a^{n}}.`]],
  ['cd08-cd11-exponential-logarithm:CD08-CD11:knowledge',5,5,[String.raw`a^{m/n}=\sqrt[n]{a^{m}}.`]],
  ['cd08-cd11-exponential-logarithm:CD08-CD11:knowledge',5,11,['n',String.raw`\sqrt[n]{a^{n}}=a`,'n',String.raw`\sqrt[n]{a^{n}}=|a|`,'n']],
  ['cd08-cd11-exponential-logarithm:CD08-CD11:knowledge',5,15,[String.raw`\log _{a}\frac{M}{N}=\log _{a}M-\log _{a}N,\log _{a}(M^{\alpha})=\alpha \log _{a}M.`]],
  ['cd08-cd11-exponential-logarithm:CD08-CD11:knowledge',5,16,['b>0',String.raw`b\ne 1`,String.raw`\log _{a}M=\frac{\log _{b}M}{\log _{b}a}.`]],
  ['cd08-cd11-exponential-logarithm:CD08-CD11:knowledge',7,37,[String.raw`\sqrt[n]{a}\sqrt[n]{b}=\sqrt[n]{ab},\frac{\sqrt[n]{a}}{\sqrt[n]{b}}=\sqrt[n]{\frac{a}{b}}(b\ne 0),`]],
  ['cd08-cd11-exponential-logarithm:CD08-CD11:knowledge',7,35,[String.raw`n\in \mathbb{N}^{*}`,'b','n','a',String.raw`b^{n}=a`,'n','n','n',String.raw`\sqrt[n]{a}`]],
  ['cd08-cd11-exponential-logarithm:CD08-CD11:knowledge',7,39,[String.raw`\sqrt[n]{a^n}=\begin{cases}a,&n\text{ lẻ},\\|a|,&n\text{ chẵn}.\end{cases}`]],
  ['cd17-cd19-sequences-2026:17.1:knowledge',2,1,[String.raw`(u_{n})`,'n=1',String.raw`u_{j}`,'j',String.raw`u_{n}=j`,'n']],
  ['cd17-cd19-sequences-2026:17.2:knowledge',2,1,[String.raw`S_{n}=\sum _{j=1}^{n}u_{j}`,String.raw`u_{1}=S_{1}`,String.raw`u_{n}=S_{n}-S_{n-1}`,String.raw`n\ge 2`,'n']],
  ['cd15-cd16-trigonometry-2026:15.1:knowledge',2,1,[String.raw`\sin ^{2}\alpha +\cos ^{2}\alpha =1`,String.raw`\tan \alpha =\sin \alpha /\cos \alpha`,String.raw`\cos \alpha \ne 0`,String.raw`\cot \alpha =\cos \alpha /\sin \alpha`,String.raw`\sin \alpha \ne 0`]],
  ['cd12-cd14-calculus-2026:12.1:knowledge',3,1,['F','f','K',String.raw`F^{'}(x)=f(x)`]],
  ['cd12-cd14-calculus-2026:12.1:knowledge',3,2,[String.raw`x\in K`,'K','F(x)+C',String.raw`\alpha \ne -1`,String.raw`\int x^{\alpha}dx=\frac{x^{\alpha +1}}{\alpha +1}+C`,String.raw`\int \frac{dx}{x}=\ln |x|+C`]],
  ['cd12-cd14-calculus-2026:13.1:knowledge',8,1,['f','[a;b]',String.raw`F^{'}=f`,String.raw`\int _{a}^{b}f(x)dx=F(b)-F(a)`]],
  ['cd12-cd14-calculus-2026:14.1:knowledge',17,1,['y=f(x)','Ox','x=a','x=b',String.raw`S=\int _{a}^{b}|f(x)|dx`,'Ox','f(x)=0']],
  ['cd28-cd33-vector-2026:28.1:knowledge',2,1,[String.raw`\overrightarrow{AB}+\overrightarrow{BC}=\overrightarrow{AC}`]],
  ['cd28-cd33-vector-2026:28.2:knowledge',2,1,[String.raw`\overrightarrow{AB}=\overrightarrow{CD}\Leftrightarrow B-A=D-C`]],
  ['cd20-cd21-theory:20.1:knowledge',4,2,[String.raw`n_{1}`,String.raw`n_{2}`,String.raw`n_{k}`,String.raw`n_{1}`,String.raw`n_{2}`,String.raw`n_{k}`]]
];
export const trigonometryCells=[
  [String.raw`\alpha`,'0',String.raw`\pi/6`,String.raw`\pi/4`,String.raw`\pi/3`,String.raw`\pi/2`],
  [String.raw`\sin\alpha`,'0','1/2',String.raw`\sqrt{2}/2`,String.raw`\sqrt{3}/2`,'1'],
  [String.raw`\cos\alpha`,'1',String.raw`\sqrt{3}/2`,String.raw`\sqrt{2}/2`,'1/2','0'],
  [String.raw`\tan\alpha`,'0',String.raw`\sqrt{3}/3`,'1',String.raw`\sqrt{3}`,'KXĐ'],
  [String.raw`\cot\alpha`,'KXĐ',String.raw`\sqrt{3}`,'1',String.raw`\sqrt{3}/3`,'0']
];
