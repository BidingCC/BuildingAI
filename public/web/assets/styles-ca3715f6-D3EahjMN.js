import{F as e,M as t,N as n,T as r,_ as i,g as a,h as o,m as s,o as c,s as l,y as u}from"./mermaid-7ea9cbd6-CTdxebQd.js";var d=function(){var e=function(e,t,n,r){for(n||={},r=e.length;r--;n[e[r]]=t);return n},t=[1,2],n=[1,3],r=[1,4],i=[2,4],a=[1,9],o=[1,11],s=[1,15],c=[1,16],l=[1,17],u=[1,18],d=[1,30],f=[1,19],p=[1,20],m=[1,21],h=[1,22],g=[1,23],_=[1,25],v=[1,26],y=[1,27],b=[1,28],x=[1,29],S=[1,32],C=[1,33],w=[1,34],T=[1,35],E=[1,31],D=[1,4,5,15,16,18,20,21,23,24,25,26,27,28,32,34,36,37,41,44,45,46,47,50],O=[1,4,5,13,14,15,16,18,20,21,23,24,25,26,27,28,32,34,36,37,41,44,45,46,47,50],k=[4,5,15,16,18,20,21,23,24,25,26,27,28,32,34,36,37,41,44,45,46,47,50],A={trace:function(){},yy:{},symbols_:{error:2,start:3,SPACE:4,NL:5,SD:6,document:7,line:8,statement:9,classDefStatement:10,cssClassStatement:11,idStatement:12,DESCR:13,"-->":14,HIDE_EMPTY:15,scale:16,WIDTH:17,COMPOSIT_STATE:18,STRUCT_START:19,STRUCT_STOP:20,STATE_DESCR:21,AS:22,ID:23,FORK:24,JOIN:25,CHOICE:26,CONCURRENT:27,note:28,notePosition:29,NOTE_TEXT:30,direction:31,acc_title:32,acc_title_value:33,acc_descr:34,acc_descr_value:35,acc_descr_multiline_value:36,classDef:37,CLASSDEF_ID:38,CLASSDEF_STYLEOPTS:39,DEFAULT:40,class:41,CLASSENTITY_IDS:42,STYLECLASS:43,direction_tb:44,direction_bt:45,direction_rl:46,direction_lr:47,eol:48,";":49,EDGE_STATE:50,STYLE_SEPARATOR:51,left_of:52,right_of:53,$accept:0,$end:1},terminals_:{2:`error`,4:`SPACE`,5:`NL`,6:`SD`,13:`DESCR`,14:`-->`,15:`HIDE_EMPTY`,16:`scale`,17:`WIDTH`,18:`COMPOSIT_STATE`,19:`STRUCT_START`,20:`STRUCT_STOP`,21:`STATE_DESCR`,22:`AS`,23:`ID`,24:`FORK`,25:`JOIN`,26:`CHOICE`,27:`CONCURRENT`,28:`note`,30:`NOTE_TEXT`,32:`acc_title`,33:`acc_title_value`,34:`acc_descr`,35:`acc_descr_value`,36:`acc_descr_multiline_value`,37:`classDef`,38:`CLASSDEF_ID`,39:`CLASSDEF_STYLEOPTS`,40:`DEFAULT`,41:`class`,42:`CLASSENTITY_IDS`,43:`STYLECLASS`,44:`direction_tb`,45:`direction_bt`,46:`direction_rl`,47:`direction_lr`,49:`;`,50:`EDGE_STATE`,51:`STYLE_SEPARATOR`,52:`left_of`,53:`right_of`},productions_:[0,[3,2],[3,2],[3,2],[7,0],[7,2],[8,2],[8,1],[8,1],[9,1],[9,1],[9,1],[9,2],[9,3],[9,4],[9,1],[9,2],[9,1],[9,4],[9,3],[9,6],[9,1],[9,1],[9,1],[9,1],[9,4],[9,4],[9,1],[9,2],[9,2],[9,1],[10,3],[10,3],[11,3],[31,1],[31,1],[31,1],[31,1],[48,1],[48,1],[12,1],[12,1],[12,3],[12,3],[29,1],[29,1]],performAction:function(e,t,n,r,i,a,o){var s=a.length-1;switch(i){case 3:return r.setRootDoc(a[s]),a[s];case 4:this.$=[];break;case 5:a[s]!=`nl`&&(a[s-1].push(a[s]),this.$=a[s-1]);break;case 6:case 7:this.$=a[s];break;case 8:this.$=`nl`;break;case 11:this.$=a[s];break;case 12:let e=a[s-1];e.description=r.trimColon(a[s]),this.$=e;break;case 13:this.$={stmt:`relation`,state1:a[s-2],state2:a[s]};break;case 14:let t=r.trimColon(a[s]);this.$={stmt:`relation`,state1:a[s-3],state2:a[s-1],description:t};break;case 18:this.$={stmt:`state`,id:a[s-3],type:`default`,description:``,doc:a[s-1]};break;case 19:var c=a[s],l=a[s-2].trim();if(a[s].match(`:`)){var u=a[s].split(`:`);c=u[0],l=[l,u[1]]}this.$={stmt:`state`,id:c,type:`default`,description:l};break;case 20:this.$={stmt:`state`,id:a[s-3],type:`default`,description:a[s-5],doc:a[s-1]};break;case 21:this.$={stmt:`state`,id:a[s],type:`fork`};break;case 22:this.$={stmt:`state`,id:a[s],type:`join`};break;case 23:this.$={stmt:`state`,id:a[s],type:`choice`};break;case 24:this.$={stmt:`state`,id:r.getDividerId(),type:`divider`};break;case 25:this.$={stmt:`state`,id:a[s-1].trim(),note:{position:a[s-2].trim(),text:a[s].trim()}};break;case 28:this.$=a[s].trim(),r.setAccTitle(this.$);break;case 29:case 30:this.$=a[s].trim(),r.setAccDescription(this.$);break;case 31:case 32:this.$={stmt:`classDef`,id:a[s-1].trim(),classes:a[s].trim()};break;case 33:this.$={stmt:`applyClass`,id:a[s-1].trim(),styleClass:a[s].trim()};break;case 34:r.setDirection(`TB`),this.$={stmt:`dir`,value:`TB`};break;case 35:r.setDirection(`BT`),this.$={stmt:`dir`,value:`BT`};break;case 36:r.setDirection(`RL`),this.$={stmt:`dir`,value:`RL`};break;case 37:r.setDirection(`LR`),this.$={stmt:`dir`,value:`LR`};break;case 40:case 41:this.$={stmt:`state`,id:a[s].trim(),type:`default`,description:``};break;case 42:this.$={stmt:`state`,id:a[s-2].trim(),classes:[a[s].trim()],type:`default`,description:``};break;case 43:this.$={stmt:`state`,id:a[s-2].trim(),classes:[a[s].trim()],type:`default`,description:``};break}},table:[{3:1,4:t,5:n,6:r},{1:[3]},{3:5,4:t,5:n,6:r},{3:6,4:t,5:n,6:r},e([1,4,5,15,16,18,21,23,24,25,26,27,28,32,34,36,37,41,44,45,46,47,50],i,{7:7}),{1:[2,1]},{1:[2,2]},{1:[2,3],4:a,5:o,8:8,9:10,10:12,11:13,12:14,15:s,16:c,18:l,21:u,23:d,24:f,25:p,26:m,27:h,28:g,31:24,32:_,34:v,36:y,37:b,41:x,44:S,45:C,46:w,47:T,50:E},e(D,[2,5]),{9:36,10:12,11:13,12:14,15:s,16:c,18:l,21:u,23:d,24:f,25:p,26:m,27:h,28:g,31:24,32:_,34:v,36:y,37:b,41:x,44:S,45:C,46:w,47:T,50:E},e(D,[2,7]),e(D,[2,8]),e(D,[2,9]),e(D,[2,10]),e(D,[2,11],{13:[1,37],14:[1,38]}),e(D,[2,15]),{17:[1,39]},e(D,[2,17],{19:[1,40]}),{22:[1,41]},e(D,[2,21]),e(D,[2,22]),e(D,[2,23]),e(D,[2,24]),{29:42,30:[1,43],52:[1,44],53:[1,45]},e(D,[2,27]),{33:[1,46]},{35:[1,47]},e(D,[2,30]),{38:[1,48],40:[1,49]},{42:[1,50]},e(O,[2,40],{51:[1,51]}),e(O,[2,41],{51:[1,52]}),e(D,[2,34]),e(D,[2,35]),e(D,[2,36]),e(D,[2,37]),e(D,[2,6]),e(D,[2,12]),{12:53,23:d,50:E},e(D,[2,16]),e(k,i,{7:54}),{23:[1,55]},{23:[1,56]},{22:[1,57]},{23:[2,44]},{23:[2,45]},e(D,[2,28]),e(D,[2,29]),{39:[1,58]},{39:[1,59]},{43:[1,60]},{23:[1,61]},{23:[1,62]},e(D,[2,13],{13:[1,63]}),{4:a,5:o,8:8,9:10,10:12,11:13,12:14,15:s,16:c,18:l,20:[1,64],21:u,23:d,24:f,25:p,26:m,27:h,28:g,31:24,32:_,34:v,36:y,37:b,41:x,44:S,45:C,46:w,47:T,50:E},e(D,[2,19],{19:[1,65]}),{30:[1,66]},{23:[1,67]},e(D,[2,31]),e(D,[2,32]),e(D,[2,33]),e(O,[2,42]),e(O,[2,43]),e(D,[2,14]),e(D,[2,18]),e(k,i,{7:68}),e(D,[2,25]),e(D,[2,26]),{4:a,5:o,8:8,9:10,10:12,11:13,12:14,15:s,16:c,18:l,20:[1,69],21:u,23:d,24:f,25:p,26:m,27:h,28:g,31:24,32:_,34:v,36:y,37:b,41:x,44:S,45:C,46:w,47:T,50:E},e(D,[2,20])],defaultActions:{5:[2,1],6:[2,2],44:[2,44],45:[2,45]},parseError:function(e,t){if(t.recoverable)this.trace(e);else{var n=Error(e);throw n.hash=t,n}},parse:function(e){var t=this,n=[0],r=[],i=[null],a=[],o=this.table,s=``,c=0,l=0,u=2,d=1,f=a.slice.call(arguments,1),p=Object.create(this.lexer),m={yy:{}};for(var h in this.yy)Object.prototype.hasOwnProperty.call(this.yy,h)&&(m.yy[h]=this.yy[h]);p.setInput(e,m.yy),m.yy.lexer=p,m.yy.parser=this,p.yylloc===void 0&&(p.yylloc={});var g=p.yylloc;a.push(g);var _=p.options&&p.options.ranges;typeof m.yy.parseError==`function`?this.parseError=m.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function v(){var e=r.pop()||p.lex()||d;return typeof e!=`number`&&(e instanceof Array&&(r=e,e=r.pop()),e=t.symbols_[e]||e),e}for(var y,b,x,S,C={},w,T,E,D;;){if(b=n[n.length-1],this.defaultActions[b]?x=this.defaultActions[b]:(y??=v(),x=o[b]&&o[b][y]),x===void 0||!x.length||!x[0]){var O=``;for(w in D=[],o[b])this.terminals_[w]&&w>u&&D.push(`'`+this.terminals_[w]+`'`);O=p.showPosition?`Parse error on line `+(c+1)+`:
`+p.showPosition()+`
Expecting `+D.join(`, `)+`, got '`+(this.terminals_[y]||y)+`'`:`Parse error on line `+(c+1)+`: Unexpected `+(y==d?`end of input`:`'`+(this.terminals_[y]||y)+`'`),this.parseError(O,{text:p.match,token:this.terminals_[y]||y,line:p.yylineno,loc:g,expected:D})}if(x[0]instanceof Array&&x.length>1)throw Error(`Parse Error: multiple actions possible at state: `+b+`, token: `+y);switch(x[0]){case 1:n.push(y),i.push(p.yytext),a.push(p.yylloc),n.push(x[1]),y=null,l=p.yyleng,s=p.yytext,c=p.yylineno,g=p.yylloc;break;case 2:if(T=this.productions_[x[1]][1],C.$=i[i.length-T],C._$={first_line:a[a.length-(T||1)].first_line,last_line:a[a.length-1].last_line,first_column:a[a.length-(T||1)].first_column,last_column:a[a.length-1].last_column},_&&(C._$.range=[a[a.length-(T||1)].range[0],a[a.length-1].range[1]]),S=this.performAction.apply(C,[s,l,c,m.yy,x[1],i,a].concat(f)),S!==void 0)return S;T&&(n=n.slice(0,-1*T*2),i=i.slice(0,-1*T),a=a.slice(0,-1*T)),n.push(this.productions_[x[1]][0]),i.push(C.$),a.push(C._$),E=o[n[n.length-2]][n[n.length-1]],n.push(E);break;case 3:return!0}}return!0}};A.lexer=function(){return{EOF:1,parseError:function(e,t){if(this.yy.parser)this.yy.parser.parseError(e,t);else throw Error(e)},setInput:function(e,t){return this.yy=t||this.yy||{},this._input=e,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match=``,this.conditionStack=[`INITIAL`],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var e=this._input[0];return this.yytext+=e,this.yyleng++,this.offset++,this.match+=e,this.matched+=e,e.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),e},unput:function(e){var t=e.length,n=e.split(/(?:\r\n?|\n)/g);this._input=e+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-t),this.offset-=t;var r=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),n.length-1&&(this.yylineno-=n.length-1);var i=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:n?(n.length===r.length?this.yylloc.first_column:0)+r[r.length-n.length].length-n[0].length:this.yylloc.first_column-t},this.options.ranges&&(this.yylloc.range=[i[0],i[0]+this.yyleng-t]),this.yyleng=this.yytext.length,this},more:function(){return this._more=!0,this},reject:function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError(`Lexical error on line `+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:``,token:null,line:this.yylineno});return this},less:function(e){this.unput(this.match.slice(e))},pastInput:function(){var e=this.matched.substr(0,this.matched.length-this.match.length);return(e.length>20?`...`:``)+e.substr(-20).replace(/\n/g,``)},upcomingInput:function(){var e=this.match;return e.length<20&&(e+=this._input.substr(0,20-e.length)),(e.substr(0,20)+(e.length>20?`...`:``)).replace(/\n/g,``)},showPosition:function(){var e=this.pastInput(),t=Array(e.length+1).join(`-`);return e+this.upcomingInput()+`
`+t+`^`},test_match:function(e,t){var n,r,i;if(this.options.backtrack_lexer&&(i={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(i.yylloc.range=this.yylloc.range.slice(0))),r=e[0].match(/(?:\r\n?|\n).*/g),r&&(this.yylineno+=r.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:r?r[r.length-1].length-r[r.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+e[0].length},this.yytext+=e[0],this.match+=e[0],this.matches=e,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(e[0].length),this.matched+=e[0],n=this.performAction.call(this,this.yy,this,t,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),n)return n;if(this._backtrack){for(var a in i)this[a]=i[a];return!1}return!1},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0);var e,t,n,r;this._more||(this.yytext=``,this.match=``);for(var i=this._currentRules(),a=0;a<i.length;a++)if(n=this._input.match(this.rules[i[a]]),n&&(!t||n[0].length>t[0].length)){if(t=n,r=a,this.options.backtrack_lexer){if(e=this.test_match(n,i[a]),e!==!1)return e;if(this._backtrack){t=!1;continue}else return!1}else if(!this.options.flex)break}return t?(e=this.test_match(t,i[r]),e===!1?!1:e):this._input===``?this.EOF:this.parseError(`Lexical error on line `+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:``,token:null,line:this.yylineno})},lex:function(){return this.next()||this.lex()},begin:function(e){this.conditionStack.push(e)},popState:function(){return this.conditionStack.length-1>0?this.conditionStack.pop():this.conditionStack[0]},_currentRules:function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},topState:function(e){return e=this.conditionStack.length-1-Math.abs(e||0),e>=0?this.conditionStack[e]:`INITIAL`},pushState:function(e){this.begin(e)},stateStackSize:function(){return this.conditionStack.length},options:{"case-insensitive":!0},performAction:function(e,t,n,r){switch(n){case 0:return 40;case 1:return 44;case 2:return 45;case 3:return 46;case 4:return 47;case 5:break;case 6:break;case 7:return 5;case 8:break;case 9:break;case 10:break;case 11:break;case 12:return this.pushState(`SCALE`),16;case 13:return 17;case 14:this.popState();break;case 15:return this.begin(`acc_title`),32;case 16:return this.popState(),`acc_title_value`;case 17:return this.begin(`acc_descr`),34;case 18:return this.popState(),`acc_descr_value`;case 19:this.begin(`acc_descr_multiline`);break;case 20:this.popState();break;case 21:return`acc_descr_multiline_value`;case 22:return this.pushState(`CLASSDEF`),37;case 23:return this.popState(),this.pushState(`CLASSDEFID`),`DEFAULT_CLASSDEF_ID`;case 24:return this.popState(),this.pushState(`CLASSDEFID`),38;case 25:return this.popState(),39;case 26:return this.pushState(`CLASS`),41;case 27:return this.popState(),this.pushState(`CLASS_STYLE`),42;case 28:return this.popState(),43;case 29:return this.pushState(`SCALE`),16;case 30:return 17;case 31:this.popState();break;case 32:this.pushState(`STATE`);break;case 33:return this.popState(),t.yytext=t.yytext.slice(0,-8).trim(),24;case 34:return this.popState(),t.yytext=t.yytext.slice(0,-8).trim(),25;case 35:return this.popState(),t.yytext=t.yytext.slice(0,-10).trim(),26;case 36:return this.popState(),t.yytext=t.yytext.slice(0,-8).trim(),24;case 37:return this.popState(),t.yytext=t.yytext.slice(0,-8).trim(),25;case 38:return this.popState(),t.yytext=t.yytext.slice(0,-10).trim(),26;case 39:return 44;case 40:return 45;case 41:return 46;case 42:return 47;case 43:this.pushState(`STATE_STRING`);break;case 44:return this.pushState(`STATE_ID`),`AS`;case 45:return this.popState(),`ID`;case 46:this.popState();break;case 47:return`STATE_DESCR`;case 48:return 18;case 49:this.popState();break;case 50:return this.popState(),this.pushState(`struct`),19;case 51:break;case 52:return this.popState(),20;case 53:break;case 54:return this.begin(`NOTE`),28;case 55:return this.popState(),this.pushState(`NOTE_ID`),52;case 56:return this.popState(),this.pushState(`NOTE_ID`),53;case 57:this.popState(),this.pushState(`FLOATING_NOTE`);break;case 58:return this.popState(),this.pushState(`FLOATING_NOTE_ID`),`AS`;case 59:break;case 60:return`NOTE_TEXT`;case 61:return this.popState(),`ID`;case 62:return this.popState(),this.pushState(`NOTE_TEXT`),23;case 63:return this.popState(),t.yytext=t.yytext.substr(2).trim(),30;case 64:return this.popState(),t.yytext=t.yytext.slice(0,-8).trim(),30;case 65:return 6;case 66:return 6;case 67:return 15;case 68:return 50;case 69:return 23;case 70:return t.yytext=t.yytext.trim(),13;case 71:return 14;case 72:return 27;case 73:return 51;case 74:return 5;case 75:return`INVALID`}},rules:[/^(?:default\b)/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:%%(?!\{)[^\n]*)/i,/^(?:[^\}]%%[^\n]*)/i,/^(?:[\n]+)/i,/^(?:[\s]+)/i,/^(?:((?!\n)\s)+)/i,/^(?:#[^\n]*)/i,/^(?:%[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:classDef\s+)/i,/^(?:DEFAULT\s+)/i,/^(?:\w+\s+)/i,/^(?:[^\n]*)/i,/^(?:class\s+)/i,/^(?:(\w+)+((,\s*\w+)*))/i,/^(?:[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:state\s+)/i,/^(?:.*<<fork>>)/i,/^(?:.*<<join>>)/i,/^(?:.*<<choice>>)/i,/^(?:.*\[\[fork\]\])/i,/^(?:.*\[\[join\]\])/i,/^(?:.*\[\[choice\]\])/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:["])/i,/^(?:\s*as\s+)/i,/^(?:[^\n\{]*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:[^\n\s\{]+)/i,/^(?:\n)/i,/^(?:\{)/i,/^(?:%%(?!\{)[^\n]*)/i,/^(?:\})/i,/^(?:[\n])/i,/^(?:note\s+)/i,/^(?:left of\b)/i,/^(?:right of\b)/i,/^(?:")/i,/^(?:\s*as\s*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:[^\n]*)/i,/^(?:\s*[^:\n\s\-]+)/i,/^(?:\s*:[^:\n;]+)/i,/^(?:[\s\S]*?end note\b)/i,/^(?:stateDiagram\s+)/i,/^(?:stateDiagram-v2\s+)/i,/^(?:hide empty description\b)/i,/^(?:\[\*\])/i,/^(?:[^:\n\s\-\{]+)/i,/^(?:\s*:[^:\n;]+)/i,/^(?:-->)/i,/^(?:--)/i,/^(?::::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{LINE:{rules:[9,10],inclusive:!1},struct:{rules:[9,10,22,26,32,39,40,41,42,51,52,53,54,68,69,70,71,72],inclusive:!1},FLOATING_NOTE_ID:{rules:[61],inclusive:!1},FLOATING_NOTE:{rules:[58,59,60],inclusive:!1},NOTE_TEXT:{rules:[63,64],inclusive:!1},NOTE_ID:{rules:[62],inclusive:!1},NOTE:{rules:[55,56,57],inclusive:!1},CLASS_STYLE:{rules:[28],inclusive:!1},CLASS:{rules:[27],inclusive:!1},CLASSDEFID:{rules:[25],inclusive:!1},CLASSDEF:{rules:[23,24],inclusive:!1},acc_descr_multiline:{rules:[20,21],inclusive:!1},acc_descr:{rules:[18],inclusive:!1},acc_title:{rules:[16],inclusive:!1},SCALE:{rules:[13,14,30,31],inclusive:!1},ALIAS:{rules:[],inclusive:!1},STATE_ID:{rules:[45],inclusive:!1},STATE_STRING:{rules:[46,47],inclusive:!1},FORK_STATE:{rules:[],inclusive:!1},STATE:{rules:[9,10,33,34,35,36,37,38,43,44,48,49,50],inclusive:!1},ID:{rules:[9,10],inclusive:!1},INITIAL:{rules:[0,1,2,3,4,5,6,7,8,10,11,12,15,17,19,22,26,29,32,50,54,65,66,67,68,69,70,71,73,74,75],inclusive:!0}}}}();function j(){this.yy={}}return j.prototype=A,A.Parser=j,new j}();d.parser=d;var f=d,p=`LR`,m=`state`,h=`relation`,g=`classDef`,_=`applyClass`,v=`default`,y=`divider`,b=`[*]`,x=`start`,S=b,C=`end`,w=`color`,T=`fill`,E=`bgFill`,D=`,`;function O(){return{}}var k=p,A=[],j=O(),M=()=>({relations:[],states:{},documents:{}}),N={root:M()},P=N.root,F=0,I=0,L={LINE:0,DOTTED_LINE:1},R={AGGREGATION:0,EXTENSION:1,COMPOSITION:2,DEPENDENCY:3},z=e=>JSON.parse(JSON.stringify(e)),ee=e=>{r.info(`Setting root doc`,e),A=e},te=()=>A,B=(e,t,n)=>{if(t.stmt===`relation`)B(e,t.state1,!0),B(e,t.state2,!1);else if(t.stmt===`state`&&(t.id===`[*]`?(t.id=n?e.id+`_start`:e.id+`_end`,t.start=n):t.id=t.id.trim()),t.doc){let e=[],n=[],r;for(r=0;r<t.doc.length;r++)if(t.doc[r].type===`divider`){let i=z(t.doc[r]);i.doc=z(n),e.push(i),n=[]}else n.push(t.doc[r]);if(e.length>0&&n.length>0){let r={stmt:m,id:s(),type:`divider`,doc:z(n)};e.push(z(r)),t.doc=e}t.doc.forEach(e=>B(t,e,!0))}},ne=()=>(B({id:`root`},{id:`root`,doc:A},!0),{id:`root`,doc:A}),V=e=>{let t;t=e.doc?e.doc:e,r.info(t),U(!0),r.info(`Extract`,t),t.forEach(e=>{switch(e.stmt){case m:H(e.id.trim(),e.type,e.doc,e.description,e.note,e.classes,e.styles,e.textStyles);break;case h:X(e.state1,e.state2,e.description);break;case g:Q(e.id.trim(),e.classes);break;case _:$(e.id.trim(),e.styleClass);break}})},H=function(e,t=v,n=null,a=null,o=null,s=null,c=null,u=null){let d=e?.trim();P.states[d]===void 0?(r.info(`Adding state `,d,a),P.states[d]={id:d,descriptions:[],type:t,doc:n,note:o,classes:[],styles:[],textStyles:[]}):(P.states[d].doc||(P.states[d].doc=n),P.states[d].type||(P.states[d].type=t)),a&&(r.info(`Setting state description`,d,a),typeof a==`string`&&Z(d,a.trim()),typeof a==`object`&&a.forEach(e=>Z(d,e.trim()))),o&&(P.states[d].note=o,P.states[d].note.text=l.sanitizeText(P.states[d].note.text,i())),s&&(r.info(`Setting state classes`,d,s),(typeof s==`string`?[s]:s).forEach(e=>$(d,e.trim()))),c&&(r.info(`Setting state styles`,d,c),(typeof c==`string`?[c]:c).forEach(e=>le(d,e.trim()))),u&&(r.info(`Setting state styles`,d,c),(typeof u==`string`?[u]:u).forEach(e=>ue(d,e.trim())))},U=function(e){N={root:M()},P=N.root,F=0,j=O(),e||c()},W=function(e){return P.states[e]},G=function(){return P.states},K=function(){r.info(`Documents = `,N)},q=function(){return P.relations};function J(e=``){let t=e;return e===b&&(F++,t=`${x}${F}`),t}function Y(e=``,t=v){return e===b?x:t}function re(e=``){let t=e;return e===S&&(F++,t=`${C}${F}`),t}function ie(e=``,t=v){return e===S?C:t}function ae(e,t,n){let r=J(e.id.trim()),a=Y(e.id.trim(),e.type),o=J(t.id.trim()),s=Y(t.id.trim(),t.type);H(r,a,e.doc,e.description,e.note,e.classes,e.styles,e.textStyles),H(o,s,t.doc,t.description,t.note,t.classes,t.styles,t.textStyles),P.relations.push({id1:r,id2:o,relationTitle:l.sanitizeText(n,i())})}var X=function(e,t,n){if(typeof e==`object`)ae(e,t,n);else{let r=J(e.trim()),a=Y(e),o=re(t.trim()),s=ie(t);H(r,a),H(o,s),P.relations.push({id1:r,id2:o,title:l.sanitizeText(n,i())})}},Z=function(e,t){let n=P.states[e],r=t.startsWith(`:`)?t.replace(`:`,``).trim():t;n.descriptions.push(l.sanitizeText(r,i()))},oe=function(e){return e.substring(0,1)===`:`?e.substr(2).trim():e.trim()},se=()=>(I++,`divider-id-`+I),Q=function(e,t=``){j[e]===void 0&&(j[e]={id:e,styles:[],textStyles:[]});let n=j[e];t?.split(D).forEach(e=>{let t=e.replace(/([^;]*);/,`$1`).trim();if(e.match(w)){let e=t.replace(T,E).replace(w,T);n.textStyles.push(e)}n.styles.push(t)})},ce=function(){return j},$=function(e,t){e.split(`,`).forEach(function(e){let n=W(e);if(n===void 0){let t=e.trim();H(t),n=W(t)}n.classes.push(t)})},le=function(e,t){let n=W(e);n!==void 0&&n.textStyles.push(t)},ue=function(e,t){let n=W(e);n!==void 0&&n.textStyles.push(t)},de={getConfig:()=>i().state,addState:H,clear:U,getState:W,getStates:G,getRelations:q,getClasses:ce,getDirection:()=>k,addRelation:X,getDividerId:se,setDirection:e=>{k=e},cleanupLabel:oe,lineType:L,relationType:R,logDocuments:K,getRootDoc:te,setRootDoc:ee,getRootDocV2:ne,extract:V,trimColon:e=>e&&e[0]===`:`?e.substr(1).trim():e.trim(),getAccTitle:a,setAccTitle:n,getAccDescription:o,setAccDescription:t,addStyleClass:Q,setCssClass:$,addDescription:Z,setDiagramTitle:e,getDiagramTitle:u},fe=e=>`
defs #statediagram-barbEnd {
    fill: ${e.transitionColor};
    stroke: ${e.transitionColor};
  }
