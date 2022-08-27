# Telegram Daily Finances
This is a cloud function project to work along side telegram bot to handle daily finances
## How to use
Download [Telegram](https://play.google.com/store/apps/details?id=org.telegram.messenger&hl=pt_BR&gl=US) on your phone, create a new group and add daily-finances bot. Follow the instructions on how to use.
## Setup with a new Firebase project
To setup the firebase function and make it work alongside Telegram Bot Api, you need to retrieve a token for your bot on the BotFather in Telegram and send a POST to the link https://api.telegram.org/bot<bot-token>/setWebhook?url=<function-public-link>

