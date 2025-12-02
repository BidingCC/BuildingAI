1.本项目是 BuildingAI 的主应用程序， 技术栈 Nuxt3 + NuxtUI + TypeScript + Vue3 + Pinia +
TailwindCSS +
@buildingai/nuxt 2.项目采用Monorepo架构，环境变量配置在根目录（../../../.env）项目使用 pnpm 作为包管理器 3.项目严格按照 模块化开发，尽量简洁代码，避免绝对路径，生成的代码 相对完善可读性强 4.项目 Nuxt 配置在 @building/nuxt 模块里面，包含了基础模块的注册、配置、插件等，这边是公共的一些配置信息，最终被项目中的 nuxt.config.ts 中引入使用。5.项目公共 stores 状态管理是在 @building/stores 模块里面，包含了应用配置，用户信息，权限信息，控制器信息等状态管理。6.项目全局组件放在 @building/ui 模块里面(项目中使用无需引入)，包含了全局组件 bd-xxx, 以及全局的样式定义都在这里 里面具体的全局组件有：

- bd-aspect-ratio: 宽高比容器 - 保持固定宽高比的容器组件
- bd-button-copy: 复制按钮 - 由于 NuxtUI 组件库没有复制按钮，所以这里单独封装一个复制按钮组件, 适配全部的原组件按钮功能
- bd-card: 卡片 - 封装了 通用的卡片组件 拥有多种适配插槽和高度定制需求
- bd-chat-scroll: 聊天滚动 - 封装了 聊天滚动组件, 专为聊天场景优化的滚动组件, 适配了 聊天场景的滚动需求
- bd-color-picker: 颜色选择器 - 封装了 NuxtUI 的 颜色选择器组件, 添加了定制需求
- bd-date-picker: 日期选择器 - 封装了 NuxtUI 的 日期选择器组件, 拓展了日期选择器的功能
- bd-date-range-picker: 日期范围选择器 - 封装了 NuxtUI 的 日期范围选择器组件, 拓展了日期范围选择器的功能
- bd-echarts: 图表 - 封装了 echarts 的 图表组件, 拥有大部分的图表功能
- bd-editor: 编辑器 - 基于tiptap集合了富文本编辑器的功能
- bd-infinite-scroll: 无限滚动 - 无限滚动加载，用于底部加载的场景
- bd-input-password: 密码输入框 - 由于 NuxtUI 缺少密码输入框，所以这里单独封装一个密码输入框组件
- bd-markdown:
  markdown 渲染 - 使用 markdown-it 插件集成了定制的 markdown 渲染需求，拥有 markdown-it 全部功能和插件拓展 代码复制 github 的 alerts提示 代码高亮 数学公式 mermaid 流程图渲染器 等功能
- bd-modal: 模态框 - 基于 NuxtUI 封装的模态框组件, 封装了一层我认为方便的使用场景组件
- bd-modal-use: 模态框使用 - 这里特意供给 useModal 方法使用的，用于在 函数式调用模态框的使用场景中
- bd-pagination: 分页 - 封装了 NuxtUI 的 分页组件, 搭配 usePaging 方法使用，省略了多个分页请求的场景使用步骤
- bd-placeholder: 占位符 - 主要用于演示组件的占位符
- bd-scroll-area: 滚动区域组件 - 基于 reka-ui 的 ScrollArea 组件封装 特别个性化定制，如果有滚动场景非常推荐使用
- bd-slider: 滑块 - 封装了 NuxtUI 的 滑块组件, 添加了定制需求
- bd-theme-toggle: 主题切换 - 通过 "@vueuse/core" 的useColorMode 实现的主题切换功能组件
- bd-time-picker: 时间选择器 - 用于时间选择场景，定制化的开发
- bd-uploader: 上传组件 - 上传各种文件场景的封装 7.项目的 http 请求封装在 @building/http 模块里面(项目中使用无需引入)，项目的 hooks/use-request 会被 @building/nuxt 的 modules 自动引入，然后项目中 只需要 使用 useXXXGet,
  useXXXPost, useXXXPut, useXXXDelete,
  useXXXPatch 等就能直接使用 。8.项目的请求 api 被独立的放在了一个包之中，是 @building/service 模块，里面使用独立文件去定义每个模块的请求接口，比如 common.ts 里面拥有全局的一些请求功能， 在使用的时候 引入 @building/service/common， 比如 apiGetSiteConfig 直接 在 script 中使用即可。， !!!!![注意]：@building/service 仅限于给主程序使用 ，如果在插件(extensions)里面的web项目中使用的话，请在自己的 web/service 中定义api的接口。而不是在 @building/service 模块中定义。9.项目的 i18n 配置在 @building/i18n-config 模块中，里面定义了 i18n 的语言包获取，以及公共的 i18n 语言包，可用于 主程序或插件，只需要在项目中 app/i18n中定义一个文件夹，里面 index.ts 引入 generateAppMessagesForLocale 然后 export
  default
  defineI18nLocale 导出即可使用这个插件包，语言包的定义文件夹名称约为 zh/jp/en等，注意不要使用 common.json 因为这个文件是公共的，不允许重复定义， 使用国际化方式的时候如果在 template 中可以 使用 $t('xxx'), 如果在 script 中使用 const
  { t } =
  useI18n() 即可。10.项目通用 hooks 封装在 @building/hooks 模块中(项目中使用无需引入)，里面封装了常用的 hooks，比如：
- useAccessControl: 权限控制 - 封装了权限控制功能（是否拥有某个权限），使用方法：const {
  hasAccessByCodes } = useAccessControl()
- useChat: 聊天对话封装 - 参照了 vercel/ai 的 ai-sdk包的前端请求流程来进行 和 AI 的对话通信
- use-image-preview: 图片预览 - 封装了图片预览功能(Fancybox)，使用方法：useImagePreview(urls:
  string[], index: number)
- use-lock-fn:: 锁功能封装 - 封装了锁功能，防止多次点击
- use-message: 消息提示封装 - 封装了消息提示功能，基于 NuxtUI 的 Toast 进行封装
- use-modal: 模态框封装 - 使用 NuxtUI 的 useOverlay 功能进行调用 bd-modal-use 实现函数式调用模态框
- use-paging: 分页封装 - 封装了分页功能，如果有分页功能都推荐使用这个函数去进行简洁的分页请求
- use-polling-task: 定时轮询封装 - 封装了定时轮询功能
- use-route-path: 路由解析权限封装，主要用于 useRoutePath(permissionCode) 获取后台的路由路径，返回值是 路由路径，在主程序的后台如果跳转需要使用 这个 解析路由路径， 此方法的 permissionCode 在菜单列表中有定义
