# SakuraBot

## Overview
SakuraBot is a multi-function WhatsApp and Telegram chatbot that runs both platforms simultaneously with dynamic integration. Built with Node.js.

## Project Architecture
- `index.js` - Main entry point, initializes bot services and optional HTTP server
- `wa/` - WhatsApp bot logic (using @whiskeysockets/baileys)
- `tg/` - Telegram bot logic (using telegraf)
- `tools/` - Shared utilities and helper functions
- `config.json` - Bot configuration (phone number, tokens, system settings)

## Key Configuration
- HTTP keep-alive server enabled on port 5000 (bound to 0.0.0.0)
- WhatsApp bot requires valid phone number in `config.json`
- Telegram bot requires valid BotFather token in `config.json`

## Running
- Workflow: `node .` starts the bot
- The bot will skip WhatsApp/Telegram if their configs are not set

## Recent Changes
- 2026-02-06: Initial Replit setup, enabled HTTP server on port 5000, bound to 0.0.0.0
