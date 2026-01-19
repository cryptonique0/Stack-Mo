import express, { type Request, type Response } from 'express';
import bodyParser from 'body-parser';
import type { ChainhookPayload } from './types.js';

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.post('/api/webhook', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  console.log(authHeader);

  console.log('\nReceived Chainhook event:', req.body);

  const payload = req.body.event as ChainhookPayload;

  // This will show the contents of the apply array
  console.log('\nAPPLY ARRAY CONTENTS:');
  console.dir(payload.apply, { depth: null, colors: true });

  res.status(200).send({ status: 'counter-active' });
});

app.listen(port, () => {
  console.log(`Counter app listening at http://localhost:${port}`);
  console.log('Ready to receive Chainhook events at /api/webhook');
});