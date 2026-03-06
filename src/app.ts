import express, { Application } from 'express';
import cors from 'cors';
import apiRoutes from './routes';

const app: Application = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);

export default app;