g.stateGroup text {
  fill: ${e.nodeBorder};
  stroke: none;
  font-size: 10px;
}
g.stateGroup text {
  fill: ${e.textColor};
  stroke: none;
  font-size: 10px;

}
g.stateGroup .state-title {
  font-weight: bolder;
  fill: ${e.stateLabelColor};
}

g.stateGroup rect {
  fill: ${e.mainBkg};
  stroke: ${e.nodeBorder};
}

g.stateGroup line {
  stroke: ${e.lineColor};
  stroke-width: 1;
}

.transition {
  stroke: ${e.transitionColor};
  stroke-width: 1;
  fill: none;
}

.stateGroup .composit {
  fill: ${e.background};
  border-bottom: 1px
}

.stateGroup .alt-composit {
  fill: #e0e0e0;
  border-bottom: 1px
}

.state-note {
  stroke: ${e.noteBorderColor};
  fill: ${e.noteBkgColor};

  text {
    fill: ${e.noteTextColor};
    stroke: none;
    font-size: 10px;
  }
}

.stateLabel .box {
  stroke: none;
  stroke-width: 0;
  fill: ${e.mainBkg};
  opacity: 0.5;
}

.edgeLabel .label rect {
  fill: ${e.labelBackgroundColor};
  opacity: 0.5;
}
.edgeLabel .label text {
  fill: ${e.transitionLabelColor||e.tertiaryTextColor};
}
.label div .edgeLabel {
  color: ${e.transitionLabelColor||e.tertiaryTextColor};
}

