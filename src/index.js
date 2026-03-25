require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN in .env file.');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

/**
 * In-memory onboarding state by chat ID.
 * This resets whenever the process restarts.
 */
const onboardingState = {};

const STEPS = {
  DATE_OF_BIRTH: 'date_of_birth',
  TIME_OF_BIRTH: 'time_of_birth',
  PLACE_OF_BIRTH: 'place_of_birth',
  GUIDANCE_TOPIC: 'guidance_topic',
  COMPLETE: 'complete'
};

const GUIDANCE_OPTIONS = ['Love', 'Career', 'Money', 'Personal growth', 'Spirituality'];

function startOnboarding(chatId) {
  onboardingState[chatId] = {
    step: STEPS.DATE_OF_BIRTH,
    answers: {
      dateOfBirth: '',
      timeOfBirth: '',
      placeOfBirth: '',
      guidanceTopic: ''
    }
  };

  bot.sendMessage(
    chatId,
    'Hi, I’m Moonbot — your private AI astrology guide. I’ll ask a few questions to personalize your experience.'
  );

  bot.sendMessage(chatId, 'What is your date of birth? (e.g. 1996-08-21)');
}

function askGuidanceQuestion(chatId) {
  bot.sendMessage(chatId, 'What would you like guidance on most?', {
    reply_markup: {
      keyboard: [
        ['Love', 'Career'],
        ['Money', 'Personal growth'],
        ['Spirituality']
      ],
      one_time_keyboard: true,
      resize_keyboard: true
    }
  });
}

function completeOnboarding(chatId) {
  const data = onboardingState[chatId];
  data.step = STEPS.COMPLETE;

  const { dateOfBirth, timeOfBirth, placeOfBirth, guidanceTopic } = data.answers;

  const reading = [
    `Thanks for sharing, Moon Seeker ✨`,
    `Based on your details (${dateOfBirth}, ${timeOfBirth}, ${placeOfBirth}), your current energy points toward ${guidanceTopic.toLowerCase()}.`,
    'This is a season to trust your intuition, take one grounded step forward, and stay open to meaningful signs.'
  ].join('\n\n');

  bot.sendMessage(chatId, reading, {
    reply_markup: {
      remove_keyboard: true
    }
  });
}

bot.onText(/^\/start$/, (msg) => {
  const chatId = msg.chat.id;
  startOnboarding(chatId);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  // Ignore command messages here; /start is handled above.
  if (text.startsWith('/')) {
    return;
  }

  const state = onboardingState[chatId];

  // Ask users to start onboarding if they have no active state.
  if (!state) {
    bot.sendMessage(chatId, 'Send /start to begin onboarding with Moonbot.');
    return;
  }

  switch (state.step) {
    case STEPS.DATE_OF_BIRTH:
      state.answers.dateOfBirth = text;
      state.step = STEPS.TIME_OF_BIRTH;
      bot.sendMessage(chatId, 'Great. What is your time of birth? (e.g. 14:35)');
      break;

    case STEPS.TIME_OF_BIRTH:
      state.answers.timeOfBirth = text;
      state.step = STEPS.PLACE_OF_BIRTH;
      bot.sendMessage(chatId, 'Thanks. What is your place of birth? (City, Country)');
      break;

    case STEPS.PLACE_OF_BIRTH:
      state.answers.placeOfBirth = text;
      state.step = STEPS.GUIDANCE_TOPIC;
      askGuidanceQuestion(chatId);
      break;

    case STEPS.GUIDANCE_TOPIC:
      if (!GUIDANCE_OPTIONS.includes(text)) {
        bot.sendMessage(chatId, 'Please pick one of the options using the keyboard.');
        askGuidanceQuestion(chatId);
        return;
      }

      state.answers.guidanceTopic = text;
      completeOnboarding(chatId);
      break;

    case STEPS.COMPLETE:
      bot.sendMessage(chatId, 'You are already onboarded. Send /start any time to restart.');
      break;

    default:
      bot.sendMessage(chatId, 'Something went off track. Send /start to begin again.');
      delete onboardingState[chatId];
      break;
  }
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

console.log('Moonbot is running...');
