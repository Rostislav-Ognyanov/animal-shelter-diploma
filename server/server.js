import 'dotenv/config';

import app from './app.js';
import {
  connectToDatabase,
  describeAnimalsPersistenceMode,
  isDatabaseConnected,
} from './config/db.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectToDatabase();

  app.listen(PORT, () => {
    const databaseStatus = isDatabaseConnected() ? 'MongoDB connected' : 'MongoDB unavailable';
    console.log(`Server is running on port ${PORT}`);
    console.log(`Database status: ${databaseStatus}`);
    console.log(`Animals persistence: ${describeAnimalsPersistenceMode()}`);
  });
}

startServer();
