import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import errorHandler from './middleware/error.middleware.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import platformRoutes from './routes/platform.routes.js';
import productRoutes from './routes/product.routes.js';
import priceRoutes from './routes/price.routes.js';
import alertRoutes from './routes/alert.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = rawFrontendUrl.split(',').map(u => u.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(cleanOrigin) ||
      allowedOrigins.includes(origin) ||
      cleanOrigin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    // Allow in development or fallback
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
  },
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/api/products', productRoutes);
app.use('/api/products/:id', priceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

app.use(errorHandler);

export default app;
