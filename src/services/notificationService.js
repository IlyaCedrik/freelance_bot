import MessageFormatter from './messageFormatter.js';

const DELAYS = {
  BETWEEN_USERS: 50,
};

class NotificationService {
  constructor() {
    this.bot = null;
  }

  setBot(bot) {
    this.bot = bot;
  }

  async sendJobToSubscribers(jobData, subscribedUsers) {
    if (!this.bot) {
      throw new Error('Bot instance not set');
    }

    let sentCount = 0;

    for (const subscription of subscribedUsers) {
      try {
        await this._sendJobMessage(subscription, jobData);
        sentCount++;
        await this._sleep(DELAYS.BETWEEN_USERS);
      } catch (error) {
        if (error.response?.error_code !== 403) {
          console.error(`Error sending to user ${subscription.user.telegram_id}:`, error.message);
        }
      }
    }

    return sentCount;
  }

  async sendPromoCodeUsageNotification(telegramId, promoCode, userName) {
    if (!this.bot) {
      console.error('Bot instance not set for promo code notification');
      return;
    }

    try {
      const bonusText = promoCode.bonus_days > 0 ? ` (+${promoCode.bonus_days} дней)` : '';
      const discountText = promoCode.discount_percent > 0 ? ` (скидка ${promoCode.discount_percent}%)` : '';

      const notificationMessage = `
🎉 Ваш промокод использован!

🎫 Промокод: ${promoCode.code}
👤 Пользователь: ${userName}
🔢 Использований: ${promoCode.usage_count + 1}${promoCode.usage_limit ? `/${promoCode.usage_limit}` : ''}

💎 Бонусы промокода:${bonusText}${discountText}

📊 Посмотреть статистику промокодов можно в реферальной системе.
      `;

      await this.bot.telegram.sendMessage(telegramId, notificationMessage.trim());
      console.log(`✅ Уведомление о промокоде отправлено пользователю ${telegramId}`);
      
    } catch (error) {
      console.error(`❌ Ошибка отправки уведомления о промокоде пользователю ${telegramId}:`, error.message);
    }
  }

  async sendAdminNotification(telegramId, message) {
    if (!this.bot) {
      console.error('Bot instance not set for admin notification');
      return;
    }

    try {
      await this.bot.telegram.sendMessage(telegramId, message.trim());
      console.log(`✅ Админ уведомление отправлено ${telegramId}`);
    } catch (error) {
      console.error(`❌ Ошибка отправки админ уведомления ${telegramId}:`, error.message);
    }
  }

  async _sendJobMessage(subscription, jobData) {
    
    // Конвертируем в HTML формат (проще чем MarkdownV2)
    const htmlText = MessageFormatter.convertToHTML({
      message: jobData.message.message,
      entities: jobData.message.entities || []
    });

    await this.bot.telegram.sendMessage(
      subscription.user.telegram_id,
      MessageFormatter.formatJobMessage({
        category_name: jobData.category_name,
        url: jobData.url,
        text: htmlText,
      }),
      { 
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }
    );
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new NotificationService();