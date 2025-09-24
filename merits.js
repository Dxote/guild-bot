const fs = require('fs');

const getMeritFilePath = (guildId) => {
  const dir = './merits';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  return `${dir}/${guildId}.json`;
};

const loadMerits = (guildId = 'global') => {
  const path = getMeritFilePath(guildId);
  if (!fs.existsSync(path)) return {};
  return JSON.parse(fs.readFileSync(path, 'utf8'));
};

const saveMerits = (guildId, data) => {
  const path = getMeritFilePath(guildId);
  if (!data) {
    console.error('Data to save is undefined or null!');
    return;
  }
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
};

const initUserData = (data, id) => {
  if (!data[id]) data[id] = {};
  data[id].merit ??= 0;
  data[id].goal ??= 0;
  data[id].assist ??= 0;
  data[id].save ??= 0;
  data[id].points ??= 0;
};

module.exports = { loadMerits, saveMerits, initUserData };
