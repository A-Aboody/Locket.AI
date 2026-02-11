import {
  Box,
  VStack,
  Text,
  Button,
  Icon,
  HStack,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiX, FiCheck } from 'react-icons/fi';
import { apiUtils } from '../../utils/api';

const FileUploadArea = ({ 
  selectedFile, 
  uploading, 
  isDragging, 
  uploadError, 
  onFileSelect, 
  onCancel,
  onDragOver,
  onDragLeave,
  onDrop,
  validateFile,
  fileInputRef,
  onFileChange
}) => {
  const allowedTypes = ['.pdf', '.txt', '.doc', '.docx'];
  const maxSizeMB = 100;

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    if (ext === 'pdf') return { icon: FiFile, color: 'red.400' };
    if (ext === 'doc' || ext === 'docx') return { icon: FiFile, color: 'blue.400' };
    if (ext === 'txt') return { icon: FiFile, color: 'gray.400' };
    return { icon: FiFile, color: 'accent.400' };
  };

  const fileIconData = selectedFile ? getFileIcon(selectedFile.name) : null;

  const handleClick = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box>
      <HStack mb={3} spacing={2}>
        <Box
          w={6}
          h={6}
          rounded="full"
          bg={selectedFile ? 'accent.500' : 'primary.700'}
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="xs"
          fontWeight="bold"
          color="white"
          transition="all 0.3s"
        >
          {selectedFile ? <FiCheck size={14} /> : <FiFile size={14} />}
        </Box>
        <Text color="gray.300" fontWeight="medium">
          Select File
        </Text>
      </HStack>

      <Box
        border="2px dashed"
        borderColor={
          isDragging ? 'accent.400' : 
          uploadError ? 'red.500' : 
          selectedFile ? 'accent.500' : 
          'primary.600'
        }
        bg={
          isDragging ? 'accent.900' : 
          uploadError ? 'red.900' : 
          selectedFile ? 'accent.900' : 
          'primary.800'
        }
        rounded="xl"
        p={8}
        textAlign="center"
        cursor={uploading ? 'not-allowed' : 'pointer'}
        transition="all 0.3s"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={handleClick}
        _hover={!uploading ? { 
          borderColor: selectedFile ? 'accent.400' : 'accent.500', 
          bg: selectedFile ? 'accent.800' : 'primary.700',
          transform: 'translateY(-2px)',
        } : {}}
        opacity={uploading ? 0.6 : 1}
      >
        {selectedFile ? (
          <VStack spacing={4}>
            <Box 
              p={4} 
              bg="accent.500" 
              rounded="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={fileIconData?.icon} boxSize={8} color="white" />
            </Box>
            <VStack spacing={1}>
              <Text color="white" fontWeight="semibold" fontSize="lg" noOfLines={1} maxW="300px">
                {selectedFile.name}
              </Text>
              <Text color="accent.200" fontSize="sm">
                {apiUtils.formatFileSize(selectedFile.size)}
              </Text>
            </VStack>
            {!uploading && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                leftIcon={<FiX />}
                color="accent.200"
                _hover={{ color: 'white', bg: 'accent.700' }}
              >
                Remove File
              </Button>
            )}
          </VStack>
        ) : (
          <VStack spacing={4}>
            <Box 
              p={4} 
              bg={isDragging ? 'accent.500' : 'primary.700'} 
              rounded="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              transition="all 0.3s"
            >
              <Icon 
                as={FiUpload} 
                boxSize={8} 
                color={isDragging ? 'white' : 'gray.400'} 
              />
            </Box>
            <VStack spacing={2}>
              <Text color="white" fontWeight="semibold" fontSize="lg">
                {isDragging ? 'Drop your file here' : 'Choose a file or drag it here'}
              </Text>
              <Text color="gray.400" fontSize="sm">
                Supports PDF, DOC, DOCX, TXT up to {maxSizeMB}MB
              </Text>
            </VStack>
          </VStack>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={onFileChange}
        style={{ display: 'none' }}
        disabled={uploading}
      />
    </Box>
  );
};

export default FileUploadArea;