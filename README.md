# Moonbot (Node.js Telegram Bot)

Moonbot is a simple Telegram bot with an onboarding flow that collects:
- Date of birth
- Time of birth
- Place of birth
- Primary guidance area (Love, Career, Money, Personal growth, Spirituality)

After onboarding, it calls the Free Astrology API planets endpoint and returns key placements.

## Prerequisites
- Node.js 18+ (or any modern Node.js version)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A Free Astrology API key

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Create your environment file:
   ```bash
   cp .env.example .env
   ```

3. Add your secrets to `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=your_real_token_here
   ASTROLOGY_API_KEY=your_real_api_key_here
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

## Onboarding + API behavior
1. `/start` sends:
   > Hi, I’m Moonbot — your private AI astrology guide. I’ll ask a few questions to personalize your experience.
2. Moonbot asks date of birth.
3. Moonbot asks time of birth.
4. Moonbot asks place of birth.
5. Moonbot asks guidance topic with keyboard options.
6. Moonbot calls `https://json.freeastrologyapi.com/planets` with:
   - `year`, `month`, `date`, `hours`, `minutes`, `seconds`
   - hardcoded test location for Cascais, Portugal:
     - `latitude: 38.6979`
     - `longitude: -9.4215`
     - `timezone: 0`
7. Moonbot replies with:
   - `I’ve calculated your chart.`
   - any found placements among: Ascendant, Sun, Moon, Mercury, Venus, Mars

## Notes
- State is in-memory only. Restarting the process clears all user onboarding data.
- Place of birth is currently collected but not geocoded yet; API uses the temporary Cascais test coordinates.
