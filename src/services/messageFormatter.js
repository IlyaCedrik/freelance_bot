/**
 * Сервис для обработки и форматирования Telegram сообщений
 */
class MessageFormatter {
  constructor() {}

  formatJobMessage(jobData) {


    const messagePrefix = `🔔 Новый заказ

📂 ${jobData.category_name || ''}

📋 ${jobData.text}

🔗 <a href="${jobData.url || ''}">Перейти к заказу</a>`;
    

    return messagePrefix;
  }

  _adjustEntitiesOffset(entities, offset) {
    if (!entities || !Array.isArray(entities) || entities.length === 0) {
      return [];
    }

    const adjustedEntities = [];
    
    for (const entity of entities) {
      // Проверяем валидность entity
      if (this._isValidEntity(entity)) {
        // Копируем все поля entity и обновляем только offset
        adjustedEntities.push({
          ...entity,
          offset: entity.offset + offset
        });
      }
    }

    return adjustedEntities;
  }


  _isValidEntity(entity) {
    if (!entity || typeof entity !== 'object') {
      return false;
    }
    
    // Проверяем обязательные поля (для стандартных entities с полем type)
    if (typeof entity.type === 'string' && 
        typeof entity.offset === 'number' && 
        typeof entity.length === 'number') {
      // Проверяем разумные значения
      if (entity.offset < 0 || entity.length <= 0) {
        console.warn('Invalid entity values:', entity);
        return false;
      }
      return true;
    }
    
    // Проверяем Telegram entities с полем className
    if (typeof entity.className === 'string' && 
        typeof entity.offset === 'number' && 
        typeof entity.length === 'number') {
      // Проверяем разумные значения
      if (entity.offset < 0 || entity.length <= 0) {
        console.warn('Invalid entity values:', entity);
        return false;
      }
      return true;
    }
    
    console.warn('Invalid entity structure:', entity);
    return false;
  }

  filterValidEntities(entities) {
    if (!entities || !Array.isArray(entities)) {
      return [];
    }

    return entities.filter(entity => this._isValidEntity(entity));
  }

  convertToPlainText(text, entities = []) {
    // Просто возвращаем текст как есть
    return text || '';
  }

  // Карта соответствий Telegram entity типов к HTML тегам
  _entityToHtmlMap = {
    'MessageEntityBold': (text) => `<b>${text}</b>`,
    'MessageEntityItalic': (text) => `<i>${text}</i>`,
    'MessageEntityCode': (text) => `<code>${text}</code>`,
    'MessageEntityPre': (text) => `<pre>${text}</pre>`,
    'MessageEntityStrike': (text) => `<s>${text}</s>`,
    'MessageEntityUnderline': (text) => `<u>${text}</u>`,
    'MessageEntityHashtag': (text) => `<b>${text}</b>`,
    'MessageEntityTextUrl': (text, entity) => `<a href="${entity.url || ''}">${text}</a>`,
    'MessageEntityUrl': (text) => `<a href="${text}">${text}</a>`,
    'MessageEntityMention': (text) => `<a href="https://t.me/${text.replace('@', '')}">${text}</a>`
  };

  convertToHTML(messageObj) {
    if (!messageObj || !messageObj.message) {
      return '';
    }

    const { message: text, entities = [] } = messageObj;
    
    if (!text) {
      return '';
    }

    if (entities.length === 0) {
      return this._escapeHTML(text);
    }

    // Фильтруем валидные entities и сортируем по offset в обратном порядке
    const validEntities = entities
      .filter(entity => this._isValidTelegramEntity(entity))
      .sort((a, b) => b.offset - a.offset);

    let result = text;

    // Обрабатываем entities от конца к началу, чтобы не нарушать смещения
    for (const entity of validEntities) {
      const { offset, length, className } = entity;
      
      // Извлекаем текст entity
      const entityText = text.substring(offset, offset + length);
      const escapedText = this._escapeHTML(entityText);
      
      // Получаем HTML обертку для данного типа entity
      const htmlWrapper = this._entityToHtmlMap[className];
      
      let replacement;
      if (htmlWrapper) {
        replacement = htmlWrapper(escapedText, entity);
      } else {
        // Для неизвестных типов просто экранируем
        replacement = escapedText;
      }
      
      // Заменяем в результирующей строке
      result = result.substring(0, offset) + replacement + result.substring(offset + length);
    }

    // Экранируем оставшиеся HTML символы в неформатированных частях
    return this._escapeHTMLSimple(result);
  }

  /**
   * Экранирует HTML символы
   * @param {string} text - Текст для экранирования
   * @returns {string} - Экранированный текст
   */
  _escapeHTML(text) {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Упрощенное экранирование HTML символов вне тегов
   * @param {string} text - Текст с HTML тегами
   * @returns {string} - Экранированный текст
   */
  _escapeHTMLSimple(text) {
    if (!text) return '';
    
    let result = '';
    let inTag = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === '<') {
        inTag = true;
        result += char;
      } else if (char === '>') {
        inTag = false;
        result += char;
      } else if (!inTag && char === '&' && !this._isEscapedChar(text, i)) {
        result += '&amp;';
      } else {
        result += char;
      }
    }
    
    return result;
  }

  /**
   * Проверяет, является ли символ & уже экранированным
   * @param {string} text - Весь текст
   * @param {number} index - Индекс символа &
   * @returns {boolean} - true если символ уже экранирован
   */
  _isEscapedChar(text, index) {
    const remaining = text.substring(index);
    return remaining.startsWith('&amp;') || 
           remaining.startsWith('&lt;') || 
           remaining.startsWith('&gt;');
  }

  /**
   * Проверяет валидность Telegram entity
   * @param {Object} entity - Entity для проверки
   * @returns {boolean} - true если entity валидный
   */
  _isValidTelegramEntity(entity) {
    if (!entity || typeof entity !== 'object') {
      return false;
    }
    
    // Проверяем обязательные поля для Telegram entities
    if (typeof entity.className !== 'string' || 
        typeof entity.offset !== 'number' || 
        typeof entity.length !== 'number') {
      console.warn('Invalid Telegram entity structure:', entity);
      return false;
    }
    
    // Проверяем разумные значения
    if (entity.offset < 0 || entity.length <= 0) {
      console.warn('Invalid Telegram entity values:', entity);
      return false;
    }
    
    return true;
  }

  /**
   * Проверяет, содержит ли сообщение entities
   * @param {Object} message - Объект сообщения
   * @returns {boolean} - true если есть валидные entities
   */
  hasValidEntities(message) {
    if (!message || !message.entities) {
      return false;
    }

    return this.filterValidEntities(message.entities).length > 0;
  }

  getEntitiesStats(entities) {
    if (!entities || !Array.isArray(entities)) {
      return { total: 0, valid: 0, invalid: 0, types: {} };
    }

    const stats = {
      total: entities.length,
      valid: 0,
      invalid: 0,
      types: {}
    };

    entities.forEach(entity => {
      if (this._isValidEntity(entity)) {
        stats.valid++;
        // Используем className для Telegram entities или type для стандартных
        const entityType = entity.className || entity.type;
        stats.types[entityType] = (stats.types[entityType] || 0) + 1;
      } else {
        stats.invalid++;
      }
    });

    return stats;
  }
}

export default new MessageFormatter(); 