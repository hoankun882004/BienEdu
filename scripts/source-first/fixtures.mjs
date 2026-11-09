// Reference transcriptions are review candidates, not automatically approved math.
// Every selector resolves against a real source and gets a checksum + crop/offset.
const tex = (code, latex, formula = 0) => ({ id: `tex-${code}`, sourceKind: "tex", code, formula, latex });
const pdf = (id, documentId, page, code, anchor, latex, categories, kind = "example") => ({ id, sourceKind: "pdf", documentId, page, code, anchor, latex, categories, kind });
const f = "cd01-cd07-functions";
const l = "cd08-cd11-exponential-logarithm";
const c = "cd12-cd14-calculus";
const p = "cd20-cd21-theory";

export const benchmarkFixtures = [
  tex("20.3", String.raw`\mathrm{P}(n)=n!`),
  { ...tex("20.4", String.raw`\mathrm{A}(n,k)=\frac{n!}{(n-k)!}=n(n-1)\cdots(n-k+1)`), conditionsLatex: String.raw`0\le k\le n` },
  { ...tex("20.5", String.raw`\mathrm{C}(n,k)=\frac{n!}{k!(n-k)!}`), conditionsLatex: String.raw`0\le k\le n` },
  tex("21.1", String.raw`\mathrm{P}(A)=\frac{|A|}{|\Omega|}`),
  tex("21.2", String.raw`\mathrm{P}(A^{c})=1-\mathrm{P}(A)`),
  { ...tex("22.1", String.raw`\mathrm{P}(A\mid B)=\frac{\mathrm{P}(A\cap B)}{\mathrm{P}(B)}`), conditionsLatex: String.raw`\mathrm{P}(B)>0` },
  tex("22.2", String.raw`\mathrm{P}(A\cap B)=\mathrm{P}(B)\mathrm{P}(A\mid B)`),
  tex("22.4", String.raw`\mathrm{P}(A)=\sum \mathrm{P}(B_i)\mathrm{P}(A\mid B_i)`),
  tex("22.5", String.raw`\mathrm{P}(B_j\mid A)=\frac{\mathrm{P}(B_j)\mathrm{P}(A\mid B_j)}{\sum \mathrm{P}(B_i)\mathrm{P}(A\mid B_i)}`),
  tex("22.7", String.raw`\mathrm{P}(\text{bệnh}\mid +)=\frac{\mathrm{P}(\text{bệnh})\mathrm{P}(+\mid\text{bệnh})}{\mathrm{P}(+)}`),
  pdf("pdf-derivative-power",f,4,"1.1","(xn)′",String.raw`(x^n)'=nx^{n-1}`,["exponents"],"knowledge"),
  pdf("pdf-derivative-quotient",f,4,"1.1","u′v",String.raw`\left(\frac uv\right)'=\frac{u'v-uv'}{v^2}`,["fractions"],"knowledge"),
  pdf("pdf-derivative-root",f,4,"1.1","(√u)′",String.raw`(\sqrt u)'=\frac{u'}{2\sqrt u},\quad u>0`,["radicals","inequalities"],"knowledge"),
  pdf("pdf-derivative-log",f,4,"1.1","(loga u)′",String.raw`(\log_a u)'=\frac{u'}{u\ln a},\quad a>0,\ a\ne1,\ u>0`,["logarithms","fractions"],"knowledge"),
  pdf("pdf-geometric-point",f,64,"7.7","A(0; −1)",String.raw`y=x^2,\quad A(0;-1)`,["geometric-notation"]),
  pdf("pdf-simultaneous-constraints",f,66,"1.1","3a + b = 3",String.raw`b=-3,\quad 3a+b=3`,["systems-of-equations"],"solution"),
  pdf("pdf-rational-exponents",l,9,"8.1","163/4",String.raw`A=16^{3/4}+27^{-2/3}`,["exponents"]),
  pdf("pdf-nested-exponents",l,9,"8.1","(23)2/3",String.raw`(2^3)^{2/3}+2^{-1}`,["nested-exponents"]),
  pdf("pdf-root-exponents",l,9,"8.1","Rút gọn a",String.raw`\frac{a^{\sqrt3+2}}{a^{\sqrt3-1}},\quad a>0`,["radicals","exponents"]),
  pdf("pdf-powers-condition",l,9,"8.1","Ví dụ5.",String.raw`a^{\sqrt2+1}a^{2-\sqrt2},\quad a>0`,["exponents","inequalities"]),
  { ...pdf("pdf-exponent-warning",l,9,"8.1","Chú ý",String.raw`\text{Không biến }a^\alpha+a^\beta\text{ thành }a^{\alpha+\beta}.`,["exponents","source-warning"],"note"),
    correction: { before: String.raw`a^\alpha+a^\beta\ne a^{\alpha+\beta}`, cause: "The source warns against a general rewrite; a universal inequality is a stronger, unsupported assertion. Preserve the original warning as text plus math.", sourcePhrase: "Không biến" } },
  pdf("pdf-log-bases",l,10,"8.2","log2 12",String.raw`A=\log_2 12-\log_2 3+\log_4 8`,["logarithms"]),
  pdf("pdf-log-nested",l,10,"8.2","ln(e2)",String.raw`\ln(e^2)+\log 0{,}01`,["logarithms","exponents"]),
  pdf("pdf-log-product",l,10,"8.2","Ví dụ5.",String.raw`\log_2 3\cdot\log_3 8`,["logarithms"]),
  pdf("pdf-integral-definition",c,3,"12.1","f(x) dx = F(x)",String.raw`\int f(x)\,dx=F(x)+C,\quad C\in\mathbb R`,["integrals"],"knowledge"),
  pdf("pdf-integral-power",c,3,"12.1","xn (n",String.raw`\int x^n\,dx=\frac{x^{n+1}}{n+1}+C,\quad n\ne-1`,["integrals","fractions","inequalities"],"knowledge"),
  pdf("pdf-integral-log",c,3,"12.1","ln |x|",String.raw`\int\frac1x\,dx=\ln|x|+C`,["integrals","logarithms"],"knowledge"),
  pdf("pdf-integral-base",c,3,"12.1","ax (a > 0",String.raw`\int a^x\,dx=\frac{a^x}{\ln a}+C,\quad a>0,\ a\ne1`,["integrals","exponents","inequalities"],"knowledge"),
  pdf("pdf-integral-cos-reciprocal",c,3,"12.1","cos2 x",String.raw`\int\frac1{\cos^2x}\,dx=\tan x+C`,["integrals","fractions"],"knowledge"),
  pdf("pdf-integral-sin-reciprocal",c,3,"12.1","sin2 x",String.raw`\int\frac1{\sin^2x}\,dx=-\cot x+C`,["integrals","fractions"],"knowledge"),
  pdf("pdf-integral-radical",c,3,"12.1","1 −x2",String.raw`\int\frac1{\sqrt{1-x^2}}\,dx=\arcsin x+C`,["integrals","radicals"],"knowledge"),
  pdf("pdf-integral-chain",c,3,"12.1","f ′(x)[f(x)]n",String.raw`\int f'(x)[f(x)]^n\,dx=\frac{[f(x)]^{n+1}}{n+1}+C,\quad n\ne-1`,["integrals","nested-exponents"],"knowledge"),
  pdf("pdf-definite-integral",c,19,"13.1","F(b) −F(a)",String.raw`\int_a^b f(x)\,dx=F(b)-F(a)`,["integrals"],"knowledge"),
  pdf("pdf-definite-example",c,19,"13.1","(3x2 −2x)",String.raw`I=\int_0^2(3x^2-2x)\,dx`,["integrals"]),
  pdf("pdf-graph-associated",c,19,"13.1","Đồthịy = x3",String.raw`J=\int_{-1}^{1}x^3\,dx=0`,["graph-associated","integrals"],"solution"),
  pdf("pdf-area-absolute",c,34,"14.1","|f(x)| dx",String.raw`S=\int_a^b|f(x)|\,dx`,["geometric-notation","integrals"],"knowledge"),
  pdf("pdf-area-piecewise",c,34,"14.1","(4 −2x)",String.raw`S=\int_0^2(4-2x)\,dx+\int_2^3(2x-4)\,dx=5`,["geometric-notation","integrals"],"solution"),
  pdf("pdf-counting-source",p,4,"20.1","N = 3 + 4 + 1",String.raw`N=3+4+1=8`,["counting"],"solution"),
  pdf("pdf-root-domain",f,66,"1.3","−2 < x < 2",String.raw`y'=-\frac{x}{\sqrt{4-x^2}},\quad -2<x<2`,["radicals","inequalities"],"solution"),
  pdf("pdf-rational-domain",f,66,"1.2","x̸ = ±1",String.raw`f'(x)=\frac{-x^2-1}{(x-1)^2(x+1)^2},\quad x\ne\pm1`,["fractions","inequalities"],"solution")
];