.stateLabel text {
  fill: ${e.stateLabelColor};
  font-size: 10px;
  font-weight: bold;
}

.node circle.state-start {
  fill: ${e.specialStateColor};
  stroke: ${e.specialStateColor};
}

.node .fork-join {
  fill: ${e.specialStateColor};
  stroke: ${e.specialStateColor};
}

.node circle.state-end {
  fill: ${e.innerEndBackground};
  stroke: ${e.background};
  stroke-width: 1.5
}
.end-state-inner {
  fill: ${e.compositeBackground||e.background};
  // stroke: ${e.background};
  stroke-width: 1.5
}

.node rect {
  fill: ${e.stateBkg||e.mainBkg};
  stroke: ${e.stateBorder||e.nodeBorder};
  stroke-width: 1px;
}
.node polygon {
  fill: ${e.mainBkg};
  stroke: ${e.stateBorder||e.nodeBorder};;
  stroke-width: 1px;
}
#statediagram-barbEnd {
  fill: ${e.lineColor};
}

.statediagram-cluster rect {
  fill: ${e.compositeTitleBackground};
  stroke: ${e.stateBorder||e.nodeBorder};
  stroke-width: 1px;
}

.cluster-label, .nodeLabel {
  color: ${e.stateLabelColor};
}

.statediagram-cluster rect.outer {
  rx: 5px;
  ry: 5px;
}
.statediagram-state .divider {
  stroke: ${e.stateBorder||e.nodeBorder};
}

