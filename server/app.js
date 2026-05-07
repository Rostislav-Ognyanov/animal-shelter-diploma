import express from 'express';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import adoptionsRoutes from './modules/adoptions/adoptions.routes.js';
import animalsRoutes from './modules/animals/animals.routes.js';
import { attachCurrentUser } from './modules/auth/auth.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import donationsRoutes from './modules/donations/donations.routes.js';
import favoritesRoutes from './modules/favorites/favorites.routes.js';
import homeRoutes from './modules/home/home.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import rescueReportsRoutes from './modules/rescue-reports/rescueReports.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import volunteersRoutes from './modules/volunteers/volunteers.routes.js';
import { sendError } from './utils/apiResponse.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const clientDistPath = path.join(projectRoot, 'client', 'dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');

app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));
app.use(attachCurrentUser);

app.use('/api/home', homeRoutes);
app.use('/api/animals', animalsRoutes);
app.use('/api/adoptions', adoptionsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/rescue-reports', rescueReportsRoutes);
app.use('/api/volunteers', volunteersRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/favorites', favoritesRoutes);

app.use('/api', (req, res) => {
  return sendError(res, {
    status: 404,
    code: 'API_RESOURCE_NOT_FOUND',
    message: 'Търсеният API ресурс не беше намерен.',
  });
});

if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

app.get(/^(?!\/api).*/, (req, res) => {
  if (existsSync(clientIndexPath)) {
    return res.sendFile(clientIndexPath);
  }

  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="bg">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Платформа за приюти за животни</title>
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #f6f9f7;
            color: #234331;
          }
          main {
            max-width: 760px;
            margin: 80px auto;
            padding: 32px;
            border-radius: 20px;
            background: white;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
          }
          code {
            background: #eff5f1;
            padding: 2px 6px;
            border-radius: 6px;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Липсва build на React клиента</h1>
          <p>Backend API работи, но готовият frontend bundle не е наличен.</p>
          <p>Използвай <code>npm run dev</code> за разработка или <code>npm run build</code> преди <code>npm start</code>.</p>
        </main>
      </body>
    </html>
  `);
});

app.use((error, req, res, next) => {
  if ((error.status || 500) >= 500) {
    console.error(error);
  }

  return sendError(res, {
    status: error.status || 500,
    code: error.code,
    message: error.message || 'Възникна неочаквана грешка в сървъра.',
    details: error.details,
  });
});

export default app;



