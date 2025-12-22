
# vue3版本！！！
vue2版本已经上线，欢迎下载使用。
[https://ext.dcloud.net.cn/plugin?id=13864](https://ext.dcloud.net.cn/plugin?id=13864)

## uniapp markdown渲染解析.md语法及代码高亮
> **组件名：uaMarkdown**
> 代码块： `<ua-markdown>`


uaMarkdown组件是基于uniapp+vue3自定义解析markdown语法结构插件、支持代码块高亮，编译兼容H5+小程序端+App端。


### 引入方式

本组件符合[easycom](https://uniapp.dcloud.io/collocation/pages?id=easycom)规范，只需将本组件`ua-markdown`放在components目录，在页面`template`中即可直接使用。


### 基本用法 

**示例**

- 基础用法

```html
const mdvalue = '### uniapp markdwon'
<ua-markdown :source="mdvalue" />
```

- 去掉代码块行号

```html
<ua-markdown :source="xxx" :showLine="false" />
```


### API

### uaMarkdown Props 

|属性名|类型|默认值|说明|
|:-:|:-:|:-:|:-:|
|source|String|-| 渲染解析内容 |
|showLine|Boolean|true| 是否显示代码块行号 |


### 💝最后

开发不易，希望各位小伙伴们多多支持下哈~~ ☕️☕️
