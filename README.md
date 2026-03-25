# Moonbot (Node.js Telegram Bot)

Moonbot is a simple Telegram bot with an onboarding flow that collects:
- Date of birth
- Time of birth
- Place of birth
- Primary guidance area (Love, Career, Money, Personal growth, Spirituality)

It stores answers **in memory** for now and then returns a short welcome reading.

## Prerequisites
- Node.js 18+ (or any modern Node.js version)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Create your environment file:
   ```bash
   cp .env.example .env
   ```

3. Add your token to `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=your_real_token_here
   ```

## Run locally
```bash
npm start
```

If successful, you should see:
```text
Moonbot is running...
```

Then open Telegram, start a chat with your bot, and send:
```text
/start
```

## Onboarding flow behavior
1. `/start` sends:
   > Hi, I’m Moonbot — your private AI astrology guide. I’ll ask a few questions to personalize your experience.
2. Moonbot asks date of birth.
3. Moonbot asks time of birth.
4. Moonbot asks place of birth.
5. Moonbot asks guidance topic with keyboard options.
6. Moonbot sends a short welcome reading.

## Notes
- State is in-memory only. Restarting the process clears all user onboarding data.
