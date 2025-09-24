const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    EmbedBuilder,
  } = require('discord.js');
  const { loadSchedules, saveSchedules } = require('./schedule');
  const fs = require('fs');
  require('dotenv').config();
  
  const logChannels = {
    '1352299703928225843': '1367833987804037221',
    '1367735308761960469': '1367835023331295232',
    '1363968776839762030': '1367835215246004224',
  };
  
  async function logCommandUsage(message, command) {
    if (!message || !message.author || !message.guild) return;
  
    const logChannelId = logChannels[message.guild.id];
    if (!logChannelId) return;
  
    const logChannel = await message.guild.channels.fetch(logChannelId).catch(() => null);
    if (!logChannel) return;
  
    const userTag = message.author.tag;
    const content = message.content;
  
    try {
        await logChannel.send(`**${userTag}** used command: \`${command}\`\n Content: \`${content}\``);
      } catch (err) {
        console.error(`Failed to send log message:`, err.message);
      }      
  }
  

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  });
  
  // ===== Utilities =====
  function getMeritFilePath(guildId) {
    const dir = './merits';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    return `${dir}/${guildId}.json`;
  }
  
  function loadMerits(guildId = 'global') {
    const path = getMeritFilePath(guildId);
    if (!fs.existsSync(path)) return {};
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  }
  
  function saveMerits(guildId, data) {
    const path = getMeritFilePath(guildId);
    if (!data) {
      console.error('Data to save is undefined or null!');
      return;
    }
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  }
  
  function initUserData(data, id) {
    if (!data[id]) data[id] = {};
    data[id].merit = Math.max(data[id].merit ?? 0, 0);
    data[id].goal = Math.max(data[id].goal ?? 0, 0);
    data[id].assist = Math.max(data[id].assist ?? 0, 0);
    data[id].save = Math.max(data[id].save ?? 0, 0);
    data[id].points = Math.max(data[id].points ?? 0, 0);
  }
  
  
  // ===== Tier Roles =====
  const tierRoles = [
    { roleId: '1352340182728179712', nextRoleId: '1352340230790709278', requiredMerit: 2 },
    { roleId: '1352340230790709278', nextRoleId: '1352340272968630404', requiredMerit: 2 },
    { roleId: '1352340272968630404', nextRoleId: '1352340315343814788', requiredMerit: 2 },
    { roleId: '1352340315343814788', nextRoleId: '1352340511330926612', requiredMerit: 5 },
  ];

  const roleNames = {
    '1352340182728179712': 'C',
    '1352340230790709278': 'B-',
    '1352340272968630404': 'B',
    '1352340315343814788': 'B+',
    '1352340511330926612': 'A',
  };

  const allowedRoles = new Set([
    '1352427677247602819',
    '1367821378857992223',
    '1367755988400078939',
    '1352427842276823105',
    '1352422621899391070',
    '1352573575822966877',
    '1352427387647692890',
    '1352303010990264382',
    '1365479109806788713',
    '1364192402075811923',
    '1364155594931568731',
    '1387361710968541225',
    '1387362332157411459',
    '1387362378064334898',
    '1387362497786282114',
  ]);
  
  const captainRoles = new Set([
    '1366059759790329897',
    '1355547706138824775',
    '1364889826830192711',
    '1364887548308230174',
    '1352573575822966877',
    '1352427677247602819',
    '1352427498993877043',
    '1352303010990264382',
    '1355550854924730558',
    '1380904717583912960',
    '1380904157678014504',
    '1380901224492040222',
    '1380909409160663061',
    '1380909513934377111',
    '1387361710968541225',
    '1387362332157411459',
    '1387362378064334898',
    '1387362497786282114',
  ]);

  function isAllowed(member) {
    return member.roles.cache.some(role => allowedRoles.has(role.id));
  }  

  function isCaptain(member) {
    return member.roles.cache.some(role => captainRoles.has(role.id));
  }  

  const teamChannels = {
    susanoo: '1364890550687240232',
    tsukuyomi: '1364888431917928520',
    benzaiten: '1364887283190202469',
    jigokuhen: '1355554094827311296',
    x: '1380905297190850682',
    dnflwrs: '1380905297190850682',
    maplnts: '1380905297190850682',
  };

  const teamRoles = {
    susanoo: '1364889664065900616',
    tsukuyomi: '1364617455175209041',
    benzaiten: '1364618063592554659',
    jigokuhen: '1355552072375865515',
    x: '1380903596408832120',
    dnflwrs: '1380903834356023367',
    maplnts: '1380903711496339596',
  };

  setInterval(async () => {
    const now = Math.floor(Date.now() / 1000); 
    const guilds = client.guilds.cache;
  
    guilds.forEach(async (guild) => {
      const schedules = loadSchedules(guild.id);
      let changed = false;
  
      for (const team in schedules) {
        const updatedSchedules = [];
  
        for (const entry of schedules[team]) {
          const diff = entry.timestamp - now;
          entry.notified30 ??= false;
          entry.notified5 ??= false;
          const teamKey = team.toLowerCase();
          const channelId = teamChannels[teamKey];
          const roleId = teamRoles[teamKey];
          const channel = guild.channels.cache.get(channelId);
  
          // Debug log team info
          console.log(`[${guild.name}] Checking team: ${team} (key: ${teamKey}), diff: ${diff}s`);
          if (!channel) console.log(`Channel not found for team '${teamKey}'`);
          if (!roleId) console.log(`Role ID not found for team '${teamKey}'`);
  
          if (!channel || !roleId) continue;
  
          if (diff <= 1800 && diff > 1500 && !entry.notified30) {
            console.log(`Sending 30m reminder for '${entry.name}' to team '${teamKey}'`);
            const embed30 = new EmbedBuilder()
              .setColor('#00BFFF')
              .setTitle('30 Minute Reminder')
              .setDescription(`**${entry.name}** will start <t:${entry.timestamp}:R>!`)
              .setFooter({ text: `Team: ${team.toUpperCase()}` })
              .setTimestamp();

            await channel.send({
              content: `<@&${roleId}>`,
              embeds: [embed30],
            });

            entry.notified30 = true;
            changed = true;
          }
  
          if (diff <= 300 && diff > 0 && !entry.notified5) {
            console.log(`Sending 5m reminder for '${entry.name}' to team '${teamKey}'`);
            const embed5 = new EmbedBuilder()
              .setColor('#FF4500')
              .setTitle('FINAL Reminder (5 Minutes)')
              .setDescription(`**${entry.name}** will start <t:${entry.timestamp}:R>!`)
              .setFooter({ text: `Team: ${team.toUpperCase()}` })
              .setTimestamp();

            await channel.send({
              content: `<@&${roleId}>`,
              embeds: [embed5],
            });
            entry.notified5 = true;
            changed = true;
          }
  
          if (now < entry.timestamp) {
            updatedSchedules.push(entry);
          } else {
            console.log(`Schedule '${entry.name}' for team '${teamKey}' expired`);
            changed = true; 
          }
        }
  
        if (updatedSchedules.length > 0) {
          schedules[team] = updatedSchedules;
        } else {
          delete schedules[team];
          console.log(`All schedules for team '${team}' removed`);
        }
      }
  
      if (changed) {
        console.log(`Saving updated schedules for guild '${guild.name}'`);
        saveSchedules(guild.id, schedules);
      }
    });
  }, 60 * 1000);

  // ===== Command Handler =====
  client.on('messageCreate', async message => {
    if (message.author.bot) return;  
  
    const args = message.content.trim().split(/\s+/);
    const command = args[0].toLowerCase();
    const publicCommands = [
      '!checkmerit', '!checkovr', '!checkpoints',
      '!lbpoints', '!lbgoal', '!lbassist',
      '!lbsave', '!lbmerit', '!checksched'
    ];
  
    if (!publicCommands.includes(command)) {
      if (!message.member || (!isAllowed(message.member) && !isCaptain(message.member))) {
        return; 
      }
    }
  
    const mention = message.mentions.members.first();
    const guildId = message.guild.id;
    let merits = loadMerits(guildId);

    const meritCrudCommands = ['!addmerit', '!deductmerit', '!resetmerit'];
    
    if (meritCrudCommands.includes(command)) {
      if (!message.member.roles.cache.some(role => allowedRoles.has(role.id))) {
        const reply = await message.reply("❌ You don't have permission to manage merits.");
          setTimeout(() => reply.delete().catch(() => {}), 5000);
        return;
      }
    }      
    const schedCrudCommands = ['!addsched', '!deletesched'];

    if (schedCrudCommands.includes(command)) {
      if (!message.member.roles.cache.some(role => captainRoles.has(role.id))) {
        const reply = await message.reply("❌ You don't have permission to manage schedule.");
          setTimeout(() => reply.delete().catch(() => {}), 5000);
        return;
      }
    }    

    // ===== Command Addmerit =====
    if (command === '!addmerit') {
        logCommandUsage(message, command);
    
        const lines = message.content.split('\n');
        const meritsAdded = new Map();
        const pendingPromotionChecks = []; 
    
        for (const line of lines) {
            const match = line.match(/<@!?(\d+)>\s+([\d.]+)/);
            if (!match) continue;
    
            const userId = match[1];
            const amount = parseFloat(match[2]);
    
            if (isNaN(amount) || amount <= 0) continue;
    
            const member = await message.guild.members.fetch(userId).catch(() => null);
            if (!member) continue;
            
            initUserData(merits, member.id);
            merits[member.id].merit += amount;
            
            meritsAdded.set(member.id, {
              username: member.user.username,
              amount,
              total: merits[member.id].merit
            });
            
            pendingPromotionChecks.push(member); 
            
        }
    
        if (meritsAdded.size === 0) return message.reply('No valid users or merit values found.');
    
        saveMerits(guildId, merits);
    
          // Build output message
          const embed = new EmbedBuilder()
            .setTitle('📥 Merit Added')
            .setColor(0x00FF7F);

          for (const [_, data] of meritsAdded.entries()) {
            embed.addFields({
              name: data.username,
              value: `+${data.amount} merit (Total: **${data.total}**)`,
              inline: false,
            });
          }

          await message.channel.send({ embeds: [embed] });
            setTimeout(async () => {
                for (const member of pendingPromotionChecks) {
                const userId = member.id;
                for (const tier of tierRoles) {
                  if (member.roles.cache.has(tier.roleId)) {
                    // User has the current tier role
                    const userMerit = merits[userId]?.merit ?? 0;
                    if (userMerit >= tier.requiredMerit) {
                      const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`promote_${userId}_${tier.roleId}_${tier.nextRoleId}`).setLabel('PROMOTE').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`cancel_${userId}`).setLabel('CANCEL').setStyle(ButtonStyle.Secondary)
                      );
                
                      const promoEmbed = new EmbedBuilder()
                        .setTitle('🎖️ Promotion Available!')
                        .setDescription(`**${member.user.username}** is eligible for promotion:\n**${roleNames[tier.roleId]}** ➜ **${roleNames[tier.nextRoleId]}**\nClick below to proceed.`)
                        .setColor(0xFFD700)
                        .setTimestamp();
                
                        await message.channel.send({
                          content: `<@${userId}>`,
                          embeds: [promoEmbed],
                          components: [row],
                        });                        
                
                      break; 
                    } else {
                      break;
                    }
                  }
                }                
                }
            }, 3000);   
          }    
  
    // === Command: Deduct Merit ===
    if (command === '!deductmerit') {
        logCommandUsage(message, command);
      const amount = parseFloat(args[2]) || 1;
      if (!mention) return message.reply('Please mention a member.');
      initUserData(merits, mention.id);
      merits[mention.id].merit = Math.max(merits[mention.id].merit - amount, 0);
      saveMerits(guildId, merits);
      const embed = new EmbedBuilder()
        .setTitle('📤 Merit Deducted')
        .setColor(0xFF4500)
        .addFields({
          name: mention.user.username,
          value: `-${amount} merit (Total: **${merits[mention.id].merit}**)`,
        });

      return message.channel.send({ embeds: [embed] });

    }

        // === Leaderboard: Merit ===
        if (command === '!lbmerit') {
          const sorted = Object.entries(merits)
            .filter(([, d]) => d.merit > 0)
            .sort((a, b) => b[1].merit - a[1].merit);
        
          if (sorted.length === 0) return message.channel.send('No merit data found.');
        
          const embed = new EmbedBuilder()
            .setTitle('🏅 Merit Leaderboard')
            .setColor(0x6A5ACD);
        
          for (const [id, data] of sorted) {
            const user = await message.guild.members.fetch(id).catch(() => null);
            if (user) {
              embed.addFields({ name: user.user.username, value: `${data.merit} merit`, inline: false });
            }
          }
        
          return message.channel.send({ embeds: [embed] });
        }
        
        
  
    // === Command: Reset Merit ===
    if (command === '!resetmerit') {
        logCommandUsage(message, command);
      if (!mention) return message.reply('Please mention a member.');
      initUserData(merits, mention.id);
      merits[mention.id].merit = 0;
      saveMerits(guildId, merits);
      const embed = new EmbedBuilder()
        .setTitle('🔄 Merit Reset')
        .setColor(0x808080)
        .setDescription(`Merit for **${mention.user.username}** has been reset to **0**.`);

      return message.channel.send({ embeds: [embed] });
    }
  
    // === Command: Check Merit ===
    if (command === '!checkmerit') {
      logCommandUsage(message, command);
      if (!mention) return message.reply('Please mention a member.');
      initUserData(merits, mention.id);
      const m = merits[mention.id];
      
      const embed = new EmbedBuilder()
        .setTitle(`Merit for ${mention.user.username}`)
        .addFields({ name: '🏅 Merit', value: `**${m.merit}**`, inline: true })
        .setColor(0x00BFFF);
      
      return message.channel.send({ embeds: [embed] });
    }
  
    // === Command: Check Overall Stats ===
    if (command === '!checkovr') {
      if (!mention) return message.reply('Please mention a member.');
      initUserData(merits, mention.id);
      const m = merits[mention.id];
    
      const embed = new EmbedBuilder()
        .setTitle(`Overall Stats for ${mention.user.username}`)
        .addFields(
          { name: '⚽ Goals', value: `${m.goal}`, inline: true },
          { name: '🎯 Assists/Passes', value: `${m.assist}`, inline: true },
          { name: '🧤 Saves', value: `${m.save}`, inline: true }
        )
        .setColor(0x1ABC9C);
    
      return message.channel.send({ embeds: [embed] });
    }
    
  
    const statMap = {
    '!addgoal': 'goal',
    '!addassist': 'assist',
    '!addsave': 'save',
    };

    const pointsPer = { goal: 3, assist: 2, save: 3 };
    const lines = message.content.split('\n');
    let responses = [];

    for (const line of lines) {
    const args = line.trim().split(/\s+/);
    const subommand = args[0].toLowerCase();

    if (!(command in statMap)) continue;

    const mention = message.mentions.members.find(member => line.includes(`<@${member.id}>`));
    if (!mention) {
        responses.push(`❌ No mention found for command: \`${line}\``);
        continue;
    }

    const amount = parseInt(args[2]) || 1;
    if (isNaN(amount) || amount < 1) {
        responses.push(`❌ Invalid amount in command: \`${line}\``);
        continue;
    }

    const type = statMap[command];
    initUserData(merits, mention.id);
    merits[mention.id][type] = Math.max(merits[mention.id][type] + amount, 0);
    const addedPoints = amount * pointsPer[type];
    merits[mention.id].points = Math.max(merits[mention.id].points + addedPoints, 0);

    responses.push(
        `**${mention.user.username}** gained **${amount} ${type.toUpperCase()}${amount > 1 ? 'S' : ''}**! ` +
        `Now: Goals: ${merits[mention.id].goal}, Assists/Passes: ${merits[mention.id].assist}, Saves: ${merits[mention.id].save}`
    );
    }

    if (responses.length > 0) {
    saveMerits(guildId, merits);
    const embed = new EmbedBuilder()
      .setTitle('⚽ Stats Updated')
      .setColor(0x1E90FF);

    for (const line of responses) {
      embed.addFields({ name: '\u200B', value: line });
    }

    message.channel.send({ embeds: [embed] });
    }

    // === Command: Add Points ===
    if (command === '!addpoints') {
        logCommandUsage(message, command);
        const amount = parseFloat(args[2]) || 1;
        const mentions = message.mentions.members;
    if (!mentions || mentions.size === 0) return message.reply('Please mention at least one member.');
    let msg = '';

    mentions.forEach(member => {
    initUserData(merits, member.id);
    merits[member.id].points = Math.max(merits[member.id].points + amount, 0);
    msg += `**${member.user.username}** RECEIVED **${amount} POINTS**. TOTAL POINTS: **${merits[member.id].points}**\n`;
    });

    saveMerits(guildId, merits);
    const embed = new EmbedBuilder()
      .setTitle('➕ Points Added')
      .setColor(0x32CD32);

    mentions.forEach(member => {
      initUserData(merits, member.id);
      merits[member.id].points = Math.max(merits[member.id].points + amount, 0);
      embed.addFields({
        name: member.user.username,
        value: `+${amount} points (Total: **${merits[member.id].points}**)`,
        inline: false,
      });
    });

    saveMerits(guildId, merits);
    return message.channel.send({ embeds: [embed] });
    }

        // === Deduct Points ===
        if (command === '!deductpoints') {
          logCommandUsage(message, command);
          const amount = parseFloat(args[2]) || 1;
          if (!mention) return message.reply('Please mention a member.');
          initUserData(merits, mention.id);
          merits[mention.id].points = Math.max(merits[mention.id].points - amount, 0);
          saveMerits(guildId, merits);
          
          const embed = new EmbedBuilder()
            .setTitle('➖ Points Deducted')
            .setColor(0xDC143C)
            .addFields({
              name: mention.user.username,
              value: `-${amount} points (Total: **${merits[mention.id].points}**)`,
              inline: false
            });
  
          return message.channel.send({ embeds: [embed] });
      }
  
      // === Check Points ===
      if (command === '!checkpoints') {
          logCommandUsage(message, command);
          if (!mention) return message.reply('Please mention a member.');
          initUserData(merits, mention.id);
  
          const embed = new EmbedBuilder()
            .setTitle(`📊 Points for ${mention.user.username}`)
            .setColor(0x4682B4)
            .addFields({ name: 'Points', value: `${merits[mention.id].points}`, inline: true });
  
          return message.channel.send({ embeds: [embed] });
      }
  
      // === Leaderboard: Points ===
      if (command === '!lbpoints') {
          const sorted = Object.entries(merits)
            .filter(([, d]) => d.points > 0)
            .sort((a, b) => b[1].points - a[1].points);
  
          if (sorted.length === 0) return message.channel.send('No point data found.');
  
          const embed = new EmbedBuilder()
            .setTitle('🏆 Points Leaderboard')
            .setColor(0x20B2AA);
  
          for (const [id, data] of sorted) {
            const user = await message.guild.members.fetch(id).catch(() => null);
            if (user) {
              embed.addFields({
                name: user.user.username,
                value: `${data.points} points`,
                inline: false
              });
            }
          }
  
          return message.channel.send({ embeds: [embed] });
      }
  
      // === Leaderboards: Goal / Assist / Save ===
      const lbTypes = {
          '!lbgoal': 'goal',
          '!lbassist': 'assist',
          '!lbsave': 'save',
      };
  
      if (Object.keys(lbTypes).includes(command)) {
          const type = lbTypes[command];
          const sorted = Object.entries(merits)
            .filter(([, d]) => d[type] > 0)
            .sort((a, b) => b[1][type] - a[1][type]);
  
          if (sorted.length === 0) return message.channel.send(`No ${type} data found.`);
  
          const titleMap = {
              goal: '⚽ Goal',
              assist: '🎯 Assist/Pass',
              save: '🧤 Save'
          };
  
          const embed = new EmbedBuilder()
            .setTitle(`${titleMap[type]} Leaderboard`)
            .setColor(0x6495ED);
  
          for (const [id, data] of sorted) {
            const user = await message.guild.members.fetch(id).catch(() => null);
            if (user) {
              embed.addFields({
                name: user.user.username,
                value: `${data[type]} ${type}${data[type] > 1 ? 's' : ''}`,
                inline: false
              });
            }
          }
  
          return message.channel.send({ embeds: [embed] });
      }
  
      // === Command: Reset Points ===
    if (command === '!resetpoints') {
      logCommandUsage(message, command);
  if (!mention) return message.reply('Please mention a member.');
  initUserData(merits, mention.id);
  
  merits[mention.id].points = 0;
  saveMerits(guildId, merits);
  
  const embed = new EmbedBuilder()
    .setTitle('🔄 Points Reset')
    .setColor(0x808080)
    .setDescription(`Points for **${mention.user.username}** have been reset to **0**.`);

  return message.channel.send({ embeds: [embed] });
  }

  // === Command: Reset All Stats ===
  if (command === '!resetall') {
      logCommandUsage(message, command);
      if (!mention) return message.reply('Please mention a member.');
      initUserData(merits, mention.id);
  
      // Reset all tracked data
      merits[mention.id].merit = 0;
      merits[mention.id].goal = 0;
      merits[mention.id].assist = 0;
      merits[mention.id].save = 0;
      merits[mention.id].points = 0;
  
      saveMerits(guildId, merits);
      const embed = new EmbedBuilder()
        .setTitle('🔄 All Stats Reset')
        .setColor(0x696969)
        .setDescription(`All stats for **${mention.user.username}** have been reset to **0**.`);

      return message.channel.send({ embeds: [embed] });
  }

    const userRoleIds = message.member.roles.cache.map(role => role.id);

    // ===== Command: !addsched =====
    if (command === '!addsched') {
      logCommandUsage(message, command);

      const content = args.slice(1).join(' ').split(',');
      const teamNameInput = content[0]?.trim().toLowerCase();
      const scheduleName = content[1]?.trim();
      const dateString = content[2]?.trim();

      if (!teamNameInput || !scheduleName || !dateString) {
        return message.reply('Usage: `!addsched <team name>, <schedule name>, <DD/MM/YYYY HH:mm>`');
      }

      const validTeams = Object.keys(teamChannels);
      const matchedTeam = validTeams.find(t => t === teamNameInput);

      if (!matchedTeam) {
        return message.reply(
          `❌ Invalid team name. Available teams: **${validTeams.join(', ')}**`
        );
      }

      const match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
      if (!match) {
        return message.reply('❌ Invalid date format. Use: `DD/MM/YYYY HH:mm`');
      }

      const [, day, month, year, hour, minute] = match;
      const parsedDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
      if (isNaN(parsedDate)) {
        return message.reply('❌ Invalid date. Please check again.');
      }

      const timestamp = Math.floor(parsedDate.getTime() / 1000);

      const schedules = loadSchedules(message.guildId);
      if (!schedules[matchedTeam]) schedules[matchedTeam] = [];
      schedules[matchedTeam].push({
        name: scheduleName,
        timestamp,
        notified30: false,
        notified5: false
      });

      saveSchedules(message.guildId, schedules);

      const embed = new EmbedBuilder()
        .setTitle('📅 Schedule Added')
        .setColor(0x3498db)
        .setDescription(`Team: **${matchedTeam}**
    Schedule: **${scheduleName}**
    at <t:${timestamp}:F>  <t:${timestamp}:R>`);

      return message.channel.send({ embeds: [embed] });
    }

    // Command: !checkschedule (public, no role check)
    if (command === '!checksched') {
      logCommandUsage(message, command);

      const teamName = args.slice(1).join(' ').trim().toLowerCase();
      if (!teamName) return message.reply('Please provide a team name.');

      const schedules = loadSchedules(message.guildId);
      const teamSchedules = schedules[teamName];

      if (!teamSchedules) {
        return message.reply('No valid team.');
      }

      if (teamSchedules.length === 0) {
        return message.reply('No schedule for this team yet.');
      }

      const embed = new EmbedBuilder()
        .setTitle(`📆 Schedule for ${teamName}`)
        .setColor(0x2ecc71);

      teamSchedules.forEach((entry, i) => {
        embed.addFields({
          name: `Schedule #${i + 1}: ${entry.name}`,
          value: `at <t:${entry.timestamp}:F>  <t:${entry.timestamp}:R>`,
          inline: false
        });        
      });

      return message.channel.send({ embeds: [embed] });
    }

    // Command: !deletesched
    if (command === '!deletesched') {
      logCommandUsage(message, command);

      const teamName = args[1]?.toLowerCase();
      const scheduleIndex = parseInt(args[2]) - 1;

      if (!teamName || isNaN(scheduleIndex)) {
        return message.reply('Usage: `!deletesched <team name> <schedule number>`');
      }

      const schedules = loadSchedules(message.guildId);
      const teamSchedules = schedules[teamName];

      if (!teamSchedules || teamSchedules.length === 0) {
        return message.reply('No schedule found for that team.');
      }

      if (scheduleIndex < 0 || scheduleIndex >= teamSchedules.length) {
        return message.reply(`Invalid schedule number. This team has only ${teamSchedules.length} schedule(s).`);
      }

      const [removed] = teamSchedules.splice(scheduleIndex, 1);

      if (teamSchedules.length === 0) {
        delete schedules[teamName];
      }
      saveSchedules(message.guildId, schedules);

      const embed = new EmbedBuilder()
        .setTitle('Schedule Deleted')
        .setColor(0xff0000)
        .setDescription(`Removed schedule #${scheduleIndex + 1} "${removed.name}" from team **${teamName}**:\n<t:${removed.timestamp}:F>`);

      return message.channel.send({ embeds: [embed] });
    }  

    }); // END messageCreate

    // Button
    client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isButton()) return;
    
      const merits = loadMerits(interaction.guildId);
    
      if (interaction.customId.startsWith('promote')) {
        logCommandUsage(interaction, `interaction:${interaction.customId}`);
    
        const [, userId, fromRoleId, toRoleId] = interaction.customId.split('_');
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) {
          return interaction.reply({
            content: 'Member not found.',
            ephemeral: true
          });
        }
    
        if (interaction.user.id !== userId) {
          return interaction.reply({
            content: '🚫 This promotion is not for you.',
            ephemeral: true
          });
        }
    
        const userMerit = merits[member.id]?.merit ?? 0;
        const tier = tierRoles.find(t => t.roleId === fromRoleId && t.nextRoleId === toRoleId);
        if (!tier) {
          return interaction.reply({
            content: 'Tier info not found.',
            ephemeral: true
          });
        }
    
        if (userMerit < tier.requiredMerit) {
          return interaction.reply({
            content: '🚫 Not enough merit for promotion.',
            ephemeral: true
          });
        }
    
        merits[member.id].merit -= tier.requiredMerit;
        saveMerits(interaction.guildId, merits);
        await member.roles.remove(fromRoleId);
        await member.roles.add(toRoleId);
    
        const roleName = roleNames[toRoleId] || 'new role';
    
        let description = `**${member.user.username}** has been promoted to **${roleName}**!`;
    
        if (toRoleId === '1352340511330926612') {
          description += ` Now you can join a team! Check <#1355564207017562112> for details.`;
        }
    
        const successEmbed = new EmbedBuilder()
          .setTitle('Promotion Successful')
          .setDescription(`**${member.user.username}** has been promoted to **${roleName.toUpperCase()}**!`)
          .setColor(0x00BFFF)
          .setTimestamp();
    
        await interaction.update({
          embeds: [successEmbed],
          components: [],
          allowedMentions: { parse: [] }
        });
    
        let currentRoleId = toRoleId;
        while (true) {
          const nextTier = tierRoles.find(t => t.roleId === currentRoleId);
          if (!nextTier) break;
    
          const required = nextTier.requiredMerit;
          const nextRoleId = nextTier.nextRoleId;
          if (!nextRoleId) break;
    
          const currentMerit = merits[member.id]?.merit ?? 0;
          if (currentMerit < required) break;
    
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`promote_${userId}_${nextTier.roleId}_${nextRoleId}`)
              .setLabel('PROMOTE')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`cancel_${userId}`)
              .setLabel('CANCEL')
              .setStyle(ButtonStyle.Secondary)
          );
    
          const promoEmbed = new EmbedBuilder()
            .setTitle('🎖️ Promotion Available!')
            .setDescription(`**${member.user.username}** is eligible for another promotion:\n**${roleNames[nextTier.roleId]}** ➜ **${roleNames[nextRoleId]}**\nClick below to proceed.`)
            .setColor(0xFFD700)
            .setTimestamp();
    
          await interaction.channel.send({
            content: `<@${userId}>`,
            embeds: [promoEmbed],
            components: [row]
          });
    
          break;
        }
      }
    
      if (interaction.customId.startsWith('cancel_')) {
        const [, userId] = interaction.customId.split('_');
      
        if (interaction.user.id !== userId) {
          return interaction.reply({
            content: '🚫 You cannot cancel this promotion.',
            ephemeral: true
          });

        }
      
        logCommandUsage(interaction, `interaction:${interaction.customId}`);
      
        const cancelEmbed = new EmbedBuilder()
          .setTitle('❌ Promotion Cancelled')
          .setDescription('Promotion process has been cancelled.')
          .setColor(0xFF0000);
      
        await interaction.update({
          embeds: [cancelEmbed],
          components: [],
          allowedMentions: { parse: [] }
        });
      }      
    });    
    
    // ===== Bot Ready =====
    client.once('ready', () => {
    console.log(`Kawazakiiii Bot is active as ${client.user.tag}`);
    });

    // ===== Login =====
    client.login(process.env.TOKEN);
