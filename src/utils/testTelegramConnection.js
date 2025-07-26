import telegramParser from '../services/telegramParser.js';
import jobParser from '../services/jobParser.js';

class TelegramConnectionTester {
  async testConnection() {
    console.log('🧪 Starting Telegram connection test...');
    
    try {
      console.log('1️⃣ Testing initialization...');
      const initialized = await telegramParser.init();
      
      if (!initialized) {
        console.log('❌ Initialization failed');
        return false;
      }
      
      console.log('✅ Initialization successful');
      
      console.log('2️⃣ Testing connection health...');
      const isHealthy = await telegramParser.checkConnectionHealth();
      
      if (!isHealthy) {
        console.log('❌ Connection health check failed');
        return false;
      }
      
      console.log('✅ Connection health check passed');
      
      console.log('3️⃣ Testing channel loading...');
      await telegramParser.loadChannelsFromDatabase();
      
      console.log(`✅ Loaded ${telegramParser.channels.length} channels`);
      
      if (telegramParser.channels.length > 0) {
        console.log('4️⃣ Testing sample parsing...');
        const firstChannel = telegramParser.channels[0];
        
        try {
          const jobs = await telegramParser.parseChannel(firstChannel);
          console.log(`✅ Sample parsing successful: ${jobs} jobs found`);
        } catch (error) {
          console.log(`⚠️ Sample parsing failed: ${error.message}`);
        }
      }
      
      await telegramParser.softDisconnect();
      
      console.log('🎉 Connection test completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }

  async forceReconnect() {
    console.log('🔄 Forcing reconnection...');
    
    try {
      await jobParser.forceReconnect();
      console.log('✅ Force reconnection completed');
      
      const testResult = await this.testConnection();
      return testResult;
      
    } catch (error) {
      console.error('❌ Force reconnection failed:', error);
      return false;
    }
  }

  async getConnectionStatus() {
    console.log('📊 Getting connection status...');
    
    try {
      const status = {
        isAuthenticated: telegramParser.isAuthenticated,
        connectionHealthy: telegramParser.connectionHealthy,
        lastConnectionCheck: telegramParser.lastConnectionCheck,
        channelsLoaded: telegramParser.channels.length,
        categoriesLoaded: Object.keys(telegramParser.categories).length,
        clientConnected: telegramParser.client?.connected || false
      };
      
      console.log('📈 Connection Status:', status);
      return status;
      
    } catch (error) {
      console.error('❌ Failed to get connection status:', error);
      return null;
    }
  }

  async runDiagnostics() {
    console.log('🔍 Running comprehensive diagnostics...');
    
    console.log('\n📊 Initial Status:');
    await this.getConnectionStatus();
    
    console.log('\n🧪 Connection Test:');
    const testResult = await this.testConnection();
    
    console.log('\n📊 Final Status:');
    await this.getConnectionStatus();
    
    console.log('\n💡 Recommendations:');
    if (!testResult) {
      console.log('- Consider running forceReconnect()');
      console.log('- Check your TELEGRAM_SESSION environment variable');
      console.log('- Verify your API credentials');
      console.log('- Check network connectivity');
    } else {
      console.log('- Connection is healthy');
      console.log('- Regular monitoring recommended');
    }
    
    return testResult;
  }
}

const tester = new TelegramConnectionTester();

if (process.argv[2]) {
  const command = process.argv[2].toLowerCase();
  
  switch (command) {
    case 'test':
      tester.testConnection().then(result => {
        process.exit(result ? 0 : 1);
      });
      break;
      
    case 'reconnect':
      tester.forceReconnect().then(result => {
        process.exit(result ? 0 : 1);
      });
      break;
      
    case 'status':
      tester.getConnectionStatus().then(() => {
        process.exit(0);
      });
      break;
      
    case 'diagnostics':
      tester.runDiagnostics().then(result => {
        process.exit(result ? 0 : 1);
      });
      break;
      
    default:
      console.log('Usage: node testTelegramConnection.js [test|reconnect|status|diagnostics]');
      process.exit(1);
  }
} else {
  console.log('Usage: node testTelegramConnection.js [test|reconnect|status|diagnostics]');
  process.exit(1);
}

export default TelegramConnectionTester; 