import dotenv from 'dotenv';
import app from './app';

dotenv.config();

const PORT = process.env.PORT || 8080;

const startServer = () => {
  try {
    app.listen(PORT, () => {
      console.log(`Server ready at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
