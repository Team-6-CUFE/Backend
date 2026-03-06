import { Router } from 'express';

// import profileRouter from './profile.routes';

const router = Router();

/**
 * Health check route for internal monitoring
 */
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is reachable' });
});

// router.use('/profiles', profileRouter);

export default router;
