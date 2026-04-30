var e=`abort.canplay.canplaythrough.durationchange.emptied.encrypted.ended.error.loadeddata.loadedmetadata.loadstart.pause.play.playing.progress.ratechange.seeked.seeking.stalled.suspend.timeupdate.volumechange.waiting.waitingforkey.resize.enterpictureinpicture.leavepictureinpicture.webkitbeginfullscreen.webkitendfullscreen.webkitpresentationmodechanged`.split(`.`),t=[`autopictureinpicture`,`disablepictureinpicture`,`disableremoteplayback`,`autoplay`,`controls`,`controlslist`,`crossorigin`,`loop`,`muted`,`playsinline`,`poster`,`preload`,`src`];function n(e){return`
    <style>
      :host {
        display: inline-flex;
        line-height: 0;
        flex-direction: column;
        justify-content: end;
      }

      audio {
        width: 100%;
      }
    </style>
    <slot name="media">
      <audio${o(e)}></audio>
    </slot>
    <slot></slot>
  `}function r(e){return`
    <style>
      :host {
        display: inline-block;
        line-height: 0;
      }

      video {
        max-width: 100%;
        max-height: 100%;
        min-width: 100%;
        min-height: 100%;
        object-fit: var(--media-object-fit, contain);
        object-position: var(--media-object-position, 50% 50%);
      }

      video::-webkit-media-text-track-container {
        transform: var(--media-webkit-text-track-transform);
        transition: var(--media-webkit-text-track-transition);
      }
    </style>
    <slot name="media">
      <video${o(e)}></video>
    </slot>
    <slot></slot>
  `}function i(i,{tag:o,is:c}){let l=globalThis.document?.createElement?.(o,{is:c}),u=l?a(l):[];return class a extends i{static getTemplateHTML=o.endsWith(`audio`)?n:r;static shadowRootOptions={mode:`open`};static Events=e;static#e=!1;static get observedAttributes(){return a.#t(),[...l?.constructor?.observedAttributes??[],...t]}static#t(){if(this.#e)return;this.#e=!0;let e=new Set(this.observedAttributes);e.delete(`muted`);for(let t of u)if(!(t in this.prototype))if(typeof l[t]==`function`)this.prototype[t]=function(...e){return this.#o(),this.call?this.call(t,...e):(this.nativeEl?.[t])?.apply(this.nativeEl,e)};else{let n={get(){this.#o();let n=t.toLowerCase();if(e.has(n)){let e=this.getAttribute(n);return e===null?!1:e===``?!0:e}return this.get?.(t)??this.nativeEl?.[t]}};t!==t.toUpperCase()&&(n.set=function(n){this.#o();let r=t.toLowerCase();if(e.has(r)){n===!0||n===!1||n==null?this.toggleAttribute(r,!!n):this.setAttribute(r,n);return}if(this.set){this.set(t,n);return}this.nativeEl&&(this.nativeEl[t]=n)}),Object.defineProperty(this.prototype,t,n)}}#n=!1;#r=null;#i=new Map;#a;get;set;call;get nativeEl(){return this.#o(),this.#r??this.querySelector(`:scope > [slot=media]`)??this.querySelector(o)??this.shadowRoot?.querySelector(o)??null}set nativeEl(e){this.#r=e}get defaultMuted(){return this.hasAttribute(`muted`)}set defaultMuted(e){this.toggleAttribute(`muted`,e)}get src(){return this.getAttribute(`src`)}set src(e){this.setAttribute(`src`,`${e}`)}get preload(){return this.getAttribute(`preload`)??this.nativeEl?.preload}set preload(e){this.setAttribute(`preload`,`${e}`)}#o(){this.#n||(this.#n=!0,this.init())}init(){if(!this.shadowRoot){this.attachShadow({mode:`open`});let e=s(this.attributes);c&&(e.is=c),o&&(e.part=o),this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}this.nativeEl.muted=this.hasAttribute(`muted`);for(let e of u)this.#u(e);this.#a=new MutationObserver(this.#c.bind(this)),this.shadowRoot.addEventListener(`slotchange`,()=>this.#s()),this.#s();for(let e of this.constructor.Events)this.shadowRoot.addEventListener(e,this,!0)}handleEvent(e){e.target===this.nativeEl&&this.dispatchEvent(new CustomEvent(e.type,{detail:e.detail}))}#s(){let e=new Map(this.#i);((this.shadowRoot?.querySelector(`slot:not([name])`))?.assignedElements({flatten:!0}).filter(e=>[`track`,`source`].includes(e.localName))).forEach(t=>{e.delete(t);let n=this.#i.get(t);n||(n=t.cloneNode(),this.#i.set(t,n),this.#a?.observe(t,{attributes:!0})),this.nativeEl?.append(n),this.#l(n)}),e.forEach((e,t)=>{e.remove(),this.#i.delete(t)})}#c(e){for(let t of e)if(t.type===`attributes`){let{target:e,attributeName:n}=t,r=this.#i.get(e);r&&n&&(r.setAttribute(n,e.getAttribute(n)??``),this.#l(r))}}#l(e){e&&e.localName===`track`&&e.default&&(e.kind===`chapters`||e.kind===`metadata`)&&e.track.mode===`disabled`&&(e.track.mode=`hidden`)}#u(e){if(Object.prototype.hasOwnProperty.call(this,e)){let t=this[e];delete this[e],this[e]=t}}attributeChangedCallback(e,t,n){this.#o(),this.#d(e,t,n)}#d(e,t,n){[`id`,`class`].includes(e)||!a.observedAttributes.includes(e)&&this.constructor.observedAttributes.includes(e)||(n===null?this.nativeEl?.removeAttribute(e):this.nativeEl?.getAttribute(e)!==n&&this.nativeEl?.setAttribute(e,n))}connectedCallback(){this.#o()}}}function a(e){let t=[];for(let n=Object.getPrototypeOf(e);n&&n!==HTMLElement.prototype;n=Object.getPrototypeOf(n)){let e=Object.getOwnPropertyNames(n);t.push(...e)}return t}function o(e){let n=``;for(let r in e){if(!t.includes(r))continue;let i=e[r];i===``?n+=` ${r}`:n+=` ${r}="${i}"`}return n}function s(e){let t={};for(let n of e)t[n.name]=n.value;return t}var c=i(globalThis.HTMLElement??class{},{tag:`video`});i(globalThis.HTMLElement??class{},{tag:`audio`});export{c as t};