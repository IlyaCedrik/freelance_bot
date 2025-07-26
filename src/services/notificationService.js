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