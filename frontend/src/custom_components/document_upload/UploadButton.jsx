import {
  Box,
  Button,
  Progress,
  HStack,
  Text,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import { FiUpload } from 'react-icons/fi';

const UploadButton = ({ 
  uploading, 
  uploadProgress, 
  isUploadDisabled, 
  visibility, 
  selectedGroup,
  onUpload 
}) => {
  return (
    <Box>
      <HStack mb={3} spacing={2}>
        <Box 
          w={6} 
          h={6} 
          rounded="full" 
          bg={uploading || isUploadDisabled ? 'primary.700' : 'primary.600'}
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="xs"
          fontWeight="bold"
          color="white"
        >
          3
        </Box>
        <Text color="gray.300" fontWeight="medium">
          Upload
        </Text>
      </HStack>

      {uploading && (
        <Box mb={4}>
          <HStack justify="space-between" mb={2}>
            <Text color="gray.400" fontSize="sm">
              Uploading your document...
            </Text>
            <Text color="accent.400" fontSize="sm" fontWeight="medium">
              {uploadProgress}%
            </Text>
          </HStack>
          <Progress
            value={uploadProgress}
            size="sm"
            colorScheme="accent"
            rounded="full"
            bg="primary.700"
            hasStripe
            isAnimated
          />
        </Box>
      )}

      <Button
        colorScheme="accent"
        size="lg"
        onClick={onUpload}
        isDisabled={isUploadDisabled}
        isLoading={uploading}
        leftIcon={<FiUpload />}
        w="full"
        h="12"
        fontSize="md"
        fontWeight="semibold"
      >
        {uploading ? 'Uploading...' : 'Upload Document'}
      </Button>

      {!uploading && isUploadDisabled && (
        <Alert status="info" variant="left-accent" rounded="md" mt={3} bg="blue.100" color="gray.900">
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {!visibility 
              ? 'Select a visibility option to continue'
              : visibility === 'group' && !selectedGroup
              ? 'Select a group to continue'
              : 'Complete all steps to upload'}
          </AlertDescription>
        </Alert>
      )}
    </Box>
  );
};

export default UploadButton;