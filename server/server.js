import 'dotenv/config';

import app from './app.js';
import {
  connectToDatabase,
  isDatabaseConnected,
} from './config/db.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectToDatabase();

  app.listen(PORT, () => {
    const databaseStatus = isDatabaseConnected() ? 'MongoDB connected' : 'MongoDB unavailable';
    console.log(`Server is running on port ${PORT}`);
    console.log(`Database status: ${databaseStatus}`);
    console.log('Persistence: MongoDB only');
  });
}

startServer().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
