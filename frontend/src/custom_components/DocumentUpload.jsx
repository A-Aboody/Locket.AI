import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Progress,
  useToast,
  Icon,
  HStack,
  Radio,
  RadioGroup,
  Stack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  SimpleGrid,
  Card,
  CardBody,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiX, FiUsers, FiEyeOff, FiGlobe } from 'react-icons/fi';
import { documentsAPI, userGroupsAPI, apiUtils } from '../utils/api';

const DocumentUpload = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [visibility, setVisibility] = useState('private');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  
  const fileInputRef = useRef(null);
  const toast = useToast();

  const allowedTypes = ['.pdf', '.txt', '.doc', '.docx'];
  const maxSizeMB = 100;

  // Fetch user groups when visibility changes to 'group'
  useEffect(() => {
    if (visibility === 'group') {
      fetchUserGroups();
    }
  }, [visibility]);

  const fetchUserGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await userGroupsAPI.list();
      const groups = response.data || [];
      setUserGroups(groups);
      
      if (groups.length === 0) {
        toast({
          title: 'No groups available',
          description: 'Create a user group first to share documents with specific users',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Failed to fetch user groups:', error);
      toast({
        title: 'Failed to load groups',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setUserGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const validateFile = (file) => {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      const errorMsg = `File type not allowed. Supported types: ${allowedTypes.join(', ')}`;
      setUploadError(errorMsg);
      toast({
        title: 'Invalid file type',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      const errorMsg = `File size exceeds maximum allowed size of ${maxSizeMB}MB`;
      setUploadError(errorMsg);
      toast({
        title: 'File too large',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }

    setUploadError(null);
    return true;
  };

  const handleFileSelect = (file) => {
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setUploadError(null);
    } else {
      setSelectedFile(null);
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
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (visibility === 'group' && !selectedGroup) {
      setUploadError('Please select a group for group documents');
      toast({
        title: 'Group required',
        description: 'Please select a group to share this document with',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('visibility', visibility);
      
      if (visibility === 'group' && selectedGroup) {
        formData.append('user_group_id', selectedGroup.id.toString());
      }

      const response = await documentsAPI.upload(
        formData,
        (progress) => setUploadProgress(progress)
      );

      toast({
        title: 'Upload successful',
        description: `${selectedFile.name} has been uploaded successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset form
      setSelectedFile(null);
      setUploadProgress(0);
      setVisibility('private');
      setSelectedGroup(null);
      setUploadError(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (error) {
      const errorMsg = apiUtils.handleError(error, 'Upload failed. Please try again.');
      setUploadError(errorMsg);
      toast({
        title: 'Upload failed',
        description: errorMsg,
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
    setVisibility('private');
    setSelectedGroup(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setShowGroupModal(false);
    toast({
      title: 'Group selected',
      description: `Document will be shared with ${group.name}`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const openGroupModal = () => {
    if (userGroups.length === 0) {
      toast({
        title: 'No groups available',
        description: 'Please create a user group first from the Groups menu',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setShowGroupModal(true);
  };

  const handleVisibilityChange = (newVisibility) => {
    setVisibility(newVisibility);
    if (newVisibility !== 'group') {
      setSelectedGroup(null);
    }
  };

  const isUploadDisabled = !selectedFile || uploading || (visibility === 'group' && !selectedGroup);

  return (
    <>
      <Box bg="primary.800" p={8} rounded="lg" border="1px" borderColor="primary.600">
        <VStack spacing={6} align="stretch">
          <Text fontSize="2xl" fontWeight="bold" color="white">
            Upload Document
          </Text>

          {uploadError && (
            <Alert status="error" variant="left-accent" rounded="md">
              <AlertIcon />
              <Box flex="1">
                <AlertTitle>Upload Error</AlertTitle>
                <AlertDescription>{uploadError}</AlertDescription>
              </Box>
            </Alert>
          )}

          {/* Visibility Settings */}
          <Box>
            <Text color="gray.300" fontWeight="semibold" mb={3}>
              Document Visibility
            </Text>
            <RadioGroup value={visibility} onChange={handleVisibilityChange}>
              <Stack direction="column" spacing={3}>
                <Radio value="private" colorScheme="accent" color="white" isDisabled={uploading}>
                  <VStack align="start" spacing={1} ml={2}>
                    <HStack>
                      <Icon as={FiEyeOff} color="gray.400" />
                      <Text color="white" fontWeight="medium">Private</Text>
                    </HStack>
                    <Text color="gray.400" fontSize="sm">
                      Only you can see this document
                    </Text>
                  </VStack>
                </Radio>

                <Radio value="public" colorScheme="accent" color="white" isDisabled={uploading}>
                  <VStack align="start" spacing={1} ml={2}>
                    <HStack>
                      <Icon as={FiGlobe} color="green.400" />
                      <Text color="white" fontWeight="medium">Public</Text>
                    </HStack>
                    <Text color="gray.400" fontSize="sm">
                      All users can see this document
                    </Text>
                  </VStack>
                </Radio>

                <Radio value="group" colorScheme="accent" color="white" isDisabled={uploading}>
                  <VStack align="start" spacing={1} ml={2}>
                    <HStack>
                      <Icon as={FiUsers} color="accent.400" />
                      <Text color="white" fontWeight="medium">Group</Text>
                      {selectedGroup && (
                        <Badge colorScheme="accent" fontSize="xs">
                          {selectedGroup.name}
                        </Badge>
                      )}
                    </HStack>
                    <Text color="gray.400" fontSize="sm">
                      {selectedGroup 
                        ? `Only members of ${selectedGroup.name} can see this document`
                        : 'Only group members can see this document'}
                    </Text>
                  </VStack>
                </Radio>
              </Stack>
            </RadioGroup>

            {/* Group Selection Button */}
            {visibility === 'group' && (
              <Box mt={3}>
                {loadingGroups ? (
                  <Button
                    leftIcon={<Spinner size="sm" />}
                    w="full"
                    variant="outline"
                    colorScheme="accent"
                    isDisabled
                  >
                    Loading groups...
                  </Button>
                ) : (
                  <Button
                    leftIcon={<FiUsers />}
                    onClick={openGroupModal}
                    variant="outline"
                    colorScheme="accent"
                    w="full"
                    isDisabled={uploading || userGroups.length === 0}
                  >
                    {selectedGroup ? `Selected: ${selectedGroup.name}` : 'Select Group'}
                  </Button>
                )}
                {userGroups.length === 0 && !loadingGroups && (
                  <Text color="yellow.400" fontSize="sm" mt={2} textAlign="center">
                    You need to create a group first to use this option
                  </Text>
                )}
              </Box>
            )}
          </Box>

          {/* Drag and Drop Area */}
          <Box
            border="2px dashed"
            borderColor={isDragging ? 'accent.500' : uploadError ? 'red.500' : 'primary.500'}
            bg={isDragging ? 'primary.700' : uploadError ? 'red.900' : 'primary.900'}
            rounded="lg"
            p={12}
            textAlign="center"
            cursor={uploading ? 'not-allowed' : 'pointer'}
            transition="all 0.3s"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            _hover={!uploading ? { borderColor: 'accent.500', bg: 'primary.700' } : {}}
            opacity={uploading ? 0.6 : 1}
          >
            <VStack spacing={4}>
              <Icon 
                as={FiUpload} 
                boxSize={16} 
                color={isDragging ? 'accent.500' : uploadError ? 'red.500' : 'gray.500'} 
              />
              <Text color="gray.300" fontWeight="semibold" fontSize="lg">
                {uploading ? 'Uploading...' : 'Drag and drop files here'}
              </Text>
              <Text color="gray.500" fontSize="sm">
                or click to browse
              </Text>
              <Text color="gray.600" fontSize="xs" mt={2}>
                Supported: {allowedTypes.join(', ')} (Max {maxSizeMB}MB)
              </Text>
            </VStack>
          </Box>

          <input
            ref={fileInputRef}
            type="file"
            accept={allowedTypes.join(',')}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={uploading}
          />

          {/* Selected File */}
          {selectedFile && (
            <Box 
              bg="primary.700" 
              p={5} 
              rounded="lg" 
              border="1px" 
              borderColor="primary.500"
              position="relative"
            >
              {uploading && (
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  bg="blackAlpha.600"
                  rounded="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  zIndex={1}
                >
                  <Spinner size="xl" color="accent.500" />
                </Box>
              )}
              
              <HStack justify="space-between">
                <HStack spacing={4}>
                  <Icon as={FiFile} boxSize={8} color="accent.500" />
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="semibold" color="white" fontSize="md" noOfLines={1}>
                      {selectedFile.name}
                    </Text>
                    <Text fontSize="sm" color="gray.400">
                      {apiUtils.formatFileSize(selectedFile.size)}
                    </Text>
                    <HStack>
                      <Badge 
                        colorScheme={
                          visibility === 'private' ? 'gray' : 
                          visibility === 'public' ? 'green' : 
                          'accent'
                        } 
                        fontSize="xs"
                      >
                        {visibility === 'private' ? 'Private' : 
                         visibility === 'public' ? 'Public' : 
                         'Group'}
                      </Badge>
                      {selectedGroup && (
                        <Badge colorScheme="accent" fontSize="xs">
                          {selectedGroup.name}
                        </Badge>
                      )}
                    </HStack>
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
                    hasStripe
                    isAnimated
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
            isDisabled={isUploadDisabled}
            isLoading={uploading}
            loadingText={`Uploading... ${uploadProgress}%`}
            leftIcon={<FiUpload />}
            bg="accent.500"
            _hover={{ bg: 'accent.600' }}
            _disabled={{
              bg: 'primary.600',
              color: 'gray.500',
              cursor: 'not-allowed',
            }}
          >
            {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Document'}
          </Button>

          {/* Help Text */}
          {visibility === 'group' && !selectedGroup && !loadingGroups && userGroups.length > 0 && (
            <Alert status="info" variant="left-accent" rounded="md">
              <AlertIcon />
              <Text fontSize="sm">Please select a group to continue with the upload</Text>
            </Alert>
          )}
        </VStack>
      </Box>

      {/* Group Selection Modal */}
      <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} size="md">
        <ModalOverlay />
        <ModalContent bg="primary.800" border="1px" borderColor="primary.600">
          <ModalHeader color="white">Select Group</ModalHeader>
          <ModalCloseButton color="gray.400" />
          
          <ModalBody pb={6}>
            {loadingGroups ? (
              <Box textAlign="center" py={8}>
                <Spinner size="xl" color="accent.500" />
                <Text mt={4} color="gray.400">Loading groups...</Text>
              </Box>
            ) : userGroups.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Icon as={FiUsers} boxSize={12} color="gray.600" />
                <Text color="gray.400" mt={4}>
                  You are not in any groups yet.
                </Text>
                <Text color="gray.500" fontSize="sm" mt={2}>
                  Create a group first to upload group documents
                </Text>
              </Box>
            ) : (
              <SimpleGrid columns={1} spacing={3}>
                {userGroups.map(group => (
                  <Card
                    key={group.id}
                    bg={selectedGroup?.id === group.id ? 'accent.500' : 'primary.700'}
                    border="1px"
                    borderColor={selectedGroup?.id === group.id ? 'accent.400' : 'primary.500'}
                    cursor="pointer"
                    onClick={() => handleGroupSelect(group)}
                    _hover={{
                      bg: selectedGroup?.id === group.id ? 'accent.600' : 'primary.600',
                      transform: 'translateY(-2px)',
                    }}
                    transition="all 0.2s"
                  >
                    <CardBody>
                      <VStack align="start" spacing={2}>
                        <Text color="white" fontWeight="semibold">
                          {group.name}
                        </Text>
                        {group.description && (
                          <Text color="gray.300" fontSize="sm" noOfLines={2}>
                            {group.description}
                          </Text>
                        )}
                        <HStack spacing={4}>
                          <HStack>
                            <Icon as={FiUsers} color="gray.400" boxSize={3} />
                            <Text color="gray.400" fontSize="xs">
                              {group.members ? group.members.length : 0} members
                            </Text>
                          </HStack>
                          {group.created_by_id === JSON.parse(localStorage.getItem('user') || '{}').id && (
                            <Badge colorScheme="accent" fontSize="xs">
                              Owner
                            </Badge>
                          )}
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default DocumentUpload;