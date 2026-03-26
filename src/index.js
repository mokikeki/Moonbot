require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const astrologyApiKey = process.env.ASTROLOGY_API_KEY;

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
const PLACEMENTS_TO_SHOW = ['Ascendant', 'Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];

const TEST_LOCATION = {
  latitude: 38.6979,
  longitude: -9.4215,
  timezone: 0
};

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

function parseBirthDate(dateText) {
  const match = String(dateText || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);

  if (month < 1 || month > 12 || date < 1 || date > 31) {
    return null;
  }

  return { year, month, date };
}

function parseBirthTime(timeText) {
  const match = String(timeText || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }

  return { hours, minutes, seconds };
}

function findPlacementInObject(container, name) {
  if (!container || typeof container !== 'object') {
    return null;
  }

  for (const [key, value] of Object.entries(container)) {
    if (key.toLowerCase() !== name.toLowerCase()) {
      continue;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value && typeof value === 'object') {
      return value.sign || value.zodiac_sign_name || value.full_name || JSON.stringify(value);
    }
  }

  return null;
}

function findPlacementInArray(items, name) {
  if (!Array.isArray(items)) {
    return null;
  }

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const itemName = (item.name || item.planet || item.planet_name || item.key || '').toString().toLowerCase();
    if (itemName !== name.toLowerCase()) {
      continue;
    }

    return item.sign || item.sign_name || item.zodiac_sign_name || item.rashi || item.full_name || 'available';
  }

  return null;
}

function extractPlacements(apiData) {
  const placements = {};

  for (const bodyName of PLACEMENTS_TO_SHOW) {
    let value = null;

    if (!value) value = findPlacementInObject(apiData, bodyName);
    if (!value) value = findPlacementInObject(apiData?.output, bodyName);
    if (!value) value = findPlacementInArray(apiData?.output, bodyName);
    if (!value) value = findPlacementInArray(apiData?.planets, bodyName);

    if (value) {
      placements[bodyName] = value;
    }
  }

  return placements;
}

async function fetchPlanetData(dateOfBirth, timeOfBirth) {
  if (!astrologyApiKey) {
    throw new Error('Missing ASTROLOGY_API_KEY in .env file.');
  }

  const parsedDate = parseBirthDate(dateOfBirth);
  if (!parsedDate) {
    throw new Error('Date format should be YYYY-MM-DD.');
  }

  const parsedTime = parseBirthTime(timeOfBirth);
  if (!parsedTime) {
    throw new Error('Time format should be HH:MM or HH:MM:SS.');
  }

  const payload = {
    ...parsedDate,
    ...parsedTime,
    ...TEST_LOCATION
  };

  const response = await fetch('https://json.freeastrologyapi.com/planets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': astrologyApiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Astrology API error (${response.status}): ${text.slice(0, 200)}`);
  }

  return response.json();
}

async function completeOnboarding(chatId) {
  const data = onboardingState[chatId];
  data.step = STEPS.COMPLETE;

  const { dateOfBirth, timeOfBirth } = data.answers;

  try {
    const apiData = await fetchPlanetData(dateOfBirth, timeOfBirth);
    const placements = extractPlacements(apiData);
    const sun = placements.Sun || 'Unavailable';
    const moon = placements.Moon || 'Unavailable';
    const ascendant = placements.Ascendant || 'Unavailable';
    const lines = [
      'I calculated your chart:',
      `Sun: ${sun}`,
      `Moon: ${moon}`,
      `Ascendant: ${ascendant}`
    ];

    await bot.sendMessage(chatId, lines.join('\n'), {
      reply_markup: {
        remove_keyboard: true
      }
    });
  } catch (error) {
    console.error('Onboarding completion failed:', error.message);
    await bot.sendMessage(
      chatId,
      `I couldn't calculate your chart right now: ${error.message}`,
      {
        reply_markup: {
          remove_keyboard: true
        }
      }
    );
  }
}

bot.onText(/^\/start$/, (msg) => {
  const chatId = msg.chat.id;
  startOnboarding(chatId);
});

async function handleMessage(msg) {
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
      await completeOnboarding(chatId);
      break;

    case STEPS.COMPLETE:
      bot.sendMessage(chatId, 'You are already onboarded. Send /start any time to restart.');
      break;

    default:
      bot.sendMessage(chatId, 'Something went off track. Send /start to begin again.');
      delete onboardingState[chatId];
      break;
  }
}

bot.on('message', handleMessage);

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

console.log('Moonbot is running...');
