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

    // If no entities, just escape and return the text
    if (entities.length === 0) {
      return this._escapeHTML(text);
    }

    // Filter and sort entities
    const validEntities = entities
      .filter(entity => this._isValidTelegramEntity(entity))
      .sort((a, b) => a.offset - b.offset); // Sort by offset (start to end)

    if (validEntities.length === 0) {
      return this._escapeHTML(text);
    }

    // Build result by processing text segments
    let result = '';
    let lastOffset = 0;

    for (const entity of validEntities) {
      const { offset, length, className } = entity;
      
      // Skip entities that start before the last processed position (overlapping)
      if (offset < lastOffset) {
        continue;
      }

      // Add text before this entity
      if (offset > lastOffset) {
        result += this._escapeHTML(text.substring(lastOffset, offset));
      }

      // Extract entity text
      const entityText = text.substring(offset, offset + length);
      const escapedText = this._escapeHTML(entityText);
      
      // Apply formatting based on entity type
      const htmlWrapper = this._entityToHtmlMap[className];
      if (htmlWrapper) {
        try {
          result += htmlWrapper(escapedText, entity);
        } catch (error) {
          // If formatting fails, just use escaped text
          result += escapedText;
        }
      } else {
        result += escapedText;
      }

      lastOffset = offset + length;
    }

    // Add remaining text
    if (lastOffset < text.length) {
      result += this._escapeHTML(text.substring(lastOffset));
    }

    return result;
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