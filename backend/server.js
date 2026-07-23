require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startReminderScheduler } = require('./src/services/reminder.service');

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`EventGuard API listening on port ${PORT}`);
  });
  startReminderScheduler();
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
