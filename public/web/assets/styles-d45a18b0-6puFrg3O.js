import{i as e,n as t,r as n,t as r}from"./src-CaF7C-tn.js";import{s as i}from"./purify.es-BI1OWkCK.js";import{t as a}from"./channel-DFd02k30.js";import{h as o}from"./step-7IFzWEMw.js";import{n as s}from"./merge-CUB1CjoI.js";import{V as c}from"./_createAssigner-CY_UBwBq.js";import{t as l}from"./graphlib-mnK_OidP.js";import{C as u,L as d,R as f,T as p,_ as m,b as h,k as g,p as _,s as v}from"./mermaid-7ea9cbd6-CTdxebQd.js";import{t as y}from"./index-5325376f-uAj4SDoV.js";function b(r){return typeof r==`string`?new t([document.querySelectorAll(r)],[document.documentElement]):new t([e(r)],n)}function x(e,t){return!!e.children(t).length}function S(e){return w(e.v)+`:`+w(e.w)+`:`+w(e.name)}var C=/:/g;function w(e){return e?String(e).replace(C,`\\:`):``}function T(e,t){t&&e.attr(`style`,t)}function E(e,t,n){t&&e.attr(`class`,t).attr(`class`,n+` `+e.attr(`class`))}function D(e,t){var n=t.graph();if(s(n)){var r=n.transition;if(c(r))return r(e)}return e}function O(e,t){var n=e.append(`foreignObject`).attr(`width`,`100000`),r=n.append(`xhtml:div`);r.attr(`xmlns`,`http://www.w3.org/1999/xhtml`);var i=t.label;switch(typeof i){case`function`:r.insert(i);break;case`object`:r.insert(function(){return i});break;default:r.html(i)}T(r,t.labelStyle),r.style(`display`,`inline-block`),r.style(`white-space`,`nowrap`);var a=r.node().getBoundingClientRect();return n.attr(`width`,a.width).attr(`height`,a.height),n}var k={},A=function(e){let t=Object.keys(e);for(let n of t)k[n]=e[n]},j=async function(e,t,n,r,i,a){let o=r.select(`[id="${n}"]`),s=Object.keys(e);for(let n of s){let r=e[n],s=`default`;r.classes.length>0&&(s=r.classes.join(` `)),s+=` flowchart-label`;let c=h(r.styles),l=r.text===void 0?r.id:r.text,u;if(p.info(`vertex`,r,r.labelType),r.labelType===`markdown`)p.info(`vertex`,r,r.labelType);else if(_(m().flowchart.htmlLabels))u=O(o,{label:l}).node(),u.parentNode.removeChild(u);else{let e=i.createElementNS(`http://www.w3.org/2000/svg`,`text`);e.setAttribute(`style`,c.labelStyle.replace(`color:`,`fill:`));let t=l.split(v.lineBreakRegex);for(let n of t){let t=i.createElementNS(`http://www.w3.org/2000/svg`,`tspan`);t.setAttributeNS(`http://www.w3.org/XML/1998/namespace`,`xml:space`,`preserve`),t.setAttribute(`dy`,`1em`),t.setAttribute(`x`,`1`),t.textContent=n,e.appendChild(t)}u=e}let d=0,f=``;switch(r.type){case`round`:d=5,f=`rect`;break;case`square`:f=`rect`;break;case`diamond`:f=`question`;break;case`hexagon`:f=`hexagon`;break;case`odd`:f=`rect_left_inv_arrow`;break;case`lean_right`:f=`lean_right`;break;case`lean_left`:f=`lean_left`;break;case`trapezoid`:f=`trapezoid`;break;case`inv_trapezoid`:f=`inv_trapezoid`;break;case`odd_right`:f=`rect_left_inv_arrow`;break;case`circle`:f=`circle`;break;case`ellipse`:f=`ellipse`;break;case`stadium`:f=`stadium`;break;case`subroutine`:f=`subroutine`;break;case`cylinder`:f=`cylinder`;break;case`group`:f=`rect`;break;case`doublecircle`:f=`doublecircle`;break;default:f=`rect`}let y=await g(l,m());t.setNode(r.id,{labelStyle:c.labelStyle,shape:f,labelText:y,labelType:r.labelType,rx:d,ry:d,class:s,style:c.style,id:r.id,link:r.link,linkTarget:r.linkTarget,tooltip:a.db.getTooltip(r.id)||``,domId:a.db.lookUpDomId(r.id),haveCallback:r.haveCallback,width:r.type===`group`?500:void 0,dir:r.dir,type:r.type,props:r.props,padding:m().flowchart.padding}),p.info(`setNode`,{labelStyle:c.labelStyle,labelType:r.labelType,shape:f,labelText:y,rx:d,ry:d,class:s,style:c.style,id:r.id,domId:a.db.lookUpDomId(r.id),width:r.type===`group`?500:void 0,type:r.type,dir:r.dir,props:r.props,padding:m().flowchart.padding})}},M=async function(e,t,n){p.info(`abc78 edges = `,e);let r=0,i={},a,s;if(e.defaultStyle!==void 0){let t=h(e.defaultStyle);a=t.style,s=t.labelStyle}for(let n of e){r++;let c=`L-`+n.start+`-`+n.end;i[c]===void 0?(i[c]=0,p.info(`abc78 new entry`,c,i[c])):(i[c]++,p.info(`abc78 new entry`,c,i[c]));let l=c+`-`+i[c];p.info(`abc78 new link id to be used is`,c,l,i[c]);let d=`LS-`+n.start,f=`LE-`+n.end,_={style:``,labelStyle:``};switch(_.minlen=n.length||1,n.type===`arrow_open`?_.arrowhead=`none`:_.arrowhead=`normal`,_.arrowTypeStart=`arrow_open`,_.arrowTypeEnd=`arrow_open`,n.type){case`double_arrow_cross`:_.arrowTypeStart=`arrow_cross`;case`arrow_cross`:_.arrowTypeEnd=`arrow_cross`;break;case`double_arrow_point`:_.arrowTypeStart=`arrow_point`;case`arrow_point`:_.arrowTypeEnd=`arrow_point`;break;case`double_arrow_circle`:_.arrowTypeStart=`arrow_circle`;case`arrow_circle`:_.arrowTypeEnd=`arrow_circle`;break}let y=``,b=``;switch(n.stroke){case`normal`:y=`fill:none;`,a!==void 0&&(y=a),s!==void 0&&(b=s),_.thickness=`normal`,_.pattern=`solid`;break;case`dotted`:_.thickness=`normal`,_.pattern=`dotted`,_.style=`fill:none;stroke-width:2px;stroke-dasharray:3;`;break;case`thick`:_.thickness=`thick`,_.pattern=`solid`,_.style=`stroke-width: 3.5px;fill:none;`;break;case`invisible`:_.thickness=`invisible`,_.pattern=`solid`,_.style=`stroke-width: 0;fill:none;`;break}if(n.style!==void 0){let e=h(n.style);y=e.style,b=e.labelStyle}_.style=_.style+=y,_.labelStyle=_.labelStyle+=b,n.interpolate===void 0?e.defaultInterpolate===void 0?_.curve=u(k.curve,o):_.curve=u(e.defaultInterpolate,o):_.curve=u(n.interpolate,o),n.text===void 0?n.style!==void 0&&(_.arrowheadStyle=`fill: #333`):(_.arrowheadStyle=`fill: #333`,_.labelpos=`c`),_.labelType=n.labelType,_.label=await g(n.text.replace(v.lineBreakRegex,`
`),m()),n.style===void 0&&(_.style=_.style||`stroke: #333; stroke-width: 1.5px;fill:none;`),_.labelStyle=_.labelStyle.replace(`color:`,`fill:`),_.id=l,_.classes=`flowchart-link `+d+` `+f,t.setEdge(n.start,n.end,_,r)}},N={setConf:A,addVertices:j,addEdges:M,getClasses:function(e,t){return t.db.getClasses()},draw:async function(e,t,n,i){p.info(`Drawing flowchart`);let a=i.db.getDirection();a===void 0&&(a=`TD`);let{securityLevel:o,flowchart:s}=m(),c=s.nodeSpacing||50,u=s.rankSpacing||50,h;o===`sandbox`&&(h=r(`#i`+t));let g=r(o===`sandbox`?h.nodes()[0].contentDocument.body:`body`),_=o===`sandbox`?h.nodes()[0].contentDocument:document,v=new l({multigraph:!0,compound:!0}).setGraph({rankdir:a,nodesep:c,ranksep:u,marginx:0,marginy:0}).setDefaultEdgeLabel(function(){return{}}),x,S=i.db.getSubGraphs();p.info(`Subgraphs - `,S);for(let e=S.length-1;e>=0;e--)x=S[e],p.info(`Subgraph - `,x),i.db.addVertex(x.id,{text:x.title,type:x.labelType},`group`,void 0,x.classes,x.dir);let C=i.db.getVertices(),w=i.db.getEdges();p.info(`Edges`,w);let T=0;for(T=S.length-1;T>=0;T--){x=S[T],b(`cluster`).append(`text`);for(let e=0;e<x.nodes.length;e++)p.info(`Setting up subgraphs`,x.nodes[e],x.id),v.setParent(x.nodes[e],x.id)}await j(C,v,t,g,_,i),await M(w,v);let E=g.select(`[id="${t}"]`);if(await y(g.select(`#`+t+` g`),v,[`point`,`circle`,`cross`],`flowchart`,t),f.insertTitle(E,`flowchartTitleText`,s.titleTopMargin,i.db.getDiagramTitle()),d(v,E,s.diagramPadding,s.useMaxWidth),i.db.indexNodes(`subGraph`+T),!s.htmlLabels){let e=_.querySelectorAll(`[id="`+t+`"] .edgeLabel .label`);for(let t of e){let e=t.getBBox(),n=_.createElementNS(`http://www.w3.org/2000/svg`,`rect`);n.setAttribute(`rx`,0),n.setAttribute(`ry`,0),n.setAttribute(`width`,e.width),n.setAttribute(`height`,e.height),t.insertBefore(n,t.firstChild)}}Object.keys(C).forEach(function(e){let n=C[e];if(n.link){let i=r(`#`+t+` [id="`+e+`"]`);if(i){let e=_.createElementNS(`http://www.w3.org/2000/svg`,`a`);e.setAttributeNS(`http://www.w3.org/2000/svg`,`class`,n.classes.join(` `)),e.setAttributeNS(`http://www.w3.org/2000/svg`,`href`,n.link),e.setAttributeNS(`http://www.w3.org/2000/svg`,`rel`,`noopener`),o===`sandbox`?e.setAttributeNS(`http://www.w3.org/2000/svg`,`target`,`_top`):n.linkTarget&&e.setAttributeNS(`http://www.w3.org/2000/svg`,`target`,n.linkTarget);let t=i.insert(function(){return e},`:first-child`),r=i.select(`.label-container`);r&&t.append(function(){return r.node()});let a=i.select(`.label`);a&&t.append(function(){return a.node()})}}})}},P=(e,t)=>{let n=a;return i(n(e,`r`),n(e,`g`),n(e,`b`),t)},F=e=>`.label {
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