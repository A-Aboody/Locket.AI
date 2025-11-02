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
  AlertDescription,
  Avatar,
  Divider,
  Tooltip,
  Center,
  Flex,
  useBreakpointValue,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  IconButton,
  Collapse,
  Wrap,
  WrapItem,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { 
  FiUpload, 
  FiFile, 
  FiX, 
  FiUsers, 
  FiEyeOff, 
  FiGlobe, 
  FiCheck,
  FiAlertCircle,
  FiFileText,
  FiPlus,
  FiUserPlus,
  FiSearch,
  FiArrowLeft,
} from 'react-icons/fi';
import { documentsAPI, userGroupsAPI, usersAPI, apiUtils } from '../utils/api';

const DocumentUpload = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [visibility, setVisibility] = useState(null); // Changed from 'private' to null
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  
  // Group creation states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  
  const fileInputRef = useRef(null);
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });

  const allowedTypes = ['.pdf', '.txt', '.doc', '.docx'];
  const maxSizeMB = 100;

  useEffect(() => {
    if (visibility === 'group') {
      fetchUserGroups();
    }
  }, [visibility]);

  // Search members with debounce
  useEffect(() => {
    const searchUsers = async () => {
      if (!memberSearch.trim() || memberSearch.length < 2) {
        setMemberSearchResults([]);
        return;
      }
      
      try {
        setSearchingMembers(true);
        const response = await usersAPI.search(memberSearch);
        setMemberSearchResults(response.data || []);
      } catch (error) {
        console.error('Search failed:', error);
        setMemberSearchResults([]);
      } finally {
        setSearchingMembers(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [memberSearch]);

  const fetchUserGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await userGroupsAPI.list();
      const groups = response.data || [];
      setUserGroups(groups);
      
      if (groups.length === 0) {
        toast({
          title: 'No groups available',
          description: 'Create a user group to share documents with specific users',
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

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: 'Group name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setCreatingGroup(true);
      const groupData = apiUtils.prepareGroupData(
        newGroupName,
        newGroupDescription,
        newGroupMembers.map(m => m.id)
      );
      
      const response = await userGroupsAPI.create(groupData);
      
      toast({
        title: 'Group created',
        description: `${newGroupName} is ready to use`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupMembers([]);
      setMemberSearch('');
      setMemberSearchResults([]);
      setShowCreateGroup(false);
      
      // Refresh groups and select the new one
      await fetchUserGroups();
      setSelectedGroup(response.data);
      setShowGroupModal(false);
      
    } catch (error) {
      toast({
        title: 'Failed to create group',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAddMember = (user) => {
    if (!newGroupMembers.find(m => m.id === user.id)) {
      setNewGroupMembers(prev => [...prev, user]);
      toast({
        title: 'Member added',
        description: `${user.username} added to group`,
        status: 'success',
        duration: 1000,
        isClosable: true,
      });
    }
  };

  const handleRemoveMember = (userId) => {
    setNewGroupMembers(prev => prev.filter(m => m.id !== userId));
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

    if (!visibility) {
      setUploadError('Please select a visibility option');
      toast({
        title: 'Visibility required',
        description: 'Please choose who can access this document',
        status: 'error',
        duration: 5000,
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
        description: `${selectedFile.name} has been uploaded`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setSelectedFile(null);
      setUploadProgress(0);
      setVisibility(null); // Reset to null
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
    setVisibility(null); // Reset to null
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
    setShowGroupModal(true);
    setShowCreateGroup(false);
  };

  const handleVisibilityChange = (newVisibility) => {
    setVisibility(newVisibility);
    if (newVisibility !== 'group') {
      setSelectedGroup(null);
    }
  };

  const isUploadDisabled = !selectedFile || uploading || !visibility || (visibility === 'group' && !selectedGroup);

  const visibilityOptions = [
    {
      value: 'private',
      icon: FiEyeOff,
      color: 'gray',
      title: 'Private',
      description: 'Only you can access this document',
    },
    {
      value: 'public',
      icon: FiGlobe,
      color: 'green',
      title: 'Public',
      description: 'All users can access this document',
    },
    {
      value: 'group',
      icon: FiUsers,
      color: 'accent',
      title: 'Group',
      description: selectedGroup 
        ? `Shared with ${selectedGroup.name}`
        : 'Share with specific group members',
    },
  ];

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    if (ext === 'pdf') return { icon: FiFileText, color: 'red.400' };
    if (ext === 'doc' || ext === 'docx') return { icon: FiFileText, color: 'blue.400' };
    if (ext === 'txt') return { icon: FiFileText, color: 'gray.400' };
    return { icon: FiFile, color: 'accent.400' };
  };

  const fileIconData = selectedFile ? getFileIcon(selectedFile.name) : null;

  return (
    <>
      <Box bg="primary.900" rounded="xl" border="1px" borderColor="primary.600" overflow="hidden">
        {/* Header */}
        <Box 
          bg="primary.800" 
          p={6} 
          borderBottom="1px" 
          borderColor="primary.600"
        >
          <HStack spacing={3}>
            <Box 
              p={2} 
              bg="accent.500" 
              rounded="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <FiUpload size={20} color="white" />
            </Box>
            <VStack align="start" spacing={0}>
              <Text fontSize="xl" fontWeight="bold" color="white">
                Upload Document
              </Text>
              <Text fontSize="sm" color="gray.400">
                Share files with your team or keep them private
              </Text>
            </VStack>
          </HStack>
        </Box>

        <VStack spacing={6} align="stretch" p={6}>
          {uploadError && (
            <Alert 
              status="error" 
              variant="left-accent" 
              rounded="lg"
              bg="red.900"
              borderColor="red.500"
            >
              <AlertIcon />
              <AlertDescription color="red.200">{uploadError}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Select File */}
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
                {selectedFile ? <FiCheck size={14} /> : '1'}
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
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
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
                        handleCancel();
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
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </Box>

          {selectedFile && (
            <>
              <Divider borderColor="primary.600" />

              {/* Step 2: Set Visibility */}
              <Box>
                <HStack mb={3} spacing={2}>
                  <Box 
                    w={6} 
                    h={6} 
                    rounded="full" 
                    bg={visibility ? 'accent.500' : 'primary.700'}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="xs"
                    fontWeight="bold"
                    color="white"
                    transition="all 0.3s"
                  >
                    {visibility ? <FiCheck size={14} /> : '2'}
                  </Box>
                  <Text color="gray.300" fontWeight="medium">
                    Choose Visibility
                  </Text>
                </HStack>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                  {visibilityOptions.map((option) => {
                    const isSelected = visibility === option.value;
                    
                    return (
                      <Card
                        key={option.value}
                        bg={isSelected ? 'accent.500' : 'primary.800'}
                        border="2px"
                        borderColor={isSelected ? 'accent.400' : 'primary.600'}
                        cursor={uploading ? 'not-allowed' : 'pointer'}
                        onClick={() => !uploading && handleVisibilityChange(option.value)}
                        _hover={!uploading ? { 
                          borderColor: isSelected ? 'accent.300' : 'primary.500',
                          transform: 'translateY(-2px)',
                        } : {}}
                        transition="all 0.2s"
                        position="relative"
                        opacity={uploading ? 0.6 : 1}
                      >
                        <CardBody p={4}>
                          <VStack align="start" spacing={2}>
                            <HStack justify="space-between" w="full">
                              <Box 
                                p={2} 
                                bg={isSelected ? 'whiteAlpha.200' : `${option.color}.500`}
                                rounded="lg"
                              >
                                <Icon 
                                  as={option.icon} 
                                  boxSize={5} 
                                  color={isSelected ? 'white' : `${option.color}.100`}
                                />
                              </Box>
                              {isSelected && (
                                <Box 
                                  p={1} 
                                  bg="white" 
                                  rounded="full"
                                >
                                  <FiCheck color="#48BB78" size={12} />
                                </Box>
                              )}
                            </HStack>
                            <VStack align="start" spacing={1} w="full">
                              <HStack w="full" justify="space-between">
                                <Text 
                                  color={isSelected ? 'white' : 'gray.100'} 
                                  fontWeight="semibold"
                                >
                                  {option.title}
                                </Text>
                                {option.value === 'group' && selectedGroup && (
                                  <Badge 
                                    colorScheme="white" 
                                    fontSize="xs"
                                    color="accent.500"
                                    bg="white"
                                  >
                                    {selectedGroup.name}
                                  </Badge>
                                )}
                              </HStack>
                              <Text 
                                color={isSelected ? 'whiteAlpha.800' : 'gray.400'} 
                                fontSize="xs"
                              >
                                {option.description}
                              </Text>
                            </VStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    );
                  })}
                </SimpleGrid>

                {/* Group Selection */}
                {visibility === 'group' && (
                  <Box mt={3}>
                    {loadingGroups ? (
                      <Button
                        leftIcon={<Spinner size="sm" />}
                        w="full"
                        size="lg"
                        variant="outline"
                        colorScheme="accent"
                        isDisabled
                        bg="primary.800"
                      >
                        Loading groups...
                      </Button>
                    ) : selectedGroup ? (
                      <Card bg="primary.800" border="1px" borderColor="accent.500">
                        <CardBody p={4}>
                          <HStack justify="space-between">
                            <HStack spacing={3}>
                              <Avatar 
                                name={selectedGroup.name} 
                                size="sm" 
                                bg="accent.500"
                              />
                              <VStack align="start" spacing={0}>
                                <Text color="white" fontWeight="medium" fontSize="sm">
                                  {selectedGroup.name}
                                </Text>
                                <Text color="gray.400" fontSize="xs">
                                  {selectedGroup.members?.length || 0} members
                                </Text>
                              </VStack>
                            </HStack>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={openGroupModal}
                              color="accent.400"
                              _hover={{ bg: 'primary.700' }}
                            >
                              Change
                            </Button>
                          </HStack>
                        </CardBody>
                      </Card>
                    ) : (
                      <VStack spacing={2}>
                        <Button
                          leftIcon={<FiUsers />}
                          onClick={openGroupModal}
                          w="full"
                          size="lg"
                          colorScheme="accent"
                          variant="outline"
                          bg="primary.800"
                          _hover={{ bg: 'primary.700' }}
                        >
                          Select Group
                        </Button>
                        {userGroups.length === 0 && !loadingGroups && (
                          <Button
                            leftIcon={<FiPlus />}
                            onClick={() => {
                              setShowGroupModal(true);
                              setShowCreateGroup(true);
                            }}
                            w="full"
                            size="md"
                            colorScheme="accent"
                            variant="ghost"
                          >
                            Create New Group
                          </Button>
                        )}
                      </VStack>
                    )}
                  </Box>
                )}
              </Box>

              <Divider borderColor="primary.600" />

              {/* Step 3: Upload */}
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
                  onClick={handleUpload}
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
                  <Alert status="info" variant="left-accent" rounded="md" mt={3}>
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
            </>
          )}
        </VStack>
      </Box>

      {/* Group Selection/Creation Modal */}
      <Modal 
        isOpen={showGroupModal} 
        onClose={() => {
          setShowGroupModal(false);
          setShowCreateGroup(false);
          setNewGroupName('');
          setNewGroupDescription('');
          setNewGroupMembers([]);
          setMemberSearch('');
          setMemberSearchResults([]);
        }} 
        size="lg"
        isCentered
      >
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <ModalContent 
          bg="primary.900" 
          border="1px" 
          borderColor="primary.600"
          mx={4}
          maxH="85vh"
        >
          <ModalHeader 
            color="white" 
            borderBottom="1px" 
            borderColor="primary.600"
          >
            <HStack spacing={3}>
              {showCreateGroup && (
                <IconButton
                  icon={<FiArrowLeft />}
                  size="sm"
                  variant="ghost"
                  color="gray.400"
                  onClick={() => setShowCreateGroup(false)}
                  aria-label="Back to groups"
                  _hover={{ color: 'white', bg: 'primary.700' }}
                />
              )}
              <Box 
                p={2} 
                bg="accent.500" 
                rounded="lg"
              >
                {showCreateGroup ? <FiPlus size={20} color="white" /> : <FiUsers size={20} color="white" />}
              </Box>
              <Text>{showCreateGroup ? 'Create New Group' : 'Select Group'}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton 
            color="gray.400" 
            _hover={{ color: 'white', bg: 'primary.700' }}
          />
          
          <ModalBody p={6} overflowY="auto">
            {showCreateGroup ? (
              // Create Group Form
              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel color="gray.300" fontWeight="medium" fontSize="sm">
                    Group Name
                  </FormLabel>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Engineering Team"
                    color="white"
                    bg="primary.800"
                    border="2px"
                    borderColor="primary.600"
                    _hover={{ borderColor: 'primary.500' }}
                    _focus={{ borderColor: 'accent.500', boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" fontWeight="medium" fontSize="sm">
                    Description
                    <Text as="span" color="gray.500" fontWeight="normal" ml={2}>
                      (Optional)
                    </Text>
                  </FormLabel>
                  <Textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="What's this group for?"
                    color="white"
                    bg="primary.800"
                    border="2px"
                    borderColor="primary.600"
                    _hover={{ borderColor: 'primary.500' }}
                    _focus={{ borderColor: 'accent.500', boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)' }}
                    rows={2}
                    resize="none"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" fontWeight="medium" fontSize="sm">
                    Add Members
                  </FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <FiSearch color="#718096" />
                    </InputLeftElement>
                    <Input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search by username or email"
                      color="white"
                      bg="primary.800"
                      border="2px"
                      borderColor="primary.600"
                      _hover={{ borderColor: 'primary.500' }}
                      _focus={{ borderColor: 'accent.500', boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)' }}
                      pl={10}
                    />
                  </InputGroup>
                  
                  {searchingMembers && (
                    <Center py={4}>
                      <Spinner size="sm" color="accent.500" />
                    </Center>
                  )}
                  
                  {memberSearchResults.length > 0 && (
                    <VStack 
                      mt={2} 
                      spacing={2} 
                      align="stretch" 
                      maxH="200px" 
                      overflowY="auto"
                      bg="primary.800"
                      rounded="md"
                      p={2}
                      border="1px"
                      borderColor="primary.600"
                    >
                      {memberSearchResults.map(user => {
                        const alreadyAdded = newGroupMembers.find(m => m.id === user.id);
                        return (
                          <Box
                            key={user.id}
                            p={3}
                            bg={alreadyAdded ? 'accent.500' : 'primary.700'}
                            rounded="md"
                            cursor={alreadyAdded ? 'default' : 'pointer'}
                            onClick={() => !alreadyAdded && handleAddMember(user)}
                            _hover={!alreadyAdded ? { bg: 'primary.600', transform: 'translateX(4px)' } : {}}
                            transition="all 0.2s"
                            border="1px"
                            borderColor={alreadyAdded ? 'accent.400' : 'transparent'}
                          >
                            <HStack justify="space-between">
                              <HStack spacing={3}>
                                <Avatar 
                                  name={user.username} 
                                  size="sm" 
                                  bg={alreadyAdded ? 'whiteAlpha.200' : 'accent.500'}
                                />
                                <VStack align="start" spacing={0}>
                                  <Text 
                                    color={alreadyAdded ? 'white' : 'gray.100'} 
                                    fontSize="sm" 
                                    fontWeight="medium"
                                  >
                                    {user.username}
                                  </Text>
                                  <Text 
                                    color={alreadyAdded ? 'whiteAlpha.800' : 'gray.400'} 
                                    fontSize="xs"
                                  >
                                    {user.email}
                                  </Text>
                                </VStack>
                              </HStack>
                              {alreadyAdded ? (
                                <Box p={1.5} bg="white" rounded="full">
                                  <FiCheck color="#48BB78" size={14} />
                                </Box>
                              ) : (
                                <Icon as={FiUserPlus} color="gray.400" boxSize={5} />
                              )}
                            </HStack>
                          </Box>
                        );
                      })}
                    </VStack>
                  )}

                  {newGroupMembers.length > 0 && (
                    <Box mt={3}>
                      <Text color="gray.400" fontSize="xs" mb={2}>
                        Selected Members ({newGroupMembers.length})
                      </Text>
                      <Wrap spacing={2}>
                        {newGroupMembers.map(member => (
                          <WrapItem key={member.id}>
                            <HStack
                              bg="primary.700"
                              px={3}
                              py={2}
                              rounded="full"
                              spacing={2}
                              border="1px"
                              borderColor="accent.500"
                            >
                              <Avatar 
                                name={member.username} 
                                size="xs" 
                                bg="accent.500"
                              />
                              <Text color="white" fontSize="sm">
                                {member.username}
                              </Text>
                              <IconButton
                                icon={<FiX />}
                                size="xs"
                                variant="ghost"
                                color="gray.400"
                                _hover={{ color: 'red.400' }}
                                onClick={() => handleRemoveMember(member.id)}
                                aria-label="Remove member"
                                minW="auto"
                                h="auto"
                                p={1}
                                rounded="full"
                              />
                            </HStack>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}
                </FormControl>

                <Button
                  colorScheme="accent"
                  onClick={handleCreateGroup}
                  isLoading={creatingGroup}
                  loadingText="Creating..."
                  leftIcon={<FiPlus />}
                  size="lg"
                  mt={2}
                  isDisabled={!newGroupName.trim()}
                >
                  Create Group
                </Button>
              </VStack>
            ) : (
              // Select Group List
              <>
                {loadingGroups ? (
                  <Center py={12}>
                    <VStack spacing={4}>
                      <Spinner size="xl" color="accent.500" thickness="3px" />
                      <Text color="gray.400">Loading groups...</Text>
                    </VStack>
                  </Center>
                ) : userGroups.length === 0 ? (
                  <Center py={12}>
                    <VStack spacing={4}>
                      <Box 
                        p={6} 
                        bg="primary.800" 
                        rounded="full"
                        border="2px dashed"
                        borderColor="primary.600"
                      >
                        <FiUsers size={40} color="#4A5568" />
                      </Box>
                      <Text color="white" fontWeight="medium">
                        No Groups Yet
                      </Text>
                      <Text color="gray.400" fontSize="sm" textAlign="center" maxW="250px">
                        Create your first group to start sharing documents
                      </Text>
                      <Button
                        leftIcon={<FiPlus />}
                        colorScheme="accent"
                        onClick={() => setShowCreateGroup(true)}
                        size="lg"
                        mt={2}
                      >
                        Create New Group
                      </Button>
                    </VStack>
                  </Center>
                ) : (
                  <VStack spacing={3} align="stretch">
                    <Button
                      leftIcon={<FiPlus />}
                      variant="outline"
                      colorScheme="accent"
                      onClick={() => setShowCreateGroup(true)}
                      size="md"
                      bg="primary.800"
                      _hover={{ bg: 'primary.700' }}
                    >
                      Create New Group
                    </Button>
                    
                    <Divider borderColor="primary.600" />
                    
                    {userGroups.map(group => {
                      const isSelected = selectedGroup?.id === group.id;
                      
                      return (
                        <Card
                          key={group.id}
                          bg={isSelected ? 'accent.500' : 'primary.800'}
                          border="2px"
                          borderColor={isSelected ? 'accent.400' : 'primary.600'}
                          cursor="pointer"
                          onClick={() => handleGroupSelect(group)}
                          _hover={{
                            borderColor: isSelected ? 'accent.300' : 'primary.500',
                            transform: 'translateY(-2px)',
                          }}
                          transition="all 0.2s"
                        >
                          <CardBody p={4}>
                            <HStack spacing={3}>
                              <Avatar 
                                name={group.name} 
                                size="md" 
                                bg={isSelected ? 'whiteAlpha.200' : 'accent.500'}
                              />
                              <VStack align="start" spacing={1} flex={1}>
                                <Text 
                                  color={isSelected ? 'white' : 'gray.100'} 
                                  fontWeight="semibold"
                                >
                                  {group.name}
                                </Text>
                                {group.description && (
                                  <Text 
                                    color={isSelected ? 'whiteAlpha.800' : 'gray.400'} 
                                    fontSize="sm" 
                                    noOfLines={1}
                                  >
                                    {group.description}
                                  </Text>
                                )}
                                <HStack spacing={3} fontSize="xs" color={isSelected ? 'whiteAlpha.700' : 'gray.500'}>
                                  <HStack spacing={1}>
                                    <FiUsers size={12} />
                                    <Text>{group.members?.length || 0} members</Text>
                                  </HStack>
                                  {group.created_by_id === JSON.parse(localStorage.getItem('user') || '{}').id && (
                                    <Badge 
                                      colorScheme={isSelected ? 'whiteAlpha' : 'accent'} 
                                      fontSize="xs"
                                    >
                                      Owner
                                    </Badge>
                                  )}
                                </HStack>
                              </VStack>
                              {isSelected && (
                                <Box 
                                  p={1.5} 
                                  bg="white" 
                                  rounded="full"
                                >
                                  <FiCheck color="#48BB78" size={16} />
                                </Box>
                              )}
                            </HStack>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </VStack>
                )}
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default DocumentUpload;