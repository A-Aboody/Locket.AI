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
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiX } from 'react-icons/fi';
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
        description: `${selectedFile.name} has been uploaded and indexed`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setSelectedFile(null);
      setUploadProgress(0);
      
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
    <Box bg="primary.800" p={8} rounded="lg" border="1px" borderColor="primary.600">
      <VStack spacing={6} align="stretch">
        <Text fontSize="2xl" fontWeight="bold" color="white">
          Document Upload
        </Text>

        {/* Drag and Drop Area */}
        <Box
          border="2px dashed"
          borderColor={isDragging ? 'accent.500' : 'primary.500'}
          bg={isDragging ? 'primary.700' : 'primary.900'}
          rounded="lg"
          p={12}
          textAlign="center"
          cursor="pointer"
          transition="all 0.3s"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          _hover={{ borderColor: 'accent.500', bg: 'primary.700' }}
        >
          <VStack spacing={4}>
            <Icon as={FiUpload} boxSize={16} color={isDragging ? 'accent.500' : 'gray.500'} />
            <Text color="gray.300" fontWeight="semibold" fontSize="lg">
              Drag and drop files you wish to upload
            </Text>
            <Text color="gray.500" fontSize="sm">
              or click to browse
            </Text>
            <Text color="gray.600" fontSize="xs" mt={2}>
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
          <Box bg="primary.700" p={5} rounded="lg" border="1px" borderColor="primary.500">
            <HStack justify="space-between">
              <HStack spacing={4}>
                <Icon as={FiFile} boxSize={8} color="accent.500" />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold" color="white" fontSize="md">
                    {selectedFile.name}
                  </Text>
                  <Text fontSize="sm" color="gray.400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </Text>
                </VStack>
              </HStack>
              {!uploading && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  leftIcon={<FiX />}
                  color="gray.400"
                  _hover={{ color: 'red.400', bg: 'primary.600' }}
                >
                  Remove
                </Button>
              )}
            </HStack>

            {uploading && (
              <Box mt={4}>
                <Progress
                  value={uploadProgress}
                  size="sm"
                  colorScheme="accent"
                  rounded="full"
                  bg="primary.600"
                />
                <Text fontSize="sm" color="gray.400" mt={2} textAlign="center">
                  Uploading... {uploadProgress}%
                </Text>
              </Box>
            )}
          </Box>
        )}

        {/* Upload Button */}
        <Button
          colorScheme="accent"
          size="lg"
          onClick={handleUpload}
          isDisabled={!selectedFile || uploading}
          isLoading={uploading}
          leftIcon={<FiUpload />}
          bg="accent.500"
          _hover={{ bg: 'accent.600' }}
          _disabled={{
            bg: 'primary.600',
            color: 'gray.500',
            cursor: 'not-allowed',
          }}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </VStack>
    </Box>
  );
};

export default DocumentUpload;