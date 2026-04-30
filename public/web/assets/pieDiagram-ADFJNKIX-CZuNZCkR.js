import"./lucide-C4oWPzu4.js";import"./src-CaF7C-tn.js";import{n as e,r as t}from"./chunk-AGHRB4JF-BqsWRwvz.js";import"./purify.es-BI1OWkCK.js";import{B as n,C as r,U as i,_ as a,a as o,b as s,c,d as l,v as u,z as d}from"./chunk-ABZYJK2D-CfdmvsHg.js";import{n as f}from"./ordinal-CVuAmFBj.js";import{t as p}from"./arc-dgqwtBeY.js";import{t as m}from"./pie-DWstSgGL.js";import{t as h}from"./chunk-EXTU4WIE-CW5Kbs0o.js";import"./dist-K6mAem53.js";import{f as g,r as _}from"./chunk-S3R3BYOJ-B0o4vLAG.js";import"./chunk-TCCFYFTB-gUis-eQj.js";import"./chunk-UMXZTB3W-xw7vhcng.js";import"./chunk-4F5CHEZ2-t9X9tDB0.js";import"./chunk-FRFDVMJY-3ucyvEIQ.js";import"./chunk-SJTYNZTY-C5I03lvH.js";import"./chunk-PL6DKKU2-CVUBcNKI.js";import"./chunk-TQ3KTPDO-54KTzUtw.js";import"./chunk-B2363JML-CSvrkFc_.js";import{t as v}from"./chunk-4BX2VUAB-FkjZmzeb.js";import{t as y}from"./mermaid-parser.core-TgnS1Efi.js";var b=l.pie,x={sections:new Map,showData:!1,config:b},S=x.sections,C=x.showData,w=structuredClone(b),T={getConfig:e(()=>structuredClone(w),`getConfig`),clear:e(()=>{S=new Map,C=x.showData,o()},`clear`),setDiagramTitle:i,getDiagramTitle:r,setAccTitle:n,getAccTitle:u,setAccDescription:d,getAccDescription:a,addSection:e(({label:e,value:n})=>{if(n<0)throw Error(`"${e}" has invalid value: ${n}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);S.has(e)||(S.set(e,n),t.debug(`added new section: ${e}, with value: ${n}`))},`addSection`),getSections:e(()=>S,`getSections`),setShowData:e(e=>{C=e},`setShowData`),getShowData:e(()=>C,`getShowData`)},E=e((e,t)=>{v(e,t),t.setShowData(e.showData),e.sections.map(t.addSection)},`populateDb`),D={parse:e(async e=>{let n=await y(`pie`,e);t.debug(n),E(n,T)},`parse`)},O=e(e=>`
  .pieCircle{
    stroke: ${e.pieStrokeColor};
    stroke-width : ${e.pieStrokeWidth};
    opacity : ${e.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${e.pieOuterStrokeColor};
    stroke-width: ${e.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${e.pieTitleTextSize};
    fill: ${e.pieTitleTextColor};
    font-family: ${e.fontFamily};
  }
  .slice {
    font-family: ${e.fontFamily};
    fill: ${e.pieSectionTextColor};
    font-size:${e.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${e.pieLegendTextColor};
    font-family: ${e.fontFamily};
    font-size: ${e.pieLegendTextSize};
  }
`,`getStyles`),k=e(e=>{let t=[...e.values()].reduce((e,t)=>e+t,0),n=[...e.entries()].map(([e,t])=>({label:e,value:t})).filter(e=>e.value/t*100>=1).sort((e,t)=>t.value-e.value);return m().value(e=>e.value)(n)},`createPieArcs`),A={parser:D,db:T,renderer:{draw:e((e,n,r,i)=>{t.debug(`rendering pie chart
`+e);let a=i.db,o=s(),l=_(a.getConfig(),o.pie),u=h(n),d=u.append(`g`);d.attr(`transform`,`translate(225,225)`);let{themeVariables:m}=o,[v]=g(m.pieOuterStrokeWidth);v??=2;let y=l.textPosition,b=p().innerRadius(0).outerRadius(185),x=p().innerRadius(185*y).outerRadius(185*y);d.append(`circle`).attr(`cx`,0).attr(`cy`,0).attr(`r`,185+v/2).attr(`class`,`pieOuterCircle`);let S=a.getSections(),C=k(S),w=[m.pie1,m.pie2,m.pie3,m.pie4,m.pie5,m.pie6,m.pie7,m.pie8,m.pie9,m.pie10,m.pie11,m.pie12],T=0;S.forEach(e=>{T+=e});let E=C.filter(e=>(e.data.value/T*100).toFixed(0)!==`0`),D=f(w);d.selectAll(`mySlices`).data(E).enter().append(`path`).attr(`d`,b).attr(`fill`,e=>D(e.data.label)).attr(`class`,`pieCircle`),d.selectAll(`mySlices`).data(E).enter().append(`text`).text(e=>(e.data.value/T*100).toFixed(0)+`%`).attr(`transform`,e=>`translate(`+x.centroid(e)+`)`).style(`text-anchor`,`middle`).attr(`class`,`slice`),d.append(`text`).text(a.getDiagramTitle()).attr(`x`,0).attr(`y`,-400/2).attr(`class`,`pieTitleText`);let O=[...S.entries()].map(([e,t])=>({label:e,value:t})),A=d.selectAll(`.legend`).data(O).enter().append(`g`).attr(`class`,`legend`).attr(`transform`,(e,t)=>{let n=22*O.length/2;return`translate(216,`+(t*22-n)+`)`});A.append(`rect`).attr(`width`,18).attr(`height`,18).style(`fill`,e=>D(e.label)).style(`stroke`,e=>D(e.label)),A.append(`text`).attr(`x`,22).attr(`y`,14).text(e=>a.getShowData()?`${e.label} [${e.value}]`:e.label);let j=512+Math.max(...A.selectAll(`text`).nodes().map(e=>e?.getBoundingClientRect().width??0));u.attr(`viewBox`,`0 0 ${j} 450`),c(u,450,j,l.useMaxWidth)},`draw`)},styles:O};export{A as diagram};