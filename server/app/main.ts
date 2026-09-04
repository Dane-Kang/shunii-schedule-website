import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config({ path: '../../config/.server.env' });

const app = express();
const PORT = process.env.PORT || 8000;

import agentinfo from './src/apis/agentinfo';

app.use(cors());

app.listen(PORT, () => {
  console.log(`server start at ${PORT}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/apis/agentinfo', agentinfo);

export = app;
