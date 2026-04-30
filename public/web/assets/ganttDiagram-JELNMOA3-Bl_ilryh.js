import{s as e,t}from"./rolldown-runtime-C5c2KzVm.js";import"./lucide-C4oWPzu4.js";import{a as n,t as r}from"./src-CaF7C-tn.js";import{n as i,r as a}from"./chunk-AGHRB4JF-BqsWRwvz.js";import"./purify.es-BI1OWkCK.js";import{B as o,C as s,U as c,_ as l,a as u,b as d,c as f,s as p,v as m,z as h}from"./chunk-ABZYJK2D-CfdmvsHg.js";import{t as g}from"./linear-BFbqmNh5.js";import{D as _,O as v,S as y,T as b,b as x,c as S,d as C,f as w,g as T,h as E,m as D,n as O,p as k,r as A,u as j,v as M,w as ee}from"./time-DtsEieTf.js";import{a as te,i as ne,n as N,o as re,r as ie,t as ae}from"./advancedFormat-BQpCSjSr.js";import"./defaultLocale-CmGekppb.js";import{t as P}from"./dist-K6mAem53.js";import{h as oe}from"./chunk-S3R3BYOJ-B0o4vLAG.js";var se=t(((e,t)=>{(function(n,r){typeof e==`object`&&t!==void 0?t.exports=r():typeof define==`function`&&define.amd?define(r):(n=typeof globalThis<`u`?globalThis:n||self).dayjs_plugin_duration=r()})(e,(function(){var e,t,n=1e3,r=6e4,i=36e5,a=864e5,o=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,s=31536e6,c=2628e6,l=/^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/,u={years:s,months:c,days:a,hours:i,minutes:r,seconds:n,milliseconds:1,weeks:6048e5},d=function(e){return e instanceof v},f=function(e,t,n){return new v(e,n,t.$l)},p=function(e){return t.p(e)+`s`},m=function(e){return e<0},h=function(e){return m(e)?Math.ceil(e):Math.floor(e)},g=function(e){return Math.abs(e)},_=function(e,t){return e?m(e)?{negative:!0,format:``+g(e)+t}:{negative:!1,format:``+e+t}:{negative:!1,format:``}},v=function(){function m(e,t,n){var r=this;if(this.$d={},this.$l=n,e===void 0&&(this.$ms=0,this.parseFromMilliseconds()),t)return f(e*u[p(t)],this);if(typeof e==`number`)return this.$ms=e,this.parseFromMilliseconds(),this;if(typeof e==`object`)return Object.keys(e).forEach((function(t){r.$d[p(t)]=e[t]})),this.calMilliseconds(),this;if(typeof e==`string`){var i=e.match(l);if(i){var a=i.slice(2).map((function(e){return e==null?0:Number(e)}));return this.$d.years=a[0],this.$d.months=a[1],this.$d.weeks=a[2],this.$d.days=a[3],this.$d.hours=a[4],this.$d.minutes=a[5],this.$d.seconds=a[6],this.calMilliseconds(),this}}return this}var g=m.prototype;return g.calMilliseconds=function(){var e=this;this.$ms=Object.keys(this.$d).reduce((function(t,n){return t+(e.$d[n]||0)*u[n]}),0)},g.parseFromMilliseconds=function(){var e=this.$ms;this.$d.years=h(e/s),e%=s,this.$d.months=h(e/c),e%=c,this.$d.days=h(e/a),e%=a,this.$d.hours=h(e/i),e%=i,this.$d.minutes=h(e/r),e%=r,this.$d.seconds=h(e/n),e%=n,this.$d.milliseconds=e},g.toISOString=function(){var e=_(this.$d.years,`Y`),t=_(this.$d.months,`M`),n=+this.$d.days||0;this.$d.weeks&&(n+=7*this.$d.weeks);var r=_(n,`D`),i=_(this.$d.hours,`H`),a=_(this.$d.minutes,`M`),o=this.$d.seconds||0;this.$d.milliseconds&&(o+=this.$d.milliseconds/1e3,o=Math.round(1e3*o)/1e3);var s=_(o,`S`),c=e.negative||t.negative||r.negative||i.negative||a.negative||s.negative,l=i.format||a.format||s.format?`T`:``,u=(c?`-`:``)+`P`+e.format+t.format+r.format+l+i.format+a.format+s.format;return u===`P`||u===`-P`?`P0D`:u},g.toJSON=function(){return this.toISOString()},g.format=function(e){var n=e||`YYYY-MM-DDTHH:mm:ss`,r={Y:this.$d.years,YY:t.s(this.$d.years,2,`0`),YYYY:t.s(this.$d.years,4,`0`),M:this.$d.months,MM:t.s(this.$d.months,2,`0`),D:this.$d.days,DD:t.s(this.$d.days,2,`0`),H:this.$d.hours,HH:t.s(this.$d.hours,2,`0`),m:this.$d.minutes,mm:t.s(this.$d.minutes,2,`0`),s:this.$d.seconds,ss:t.s(this.$d.seconds,2,`0`),SSS:t.s(this.$d.milliseconds,3,`0`)};return n.replace(o,(function(e,t){return t||String(r[e])}))},g.as=function(e){return this.$ms/u[p(e)]},g.get=function(e){var t=this.$ms,n=p(e);return n===`milliseconds`?t%=1e3:t=n===`weeks`?h(t/u[n]):this.$d[n],t||0},g.add=function(e,t,n){var r;return r=t?e*u[p(t)]:d(e)?e.$ms:f(e,this).$ms,f(this.$ms+r*(n?-1:1),this)},g.subtract=function(e,t){return this.add(e,t,!0)},g.locale=function(e){var t=this.clone();return t.$l=e,t},g.clone=function(){return f(this.$ms,this)},g.humanize=function(t){return e().add(this.$ms,`ms`).locale(this.$l).fromNow(!t)},g.valueOf=function(){return this.asMilliseconds()},g.milliseconds=function(){return this.get(`milliseconds`)},g.asMilliseconds=function(){return this.as(`milliseconds`)},g.seconds=function(){return this.get(`seconds`)},g.asSeconds=function(){return this.as(`seconds`)},g.minutes=function(){return this.get(`minutes`)},g.asMinutes=function(){return this.as(`minutes`)},g.hours=function(){return this.get(`hours`)},g.asHours=function(){return this.as(`hours`)},g.days=function(){return this.get(`days`)},g.asDays=function(){return this.as(`days`)},g.weeks=function(){return this.get(`weeks`)},g.asWeeks=function(){return this.as(`weeks`)},g.months=function(){return this.get(`months`)},g.asMonths=function(){return this.as(`months`)},g.years=function(){return this.get(`years`)},g.asYears=function(){return this.as(`years`)},m}(),y=function(e,t,n){return e.add(t.years()*n,`y`).add(t.months()*n,`M`).add(t.days()*n,`d`).add(t.hours()*n,`h`).add(t.minutes()*n,`m`).add(t.seconds()*n,`s`).add(t.milliseconds()*n,`ms`)};return function(n,r,i){e=i,t=i().$utils(),i.duration=function(e,t){return f(e,{$l:i.locale()},t)},i.isDuration=d;var a=r.prototype.add,o=r.prototype.subtract;r.prototype.add=function(e,t){return d(e)?y(this,e,1):a.bind(this)(e,t)},r.prototype.subtract=function(e,t){return d(e)?y(this,e,-1):o.bind(this)(e,t)}}}))})),ce=P(),F=e(n(),1),le=e(ie(),1),ue=e(N(),1),de=e(ae(),1),fe=e(se(),1),pe=(function(){var e=i(function(e,t,n,r){for(n||={},r=e.length;r--;n[e[r]]=t);return n},`o`),t=[6,8,10,12,13,14,15,16,17,18,20,21,22,23,24,25,26,27,28,29,30,31,33,35,36,38,40],n=[1,26],r=[1,27],a=[1,28],o=[1,29],s=[1,30],c=[1,31],l=[1,32],u=[1,33],d=[1,34],f=[1,9],p=[1,10],m=[1,11],h=[1,12],g=[1,13],_=[1,14],v=[1,15],y=[1,16],b=[1,19],x=[1,20],S=[1,21],C=[1,22],w=[1,23],T=[1,25],E=[1,35],D={trace:i(function(){},`trace`),yy:{},symbols_:{error:2,start:3,gantt:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NL:10,weekday:11,weekday_monday:12,weekday_tuesday:13,weekday_wednesday:14,weekday_thursday:15,weekday_friday:16,weekday_saturday:17,weekday_sunday:18,weekend:19,weekend_friday:20,weekend_saturday:21,dateFormat:22,inclusiveEndDates:23,topAxis:24,axisFormat:25,tickInterval:26,excludes:27,includes:28,todayMarker:29,title:30,acc_title:31,acc_title_value:32,acc_descr:33,acc_descr_value:34,acc_descr_multiline_value:35,section:36,clickStatement:37,taskTxt:38,taskData:39,click:40,callbackname:41,callbackargs:42,href:43,clickStatementDebug:44,$accept:0,$end:1},terminals_:{2:`error`,4:`gantt`,6:`EOF`,8:`SPACE`,10:`NL`,12:`weekday_monday`,13:`weekday_tuesday`,14:`weekday_wednesday`,15:`weekday_thursday`,16:`weekday_friday`,17:`weekday_saturday`,18:`weekday_sunday`,20:`weekend_friday`,21:`weekend_saturday`,22:`dateFormat`,23:`inclusiveEndDates`,24:`topAxis`,25:`axisFormat`,26:`tickInterval`,27:`excludes`,28:`includes`,29:`todayMarker`,30:`title`,31:`acc_title`,32:`acc_title_value`,33:`acc_descr`,34:`acc_descr_value`,35:`acc_descr_multiline_value`,36:`section`,38:`taskTxt`,39:`taskData`,40:`click`,41:`callbackname`,42:`callbackargs`,43:`href`},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[19,1],[19,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,1],[9,2],[37,2],[37,3],[37,3],[37,4],[37,3],[37,4],[37,2],[44,2],[44,3],[44,3],[44,4],[44,3],[44,4],[44,2]],performAction:i(function(e,t,n,r,i,a,o){var s=a.length-1;switch(i){case 1:return a[s-1];case 2:this.$=[];break;case 3:a[s-1].push(a[s]),this.$=a[s-1];break;case 4:case 5:this.$=a[s];break;case 6:case 7:this.$=[];break;case 8:r.setWeekday(`monday`);break;case 9:r.setWeekday(`tuesday`);break;case 10:r.setWeekday(`wednesday`);break;case 11:r.setWeekday(`thursday`);break;case 12:r.setWeekday(`friday`);break;case 13:r.setWeekday(`saturday`);break;case 14:r.setWeekday(`sunday`);break;case 15:r.setWeekend(`friday`);break;case 16:r.setWeekend(`saturday`);break;case 17:r.setDateFormat(a[s].substr(11)),this.$=a[s].substr(11);break;case 18:r.enableInclusiveEndDates(),this.$=a[s].substr(18);break;case 19:r.TopAxis(),this.$=a[s].substr(8);break;case 20:r.setAxisFormat(a[s].substr(11)),this.$=a[s].substr(11);break;case 21:r.setTickInterval(a[s].substr(13)),this.$=a[s].substr(13);break;case 22:r.setExcludes(a[s].substr(9)),this.$=a[s].substr(9);break;case 23:r.setIncludes(a[s].substr(9)),this.$=a[s].substr(9);break;case 24:r.setTodayMarker(a[s].substr(12)),this.$=a[s].substr(12);break;case 27:r.setDiagramTitle(a[s].substr(6)),this.$=a[s].substr(6);break;case 28:this.$=a[s].trim(),r.setAccTitle(this.$);break;case 29:case 30:this.$=a[s].trim(),r.setAccDescription(this.$);break;case 31:r.addSection(a[s].substr(8)),this.$=a[s].substr(8);break;case 33:r.addTask(a[s-1],a[s]),this.$=`task`;break;case 34:this.$=a[s-1],r.setClickEvent(a[s-1],a[s],null);break;case 35:this.$=a[s-2],r.setClickEvent(a[s-2],a[s-1],a[s]);break;case 36:this.$=a[s-2],r.setClickEvent(a[s-2],a[s-1],null),r.setLink(a[s-2],a[s]);break;case 37:this.$=a[s-3],r.setClickEvent(a[s-3],a[s-2],a[s-1]),r.setLink(a[s-3],a[s]);break;case 38:this.$=a[s-2],r.setClickEvent(a[s-2],a[s],null),r.setLink(a[s-2],a[s-1]);break;case 39:this.$=a[s-3],r.setClickEvent(a[s-3],a[s-1],a[s]),r.setLink(a[s-3],a[s-2]);break;case 40:this.$=a[s-1],r.setLink(a[s-1],a[s]);break;case 41:case 47:this.$=a[s-1]+` `+a[s];break;case 42:case 43:case 45:this.$=a[s-2]+` `+a[s-1]+` `+a[s];break;case 44:case 46:this.$=a[s-3]+` `+a[s-2]+` `+a[s-1]+` `+a[s];break}},`anonymous`),table:[{3:1,4:[1,2]},{1:[3]},e(t,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:17,12:n,13:r,14:a,15:o,16:s,17:c,18:l,19:18,20:u,21:d,22:f,23:p,24:m,25:h,26:g,27:_,28:v,29:y,30:b,31:x,33:S,35:C,36:w,37:24,38:T,40:E},e(t,[2,7],{1:[2,1]}),e(t,[2,3]),{9:36,11:17,12:n,13:r,14:a,15:o,16:s,17:c,18:l,19:18,20:u,21:d,22:f,23:p,24:m,25:h,26:g,27:_,28:v,29:y,30:b,31:x,33:S,35:C,36:w,37:24,38:T,40:E},e(t,[2,5]),e(t,[2,6]),e(t,[2,17]),e(t,[2,18]),e(t,[2,19]),e(t,[2,20]),e(t,[2,21]),e(t,[2,22]),e(t,[2,23]),e(t,[2,24]),e(t,[2,25]),e(t,[2,26]),e(t,[2,27]),{32:[1,37]},{34:[1,38]},e(t,[2,30]),e(t,[2,31]),e(t,[2,32]),{39:[1,39]},e(t,[2,8]),e(t,[2,9]),e(t,[2,10]),e(t,[2,11]),e(t,[2,12]),e(t,[2,13]),e(t,[2,14]),e(t,[2,15]),e(t,[2,16]),{41:[1,40],43:[1,41]},e(t,[2,4]),e(t,[2,28]),e(t,[2,29]),e(t,[2,33]),e(t,[2,34],{42:[1,42],43:[1,43]}),e(t,[2,40],{41:[1,44]}),e(t,[2,35],{43:[1,45]}),e(t,[2,36]),e(t,[2,38],{42:[1,46]}),e(t,[2,37]),e(t,[2,39])],defaultActions:{},parseError:i(function(e,t){if(t.recoverable)this.trace(e);else{var n=Error(e);throw n.hash=t,n}},`parseError`),parse:i(function(e){var t=this,n=[0],r=[],a=[null],o=[],s=this.table,c=``,l=0,u=0,d=0,f=2,p=1,m=o.slice.call(arguments,1),h=Object.create(this.lexer),g={yy:{}};for(var _ in this.yy)Object.prototype.hasOwnProperty.call(this.yy,_)&&(g.yy[_]=this.yy[_]);h.setInput(e,g.yy),g.yy.lexer=h,g.yy.parser=this,h.yylloc===void 0&&(h.yylloc={});var v=h.yylloc;o.push(v);var y=h.options&&h.options.ranges;typeof g.yy.parseError==`function`?this.parseError=g.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function b(e){n.length-=2*e,a.length-=e,o.length-=e}i(b,`popStack`);function x(){var e=r.pop()||h.lex()||p;return typeof e!=`number`&&(e instanceof Array&&(r=e,e=r.pop()),e=t.symbols_[e]||e),e}i(x,`lex`);for(var S,C,w,T,E,D={},O,k,A,j;;){if(w=n[n.length-1],this.defaultActions[w]?T=this.defaultActions[w]:(S??=x(),T=s[w]&&s[w][S]),T===void 0||!T.length||!T[0]){var M=``;for(O in j=[],s[w])this.terminals_[O]&&O>f&&j.push(`'`+this.terminals_[O]+`'`);M=h.showPosition?`Parse error on line `+(l+1)+`:
`+h.showPosition()+`
Expecting `+j.join(`, `)+`, got '`+(this.terminals_[S]||S)+`'`:`Parse error on line `+(l+1)+`: Unexpected `+(S==p?`end of input`:`'`+(this.terminals_[S]||S)+`'`),this.parseError(M,{text:h.match,token:this.terminals_[S]||S,line:h.yylineno,loc:v,expected:j})}if(T[0]instanceof Array&&T.length>1)throw Error(`Parse Error: multiple actions possible at state: `+w+`, token: `+S);switch(T[0]){case 1:n.push(S),a.push(h.yytext),o.push(h.yylloc),n.push(T[1]),S=null,C?(S=C,C=null):(u=h.yyleng,c=h.yytext,l=h.yylineno,v=h.yylloc,d>0&&d--);break;case 2:if(k=this.productions_[T[1]][1],D.$=a[a.length-k],D._$={first_line:o[o.length-(k||1)].first_line,last_line:o[o.length-1].last_line,first_column:o[o.length-(k||1)].first_column,last_column:o[o.length-1].last_column},y&&(D._$.range=[o[o.length-(k||1)].range[0],o[o.length-1].range[1]]),E=this.performAction.apply(D,[c,u,l,g.yy,T[1],a,o].concat(m)),E!==void 0)return E;k&&(n=n.slice(0,-1*k*2),a=a.slice(0,-1*k),o=o.slice(0,-1*k)),n.push(this.productions_[T[1]][0]),a.push(D.$),o.push(D._$),A=s[n[n.length-2]][n[n.length-1]],n.push(A);break;case 3:return!0}}return!0},`parse`)};D.lexer=(function(){return{EOF:1,parseError:i(function(e,t){if(this.yy.parser)this.yy.parser.parseError(e,t);else throw Error(e)},`parseError`),setInput:i(function(e,t){return this.yy=t||this.yy||{},this._input=e,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match=``,this.conditionStack=[`INITIAL`],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},`setInput`),input:i(function(){var e=this._input[0];return this.yytext+=e,this.yyleng++,this.offset++,this.match+=e,this.matched+=e,e.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),e},`input`),unput:i(function(e){var t=e.length,n=e.split(/(?:\r\n?|\n)/g);this._input=e+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-t),this.offset-=t;var r=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),n.length-1&&(this.yylineno-=n.length-1);var i=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:n?(n.length===r.length?this.yylloc.first_column:0)+r[r.length-n.length].length-n[0].length:this.yylloc.first_column-t},this.options.ranges&&(this.yylloc.range=[i[0],i[0]+this.yyleng-t]),this.yyleng=this.yytext.length,this},`unput`),more:i(function(){return this._more=!0,this},`more`),reject:i(function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError(`Lexical error on line `+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:``,token:null,line:this.yylineno});return this},`reject`),less:i(function(e){this.unput(this.match.slice(e))},`less`),pastInput:i(function(){var e=this.matched.substr(0,this.matched.length-this.match.length);return(e.length>20?`...`:``)+e.substr(-20).replace(/\n/g,``)},`pastInput`),upcomingInput:i(function(){var e=this.match;return e.length<20&&(e+=this._input.substr(0,20-e.length)),(e.substr(0,20)+(e.length>20?`...`:``)).replace(/\n/g,``)},`upcomingInput`),showPosition:i(function(){var e=this.pastInput(),t=Array(e.length+1).join(`-`);return e+this.upcomingInput()+`
`+t+`^`},`showPosition`),test_match:i(function(e,t){var n,r,i;if(this.options.backtrack_lexer&&(i={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(i.yylloc.range=this.yylloc.range.slice(0))),r=e[0].match(/(?:\r\n?|\n).*/g),r&&(this.yylineno+=r.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:r?r[r.length-1].length-r[r.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+e[0].length},this.yytext+=e[0],this.match+=e[0],this.matches=e,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(e[0].length),this.matched+=e[0],n=this.performAction.call(this,this.yy,this,t,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),n)return n;if(this._backtrack){for(var a in i)this[a]=i[a];return!1}return!1},`test_match`),next:i(function(){if(this.done)return this.EOF;this._input||(this.done=!0);var e,t,n,r;this._more||(this.yytext=``,this.match=``);for(var i=this._currentRules(),a=0;a<i.length;a++)if(n=this._input.match(this.rules[i[a]]),n&&(!t||n[0].length>t[0].length)){if(t=n,r=a,this.options.backtrack_lexer){if(e=this.test_match(n,i[a]),e!==!1)return e;if(this._backtrack){t=!1;continue}else return!1}else if(!this.options.flex)break}return t?(e=this.test_match(t,i[r]),e===!1?!1:e):this._input===``?this.EOF:this.parseError(`Lexical error on line `+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:``,token:null,line:this.yylineno})},`next`),lex:i(function(){return this.next()||this.lex()},`lex`),begin:i(function(e){this.conditionStack.push(e)},`begin`),popState:i(function(){return this.conditionStack.length-1>0?this.conditionStack.pop():this.conditionStack[0]},`popState`),_currentRules:i(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},`_currentRules`),topState:i(function(e){return e=this.conditionStack.length-1-Math.abs(e||0),e>=0?this.conditionStack[e]:`INITIAL`},`topState`),pushState:i(function(e){this.begin(e)},`pushState`),stateStackSize:i(function(){return this.conditionStack.length},`stateStackSize`),options:{"case-insensitive":!0},performAction:i(function(e,t,n,r){switch(n){case 0:return this.begin(`open_directive`),`open_directive`;case 1:return this.begin(`acc_title`),31;case 2:return this.popState(),`acc_title_value`;case 3:return this.begin(`acc_descr`),33;case 4:return this.popState(),`acc_descr_value`;case 5:this.begin(`acc_descr_multiline`);break;case 6:this.popState();break;case 7:return`acc_descr_multiline_value`;case 8:break;case 9:break;case 10:break;case 11:return 10;case 12:break;case 13:break;case 14:this.begin(`href`);break;case 15:this.popState();break;case 16:return 43;case 17:this.begin(`callbackname`);break;case 18:this.popState();break;case 19:this.popState(),this.begin(`callbackargs`);break;case 20:return 41;case 21:this.popState();break;case 22:return 42;case 23:this.begin(`click`);break;case 24:this.popState();break;case 25:return 40;case 26:return 4;case 27:return 22;case 28:return 23;case 29:return 24;case 30:return 25;case 31:return 26;case 32:return 28;case 33:return 27;case 34:return 29;case 35:return 12;case 36:return 13;case 37:return 14;case 38:return 15;case 39:return 16;case 40:return 17;case 41:return 18;case 42:return 20;case 43:return 21;case 44:return`date`;case 45:return 30;case 46:return`accDescription`;case 47:return 36;case 48:return 38;case 49:return 39;case 50:return`:`;case 51:return 6;case 52:return`INVALID`}},`anonymous`),rules:[/^(?:%%\{)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:%%(?!\{)*[^\n]*)/i,/^(?:[^\}]%%*[^\n]*)/i,/^(?:%%*[^\n]*[\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:%[^\n]*)/i,/^(?:href[\s]+["])/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:call[\s]+)/i,/^(?:\([\s]*\))/i,/^(?:\()/i,/^(?:[^(]*)/i,/^(?:\))/i,/^(?:[^)]*)/i,/^(?:click[\s]+)/i,/^(?:[\s\n])/i,/^(?:[^\s\n]*)/i,/^(?:gantt\b)/i,/^(?:dateFormat\s[^#\n;]+)/i,/^(?:inclusiveEndDates\b)/i,/^(?:topAxis\b)/i,/^(?:axisFormat\s[^#\n;]+)/i,/^(?:tickInterval\s[^#\n;]+)/i,/^(?:includes\s[^#\n;]+)/i,/^(?:excludes\s[^#\n;]+)/i,/^(?:todayMarker\s[^\n;]+)/i,/^(?:weekday\s+monday\b)/i,/^(?:weekday\s+tuesday\b)/i,/^(?:weekday\s+wednesday\b)/i,/^(?:weekday\s+thursday\b)/i,/^(?:weekday\s+friday\b)/i,/^(?:weekday\s+saturday\b)/i,/^(?:weekday\s+sunday\b)/i,/^(?:weekend\s+friday\b)/i,/^(?:weekend\s+saturday\b)/i,/^(?:\d\d\d\d-\d\d-\d\d\b)/i,/^(?:title\s[^\n]+)/i,/^(?:accDescription\s[^#\n;]+)/i,/^(?:section\s[^\n]+)/i,/^(?:[^:\n]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[6,7],inclusive:!1},acc_descr:{rules:[4],inclusive:!1},acc_title:{rules:[2],inclusive:!1},callbackargs:{rules:[21,22],inclusive:!1},callbackname:{rules:[18,19,20],inclusive:!1},href:{rules:[15,16],inclusive:!1},click:{rules:[24,25],inclusive:!1},INITIAL:{rules:[0,1,3,5,8,9,10,11,12,13,14,17,23,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52],inclusive:!0}}}})();function O(){this.yy={}}return i(O,`Parser`),O.prototype=D,D.Parser=O,new O})();pe.parser=pe;var me=pe;F.default.extend(le.default),F.default.extend(ue.default),F.default.extend(de.default);var he={friday:5,saturday:6},I=``,L=``,R=void 0,z=``,B=[],V=[],H=new Map,ge=[],U=[],W=``,_e=``,ve=[`active`,`done`,`crit`,`milestone`,`vert`],ye=[],G=!1,be=!1,K=`sunday`,q=`saturday`,xe=0,Se=i(function(){ge=[],U=[],W=``,ye=[],et=0,rt=void 0,Y=void 0,X=[],I=``,L=``,_e=``,R=void 0,z=``,B=[],V=[],G=!1,be=!1,xe=0,H=new Map,u(),K=`sunday`,q=`saturday`},`clear`),Ce=i(function(e){L=e},`setAxisFormat`),we=i(function(){return L},`getAxisFormat`),Te=i(function(e){R=e},`setTickInterval`),Ee=i(function(){return R},`getTickInterval`),De=i(function(e){z=e},`setTodayMarker`),Oe=i(function(){return z},`getTodayMarker`),ke=i(function(e){I=e},`setDateFormat`),Ae=i(function(){G=!0},`enableInclusiveEndDates`),je=i(function(){return G},`endDatesAreInclusive`),Me=i(function(){be=!0},`enableTopAxis`),Ne=i(function(){return be},`topAxisEnabled`),Pe=i(function(e){_e=e},`setDisplayMode`),Fe=i(function(){return _e},`getDisplayMode`),Ie=i(function(){return I},`getDateFormat`),Le=i(function(e){B=e.toLowerCase().split(/[\s,]+/)},`setIncludes`),Re=i(function(){return B},`getIncludes`),ze=i(function(e){V=e.toLowerCase().split(/[\s,]+/)},`setExcludes`),Be=i(function(){return V},`getExcludes`),Ve=i(function(){return H},`getLinks`),He=i(function(e){W=e,ge.push(e)},`addSection`),Ue=i(function(){return ge},`getSections`),We=i(function(){let e=st(),t=0;for(;!e&&t<10;)e=st(),t++;return U=X,U},`getTasks`),Ge=i(function(e,t,n,r){let i=e.format(t.trim()),a=e.format(`YYYY-MM-DD`);return r.includes(i)||r.includes(a)?!1:n.includes(`weekends`)&&(e.isoWeekday()===he[q]||e.isoWeekday()===he[q]+1)||n.includes(e.format(`dddd`).toLowerCase())?!0:n.includes(i)||n.includes(a)},`isInvalidDate`),Ke=i(function(e){K=e},`setWeekday`),qe=i(function(){return K},`getWeekday`),Je=i(function(e){q=e},`setWeekend`),Ye=i(function(e,t,n,r){if(!n.length||e.manualEndTime)return;let i;i=e.startTime instanceof Date?(0,F.default)(e.startTime):(0,F.default)(e.startTime,t,!0),i=i.add(1,`d`);let a;a=e.endTime instanceof Date?(0,F.default)(e.endTime):(0,F.default)(e.endTime,t,!0);let[o,s]=Xe(i,a,t,n,r);e.endTime=o.toDate(),e.renderEndTime=s},`checkTaskDates`),Xe=i(function(e,t,n,r,i){let a=!1,o=null;for(;e<=t;)a||(o=t.toDate()),a=Ge(e,n,r,i),a&&(t=t.add(1,`d`)),e=e.add(1,`d`);return[t,o]},`fixTaskDates`),Ze=i(function(e,t,n){if(n=n.trim(),i(e=>{let t=e.trim();return t===`x`||t===`X`},`isTimestampFormat`)(t)&&/^\d+$/.test(n))return new Date(Number(n));let r=/^after\s+(?<ids>[\d\w- ]+)/.exec(n);if(r!==null){let e=null;for(let t of r.groups.ids.split(` `)){let n=Z(t);n!==void 0&&(!e||n.endTime>e.endTime)&&(e=n)}if(e)return e.endTime;let t=new Date;return t.setHours(0,0,0,0),t}let o=(0,F.default)(n,t.trim(),!0);if(o.isValid())return o.toDate();{a.debug(`Invalid date:`+n),a.debug(`With date format:`+t.trim());let e=new Date(n);if(e===void 0||isNaN(e.getTime())||e.getFullYear()<-1e4||e.getFullYear()>1e4)throw Error(`Invalid date:`+n);return e}},`getStartDate`),Qe=i(function(e){let t=/^(\d+(?:\.\d+)?)([Mdhmswy]|ms)$/.exec(e.trim());return t===null?[NaN,`ms`]:[Number.parseFloat(t[1]),t[2]]},`parseDuration`),$e=i(function(e,t,n,r=!1){n=n.trim();let i=/^until\s+(?<ids>[\d\w- ]+)/.exec(n);if(i!==null){let e=null;for(let t of i.groups.ids.split(` `)){let n=Z(t);n!==void 0&&(!e||n.startTime<e.startTime)&&(e=n)}if(e)return e.startTime;let t=new Date;return t.setHours(0,0,0,0),t}let a=(0,F.default)(n,t.trim(),!0);if(a.isValid())return r&&(a=a.add(1,`d`)),a.toDate();let o=(0,F.default)(e),[s,c]=Qe(n);if(!Number.isNaN(s)){let e=o.add(s,c);e.isValid()&&(o=e)}return o.toDate()},`getEndDate`),et=0,J=i(function(e){return e===void 0?(et+=1,`task`+et):e},`parseId`),tt=i(function(e,t){let n;n=t.substr(0,1)===`:`?t.substr(1,t.length):t;let r=n.split(`,`),i={};pt(r,i,ve);for(let e=0;e<r.length;e++)r[e]=r[e].trim();let a=``;switch(r.length){case 1:i.id=J(),i.startTime=e.endTime,a=r[0];break;case 2:i.id=J(),i.startTime=Ze(void 0,I,r[0]),a=r[1];break;case 3:i.id=J(r[0]),i.startTime=Ze(void 0,I,r[1]),a=r[2];break;default:}return a&&(i.endTime=$e(i.startTime,I,a,G),i.manualEndTime=(0,F.default)(a,`YYYY-MM-DD`,!0).isValid(),Ye(i,I,V,B)),i},`compileData`),nt=i(function(e,t){let n;n=t.substr(0,1)===`:`?t.substr(1,t.length):t;let r=n.split(`,`),i={};pt(r,i,ve);for(let e=0;e<r.length;e++)r[e]=r[e].trim();switch(r.length){case 1:i.id=J(),i.startTime={type:`prevTaskEnd`,id:e},i.endTime={data:r[0]};break;case 2:i.id=J(),i.startTime={type:`getStartDate`,startData:r[0]},i.endTime={data:r[1]};break;case 3:i.id=J(r[0]),i.startTime={type:`getStartDate`,startData:r[1]},i.endTime={data:r[2]};break;default:}return i},`parseData`),rt,Y,X=[],it={},at=i(function(e,t){let n={section:W,type:W,processed:!1,manualEndTime:!1,renderEndTime:null,raw:{data:t},task:e,classes:[]},r=nt(Y,t);n.raw.startTime=r.startTime,n.raw.endTime=r.endTime,n.id=r.id,n.prevTaskId=Y,n.active=r.active,n.done=r.done,n.crit=r.crit,n.milestone=r.milestone,n.vert=r.vert,n.order=xe,xe++;let i=X.push(n);Y=n.id,it[n.id]=i-1},`addTask`),Z=i(function(e){let t=it[e];return X[t]},`findTaskById`),ot=i(function(e,t){let n={section:W,type:W,description:e,task:e,classes:[]},r=tt(rt,t);n.startTime=r.startTime,n.endTime=r.endTime,n.id=r.id,n.active=r.active,n.done=r.done,n.crit=r.crit,n.milestone=r.milestone,n.vert=r.vert,rt=n,U.push(n)},`addTaskOrg`),st=i(function(){let e=i(function(e){let t=X[e],n=``;switch(X[e].raw.startTime.type){case`prevTaskEnd`:t.startTime=Z(t.prevTaskId).endTime;break;case`getStartDate`:n=Ze(void 0,I,X[e].raw.startTime.startData),n&&(X[e].startTime=n);break}return X[e].startTime&&(X[e].endTime=$e(X[e].startTime,I,X[e].raw.endTime.data,G),X[e].endTime&&(X[e].processed=!0,X[e].manualEndTime=(0,F.default)(X[e].raw.endTime.data,`YYYY-MM-DD`,!0).isValid(),Ye(X[e],I,V,B))),X[e].processed},`compileTask`),t=!0;for(let[n,r]of X.entries())e(n),t&&=r.processed;return t},`compileTasks`),ct=i(function(e,t){let n=t;d().securityLevel!==`loose`&&(n=(0,ce.sanitizeUrl)(t)),e.split(`,`).forEach(function(e){Z(e)!==void 0&&(dt(e,()=>{window.open(n,`_self`)}),H.set(e,n))}),lt(e,`clickable`)},`setLink`),lt=i(function(e,t){e.split(`,`).forEach(function(e){let n=Z(e);n!==void 0&&n.classes.push(t)})},`setClass`),ut=i(function(e,t,n){if(d().securityLevel!==`loose`||t===void 0)return;let r=[];if(typeof n==`string`){r=n.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);for(let e=0;e<r.length;e++){let t=r[e].trim();t.startsWith(`"`)&&t.endsWith(`"`)&&(t=t.substr(1,t.length-2)),r[e]=t}}r.length===0&&r.push(e),Z(e)!==void 0&&dt(e,()=>{oe.runFunc(t,...r)})},`setClickFun`),dt=i(function(e,t){ye.push(function(){let n=document.querySelector(`[id="${e}"]`);n!==null&&n.addEventListener(`click`,function(){t()})},function(){let n=document.querySelector(`[id="${e}-text"]`);n!==null&&n.addEventListener(`click`,function(){t()})})},`pushFun`),ft={getConfig:i(()=>d().gantt,`getConfig`),clear:Se,setDateFormat:ke,getDateFormat:Ie,enableInclusiveEndDates:Ae,endDatesAreInclusive:je,enableTopAxis:Me,topAxisEnabled:Ne,setAxisFormat:Ce,getAxisFormat:we,setTickInterval:Te,getTickInterval:Ee,setTodayMarker:De,getTodayMarker:Oe,setAccTitle:o,getAccTitle:m,setDiagramTitle:c,getDiagramTitle:s,setDisplayMode:Pe,getDisplayMode:Fe,setAccDescription:h,getAccDescription:l,addSection:He,getSections:Ue,getTasks:We,addTask:at,findTaskById:Z,addTaskOrg:ot,setIncludes:Le,getIncludes:Re,setExcludes:ze,getExcludes:Be,setClickEvent:i(function(e,t,n){e.split(`,`).forEach(function(e){ut(e,t,n)}),lt(e,`clickable`)},`setClickEvent`),setLink:ct,getLinks:Ve,bindFunctions:i(function(e){ye.forEach(function(t){t(e)})},`bindFunctions`),parseDuration:Qe,isInvalidDate:Ge,setWeekday:Ke,getWeekday:qe,setWeekend:Je};function pt(e,t,n){let r=!0;for(;r;)r=!1,n.forEach(function(n){let i=`^\\s*`+n+`\\s*$`,a=new RegExp(i);e[0].match(a)&&(t[n]=!0,e.shift(1),r=!0)})}i(pt,`getTaskTags`),F.default.extend(fe.default);var mt=i(function(){a.debug(`Something is calling, setConf, remove the call`)},`setConf`),ht={monday:C,tuesday:E,wednesday:T,thursday:D,friday:j,saturday:w,sunday:k},gt=i((e,t)=>{let n=[...e].map(()=>-1/0),r=[...e].sort((e,t)=>e.startTime-t.startTime||e.order-t.order),i=0;for(let e of r)for(let r=0;r<n.length;r++)if(e.startTime>=n[r]){n[r]=e.endTime,e.order=r+t,r>i&&(i=r);break}return i},`getMaxIntersections`),Q,$=1e4,_t={parser:me,db:ft,renderer:{setConf:mt,draw:i(function(e,t,n,o){let s=d().gantt,c=d().securityLevel,l;c===`sandbox`&&(l=r(`#i`+t));let u=r(c===`sandbox`?l.nodes()[0].contentDocument.body:`body`),m=c===`sandbox`?l.nodes()[0].contentDocument:document,h=m.getElementById(t);Q=h.parentElement.offsetWidth,Q===void 0&&(Q=1200),s.useWidth!==void 0&&(Q=s.useWidth);let C=o.db.getTasks(),w=[];for(let e of C)w.push(e.type);w=le(w);let T={},E=2*s.topPadding;if(o.db.getDisplayMode()===`compact`||s.displayMode===`compact`){let e={};for(let t of C)e[t.section]===void 0?e[t.section]=[t]:e[t.section].push(t);let t=0;for(let n of Object.keys(e)){let r=gt(e[n],t)+1;t+=r,E+=r*(s.barHeight+s.barGap),T[n]=r}}else{E+=C.length*(s.barHeight+s.barGap);for(let e of w)T[e]=C.filter(t=>t.type===e).length}h.setAttribute(`viewBox`,`0 0 `+Q+` `+E);let D=u.select(`[id="${t}"]`),k=O().domain([_(C,function(e){return e.startTime}),v(C,function(e){return e.endTime})]).rangeRound([0,Q-s.leftPadding-s.rightPadding]);function j(e,t){let n=e.startTime,r=t.startTime,i=0;return n>r?i=1:n<r&&(i=-1),i}i(j,`taskCompare`),C.sort(j),N(C,Q,E),f(D,E,Q,s.useMaxWidth),D.append(`text`).text(o.db.getDiagramTitle()).attr(`x`,Q/2).attr(`y`,s.titleTopMargin).attr(`class`,`titleText`);function N(e,t,n){let r=s.barHeight,i=r+s.barGap,a=s.topPadding,c=s.leftPadding,l=g().domain([0,w.length]).range([`#00B9FA`,`#F95002`]).interpolate(ne);ae(i,a,c,t,n,e,o.db.getExcludes(),o.db.getIncludes()),oe(c,a,t,n),ie(e,i,a,c,r,l,t,n),se(i,a,c,r,l),ce(c,a,t,n)}i(N,`makeGantt`);function ie(e,n,i,a,c,l,u){e.sort((e,t)=>e.vert===t.vert?0:e.vert?1:-1);let f=[...new Set(e.map(e=>e.order))].map(t=>e.find(e=>e.order===t));D.append(`g`).selectAll(`rect`).data(f).enter().append(`rect`).attr(`x`,0).attr(`y`,function(e,t){return t=e.order,t*n+i-2}).attr(`width`,function(){return u-s.rightPadding/2}).attr(`height`,n).attr(`class`,function(e){for(let[t,n]of w.entries())if(e.type===n)return`section section`+t%s.numberSectionStyles;return`section section0`}).enter();let p=D.append(`g`).selectAll(`rect`).data(e).enter(),m=o.db.getLinks();if(p.append(`rect`).attr(`id`,function(e){return e.id}).attr(`rx`,3).attr(`ry`,3).attr(`x`,function(e){return e.milestone?k(e.startTime)+a+.5*(k(e.endTime)-k(e.startTime))-.5*c:k(e.startTime)+a}).attr(`y`,function(e,t){return t=e.order,e.vert?s.gridLineStartPadding:t*n+i}).attr(`width`,function(e){return e.milestone?c:e.vert?.08*c:k(e.renderEndTime||e.endTime)-k(e.startTime)}).attr(`height`,function(e){return e.vert?C.length*(s.barHeight+s.barGap)+s.barHeight*2:c}).attr(`transform-origin`,function(e,t){return t=e.order,(k(e.startTime)+a+.5*(k(e.endTime)-k(e.startTime))).toString()+`px `+(t*n+i+.5*c).toString()+`px`}).attr(`class`,function(e){let t=``;e.classes.length>0&&(t=e.classes.join(` `));let n=0;for(let[t,r]of w.entries())e.type===r&&(n=t%s.numberSectionStyles);let r=``;return e.active?e.crit?r+=` activeCrit`:r=` active`:e.done?r=e.crit?` doneCrit`:` done`:e.crit&&(r+=` crit`),r.length===0&&(r=` task`),e.milestone&&(r=` milestone `+r),e.vert&&(r=` vert `+r),r+=n,r+=` `+t,`task`+r}),p.append(`text`).attr(`id`,function(e){return e.id+`-text`}).text(function(e){return e.task}).attr(`font-size`,s.fontSize).attr(`x`,function(e){let t=k(e.startTime),n=k(e.renderEndTime||e.endTime);if(e.milestone&&(t+=.5*(k(e.endTime)-k(e.startTime))-.5*c,n=t+c),e.vert)return k(e.startTime)+a;let r=this.getBBox().width;return r>n-t?n+r+1.5*s.leftPadding>u?t+a-5:n+a+5:(n-t)/2+t+a}).attr(`y`,function(e,t){return e.vert?s.gridLineStartPadding+C.length*(s.barHeight+s.barGap)+60:(t=e.order,t*n+s.barHeight/2+(s.fontSize/2-2)+i)}).attr(`text-height`,c).attr(`class`,function(e){let t=k(e.startTime),n=k(e.endTime);e.milestone&&(n=t+c);let r=this.getBBox().width,i=``;e.classes.length>0&&(i=e.classes.join(` `));let a=0;for(let[t,n]of w.entries())e.type===n&&(a=t%s.numberSectionStyles);let o=``;return e.active&&(o=e.crit?`activeCritText`+a:`activeText`+a),e.done?o=e.crit?o+` doneCritText`+a:o+` doneText`+a:e.crit&&(o=o+` critText`+a),e.milestone&&(o+=` milestoneText`),e.vert&&(o+=` vertText`),r>n-t?n+r+1.5*s.leftPadding>u?i+` taskTextOutsideLeft taskTextOutside`+a+` `+o:i+` taskTextOutsideRight taskTextOutside`+a+` `+o+` width-`+r:i+` taskText taskText`+a+` `+o+` width-`+r}),d().securityLevel===`sandbox`){let e;e=r(`#i`+t);let n=e.nodes()[0].contentDocument;p.filter(function(e){return m.has(e.id)}).each(function(e){var t=n.querySelector(`#`+e.id),r=n.querySelector(`#`+e.id+`-text`);let i=t.parentNode;var a=n.createElement(`a`);a.setAttribute(`xlink:href`,m.get(e.id)),a.setAttribute(`target`,`_top`),i.appendChild(a),a.appendChild(t),a.appendChild(r)})}}i(ie,`drawRects`);function ae(e,t,n,r,i,c,l,u){if(l.length===0&&u.length===0)return;let d,f;for(let{startTime:e,endTime:t}of c)(d===void 0||e<d)&&(d=e),(f===void 0||t>f)&&(f=t);if(!d||!f)return;if((0,F.default)(f).diff((0,F.default)(d),`year`)>5){a.warn(`The difference between the min and max time is more than 5 years. This will cause performance issues. Skipping drawing exclude days.`);return}let p=o.db.getDateFormat(),m=[],h=null,g=(0,F.default)(d);for(;g.valueOf()<=f;)o.db.isInvalidDate(g,p,l,u)?h?h.end=g:h={start:g,end:g}:h&&=(m.push(h),null),g=g.add(1,`d`);D.append(`g`).selectAll(`rect`).data(m).enter().append(`rect`).attr(`id`,e=>`exclude-`+e.start.format(`YYYY-MM-DD`)).attr(`x`,e=>k(e.start.startOf(`day`))+n).attr(`y`,s.gridLineStartPadding).attr(`width`,e=>k(e.end.endOf(`day`))-k(e.start.startOf(`day`))).attr(`height`,i-t-s.gridLineStartPadding).attr(`transform-origin`,function(t,r){return(k(t.start)+n+.5*(k(t.end)-k(t.start))).toString()+`px `+(r*e+.5*i).toString()+`px`}).attr(`class`,`exclude-range`)}i(ae,`drawExcludeDays`);function P(e,t,n,r){if(n<=0||e>t)return 1/0;let i=t-e,a=F.default.duration({[r??`day`]:n}).asMilliseconds();return a<=0?1/0:Math.ceil(i/a)}i(P,`getEstimatedTickCount`);function oe(e,t,n,r){let i=o.db.getDateFormat(),c=o.db.getAxisFormat(),l;l=c||(i===`D`?`%d`:s.axisFormat??`%Y-%m-%d`);let u=te(k).tickSize(-r+t+s.gridLineStartPadding).tickFormat(A(l)),d=/^([1-9]\d*)(millisecond|second|minute|hour|day|week|month)$/.exec(o.db.getTickInterval()||s.tickInterval);if(d!==null){let e=parseInt(d[1],10);if(isNaN(e)||e<=0)a.warn(`Invalid tick interval value: "${d[1]}". Skipping custom tick interval.`);else{let t=d[2],n=o.db.getWeekday()||s.weekday,r=k.domain(),i=r[0],c=r[1],l=P(i,c,e,t);if(l>$)a.warn(`The tick interval "${e}${t}" would generate ${l} ticks, which exceeds the maximum allowed (${$}). This may indicate an invalid date or time range. Skipping custom tick interval.`);else switch(t){case`millisecond`:u.ticks(b.every(e));break;case`second`:u.ticks(ee.every(e));break;case`minute`:u.ticks(y.every(e));break;case`hour`:u.ticks(x.every(e));break;case`day`:u.ticks(M.every(e));break;case`week`:u.ticks(ht[n].every(e));break;case`month`:u.ticks(S.every(e));break}}}if(D.append(`g`).attr(`class`,`grid`).attr(`transform`,`translate(`+e+`, `+(r-50)+`)`).call(u).selectAll(`text`).style(`text-anchor`,`middle`).attr(`fill`,`#000`).attr(`stroke`,`none`).attr(`font-size`,10).attr(`dy`,`1em`),o.db.topAxisEnabled()||s.topAxis){let n=re(k).tickSize(-r+t+s.gridLineStartPadding).tickFormat(A(l));if(d!==null){let e=parseInt(d[1],10);if(isNaN(e)||e<=0)a.warn(`Invalid tick interval value: "${d[1]}". Skipping custom tick interval.`);else{let t=d[2],r=o.db.getWeekday()||s.weekday,i=k.domain(),a=i[0],c=i[1];if(P(a,c,e,t)<=$)switch(t){case`millisecond`:n.ticks(b.every(e));break;case`second`:n.ticks(ee.every(e));break;case`minute`:n.ticks(y.every(e));break;case`hour`:n.ticks(x.every(e));break;case`day`:n.ticks(M.every(e));break;case`week`:n.ticks(ht[r].every(e));break;case`month`:n.ticks(S.every(e));break}}}D.append(`g`).attr(`class`,`grid`).attr(`transform`,`translate(`+e+`, `+t+`)`).call(n).selectAll(`text`).style(`text-anchor`,`middle`).attr(`fill`,`#000`).attr(`stroke`,`none`).attr(`font-size`,10)}}i(oe,`makeGrid`);function se(e,t){let n=0,r=Object.keys(T).map(e=>[e,T[e]]);D.append(`g`).selectAll(`text`).data(r).enter().append(function(e){let t=e[0].split(p.lineBreakRegex),n=-(t.length-1)/2,r=m.createElementNS(`http://www.w3.org/2000/svg`,`text`);r.setAttribute(`dy`,n+`em`);for(let[e,n]of t.entries()){let t=m.createElementNS(`http://www.w3.org/2000/svg`,`tspan`);t.setAttribute(`alignment-baseline`,`central`),t.setAttribute(`x`,`10`),e>0&&t.setAttribute(`dy`,`1em`),t.textContent=n,r.appendChild(t)}return r}).attr(`x`,10).attr(`y`,function(i,a){if(a>0)for(let o=0;o<a;o++)return n+=r[a-1][1],i[1]*e/2+n*e+t;else return i[1]*e/2+t}).attr(`font-size`,s.sectionFontSize).attr(`class`,function(e){for(let[t,n]of w.entries())if(e[0]===n)return`sectionTitle sectionTitle`+t%s.numberSectionStyles;return`sectionTitle`})}i(se,`vertLabels`);function ce(e,t,n,r){let i=o.db.getTodayMarker();if(i===`off`)return;let a=D.append(`g`).attr(`class`,`today`),c=new Date,l=a.append(`line`);l.attr(`x1`,k(c)+e).attr(`x2`,k(c)+e).attr(`y1`,s.titleTopMargin).attr(`y2`,r-s.titleTopMargin).attr(`class`,`today`),i!==``&&l.attr(`style`,i.replace(/,/g,`;`))}i(ce,`drawToday`);function le(e){let t={},n=[];for(let r=0,i=e.length;r<i;++r)Object.prototype.hasOwnProperty.call(t,e[r])||(t[e[r]]=!0,n.push(e[r]));return n}i(le,`checkUnique`)},`draw`)},styles:i(e=>`
  .mermaid-main-font {
        font-family: ${e.fontFamily};
  }

  .exclude-range {
    fill: ${e.excludeBkgColor};
  }

  .section {
    stroke: none;
    opacity: 0.2;
  }

  .section0 {
    fill: ${e.sectionBkgColor};
  }

  .section2 {
    fill: ${e.sectionBkgColor2};
  }

  .section1,
  .section3 {
    fill: ${e.altSectionBkgColor};
    opacity: 0.2;
  }

  .sectionTitle0 {
    fill: ${e.titleColor};
  }

  .sectionTitle1 {
    fill: ${e.titleColor};
  }

  .sectionTitle2 {
    fill: ${e.titleColor};
  }

  .sectionTitle3 {
    fill: ${e.titleColor};
  }

  .sectionTitle {
    text-anchor: start;
    font-family: ${e.fontFamily};
  }


  /* Grid and axis */

  .grid .tick {
    stroke: ${e.gridColor};
    opacity: 0.8;
    shape-rendering: crispEdges;
  }

  .grid .tick text {
    font-family: ${e.fontFamily};
    fill: ${e.textColor};
  }

  .grid path {
    stroke-width: 0;
  }


  /* Today line */

  .today {
    fill: none;
    stroke: ${e.todayLineColor};
    stroke-width: 2px;
  }


  /* Task styling */

  /* Default task */

  .task {
    stroke-width: 2;
  }

  .taskText {
    text-anchor: middle;
    font-family: ${e.fontFamily};
  }

  .taskTextOutsideRight {
    fill: ${e.taskTextDarkColor};
    text-anchor: start;
    font-family: ${e.fontFamily};
  }

  .taskTextOutsideLeft {
    fill: ${e.taskTextDarkColor};
    text-anchor: end;
  }


  /* Special case clickable */

  .task.clickable {
    cursor: pointer;
  }

  .taskText.clickable {
    cursor: pointer;
    fill: ${e.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideLeft.clickable {
    cursor: pointer;
    fill: ${e.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideRight.clickable {
    cursor: pointer;
    fill: ${e.taskTextClickableColor} !important;
    font-weight: bold;
  }


  /* Specific task settings for the sections*/

  .taskText0,
  .taskText1,
  .taskText2,
  .taskText3 {
    fill: ${e.taskTextColor};
  }

  .task0,
  .task1,
  .task2,
  .task3 {
    fill: ${e.taskBkgColor};
    stroke: ${e.taskBorderColor};
  }

  .taskTextOutside0,
  .taskTextOutside2
  {
    fill: ${e.taskTextOutsideColor};
  }

  .taskTextOutside1,
  .taskTextOutside3 {
    fill: ${e.taskTextOutsideColor};
  }


  /* Active task */

  .active0,
  .active1,
  .active2,
  .active3 {
    fill: ${e.activeTaskBkgColor};
    stroke: ${e.activeTaskBorderColor};
  }

  .activeText0,
  .activeText1,
  .activeText2,
  .activeText3 {
    fill: ${e.taskTextDarkColor} !important;
  }


  /* Completed task */

  .done0,
  .done1,
  .done2,
  .done3 {
    stroke: ${e.doneTaskBorderColor};
    fill: ${e.doneTaskBkgColor};
    stroke-width: 2;
  }

  .doneText0,
  .doneText1,
  .doneText2,
  .doneText3 {
    fill: ${e.taskTextDarkColor} !important;
  }


  /* Tasks on the critical line */

  .crit0,
  .crit1,
  .crit2,
  .crit3 {
    stroke: ${e.critBorderColor};
    fill: ${e.critBkgColor};
    stroke-width: 2;
  }

  .activeCrit0,
  .activeCrit1,
  .activeCrit2,
  .activeCrit3 {
    stroke: ${e.critBorderColor};
    fill: ${e.activeTaskBkgColor};
    stroke-width: 2;
  }

  .doneCrit0,
  .doneCrit1,
  .doneCrit2,
  .doneCrit3 {
    stroke: ${e.critBorderColor};
    fill: ${e.doneTaskBkgColor};
    stroke-width: 2;
    cursor: pointer;
    shape-rendering: crispEdges;
  }

  .milestone {
    transform: rotate(45deg) scale(0.8,0.8);
  }

  .milestoneText {
    font-style: italic;
  }
  .doneCritText0,
  .doneCritText1,
  .doneCritText2,
  .doneCritText3 {
    fill: ${e.taskTextDarkColor} !important;
  }

  .vert {
    stroke: ${e.vertLineColor};
  }

  .vertText {
    font-size: 15px;
    text-anchor: middle;
    fill: ${e.vertLineColor} !important;
  }

  .activeCritText0,
  .activeCritText1,
  .activeCritText2,
  .activeCritText3 {
    fill: ${e.taskTextDarkColor} !important;
  }

  .titleText {
    text-anchor: middle;
    font-size: 18px;
    fill: ${e.titleColor||e.textColor};
    font-family: ${e.fontFamily};
  }
`,`getStyles`)};export{_t as diagram};