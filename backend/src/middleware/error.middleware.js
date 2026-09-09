export function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err.message || err);

  const statusCode =
    err.statusCode ||
    (err.code === 'UNSUPPORTED_PLATFORM' || err.code === 'VALIDATION_ERROR' ? 400 : 500);

  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    code: err.code || 'SERVER_ERROR',
    message,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export default errorHandler;
