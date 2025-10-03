const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

/**
 * Upload single image to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} originalName - Original filename
 * @param {string} folder - Folder name in storage bucket (e.g., 'avatars', 'products')
 * @param {string} bucketName - Storage bucket name (default: 'images')
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
async function uploadImage(fileBuffer, originalName, folder = 'images', bucketName = 'SWD_image') {
  try {
    // Generate unique filename
    const fileExtension = path.extname(originalName);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = `${folder}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: getContentType(fileExtension),
        upsert: false,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return {
        success: false,
        error: 'Failed to upload image to storage'
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      success: true,
      data: {
        fileName: fileName,
        filePath: filePath,
        publicUrl: urlData.publicUrl,
        fullPath: data.path,
        bucket: bucketName
      }
    };

  } catch (err) {
    console.error('Image upload service error:', err);
    return {
      success: false,
      error: 'Internal server error during image upload'
    };
  }
}

/**
 * Upload multiple images to Supabase Storage
 * @param {Array<{buffer: Buffer, originalname: string}>} files - Array of file objects from multer
 * @param {string} folder - Folder name in storage bucket
 * @param {string} bucketName - Storage bucket name
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
async function uploadMultipleImages(files, folder = 'images', bucketName = 'SWD_image') {
  try {
    if (!files || files.length === 0) {
      return {
        success: false,
        error: 'No files provided'
      };
    }

    const uploadPromises = files.map(file => 
      uploadImage(file.buffer, file.originalname, folder, bucketName)
    );

    const results = await Promise.all(uploadPromises);
    
    // Check if any uploads failed
    const failedUploads = results.filter(result => !result.success);
    if (failedUploads.length > 0) {
      return {
        success: false,
        error: `${failedUploads.length} out of ${files.length} images failed to upload`,
        partialResults: results
      };
    }

    return {
      success: true,
      data: results.map(result => result.data)
    };

  } catch (err) {
    console.error('Multiple images upload error:', err);
    return {
      success: false,
      error: 'Internal server error during multiple images upload'
    };
  }
}

/**
 * Delete image from Supabase Storage
 * @param {string} filePath - File path in storage bucket
 * @param {string} bucketName - Storage bucket name
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteImage(filePath, bucketName = 'SWD_image') {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      return {
        success: false,
        error: 'Failed to delete image from storage'
      };
    }

    return { success: true };

  } catch (err) {
    console.error('Image delete service error:', err);
    return {
      success: false,
      error: 'Internal server error during image deletion'
    };
  }
}

/**
 * Get public URL for an image
 * @param {string} filePath - File path in storage bucket
 * @param {string} bucketName - Storage bucket name
 * @returns {string} - Public URL
 */
function getImageUrl(filePath, bucketName = 'SWD_image') {
  try {
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  } catch (err) {
    console.error('Get image URL error:', err);
    return null;
  }
}

/**
 * List all files in a folder
 * @param {string} folder - Folder name in storage bucket
 * @param {string} bucketName - Storage bucket name
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
async function listImages(folder = '', bucketName = 'SWD_image') {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folder, {
        limit: 100,
        offset: 0
      });

    if (error) {
      console.error('List images error:', error);
      return {
        success: false,
        error: 'Failed to list images'
      };
    }

    return {
      success: true,
      data: data
    };

  } catch (err) {
    console.error('List images service error:', err);
    return {
      success: false,
      error: 'Internal server error during listing images'
    };
  }
}

/**
 * Get content type based on file extension
 * @param {string} extension - File extension
 * @returns {string} - MIME type
 */
function getContentType(extension) {
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml'
  };

  return contentTypes[extension.toLowerCase()] || 'image/jpeg';
}

module.exports = {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  getImageUrl,
  listImages,
};
