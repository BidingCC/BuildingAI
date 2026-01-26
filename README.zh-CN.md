<p align="center">
  <a href="https://www.buildingai.cc/" target="_blank"><img src="./assets/banner.png" width="100%" alt="Nest Logo" /></a>
</p>

<p align="center">
<a href="http://demo.buildingai.cc/" target="_blank">在线演示</a>｜
<a href="https://www.buildingai.cc/">官方网站</a>｜
<a href="./README.md">English</a>
</p>

<p align="center">
  <a href="https://nestjs.com/"><img src="https://img.shields.io/badge/NestJS-11.x-ea2845" alt="NestJS" /></a>
  <a href="https://typeorm.io/"><img src="https://img.shields.io/badge/Typeorm-0.3.x-ef4100" alt="NestJS" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-17.x-29527d" alt="NestJS" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178c6" alt="TypeScript" /></a>
  <a href="https://turbo.build/"><img src="https://img.shields.io/badge/Turbo-2.x-6d5cb3" alt="Turbo" /></a>
  <a href="https://vuejs.org/"><img src="https://img.shields.io/badge/Vue.js-3.x-3aaf78" alt="Vue.js" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/vite-7.x-646cff" alt="Vite" /></a>
  <a href="https://ui.nuxt.com/"><img src="https://img.shields.io/badge/NuxtUI-3.x-00b95f" alt="NuxtUI" /></a>
  <a href="https://nuxt.com/"><img src="https://img.shields.io/badge/NuxtJS-4.x-00b95f" alt="NuxtJS" /></a>
</p>

BuildingAI 是一款面向AI开发者、AI创业者和先进组织打造的企业级开源智能体搭建平台。通过可视化配置界面（Do
It
Yourself）零代码搭建具备智能体、MCP、RAG管道、知识库、大模型聚合、上下文工程等原生AI能力，以及用户注册、会员订阅、算力计费等商业闭环能力的原生企业智能体应用。

## 快速入门

> 安装 `BuildingAI` 之前，请确保你的设备满足一下最低配置要求：
>
> - **CPU**：≥2核
> - **内存**：≥4GB RAM
> - **存储**：≥5GB 空闲空间

使用 [Docker](https://www.docker.com/)
部署 BuildingAI 是最简单、稳定的部署方案。安装之前，请确保你的设备已经安装了
[Docker](https://www.docker.com/) 和 [Docker Compose](https://docs.docker.com/compose/)

```bash
# 进入项目目录（替换为你的项目目录名）
cd buildingai
# 复制并修改环境变量配置
cp .env.example .env
# 生产环境请修改 .env 文件中的 APP_DOMAIN 为你的域名
# 使用 Docker 启动应用
docker compose up -d
```

等待镜像拉取和项目构建，正常约5～10分钟（取决于设备性能和网络环境），可在Nodejs容器日志中查看构建进度，一般出现访问地址时即表示项目启动成功。

待项目完全启动后，您可以通过浏览器访问以下地址
[http://localhost:4090/install](http://localhost:4090/install) 进入到初始化安装界面进行初始化设置。

其他部署方式请参阅我们的 [《部署文档》](https://www.buildingai.cc/docs/introduction/install)

## 主要功能

- **AI对话**： 基于 LLM 模型进行对话、文本生成，支持多模态模型调用
- **AI智能体**： 支持创建具备记忆、目标和工具使用能力的智能体，实现自主任务执行
- **知识库**： 通过文档构建知识库，支持向量检索与RAG增强生成
- **MCP调用**： 支持以 SSE、StreamableHTTP 方式调用MCP工具
- **模型管理**： 支持主流大模型集成，统一API规范
- **拓展机制**： 通过安装拓展丰富系统功能和AI能力
- **充值计费**： 内置会员管理、计费管理、支付功能，开箱即用

## 截图展示

![image](./assets/screenshots/1.png) ![image](./assets/screenshots/2.png)
![image](./assets/screenshots/3.png) ![image](./assets/screenshots/4.png)
![image](./assets/screenshots/5.png)

## 贡献

如果您想贡献代码，可以在Github上
[提交 Issue](https://github.com/BidingCC/BuildingAI/issues/new/choose) 或者
[提交 PR](https://github.com/BidingCC/BuildingAI/pulls)。

也可以通过[社群](https://buildingai.cc/docs/introduction/community)、[问答社区](https://buildingai.cc/question)等方式联系我们。

## Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=BidingCC/BuildingAI&type=Date)](https://www.star-history.com/#BidingCC/BuildingAI&Date)

## 隐私政策

本项目**仅在获得您同意后**才会收集匿名使用统计数据。详情请参阅
[PRIVACY_NOTICE.md](./PRIVACY_NOTICE.md) 文件。

## 许可证

[Apache License 2.0](./LICENSE)
