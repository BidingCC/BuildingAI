import{C as e,Et as t,L as n,Pt as r,R as i,Rt as a,T as o,_ as s,at as c,b as l,dn as u,fn as d,k as f,p,pn as m,s as h,un as g}from"./mermaid-7ea9cbd6-DmivzQ7-.js";import{t as _}from"./channel-Bixl4ZHT.js";import{t as v}from"./graphlib-B7zpM-Rl.js";import{t as y}from"./index-5325376f-B7yS05tn.js";function b(e){return typeof e==`string`?new u([document.querySelectorAll(e)],[document.documentElement]):new u([m(e)],d)}function x(e,t){return!!e.children(t).length}function S(e){return w(e.v)+`:`+w(e.w)+`:`+w(e.name)}var C=/:/g;function w(e){return e?String(e).replace(C,`\\:`):``}function T(e,t){t&&e.attr(`style`,t)}function E(e,t,n){t&&e.attr(`class`,t).attr(`class`,n+` `+e.attr(`class`))}function D(e,n){var r=n.graph();if(c(r)){var i=r.transition;if(t(i))return i(e)}return e}function O(e,t){var n=e.append(`foreignObject`).attr(`width`,`100000`),r=n.append(`xhtml:div`);r.attr(`xmlns`,`http://www.w3.org/1999/xhtml`);var i=t.label;switch(typeof i){case`function`:r.insert(i);break;case`object`:r.insert(function(){return i});break;default:r.html(i)}T(r,t.labelStyle),r.style(`display`,`inline-block`),r.style(`white-space`,`nowrap`);var a=r.node().getBoundingClientRect();return n.attr(`width`,a.width).attr(`height`,a.height),n}var k={},A=function(e){let t=Object.keys(e);for(let n of t)k[n]=e[n]},j=async function(e,t,n,r,i,a){let c=r.select(`[id="${n}"]`),u=Object.keys(e);for(let n of u){let r=e[n],u=`default`;r.classes.length>0&&(u=r.classes.join(` `)),u+=` flowchart-label`;let d=l(r.styles),m=r.text===void 0?r.id:r.text,g;if(o.info(`vertex`,r,r.labelType),r.labelType===`markdown`)o.info(`vertex`,r,r.labelType);else if(p(s().flowchart.htmlLabels))g=O(c,{label:m}).node(),g.parentNode.removeChild(g);else{let e=i.createElementNS(`http://www.w3.org/2000/svg`,`text`);e.setAttribute(`style`,d.labelStyle.replace(`color:`,`fill:`));let t=m.split(h.lineBreakRegex);for(let n of t){let t=i.createElementNS(`http://www.w3.org/2000/svg`,`tspan`);t.setAttributeNS(`http://www.w3.org/XML/1998/namespace`,`xml:space`,`preserve`),t.setAttribute(`dy`,`1em`),t.setAttribute(`x`,`1`),t.textContent=n,e.appendChild(t)}g=e}let _=0,v=``;switch(r.type){case`round`:_=5,v=`rect`;break;case`square`:v=`rect`;break;case`diamond`:v=`question`;break;case`hexagon`:v=`hexagon`;break;case`odd`:v=`rect_left_inv_arrow`;break;case`lean_right`:v=`lean_right`;break;case`lean_left`:v=`lean_left`;break;case`trapezoid`:v=`trapezoid`;break;case`inv_trapezoid`:v=`inv_trapezoid`;break;case`odd_right`:v=`rect_left_inv_arrow`;break;case`circle`:v=`circle`;break;case`ellipse`:v=`ellipse`;break;case`stadium`:v=`stadium`;break;case`subroutine`:v=`subroutine`;break;case`cylinder`:v=`cylinder`;break;case`group`:v=`rect`;break;case`doublecircle`:v=`doublecircle`;break;default:v=`rect`}let y=await f(m,s());t.setNode(r.id,{labelStyle:d.labelStyle,shape:v,labelText:y,labelType:r.labelType,rx:_,ry:_,class:u,style:d.style,id:r.id,link:r.link,linkTarget:r.linkTarget,tooltip:a.db.getTooltip(r.id)||``,domId:a.db.lookUpDomId(r.id),haveCallback:r.haveCallback,width:r.type===`group`?500:void 0,dir:r.dir,type:r.type,props:r.props,padding:s().flowchart.padding}),o.info(`setNode`,{labelStyle:d.labelStyle,labelType:r.labelType,shape:v,labelText:y,rx:_,ry:_,class:u,style:d.style,id:r.id,domId:a.db.lookUpDomId(r.id),width:r.type===`group`?500:void 0,type:r.type,dir:r.dir,props:r.props,padding:s().flowchart.padding})}},M=async function(t,n,r){o.info(`abc78 edges = `,t);let i=0,c={},u,d;if(t.defaultStyle!==void 0){let e=l(t.defaultStyle);u=e.style,d=e.labelStyle}for(let r of t){i++;let p=`L-`+r.start+`-`+r.end;c[p]===void 0?(c[p]=0,o.info(`abc78 new entry`,p,c[p])):(c[p]++,o.info(`abc78 new entry`,p,c[p]));let m=p+`-`+c[p];o.info(`abc78 new link id to be used is`,p,m,c[p]);let g=`LS-`+r.start,_=`LE-`+r.end,v={style:``,labelStyle:``};switch(v.minlen=r.length||1,r.type===`arrow_open`?v.arrowhead=`none`:v.arrowhead=`normal`,v.arrowTypeStart=`arrow_open`,v.arrowTypeEnd=`arrow_open`,r.type){case`double_arrow_cross`:v.arrowTypeStart=`arrow_cross`;case`arrow_cross`:v.arrowTypeEnd=`arrow_cross`;break;case`double_arrow_point`:v.arrowTypeStart=`arrow_point`;case`arrow_point`:v.arrowTypeEnd=`arrow_point`;break;case`double_arrow_circle`:v.arrowTypeStart=`arrow_circle`;case`arrow_circle`:v.arrowTypeEnd=`arrow_circle`;break}let y=``,b=``;switch(r.stroke){case`normal`:y=`fill:none;`,u!==void 0&&(y=u),d!==void 0&&(b=d),v.thickness=`normal`,v.pattern=`solid`;break;case`dotted`:v.thickness=`normal`,v.pattern=`dotted`,v.style=`fill:none;stroke-width:2px;stroke-dasharray:3;`;break;case`thick`:v.thickness=`thick`,v.pattern=`solid`,v.style=`stroke-width: 3.5px;fill:none;`;break;case`invisible`:v.thickness=`invisible`,v.pattern=`solid`,v.style=`stroke-width: 0;fill:none;`;break}if(r.style!==void 0){let e=l(r.style);y=e.style,b=e.labelStyle}v.style=v.style+=y,v.labelStyle=v.labelStyle+=b,r.interpolate===void 0?t.defaultInterpolate===void 0?v.curve=e(k.curve,a):v.curve=e(t.defaultInterpolate,a):v.curve=e(r.interpolate,a),r.text===void 0?r.style!==void 0&&(v.arrowheadStyle=`fill: #333`):(v.arrowheadStyle=`fill: #333`,v.labelpos=`c`),v.labelType=r.labelType,v.label=await f(r.text.replace(h.lineBreakRegex,`
`),s()),r.style===void 0&&(v.style=v.style||`stroke: #333; stroke-width: 1.5px;fill:none;`),v.labelStyle=v.labelStyle.replace(`color:`,`fill:`),v.id=m,v.classes=`flowchart-link `+g+` `+_,n.setEdge(r.start,r.end,v,i)}},N={setConf:A,addVertices:j,addEdges:M,getClasses:function(e,t){return t.db.getClasses()},draw:async function(e,t,r,a){o.info(`Drawing flowchart`);let c=a.db.getDirection();c===void 0&&(c=`TD`);let{securityLevel:l,flowchart:u}=s(),d=u.nodeSpacing||50,f=u.rankSpacing||50,p;l===`sandbox`&&(p=g(`#i`+t));let m=g(l===`sandbox`?p.nodes()[0].contentDocument.body:`body`),h=l===`sandbox`?p.nodes()[0].contentDocument:document,_=new v({multigraph:!0,compound:!0}).setGraph({rankdir:c,nodesep:d,ranksep:f,marginx:0,marginy:0}).setDefaultEdgeLabel(function(){return{}}),x,S=a.db.getSubGraphs();o.info(`Subgraphs - `,S);for(let e=S.length-1;e>=0;e--)x=S[e],o.info(`Subgraph - `,x),a.db.addVertex(x.id,{text:x.title,type:x.labelType},`group`,void 0,x.classes,x.dir);let C=a.db.getVertices(),w=a.db.getEdges();o.info(`Edges`,w);let T=0;for(T=S.length-1;T>=0;T--){x=S[T],b(`cluster`).append(`text`);for(let e=0;e<x.nodes.length;e++)o.info(`Setting up subgraphs`,x.nodes[e],x.id),_.setParent(x.nodes[e],x.id)}await j(C,_,t,m,h,a),await M(w,_);let E=m.select(`[id="${t}"]`);if(await y(m.select(`#`+t+` g`),_,[`point`,`circle`,`cross`],`flowchart`,t),i.insertTitle(E,`flowchartTitleText`,u.titleTopMargin,a.db.getDiagramTitle()),n(_,E,u.diagramPadding,u.useMaxWidth),a.db.indexNodes(`subGraph`+T),!u.htmlLabels){let e=h.querySelectorAll(`[id="`+t+`"] .edgeLabel .label`);for(let t of e){let e=t.getBBox(),n=h.createElementNS(`http://www.w3.org/2000/svg`,`rect`);n.setAttribute(`rx`,0),n.setAttribute(`ry`,0),n.setAttribute(`width`,e.width),n.setAttribute(`height`,e.height),t.insertBefore(n,t.firstChild)}}Object.keys(C).forEach(function(e){let n=C[e];if(n.link){let r=g(`#`+t+` [id="`+e+`"]`);if(r){let e=h.createElementNS(`http://www.w3.org/2000/svg`,`a`);e.setAttributeNS(`http://www.w3.org/2000/svg`,`class`,n.classes.join(` `)),e.setAttributeNS(`http://www.w3.org/2000/svg`,`href`,n.link),e.setAttributeNS(`http://www.w3.org/2000/svg`,`rel`,`noopener`),l===`sandbox`?e.setAttributeNS(`http://www.w3.org/2000/svg`,`target`,`_top`):n.linkTarget&&e.setAttributeNS(`http://www.w3.org/2000/svg`,`target`,n.linkTarget);let t=r.insert(function(){return e},`:first-child`),i=r.select(`.label-container`);i&&t.append(function(){return i.node()});let a=r.select(`.label`);a&&t.append(function(){return a.node()})}}})}},P=(e,t)=>{let n=_;return r(n(e,`r`),n(e,`g`),n(e,`b`),t)},F=e=>`.label {
    font-family: ${e.fontFamily};
    color: ${e.nodeTextColor||e.textColor};
  }
  .cluster-label text {
    fill: ${e.titleColor};
  }
  .cluster-label span,p {
    color: ${e.titleColor};
  }

  .label text,span,p {
    fill: ${e.nodeTextColor||e.textColor};
    color: ${e.nodeTextColor||e.textColor};
  }

  .node rect,
  .node circle,
  .node ellipse,
  .node polygon,
  .node path {
    fill: ${e.mainBkg};
    stroke: ${e.nodeBorder};
    stroke-width: 1px;
  }
  .flowchart-label text {
    text-anchor: middle;
  }
  // .flowchart-label .text-outer-tspan {
  //   text-anchor: middle;
  // }
  // .flowchart-label .text-inner-tspan {
  //   text-anchor: start;
  // }

  .node .katex path {
    fill: #000;
    stroke: #000;
    stroke-width: 1px;
  }

  .node .label {
    text-align: center;
  }
  .node.clickable {
    cursor: pointer;
  }

  .arrowheadPath {
    fill: ${e.arrowheadColor};
  }

  .edgePath .path {
    stroke: ${e.lineColor};
    stroke-width: 2.0px;
  }

  .flowchart-link {
    stroke: ${e.lineColor};
    fill: none;
  }

  .edgeLabel {
    background-color: ${e.edgeLabelBackground};
    rect {
      opacity: 0.5;
      background-color: ${e.edgeLabelBackground};
      fill: ${e.edgeLabelBackground};
    }
    text-align: center;
  }

  /* For html labels only */
  .labelBkg {
    background-color: ${P(e.edgeLabelBackground,.5)};
    // background-color: 
  }

  .cluster rect {
    fill: ${e.clusterBkg};
    stroke: ${e.clusterBorder};
    stroke-width: 1px;
  }

  .cluster text {
    fill: ${e.titleColor};
  }

  .cluster span,p {
    color: ${e.titleColor};
  }
  /* .cluster div {
    color: ${e.titleColor};
  } */

  div.mermaidTooltip {
    position: absolute;
    text-align: center;
    max-width: 200px;
    padding: 2px;
    font-family: ${e.fontFamily};
    font-size: 12px;
    background: ${e.tertiaryColor};
    border: 1px solid ${e.border2};
    border-radius: 2px;
    pointer-events: none;
    z-index: 100;
  }

  .flowchartTitleText {
    text-anchor: middle;
    font-size: 18px;
    fill: ${e.textColor};
  }
`;export{T as a,x as c,E as i,b as l,F as n,D as o,O as r,S as s,N as t};