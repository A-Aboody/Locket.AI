import { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  Text,
  useToast,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
} from '@chakra-ui/react';
import { FiUpload, FiUsers } from 'react-icons/fi';
import { documentsAPI, userGroupsAPI, usersAPI, apiUtils } from '../utils/api';
import { isPersonalMode as checkIsPersonalMode } from '../utils/modeUtils';

// Import components
import FileUploadArea from './document_upload/FileUploadArea';
import VisibilitySelector from './document_upload/VisibilitySelector';
import GroupSelection from './document_upload/GroupSelection';
import UploadButton from './document_upload/UploadButton';
import GroupSelectionModal from './document_upload/GroupSelectionModal';

const DocumentUpload = ({ onUploadSuccess }) => {
  // Get current user for organization visibility
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [isPersonalMode, setIsPersonalMode] = useState(checkIsPersonalMode());

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // In personal mode, default to 'private'; in organization mode, no default
  const [visibility, setVisibility] = useState(isPersonalMode ? 'private' : null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const fileInputRef = useRef(null);
  const toast = useToast();
  const maxSizeMB = 100;

  // Listen for mode changes and reset visibility
  useEffect(() => {
    const handleModeChange = () => {
      const newMode = checkIsPersonalMode();
      setIsPersonalMode(newMode);
      // Reset visibility to appropriate default for new mode
      setVisibility(newMode ? 'private' : null);
      setSelectedGroup(null);
    };

    window.addEventListener('modeChanged', handleModeChange);
    return () => window.removeEventListener('modeChanged', handleModeChange);
  }, []);

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

  const validateFile = (file) => {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const allowedTypes = ['.pdf', '.txt', '.doc', '.docx'];
    
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

      // Reset form exactly like original version
      setSelectedFile(null);
      setUploadProgress(0);
      // Reset to 'private' in personal mode, null in organization mode
      setVisibility(isPersonalMode ? 'private' : null);
      setSelectedGroup(null);
      setUploadError(null);

      // Clear file input like original version
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
    // Reset to 'private' in personal mode, null in organization mode
    setVisibility(isPersonalMode ? 'private' : null);
    setSelectedGroup(null);
    setUploadError(null);
    // Clear file input like original version
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
  };

  const handleVisibilityChange = (newVisibility) => {
    setVisibility(newVisibility);
    if (newVisibility !== 'group') {
      setSelectedGroup(null);
    }
  };

  const handleCreateGroup = () => {
    setShowGroupModal(true);
  };

  const isUploadDisabled = !selectedFile || uploading || !visibility || (visibility === 'group' && !selectedGroup);

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
                {isPersonalMode
                  ? 'Upload and securely store your personal documents'
                  : 'Share files with your team or keep them private'}
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
          <FileUploadArea
            selectedFile={selectedFile}
            uploading={uploading}
            isDragging={isDragging}
            uploadError={uploadError}
            onFileSelect={handleFileSelect}
            onCancel={handleCancel}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            validateFile={validateFile}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
          />

          {selectedFile && (
            <>
              {/* Only show visibility settings in organization mode */}
              {!isPersonalMode && (
                <>
                  <Divider borderColor="primary.600" />

                  {/* Step 2: Set Visibility */}
                  <VisibilitySelector
                    visibility={visibility}
                    selectedGroup={selectedGroup}
                    uploading={uploading}
                    onVisibilityChange={handleVisibilityChange}
                    onGroupSelect={handleGroupSelect}
                    currentUser={currentUser}
                  />

                  {/* Group Selection */}
                  <GroupSelection
                    visibility={visibility}
                    selectedGroup={selectedGroup}
                    userGroups={userGroups}
                    loadingGroups={loadingGroups}
                    uploading={uploading}
                    onOpenGroupModal={openGroupModal}
                    onCreateGroup={handleCreateGroup}
                  />
                </>
              )}

              <Divider borderColor="primary.600" />

              {/* Step 3: Upload */}
              <UploadButton
                uploading={uploading}
                uploadProgress={uploadProgress}
                isUploadDisabled={isUploadDisabled}
                visibility={visibility}
                selectedGroup={selectedGroup}
                onUpload={handleUpload}
              />
            </>
          )}
        </VStack>
      </Box>

      {/* Group Selection Modal */}
      <GroupSelectionModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        userGroups={userGroups}
        loadingGroups={loadingGroups}
        selectedGroup={selectedGroup}
        onGroupSelect={handleGroupSelect}
        onGroupsUpdate={fetchUserGroups}
      />
    </>
  );
};

export default DocumentUpload;