#!/usr/bin/env node

/**
 * Script để setup AI providers cho BuildingAI
 * Hướng dẫn người dùng nhập API keys và tạo file .env
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const providers = [
  {
    name: 'OpenAI (ChatGPT)',
    envKey: 'OPENAI_API_KEY',
    website: 'https://platform.openai.com/api-keys',
    required: false
  },
  {
    name: 'Anthropic (Claude)',
    envKey: 'ANTHROPIC_API_KEY',
    website: 'https://console.anthropic.com/',
    required: false
  },
  {
    name: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    website: 'https://platform.deepseek.com/',
    required: false
  },
  {
    name: 'Google (Gemini)',
    envKey: 'GOOGLE_API_KEY',
    website: 'https://makersuite.google.com/app/apikey',
    required: false
  }
];

const dbProviders = [
  {
    name: 'Vercel Postgres',
    type: 'managed',
    setup: 'Chạy: vercel postgres create'
  },
  {
    name: 'Supabase',
    type: 'managed',
    setup: 'Đăng ký tại: https://supabase.com'
  },
  {
    name: 'Railway',
    type: 'managed',
    setup: 'Đăng ký tại: https://railway.app'
  },
  {
    name: 'Custom PostgreSQL',
    type: 'self-hosted',
    setup: 'Sử dụng PostgreSQL server của riêng bạn'
  }
];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     BuildingAI - AI Provider Setup Script                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function setupAIProviders() {
  const envVars = {};

  console.log('📝 Thiết lập AI Providers\n');
  console.log('Bạn có thể bỏ qua bất kỳ provider nào bằng cách nhấn Enter\n');

  for (const provider of providers) {
    console.log(`\n🤖 ${provider.name}`);
    console.log(`   Website: ${provider.website}`);

    const apiKey = await question(`   Nhập API key (hoặc Enter để bỏ qua): `);

    if (apiKey && apiKey.trim()) {
      envVars[provider.envKey] = apiKey.trim();
      console.log('   ✅ API key đã được lưu');
    } else {
      console.log('   ⏭️  Bỏ qua provider này');
    }
  }

  return envVars;
}

async function setupDatabase() {
  console.log('\n\n📊 Thiết lập Database\n');
  console.log('Chọn database provider của bạn:\n');

  dbProviders.forEach((provider, index) => {
    console.log(`${index + 1}. ${provider.name} (${provider.type})`);
    console.log(`   ${provider.setup}\n`);
  });

  const choice = await question('Chọn (1-4): ');
  const selectedProvider = dbProviders[parseInt(choice) - 1];

  if (!selectedProvider) {
    console.log('❌ Lựa chọn không hợp lệ');
    return {};
  }

  console.log(`\n✅ Đã chọn: ${selectedProvider.name}`);

  const dbVars = {};

  if (selectedProvider.type === 'self-hosted' || choice === '4') {
    console.log('\nNhập thông tin database:\n');
    dbVars.DB_HOST = await question('Database Host: ');
    dbVars.DB_PORT = await question('Database Port (5432): ') || '5432';
    dbVars.DB_USERNAME = await question('Database Username: ');
    dbVars.DB_PASSWORD = await question('Database Password: ');
    dbVars.DB_DATABASE = await question('Database Name (buildingai): ') || 'buildingai';
  } else {
    console.log('\n📌 Lưu ý: Sau khi tạo database, hãy cập nhật thông tin vào .env');
    console.log(`   Làm theo hướng dẫn: ${selectedProvider.setup}`);
  }

  return dbVars;
}

async function setupRedis() {
  console.log('\n\n🔴 Thiết lập Redis\n');
  console.log('Khuyến nghị sử dụng Upstash Redis cho Vercel deployment');
  console.log('Website: https://upstash.com\n');

  const useRedis = await question('Bạn có muốn cấu hình Redis ngay bây giờ? (y/n): ');

  if (useRedis.toLowerCase() !== 'y') {
    console.log('⏭️  Bỏ qua Redis setup');
    return {};
  }

  const redisVars = {};
  console.log('\nNhập thông tin Redis:\n');
  redisVars.REDIS_HOST = await question('Redis Host: ');
  redisVars.REDIS_PORT = await question('Redis Port (6379): ') || '6379';
  redisVars.REDIS_PASSWORD = await question('Redis Password: ');

  return redisVars;
}

async function generateEnvFile(envVars) {
  console.log('\n\n📄 Tạo file .env\n');

  const envPath = path.join(rootDir, '.env');
  const examplePath = path.join(rootDir, '.env.example');

  // Đọc .env.example
  let envContent = fs.readFileSync(examplePath, 'utf-8');

  // Thay thế các giá trị
  for (const [key, value] of Object.entries(envVars)) {
    const regex = new RegExp(`^${key}=.*$`, 'gm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  // Sinh JWT secret ngẫu nhiên nếu chưa có
  if (!envVars.JWT_SECRET) {
    const crypto = await import('crypto');
    const jwtSecret = crypto.randomBytes(64).toString('hex');
    envContent = envContent.replace(/^JWT_SECRET=.*$/gm, `JWT_SECRET=${jwtSecret}`);
  }

  // Ghi file
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ File .env đã được tạo tại: ${envPath}`);
}

async function main() {
  try {
    // Setup AI providers
    const aiEnvVars = await setupAIProviders();

    // Setup Database
    const dbEnvVars = await setupDatabase();

    // Setup Redis
    const redisEnvVars = await setupRedis();

    // Combine all env vars
    const allEnvVars = {
      ...aiEnvVars,
      ...dbEnvVars,
      ...redisEnvVars
    };

    // Generate .env file
    if (Object.keys(allEnvVars).length > 0) {
      await generateEnvFile(allEnvVars);
    }

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Setup hoàn tất! 🎉                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Các bước tiếp theo:\n');
    console.log('1. Kiểm tra file .env và cập nhật các giá trị còn thiếu');
    console.log('2. Chạy: pnpm install');
    console.log('3. Chạy: pnpm run build');
    console.log('4. Deploy lên Vercel: vercel');
    console.log('\n📖 Xem thêm hướng dẫn chi tiết trong VERCEL_DEPLOYMENT.md\n');

  } catch (error) {
    console.error('\n❌ Lỗi:', error.message);
  } finally {
    rl.close();
  }
}

main();
