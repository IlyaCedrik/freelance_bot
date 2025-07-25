const telegramConfig = {
  apiId: parseInt(process.env.TELEGRAM_API_ID) || 22013850,
  apiHash: process.env.TELEGRAM_API_HASH || 'd061ef88902a38323303d9ebfadfbbca',
  phone: process.env.TELEGRAM_PHONE || '+79605817070',
  session: process.env.TELEGRAM_SESSION || '1AgAOMTQ5LjE1NC4xNjcuNTEBuxNyxwFY3cL1yZzxNv76URmFuFgJZGGWdHnQJLz6n8wrWZoKq0gt5Gh6Ze6DhSHjOgiFZKQnQeOxKCmLdHOfwPiouBWU7Y+wwDzeoEvcX/ydAy/uWADwtvBl6OoahmQsrfgr1zCr2nS+q2RAzFQN67sUPmPfQIVgHaMLZQJ71WMY94fDmfk+TGQVB9nmPY6jhtZljLiMsTxCOgwEIsw9z949qQUM3EY9F6Gcy+s55UEQPs0KKufWZiMD7htHoie8GZ3msHRgIDwkI96qzouHK1ivN4LmAeyf8sSAhIQmQ3vq8F8BWWnkWUtZC3EYRwoWZktpY1c8glN20RdVCWIYI2I=',
  
  settings: {
    messageLimit: 50,
    timeWindow: 24,
    pauseBetweenChannels: 2000,
    deviceModel: 'FreelanceBot',
    appVersion: '1.0.0'
  }
};

export default telegramConfig; 