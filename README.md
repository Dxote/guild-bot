# ⚽ Discord Merit & Schedule Bot

Discord bot for managing **merit**, **points**, and **match schedules**, with role-based permissions, leaderboards, reminders, and automatic role promotion.

---

## Installation & Setup

### Clone repository
git clone https://github.com/username/discord-merit-schedule-bot.git
cd discord-merit-schedule-bot

### Install dependencies
npm install

---

## Environment Variables
Create a `.env` file in the project root:
TOKEN=your_discord_bot_token

---

## Configuration
Edit `index.js` to match your server setup:

- logChannels → channels for logging activity.  
- tierRoles → roles with required merit thresholds.  
- roleNames → mapping of role IDs → role names.  
- allowedRoles → roles allowed to manage merit.  
- captainRoles → roles allowed to manage schedules.  
- teamChannels → channels for schedule reminders.  
- teamRoles → roles that will be pinged for reminders.  

---

## Run the bot
node index.js

---

## Commands

### Merit System
!addmerit @user <amount>  
!deductmerit @user <amount>  
!resetmerit @user  
!checkmerit @user  
!lbmerit  

### Points & Stats
!addpoints @user <amount>  
!deductpoints @user <amount>  
!resetpoints @user  
!checkpoints @user  
!lbpoints  
!addgoal @user <amount>  
!addassist @user <amount>  
!addsave @user <amount>  
!checkovr @user  
!lbgoal  
!lbassist  
!lbsave  
!resetall @user  

### Schedule
!addsched <team>, <schedule name>, <DD/MM/YYYY HH:mm>  
!checksched <team>  
!deletesched <team> <number>  

⏰ Reminders:  
- 30 minutes before the match.  
- 5 minutes before the match.  

---

## Notes
- Ensure the bot has **Manage Roles** & **Send Messages** permissions.  
- Adjust all role IDs and channel IDs in `index.js`.  
- Use date format: `DD/MM/YYYY HH:mm`.  
