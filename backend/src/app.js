import express from 'express';
import cors from 'cors';
import fileRoutes from './routes/fileRoutes.js';
import config from './config.js';

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/files', fileRoutes);

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
