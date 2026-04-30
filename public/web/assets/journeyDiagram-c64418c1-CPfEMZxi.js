import{s as e}from"./rolldown-runtime-C5c2KzVm.js";import"./lucide-C4oWPzu4.js";import{a as t,t as n}from"./src-CaF7C-tn.js";import"./purify.es-BI1OWkCK.js";import{t as r}from"./arc-dgqwtBeY.js";import{B as i,F as a,M as o,N as s,_ as c,g as l,h as u,l as d,o as f,y as p}from"./mermaid-7ea9cbd6-CTdxebQd.js";import{a as m,i as h,o as g,t as _}from"./svgDrawCommon-b86b1483-BgTdadac.js";e(t(),1),i();var v=function(){var e=function(e,t,n,r){for(n||={},r=e.length;r--;n[e[r]]=t);return n},t=[6,8,10,11,12,14,16,17,18],n=[1,9],r=[1,10],i=[1,11],a=[1,12],o=[1,13],s=[1,14],c={trace:function(){},yy:{},symbols_:{error:2,start:3,journey:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NEWLINE:10,title:11,acc_title:12,acc_title_value:13,acc_descr:14,acc_descr_value:15,acc_descr_multiline_value:16,section:17,taskName:18,taskData:19,$accept:0,$end:1},terminals_:{2:`error`,4:`journey`,6:`EOF`,8:`SPACE`,10:`NEWLINE`,11:`title`,12:`acc_title`,13:`acc_title_value`,14:`acc_descr`,15:`acc_descr_value`,16:`acc_descr_multiline_value`,17:`section`,18:`taskName`,19:`taskData`},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,2]],performAction:function(e,t,n,r,i,a,o){var s=a.length-1;switch(i){case 1:return a[s-1];case 2:this.$=[];break;case 3:a[s-1].push(a[s]),this.$=a[s-1];break;case 4:case 5:this.$=a[s];break;case 6:case 7:this.$=[];break;case 8:r.setDiagramTitle(a[s].substr(6)),this.$=a[s].substr(6);break;case 9:this.$=a[s].trim(),r.setAccTitle(this.$);break;case 10:case 11:this.$=a[s].trim(),r.setAccDescription(this.$);break;case 12:r.addSection(a[s].substr(8)),this.$=a[s].substr(8);break;case 13:r.addTask(a[s-1],a[s]),this.$=`task`;break}},table:[{3:1,4:[1,2]},{1:[3]},e(t,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:n,12:r,14:i,16:a,17:o,18:s},e(t,[2,7],{1:[2,1]}),e(t,[2,3]),{9:15,11:n,12:r,14:i,16:a,17:o,18:s},e(t,[2,5]),e(t,[2,6]),e(t,[2,8]),{13:[1,16]},{15:[1,17]},e(t,[2,11]),e(t,[2,12]),{19:[1,18]},e(t,[2,4]),e(t,[2,9]),e(t,[2,10]),e(t,[2,13])],defaultActions:{},parseError:function(e,t){if(t.recoverable)this.trace(e);else{var n=Error(e);throw n.hash=t,n}},parse:function(e){var t=this,n=[0],r=[],i=[null],a=[],o=this.table,s=``,c=0,l=0,u=2,d=1,f=a.slice.call(arguments,1),p=Object.create(this.lexer),m={yy:{}};for(var h in this.yy)Object.prototype.hasOwnProperty.call(this.yy,h)&&(m.yy[h]=this.yy[h]);p.setInput(e,m.yy),m.yy.lexer=p,m.yy.parser=this,p.yylloc===void 0&&(p.yylloc={});var g=p.yylloc;a.push(g);var _=p.options&&p.options.ranges;typeof m.yy.parseError==`function`?this.parseError=m.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function v(){var e=r.pop()||p.lex()||d;return typeof e!=`number`&&(e instanceof Array&&(r=e,e=r.pop()),e=t.symbols_[e]||e),e}for(var y,b,x,S,C={},w,T,E,D;;){if(b=n[n.length-1],this.defaultActions[b]?x=this.defaultActions[b]:(y??=v(),x=o[b]&&o[b][y]),x===void 0||!x.length||!x[0]){var O=``;for(w in D=[],o[b])this.terminals_[w]&&w>u&&D.push(`'`+this.terminals_[w]+`'`);O=p.showPosition?`Parse error on line `+(c+1)+`:
`+p.showPosition()+`
Expecting `+D.join(`, `)+`, got '`+(this.terminals_[y]||y)+`'`:`Parse error on line `+(c+1)+`: Unexpected `+(y==d?`end of input`:`'`+(this.terminals_[y]||y)+`'`),this.parseError(O,{text:p.match,token:this.terminals_[y]||y,line:p.yylineno,loc:g,expected:D})}if(x[0]instanceof Array&&x.length>1)throw Error(`Parse Error: multiple actions possible at state: `+b+`, token: `+y);switch(x[0]){case 1:n.push(y),i.push(p.yytext),a.push(p.yylloc),n.push(x[1]),y=null,l=p.yyleng,s=p.yytext,c=p.yylineno,g=p.yylloc;break;case 2:if(T=this.productions_[x[1]][1],C.$=i[i.length-T],C._$={first_line:a[a.length-(T||1)].first_line,last_line:a[a.length-1].last_line,first_column:a[a.length-(T||1)].first_column,last_column:a[a.length-1].last_column},_&&(C._$.range=[a[a.length-(T||1)].range[0],a[a.length-1].range[1]]),S=this.performAction.apply(C,[s,l,c,m.yy,x[1],i,a].concat(f)),S!==void 0)return S;T&&(n=n.slice(0,-1*T*2),i=i.slice(0,-1*T),a=a.slice(0,-1*T)),n.push(this.productions_[x[1]][0]),i.push(C.$),a.push(C._$),E=o[n[n.length-2]][n[n.length-1]],n.push(E);break;case 3:return!0}}return!0}};c.lexer=function(){return{EOF:1,parseError:function(e,t){if(this.yy.parser)this.yy.parser.parseError(e,t);else throw Error(e)},setInput:function(e,t){return this.yy=t||this.yy||{},this._input=e,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match=``,this.conditionStack=[`INITIAL`],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var e=this._input[0];return this.yytext+=e,this.yyleng++,this.offset++,this.match+=e,this.matched+=e,e.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),e},unput:function(e){var t=e.length,n=e.split(/(?:\r\n?|\n)/g);this._input=e+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-t),this.offset-=t;var r=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),n.length-1&&(this.yylineno-=n.length-1);var i=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:n?(n.length===r.length?this.yylloc.first_column:0)+r[r.length-n.length].length-n[0].length:this.yylloc.first_column-t},this.options.ranges&&(this.yylloc.range=[i[0],i[0]+this.yyleng-t]),this.yyleng=this.yytext.length,this},more:function(){return this._more=!0,this},reject:function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError(`Lexical error on line `+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:``,token:null,line:this.yylineno});return this},less:function(e){this.unput(this.match.slice(e))},pastInput:function(){var e=this.matched.substr(0,this.matched.length-this.match.length);return(e.length>20?`...`:``)+e.substr(-20).replace(/\n/g,``)},upcomingInput:function(){var e=this.match;return e.length<20&&(e+=this._input.substr(0,20-e.length)),(e.substr(0,20)+(e.length>20?`...`:``)).replace(/\n/g,``)},showPosition:function(){var e=this.pastInput(),t=Array(e.length+1).join(`-`);return e+this.upcomingInput()+`
`+t+`^`},test_match:function(e,t){var n,r,i;if(this.options.backtrack_lexer&&(i={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(i.yylloc.range=this.yylloc.range.slice(0))),r=e[0].match(/(?:\r\n?|\n).*/g),r&&(this.yylineno+=r.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:r?r[r.length-1].length-r[r.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+e[0].length},this.yytext+=e[0],this.match+=e[0],this.matches=e,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(e[0].length),this.matched+=e[0],n=this.performAction.call(this,this.yy,this,t,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),n)return n;if(this._backtrack){for(var a in i)this[a]=i[a];return!1}return!1},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0);var e,t,n,r;this._more||(this.yytext=``,this.match=``);for(var i=this._currentRules(),a=0;a<i.length;a++)if(n=this._input.match(this.rules[i[a]]),n&&(!t||n[0].length>t[0].length)){if(t=n,r=a,this.options.backtrack_lexer){if(e=this.test_match(n,i[a]),e!==!1)return e;if(this._backtrack){t=!1;continue}else return!1}else if(!this.options.flex)break}return t?(e=this.test_match(t,i[r]),e===!1?!1:e):this._input===``?this.EOF:this.parseError(`Lexical error on line `+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:``,token:null,line:this.yylineno})},lex:function(){return this.next()||this.lex()},begin:function(e){this.conditionStack.push(e)},popState:function(){return this.conditionStack.length-1>0?this.conditionStack.pop():this.conditionStack[0]},_currentRules:function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},topState:function(e){return e=this.conditionStack.length-1-Math.abs(e||0),e>=0?this.conditionStack[e]:`INITIAL`},pushState:function(e){this.begin(e)},stateStackSize:function(){return this.conditionStack.length},options:{"case-insensitive":!0},performAction:function(e,t,n,r){switch(n){case 0:break;case 1:break;case 2:return 10;case 3:break;case 4:break;case 5:return 4;case 6:return 11;case 7:return this.begin(`acc_title`),12;case 8:return this.popState(),`acc_title_value`;case 9:return this.begin(`acc_descr`),14;case 10:return this.popState(),`acc_descr_value`;case 11:this.begin(`acc_descr_multiline`);break;case 12:this.popState();break;case 13:return`acc_descr_multiline_value`;case 14:return 17;case 15:return 18;case 16:return 19;case 17:return`:`;case 18:return 6;case 19:return`INVALID`}},rules:[/^(?:%(?!\{)[^\n]*)/i,/^(?:[^\}]%%[^\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:#[^\n]*)/i,/^(?:journey\b)/i,/^(?:title\s[^#\n;]+)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:section\s[^#:\n;]+)/i,/^(?:[^#:\n;]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[12,13],inclusive:!1},acc_descr:{rules:[10],inclusive:!1},acc_title:{rules:[8],inclusive:!1},INITIAL:{rules:[0,1,2,3,4,5,6,7,9,11,14,15,16,17,18,19],inclusive:!0}}}}();function l(){this.yy={}}return l.prototype=c,c.Parser=l,new l}();v.parser=v;var y=v,b=``,x=[],S=[],C=[],w=function(){x.length=0,S.length=0,b=``,C.length=0,f()},T=function(e){b=e,x.push(e)},E=function(){return x},D=function(){let e=j(),t=0;for(;!e&&t<100;)e=j(),t++;return S.push(...C),S},O=function(){let e=[];return S.forEach(t=>{t.people&&e.push(...t.people)}),[...new Set(e)].sort()},k=function(e,t){let n=t.substr(1).split(`:`),r=0,i=[];n.length===1?(r=Number(n[0]),i=[]):(r=Number(n[0]),i=n[1].split(`,`));let a=i.map(e=>e.trim()),o={section:b,type:b,people:a,task:e,score:r};C.push(o)},A=function(e){let t={section:b,type:b,description:e,task:e,classes:[]};S.push(t)},j=function(){let e=function(e){return C[e].processed},t=!0;for(let[n,r]of C.entries())e(n),t&&=r.processed;return t},M={getConfig:()=>c().journey,clear:w,setDiagramTitle:a,getDiagramTitle:p,setAccTitle:s,getAccTitle:l,setAccDescription:o,getAccDescription:u,addSection:T,getSections:E,getTasks:D,addTask:k,addTaskOrg:A,getActors:function(){return O()}},N=e=>`.label {
    font-family: 'trebuchet ms', verdana, arial, sans-serif;
    font-family: var(--mermaid-font-family);
    color: ${e.textColor};
  }
  .mouth {
    stroke: #666;
  }

  line {
    stroke: ${e.textColor}
  }

  .legend {
    fill: ${e.textColor};
  }

  .label text {
    fill: #333;
  }
  .label {
    color: ${e.textColor}
  }

  .face {
    ${e.faceColor?`fill: ${e.faceColor}`:`fill: #FFF8DC`};
    stroke: #999;
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
    stroke-width: 1.5px;
  }

  .flowchart-link {
    stroke: ${e.lineColor};
    fill: none;
  }

  .edgeLabel {
    background-color: ${e.edgeLabelBackground};
    rect {
      opacity: 0.5;
    }
    text-align: center;
  }

  .cluster rect {
  }

  .cluster text {
    fill: ${e.titleColor};
  }

  div.mermaidTooltip {
    position: absolute;
    text-align: center;
    max-width: 200px;
    padding: 2px;
    font-family: 'trebuchet ms', verdana, arial, sans-serif;
    font-family: var(--mermaid-font-family);
    font-size: 12px;
    background: ${e.tertiaryColor};
    border: 1px solid ${e.border2};
    border-radius: 2px;
    pointer-events: none;
    z-index: 100;
  }

  .task-type-0, .section-type-0  {
    ${e.fillType0?`fill: ${e.fillType0}`:``};
  }
  .task-type-1, .section-type-1  {
    ${e.fillType0?`fill: ${e.fillType1}`:``};
  }
  .task-type-2, .section-type-2  {
    ${e.fillType0?`fill: ${e.fillType2}`:``};
  }
  .task-type-3, .section-type-3  {
    ${e.fillType0?`fill: ${e.fillType3}`:``};
  }
  .task-type-4, .section-type-4  {
    ${e.fillType0?`fill: ${e.fillType4}`:``};
  }
  .task-type-5, .section-type-5  {
    ${e.fillType0?`fill: ${e.fillType5}`:``};
  }
  .task-type-6, .section-type-6  {
    ${e.fillType0?`fill: ${e.fillType6}`:``};
  }
  .task-type-7, .section-type-7  {
    ${e.fillType0?`fill: ${e.fillType7}`:``};
  }

  .actor-0 {
    ${e.actor0?`fill: ${e.actor0}`:``};
  }
  .actor-1 {
    ${e.actor1?`fill: ${e.actor1}`:``};
  }
  .actor-2 {
    ${e.actor2?`fill: ${e.actor2}`:``};
  }
  .actor-3 {
    ${e.actor3?`fill: ${e.actor3}`:``};
  }
  .actor-4 {
    ${e.actor4?`fill: ${e.actor4}`:``};
  }
  .actor-5 {
    ${e.actor5?`fill: ${e.actor5}`:``};
  }
`,P=function(e,t){return h(e,t)},F=function(e,t){let n=e.append(`circle`).attr(`cx`,t.cx).attr(`cy`,t.cy).attr(`class`,`face`).attr(`r`,15).attr(`stroke-width`,2).attr(`overflow`,`visible`),i=e.append(`g`);i.append(`circle`).attr(`cx`,t.cx-15/3).attr(`cy`,t.cy-15/3).attr(`r`,1.5).attr(`stroke-width`,2).attr(`fill`,`#666`).attr(`stroke`,`#666`),i.append(`circle`).attr(`cx`,t.cx+15/3).attr(`cy`,t.cy-15/3).attr(`r`,1.5).attr(`stroke-width`,2).attr(`fill`,`#666`).attr(`stroke`,`#666`);function a(e){let n=r().startAngle(Math.PI/2).endAngle(3*(Math.PI/2)).innerRadius(15/2).outerRadius(15/2.2);e.append(`path`).attr(`class`,`mouth`).attr(`d`,n).attr(`transform`,`translate(`+t.cx+`,`+(t.cy+2)+`)`)}function o(e){let n=r().startAngle(3*Math.PI/2).endAngle(5*(Math.PI/2)).innerRadius(15/2).outerRadius(15/2.2);e.append(`path`).attr(`class`,`mouth`).attr(`d`,n).attr(`transform`,`translate(`+t.cx+`,`+(t.cy+7)+`)`)}function s(e){e.append(`line`).attr(`class`,`mouth`).attr(`stroke`,2).attr(`x1`,t.cx-5).attr(`y1`,t.cy+7).attr(`x2`,t.cx+5).attr(`y2`,t.cy+7).attr(`class`,`mouth`).attr(`stroke-width`,`1px`).attr(`stroke`,`#666`)}return t.score>3?a(i):t.score<3?o(i):s(i),n},I=function(e,t){let n=e.append(`circle`);return n.attr(`cx`,t.cx),n.attr(`cy`,t.cy),n.attr(`class`,`actor-`+t.pos),n.attr(`fill`,t.fill),n.attr(`stroke`,t.stroke),n.attr(`r`,t.r),n.class!==void 0&&n.attr(`class`,n.class),t.title!==void 0&&n.append(`title`).text(t.title),n},L=function(e,t){return m(e,t)},R=function(e,t){function n(e,t,n,r,i){return e+`,`+t+` `+(e+n)+`,`+t+` `+(e+n)+`,`+(t+r-i)+` `+(e+n-i*1.2)+`,`+(t+r)+` `+e+`,`+(t+r)}let r=e.append(`polygon`);r.attr(`points`,n(t.x,t.y,50,20,7)),r.attr(`class`,`labelBox`),t.y+=t.labelMargin,t.x+=.5*t.labelMargin,L(e,t)},z=function(e,t,n){let r=e.append(`g`),i=g();i.x=t.x,i.y=t.y,i.fill=t.fill,i.width=n.width*t.taskCount+n.diagramMarginX*(t.taskCount-1),i.height=n.height,i.class=`journey-section section-type-`+t.num,i.rx=3,i.ry=3,P(r,i),U(n)(t.text,r,i.x,i.y,i.width,i.height,{class:`journey-section section-type-`+t.num},n,t.colour)},B=-1,V=function(e,t,n){let r=t.x+n.width/2,i=e.append(`g`);B++,i.append(`line`).attr(`id`,`task`+B).attr(`x1`,r).attr(`y1`,t.y).attr(`x2`,r).attr(`y2`,450).attr(`class`,`task-line`).attr(`stroke-width`,`1px`).attr(`stroke-dasharray`,`4 2`).attr(`stroke`,`#666`),F(i,{cx:r,cy:300+(5-t.score)*30,score:t.score});let a=g();a.x=t.x,a.y=t.y,a.fill=t.fill,a.width=n.width,a.height=n.height,a.class=`task task-type-`+t.num,a.rx=3,a.ry=3,P(i,a);let o=t.x+14;t.people.forEach(e=>{let n=t.actors[e].color;I(i,{cx:o,cy:t.y,r:7,fill:n,stroke:`#000`,title:e,pos:t.actors[e].position}),o+=10}),U(n)(t.task,i,a.x,a.y,a.width,a.height,{class:`task`},n,t.colour)},H=function(e,t){_(e,t)},U=function(){function e(e,t,n,i,a,o,s,c){r(t.append(`text`).attr(`x`,n+a/2).attr(`y`,i+o/2+5).style(`font-color`,c).style(`text-anchor`,`middle`).text(e),s)}function t(e,t,n,i,a,o,s,c,l){let{taskFontSize:u,taskFontFamily:d}=c,f=e.split(/<br\s*\/?>/gi);for(let e=0;e<f.length;e++){let c=e*u-u*(f.length-1)/2,p=t.append(`text`).attr(`x`,n+a/2).attr(`y`,i).attr(`fill`,l).style(`text-anchor`,`middle`).style(`font-size`,u).style(`font-family`,d);p.append(`tspan`).attr(`x`,n+a/2).attr(`dy`,c).text(f[e]),p.attr(`y`,i+o/2).attr(`dominant-baseline`,`central`).attr(`alignment-baseline`,`central`),r(p,s)}}function n(e,n,i,a,o,s,c,l){let u=n.append(`switch`),d=u.append(`foreignObject`).attr(`x`,i).attr(`y`,a).attr(`width`,o).attr(`height`,s).attr(`position`,`fixed`).append(`xhtml:div`).style(`display`,`table`).style(`height`,`100%`).style(`width`,`100%`);d.append(`div`).attr(`class`,`label`).style(`display`,`table-cell`).style(`text-align`,`center`).style(`vertical-align`,`middle`).text(e),t(e,u,i,a,o,s,c,l),r(d,c)}function r(e,t){for(let n in t)n in t&&e.attr(n,t[n])}return function(r){return r.textPlacement===`fo`?n:r.textPlacement===`old`?e:t}}(),W={drawRect:P,drawCircle:I,drawSection:z,drawText:L,drawLabel:R,drawTask:V,drawBackgroundRect:H,initGraphics:function(e){e.append(`defs`).append(`marker`).attr(`id`,`arrowhead`).attr(`refX`,5).attr(`refY`,2).attr(`markerWidth`,6).attr(`markerHeight`,4).attr(`orient`,`auto`).append(`path`).attr(`d`,`M 0,0 V 4 L6,2 Z`)}},G=function(e){Object.keys(e).forEach(function(t){J[t]=e[t]})},K={};function q(e){let t=c().journey,n=60;Object.keys(K).forEach(r=>{let i=K[r].color,a={cx:20,cy:n,r:7,fill:i,stroke:`#000`,pos:K[r].position};W.drawCircle(e,a);let o={x:40,y:n+7,fill:`#666`,text:r,textMargin:t.boxTextMargin|5};W.drawText(e,o),n+=20})}var J=c().journey,Y=J.leftMargin,ee=function(e,t,r,i){let a=c().journey,o=c().securityLevel,s;o===`sandbox`&&(s=n(`#i`+t));let l=n(o===`sandbox`?s.nodes()[0].contentDocument.body:`body`);X.init();let u=l.select(`#`+t);W.initGraphics(u);let f=i.db.getTasks(),p=i.db.getDiagramTitle(),m=i.db.getActors();for(let e in K)delete K[e];let h=0;m.forEach(e=>{K[e]={color:a.actorColours[h%a.actorColours.length],position:h},h++}),q(u),X.insert(0,0,Y,Object.keys(K).length*50),te(u,f,0);let g=X.getBounds();p&&u.append(`text`).text(p).attr(`x`,Y).attr(`font-size`,`4ex`).attr(`font-weight`,`bold`).attr(`y`,25);let _=g.stopy-g.starty+2*a.diagramMarginY,v=Y+g.stopx+2*a.diagramMarginX;d(u,_,v,a.useMaxWidth),u.append(`line`).attr(`x1`,Y).attr(`y1`,a.height*4).attr(`x2`,v-Y-4).attr(`y2`,a.height*4).attr(`stroke-width`,4).attr(`stroke`,`black`).attr(`marker-end`,`url(#arrowhead)`);let y=p?70:0;u.attr(`viewBox`,`${g.startx} -25 ${v} ${_+y}`),u.attr(`preserveAspectRatio`,`xMinYMin meet`),u.attr(`height`,_+y+25)},X={data:{startx:void 0,stopx:void 0,starty:void 0,stopy:void 0},verticalPos:0,sequenceItems:[],init:function(){this.sequenceItems=[],this.data={startx:void 0,stopx:void 0,starty:void 0,stopy:void 0},this.verticalPos=0},updateVal:function(e,t,n,r){e[t]===void 0?e[t]=n:e[t]=r(n,e[t])},updateBounds:function(e,t,n,r){let i=c().journey,a=this,o=0;function s(s){return function(c){o++;let l=a.sequenceItems.length-o+1;a.updateVal(c,`starty`,t-l*i.boxMargin,Math.min),a.updateVal(c,`stopy`,r+l*i.boxMargin,Math.max),a.updateVal(X.data,`startx`,e-l*i.boxMargin,Math.min),a.updateVal(X.data,`stopx`,n+l*i.boxMargin,Math.max),s!==`activation`&&(a.updateVal(c,`startx`,e-l*i.boxMargin,Math.min),a.updateVal(c,`stopx`,n+l*i.boxMargin,Math.max),a.updateVal(X.data,`starty`,t-l*i.boxMargin,Math.min),a.updateVal(X.data,`stopy`,r+l*i.boxMargin,Math.max))}}this.sequenceItems.forEach(s())},insert:function(e,t,n,r){let i=Math.min(e,n),a=Math.max(e,n),o=Math.min(t,r),s=Math.max(t,r);this.updateVal(X.data,`startx`,i,Math.min),this.updateVal(X.data,`starty`,o,Math.min),this.updateVal(X.data,`stopx`,a,Math.max),this.updateVal(X.data,`stopy`,s,Math.max),this.updateBounds(i,o,a,s)},bumpVerticalPos:function(e){this.verticalPos+=e,this.data.stopy=this.verticalPos},getVerticalPos:function(){return this.verticalPos},getBounds:function(){return this.data}},Z=J.sectionFills,Q=J.sectionColours,te=function(e,t,n){let r=c().journey,i=``,a=n+(r.height*2+r.diagramMarginY),o=0,s=`#CCC`,l=`black`,u=0;for(let[n,c]of t.entries()){if(i!==c.section){s=Z[o%Z.length],u=o%Z.length,l=Q[o%Q.length];let a=0,d=c.section;for(let e=n;e<t.length&&t[e].section==d;e++)a+=1;let f={x:n*r.taskMargin+n*r.width+Y,y:50,text:c.section,fill:s,num:u,colour:l,taskCount:a};W.drawSection(e,f,r),i=c.section,o++}let d=c.people.reduce((e,t)=>(K[t]&&(e[t]=K[t]),e),{});c.x=n*r.taskMargin+n*r.width+Y,c.y=a,c.width=r.diagramMarginX,c.height=r.diagramMarginY,c.colour=l,c.fill=s,c.num=u,c.actors=d,W.drawTask(e,c,r),X.insert(c.x,c.y,c.x+c.width+r.taskMargin,450)}},$={setConf:G,draw:ee},ne={parser:y,db:M,renderer:$,styles:N,init:e=>{$.setConf(e.journey),M.clear()}};export{ne as diagram};