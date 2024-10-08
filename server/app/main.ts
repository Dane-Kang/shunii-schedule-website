import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config({ path: '../../config/.server.env' });

const app = express();
const PORT = process.env.PORT || 8000;
const HOST_ADDRESS = process.env.HOST_ADDRESS || 'localhost';

const swaggerSpec = YAML.load(path.join(__dirname, './swagger.yaml'));
const portInjectedSwaggerSpec = JSON.stringify(swaggerSpec)
  .replace('{PORT}', PORT.toString())
  .replace('{HOST_ADDRESS}', HOST_ADDRESS);

import visitor from './src/apis/visitor';
import agentinfo from './src/apis/agentinfo';

app.use(cors());

app.listen(PORT, () => {
  console.log(`server start at ${PORT}`);
});

console.log(process.env);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  '/swagger',
  swaggerUi.serve,
  swaggerUi.setup(YAML.parse(portInjectedSwaggerSpec))
);

app.use('/apis/visitor', visitor);
app.use('/apis/agentinfo', agentinfo);

export = app;
