# Hướng dẫn Deploy BuildingAI lên Vercel

Tài liệu này hướng dẫn bạn deploy BuildingAI lên Vercel với tích hợp API AI của riêng bạn (Claude, ChatGPT, DeepSeek, Gemini, v.v.).

## 📋 Yêu cầu trước khi bắt đầu

1. **Tài khoản Vercel**: Đăng ký tại [vercel.com](https://vercel.com)
2. **Tài khoản GitHub**: Repository của bạn cần được push lên GitHub
3. **Node.js**: Phiên bản 22 trở lên
4. **pnpm**: Package manager (được cài tự động trên Vercel)

## 🚀 Các bước Deploy

### Bước 1: Chuẩn bị Database và Redis

BuildingAI cần PostgreSQL và Redis. Với Vercel, bạn có các tùy chọn:

#### Option A: Sử dụng Vercel Postgres + Upstash Redis (Khuyến nghị)

**PostgreSQL:**
```bash
# Cài đặt Vercel Postgres
vercel postgres create
```

**Redis:**
1. Đăng ký tài khoản tại [upstash.com](https://upstash.com)
2. Tạo Redis database
3. Copy connection details (host, port, password)

#### Option B: Sử dụng các service khác

- **PostgreSQL**: Supabase, Railway, Neon, ElephantSQL
- **Redis**: Redis Cloud, Railway

### Bước 2: Lấy API Keys từ các AI Providers

Bạn cần đăng ký và lấy API keys từ các providers mà bạn muốn sử dụng:

| Provider | Website | Cách lấy API Key |
|----------|---------|------------------|
| **OpenAI (ChatGPT)** | [platform.openai.com](https://platform.openai.com) | Dashboard → API Keys |
| **Anthropic (Claude)** | [console.anthropic.com](https://console.anthropic.com) | Account Settings → API Keys |
| **DeepSeek** | [platform.deepseek.com](https://platform.deepseek.com) | API Keys |
| **Google (Gemini)** | [makersuite.google.com](https://makersuite.google.com/app/apikey) | Get API Key |

### Bước 3: Deploy lên Vercel

#### 3.1. Import Project

1. Truy cập [vercel.com/new](https://vercel.com/new)
2. Import repository GitHub của bạn
3. Chọn framework: **Nuxt.js**

#### 3.2. Cấu hình Build Settings

Vercel sẽ tự động detect Nuxt.js. Cấu hình đã được tối ưu trong `vercel.json`:

- **Framework Preset**: Nuxt.js
- **Build Command**: `cd packages/web/buildingai-ui && pnpm run generate`
- **Output Directory**: `packages/web/buildingai-ui/.output/public`
- **Install Command**: `pnpm install --filter=!./extensions/** --filter=!./templates/**`

> **Lưu ý**: Build command đã được tối ưu để chỉ build web package, bỏ qua extensions để tránh lỗi dependencies.

#### 3.3. Cấu hình Environment Variables

Trong Vercel Dashboard, vào **Settings → Environment Variables** và thêm các biến sau:

##### 🔐 Bắt buộc

```env
# App Configuration
APP_NAME=BuildingAI
APP_DOMAIN=https://your-app.vercel.app
NODE_VERSION=22

# JWT (Tạo secret key mạnh)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
JWT_EXPIRES_IN=7d

# Database (từ Vercel Postgres hoặc provider khác)
DB_TYPE=postgres
DB_HOST=your-postgres-host
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_DATABASE=buildingai
DB_SYNCHRONIZE=false
DB_LOGGING=false

# Redis (từ Upstash hoặc provider khác)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Web
VITE_PRODUCTION_APP_BASE_URL=https://your-app.vercel.app
VITE_APP_WEB_API_PREFIX=/api
VITE_APP_CONSOLE_API_PREFIX=/consoleapi
```

##### 🤖 AI Provider API Keys

Thêm API keys cho các providers bạn muốn sử dụng:

```env
# OpenAI (ChatGPT)
OPENAI_API_KEY=sk-...

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# DeepSeek
DEEPSEEK_API_KEY=...

# Google (Gemini)
GOOGLE_API_KEY=...
```

#### 3.4. Deploy

1. Nhấn **Deploy**
2. Chờ build hoàn tất (5-10 phút)
3. Truy cập domain được cung cấp

### Bước 4: Khởi tạo Database

Sau khi deploy thành công:

1. Truy cập `https://your-app.vercel.app/install`
2. Làm theo hướng dẫn setup wizard để khởi tạo database và tạo admin account

## 🔧 Cấu hình AI Providers trong ứng dụng

Sau khi đăng nhập vào BuildingAI:

1. Vào **Console** → **AI Providers**
2. Thêm các providers bạn đã cấu hình API keys:

### Cấu hình OpenAI (ChatGPT)

```json
{
  "provider": "openai",
  "name": "OpenAI",
  "apiKey": "Sử dụng từ env: OPENAI_API_KEY",
  "baseUrl": "https://api.openai.com/v1",
  "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"]
}
```

### Cấu hình Anthropic (Claude)

```json
{
  "provider": "anthropic",
  "name": "Anthropic",
  "apiKey": "Sử dụng từ env: ANTHROPIC_API_KEY",
  "baseUrl": "https://api.anthropic.com/v1",
  "models": [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229"
  ]
}
```

### Cấu hình DeepSeek

```json
{
  "provider": "deepseek",
  "name": "DeepSeek",
  "apiKey": "Sử dụng từ env: DEEPSEEK_API_KEY",
  "baseUrl": "https://api.deepseek.com",
  "models": ["deepseek-chat", "deepseek-coder"]
}
```

### Cấu hình Google (Gemini)

```json
{
  "provider": "google",
  "name": "Google Gemini",
  "apiKey": "Sử dụng từ env: GOOGLE_API_KEY",
  "models": ["gemini-pro", "gemini-pro-vision"]
}
```

## 📊 Kiến trúc Deployment

```
┌─────────────────────────────────────────────┐
│           Vercel (Frontend)                 │
│  ┌─────────────────────────────────────┐   │
│  │  Nuxt.js App (buildingai-ui)        │   │
│  │  - SSR/Static Generation            │   │
│  │  - API Routes (/api, /consoleapi)   │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  Vercel Postgres │  │  Upstash Redis   │
│  (Database)      │  │  (Cache/Queue)   │
└──────────────────┘  └──────────────────┘
          │                    │
          └─────────┬──────────┘
                    ▼
          ┌──────────────────┐
          │   AI Providers   │
          │  - OpenAI        │
          │  - Anthropic     │
          │  - DeepSeek      │
          │  - Google        │
          └──────────────────┘
```

## 🛠️ Troubleshooting

### Lỗi Build

**Lỗi**: `ENOENT: no such file or directory`
- **Giải pháp**: Kiểm tra `outputDirectory` trong vercel.json

**Lỗi**: `Module not found`
- **Giải pháp**: Chạy `pnpm install` local để kiểm tra dependencies

### Lỗi Runtime

**Lỗi**: Database connection failed
- **Giải pháp**: Kiểm tra DB credentials trong Environment Variables
- Đảm bảo database cho phép connection từ Vercel IPs

**Lỗi**: Redis connection timeout
- **Giải pháp**: Kiểm tra Redis credentials
- Với Upstash, đảm bảo sử dụng TLS connection

### Lỗi AI Provider

**Lỗi**: API key invalid
- **Giải pháp**: Kiểm tra lại API key trong Environment Variables
- Đảm bảo API key có quyền truy cập đúng

**Lỗi**: Rate limit exceeded
- **Giải pháp**: Kiểm tra usage limits của provider
- Nâng cấp plan nếu cần

## 🔒 Bảo mật

1. **Không commit API keys** vào git
2. **Sử dụng Environment Variables** cho tất cả secrets
3. **Tạo JWT_SECRET mạnh**: Sử dụng generator như:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
4. **Giới hạn CORS** trong production (không dùng `*`)
5. **Enable HTTPS** (Vercel tự động cung cấp)

## 📈 Monitoring và Logs

Trong Vercel Dashboard:

- **Deployments**: Xem lịch sử deploy
- **Analytics**: Theo dõi traffic
- **Logs**: Xem runtime logs
- **Environment Variables**: Quản lý env vars

## 🔄 Continuous Deployment

Vercel tự động deploy khi:
- Push lên branch `main` → Production
- Push lên branch khác → Preview deployment

Cấu hình trong **Settings → Git** để thay đổi behavior.

## 💡 Tips

1. **Sử dụng Preview Deployments** để test trước khi deploy production
2. **Enable Edge Functions** cho performance tốt hơn
3. **Cấu hình Caching** cho static assets
4. **Monitor Usage** để tránh vượt quá limits của Vercel plan

## 📚 Tài liệu tham khảo

- [Vercel Documentation](https://vercel.com/docs)
- [Nuxt.js on Vercel](https://vercel.com/docs/frameworks/nuxt)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Upstash Redis](https://upstash.com/docs/redis)

## 🆘 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra [Issues](https://github.com/BidingCC/BuildingAI/issues)
2. Tạo issue mới với label `deployment`
3. Tham khảo [Community Forum](https://www.buildingai.cc/question)

---

**Chúc bạn deploy thành công! 🎉**
