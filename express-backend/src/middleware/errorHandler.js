export const errorHandler = (err, req, res, next) => {
    console.error('❌ Global Error Handler:', err);

    if (res.headersSent) {
        return next(err);
    }

    // Handle Multer errors
    if (err.name === 'MulterError') {
        return res.status(400).json({
            error: 'File upload error',
            message: err.message
        });
    }

    // Handle Validation errors (custom)
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation error',
            message: err.message
        });
    }

    // Handle syntax errors (JSON parsing)
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'Invalid JSON',
            message: 'The request body contains invalid JSON'
        });
    }

    // Default server error
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    });
};
