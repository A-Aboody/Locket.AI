import { useState, useRef } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Progress,
  useToast,
  Icon,
  HStack,
  Badge,
} from '@chakra-ui/react';
import { FiUpload, FiFile } from 'react-icons/fi';
import { documentsAPI } from '../utils/api';

const DocumentUpload = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const allowedTypes = ['.pdf', '.txt', '.doc', '.docx'];
  const maxSizeMB = 100;

  const validateFile = (file) => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: 'Invalid file type',
        description: `Please upload: ${allowedTypes.join(', ')}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast({
        title: 'File too large',
        description: `Maximum file size is ${maxSizeMB}MB`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (file) => {
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await documentsAPI.upload(
        selectedFile,
        (progress) => setUploadProgress(progress)
      );

      toast({
        title: 'Upload successful!',
        description: `${selectedFile.name} has been uploaded`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset state
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box bg="white" p={6} rounded="lg" shadow="md">
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold" color="gray.800">
          Upload Document
        </Text>

        {/* Drag and Drop Area */}
        <Box
          border="2px dashed"
          borderColor={isDragging ? 'blue.400' : 'gray.300'}
          bg={isDragging ? 'blue.50' : 'gray.50'}
          rounded="md"
          p={8}
          textAlign="center"
          cursor="pointer"
          transition="all 0.2s"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          _hover={{ borderColor: 'blue.400', bg: 'blue.50' }}
        >
          <VStack spacing={3}>
            <Icon as={FiUpload} boxSize={12} color="gray.400" />
            <Text color="gray.600" fontWeight="medium">
              Drag and drop your file here
            </Text>
            <Text color="gray.500" fontSize="sm">
              or click to browse
            </Text>
            <Text color="gray.400" fontSize="xs">
              Supported: PDF, TXT, DOC, DOCX (Max {maxSizeMB}MB)
            </Text>
          </VStack>
        </Box>

        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Selected File */}
        {selectedFile && (
          <Box bg="gray.50" p={4} rounded="md" border="1px" borderColor="gray.200">
            <HStack justify="space-between">
              <HStack spacing={3}>
                <Icon as={FiFile} boxSize={6} color="blue.500" />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="medium" color="gray.800">
                    {selectedFile.name}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </Text>
                </VStack>
              </HStack>
              {!uploading && (
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  Remove
                </Button>
              )}
            </HStack>

            {uploading && (
              <Box mt={3}>
                <Progress
                  value={uploadProgress}
                  size="sm"
                  colorScheme="blue"
                  rounded="full"
                />
                <Text fontSize="xs" color="gray.500" mt={1} textAlign="center">
                  Uploading... {uploadProgress}%
                </Text>
              </Box>
            )}
          </Box>
        )}

        {/* Upload Button */}
        <Button
          colorScheme="blue"
          size="lg"
          onClick={handleUpload}
          isDisabled={!selectedFile || uploading}
          isLoading={uploading}
          leftIcon={<FiUpload />}
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </VStack>
    </Box>
  );
};

export default DocumentUpload;