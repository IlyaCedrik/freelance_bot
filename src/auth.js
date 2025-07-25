import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import readline from "readline";
import fs from "fs";
import path from "path";
import telegramConfig from './config/telegram.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function updateConfigSession(sessionString) {
  const configPath = path.join(process.cwd(), 'src/config/telegram.js');
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  const sessionRegex = /session:\s*['"][^'"]*['"]/;
  configContent = configContent.replace(sessionRegex, `session: '${sessionString}'`);
  
  fs.writeFileSync(configPath, configContent);
  console.log('✅ Session сохранена в конфиг файл');
}

async function authenticate() {
  console.log("🔐 Авторизация в Telegram...");
  
  const stringSession = new StringSession("");
  const client = new TelegramClient(stringSession, telegramConfig.apiId, telegramConfig.apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () =>
      new Promise((resolve) =>
        rl.question("📱 Введите номер телефона: ", resolve)
      ),
    password: async () =>
      new Promise((resolve) =>
        rl.question("🔒 Введите пароль (если есть двухфакторная аутентификация): ", resolve)
      ),
    phoneCode: async () =>
      new Promise((resolve) =>
        rl.question("📨 Введите код из SMS: ", resolve)
      ),
    onError: (err) => console.log("❌ Ошибка:", err),
  });

  console.log("✅ Авторизация успешна!");
  const sessionString = client.session.save();
  console.log("🔑 Session string:", sessionString);
  
  // Сохраняем session в конфиг
  updateConfigSession(sessionString);
  
  // Тестируем отправку сообщения самому себе
  try {
    await client.sendMessage("me", { message: "Авторизация завершена! Парсер готов к работе." });
    console.log("📤 Тестовое сообщение отправлено");
  } catch (error) {
    console.log("⚠️ Не удалось отправить тестовое сообщение:", error.message);
  }

  await client.disconnect();
  rl.close();
  
  console.log("\n🎉 Настройка завершена!");
  console.log("Теперь можете запустить: npm run test:connection");
}

authenticate().catch(console.error); 