const fs = require('fs');
const path = require('path');

const getScheduleFilePath = (guildId) => {
  const dir = './data';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  return `${dir}/schedules_${guildId}.json`;
};

const loadSchedules = (guildId) => {
  const file = getScheduleFilePath(guildId);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const saveSchedules = (guildId, data) => {
  const file = getScheduleFilePath(guildId);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

module.exports = {
  loadSchedules,
  saveSchedules
};