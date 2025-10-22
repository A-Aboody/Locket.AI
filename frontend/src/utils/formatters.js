/**
 * Format file size from bytes to human-readable format
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(parseFloat((bytes / Math.pow(k, i)).toFixed(2))) + ' ' + sizes[i];
};

/**
 * Format date to readable string
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Get file type icon color
 */
export const getFileTypeColor = (filename) => {
  const ext = getFileExtension(filename).toLowerCase();
  
  switch (ext) {
    case 'pdf':
      return 'red';
    case 'txt':
      return 'gray';
    case 'doc':
    case 'docx':
      return 'blue';
    default:
      return 'gray';
  }
};