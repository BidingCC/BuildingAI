function e(e){var t=[...arguments].slice(1),n=Array.from(typeof e==`string`?[e]:e);n[n.length-1]=n[n.length-1].replace(/\r?\n([\t ]*)$/,``);var r=n.reduce(function(e,t){var n=t.match(/\n([\t ]+|(?!\s).)/g);return n?e.concat(n.map(function(e){return e.match(/[\t ]/g)?.length??0})):e},[]);if(r.length){var i=RegExp(`
[	 ]{`+Math.min.apply(Math,r)+`}`,`g`);n=n.map(function(e){return e.replace(i,`
`)})}n[0]=n[0].replace(/^\r?\n/,``);var a=n[0];return t.forEach(function(e,t){var r=a.match(/(?:^|\n)( *)$/),i=r?r[1]:``,o=e;typeof e==`string`&&e.includes(`
`)&&(o=String(e).split(`
`).map(function(e,t){return t===0?e:``+i+e}).join(`
`)),a+=o+n[t+1]}),a}export{e as t};