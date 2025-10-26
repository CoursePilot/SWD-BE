const multer = require('multer');

// Configure multer for memory storage (like ProjectOJT)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Debug logging
    console.log('File upload debug:');
    console.log('- Field name:', file.fieldname);
    console.log('- Original name:', file.originalname);
    console.log('- MIME type:', file.mimetype);
    
    // Check if file is an image by MIME type
    const isImageMime = file.mimetype.startsWith('image/');
    
    // Fallback: check by file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    const isImageExtension = allowedExtensions.includes(fileExtension);
    
    console.log('- File extension:', fileExtension);
    console.log('- Is image by MIME:', isImageMime);
    console.log('- Is image by extension:', isImageExtension);
    
    if (isImageMime || isImageExtension) {
      console.log('✅ File accepted as image');
      cb(null, true);
    } else {
      console.log('❌ File rejected - not an image');
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Too many files or unexpected field name.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  
  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({ error: 'Only image files are allowed!' });
  }
  
  next(err);
};

module.exports = {
  upload,
  handleMulterError,
};