.statediagram-state .title-state {
  rx: 5px;
  ry: 5px;
}
.statediagram-cluster.statediagram-cluster .inner {
  fill: ${e.compositeBackground||e.background};
}
.statediagram-cluster.statediagram-cluster-alt .inner {
  fill: ${e.altBackground?e.altBackground:`#efefef`};
}

.statediagram-cluster .inner {
  rx:0;
  ry:0;
}

.statediagram-state rect.basic {
  rx: 5px;
  ry: 5px;
}
.statediagram-state rect.divider {
  stroke-dasharray: 10,10;
  fill: ${e.altBackground?e.altBackground:`#efefef`};
}

.note-edge {
  stroke-dasharray: 5;
}

.statediagram-note rect {
  fill: ${e.noteBkgColor};
  stroke: ${e.noteBorderColor};
  stroke-width: 1px;
  rx: 0;
  ry: 0;
}
.statediagram-note rect {
  fill: ${e.noteBkgColor};
  stroke: ${e.noteBorderColor};
  stroke-width: 1px;
  rx: 0;
  ry: 0;
}

.statediagram-note text {
  fill: ${e.noteTextColor};
}

.statediagram-note .nodeLabel {
  color: ${e.noteTextColor};
}
.statediagram .edgeLabel {
  color: red; // ${e.noteTextColor};
}

#dependencyStart, #dependencyEnd {
  fill: ${e.lineColor};
  stroke: ${e.lineColor};
  stroke-width: 1;
}

.statediagramTitleText {
  text-anchor: middle;
  font-size: 18px;
  fill: ${e.textColor};
}
`;export{de as a,m as i,y as n,f as o,h as r,fe as s,v as t};