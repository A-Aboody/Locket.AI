import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  Icon,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Radio,
  RadioGroup,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { FiUsers, FiAlertCircle, FiPlus } from 'react-icons/fi';
import { userGroupsAPI, documentsAPI, apiUtils } from '../../utils/api';
import GroupCreationForm from './GroupCreationForm';

const AddDocumentToGroupModal = ({
  isOpen,
  onClose,
  document,
  onSuccess
}) => {
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const toast = useToast();
  const currentUser = apiUtils.getCurrentUser();

  useEffect(() => {
    if (isOpen) {
      fetchUserGroups();
      setShowConfirm(false);
      setSelectedGroupId(null);
      setShowCreateGroup(false);
    }
  }, [isOpen]);

  const fetchUserGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await userGroupsAPI.list();
      const allGroups = response.data || [];

      // Filter out the group the document is already in (if any)
      const availableGroups = document?.user_group_id
        ? allGroups.filter(g => g.id !== document.user_group_id)
        : allGroups;

      setUserGroups(availableGroups);

      if (availableGroups.length === 0) {
        setShowCreateGroup(true);
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
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleAddToGroup = () => {
    if (!selectedGroupId) {
      toast({
        title: 'No group selected',
        description: 'Please select a group',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmAdd = async () => {
    if (!selectedGroupId) return;

    setIsLoading(true);
    try {
      const selectedGroup = userGroups.find(g => g.id === parseInt(selectedGroupId));

      await documentsAPI.updateVisibility(document.id, {
        visibility: 'group',
        user_group_id: parseInt(selectedGroupId)
      });

      toast({
        title: 'Document added to group',
        description: `${document.filename} is now shared with ${selectedGroup.name}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error) {
      console.error('Failed to add document to group:', error);
      toast({
        title: 'Failed to add document',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupCreated = () => {
    setShowCreateGroup(false);
    fetchUserGroups();
    toast({
      title: 'Group created',
      description: 'You can now add your document to the new group',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const canAddDocument = () => {
    if (!document || !currentUser) return false;

    const isOwner = document.uploaded_by_id === currentUser.id ||
                    document.uploaded_by_username === currentUser.username;
    const isAdmin = currentUser.role === 'admin';
    const isPublic = document.visibility === 'public';

    return isOwner || (isAdmin && isPublic);
  };

  if (!document || !canAddDocument()) {
    return null;
  }

  const selectedGroup = userGroups.find(g => g.id === parseInt(selectedGroupId));

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <ModalContent bg="primary.800" border="1px" borderColor="primary.600" mx={4}>
        <ModalHeader color="white">
          <HStack spacing={3}>
            <Box p={2} bg="accent.500" rounded="lg">
              <Icon as={FiUsers} boxSize={5} />
            </Box>
            <VStack align="start" spacing={0}>
              <Text>Add to User Group</Text>
              <Text fontSize="sm" fontWeight="normal" color="gray.400">
                {document.filename}
              </Text>
            </VStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="gray.400" />

        <ModalBody>
          {loadingGroups ? (
            <Center py={8}>
              <VStack spacing={3}>
                <Spinner size="lg" color="accent.500" thickness="3px" />
                <Text color="gray.400">Loading groups...</Text>
              </VStack>
            </Center>
          ) : showCreateGroup && userGroups.length === 0 ? (
            <VStack spacing={4} align="stretch">
              <Alert
                status="info"
                variant="left-accent"
                rounded="lg"
                bg="blue.900"
                borderColor="blue.500"
              >
                <AlertIcon />
                <Box>
                  <AlertTitle color="blue.200">No groups available</AlertTitle>
                  <AlertDescription color="blue.300">
                    {document?.user_group_id
                      ? 'This document is already in a group. Create a new group to share it with additional users.'
                      : 'Create your first group to share documents with specific users'}
                  </AlertDescription>
                </Box>
              </Alert>

              <Box
                bg="primary.700"
                p={4}
                rounded="lg"
                border="1px"
                borderColor="primary.600"
              >
                <GroupCreationForm onGroupCreated={handleGroupCreated} />
              </Box>
            </VStack>
          ) : showConfirm ? (
            <VStack spacing={4} align="stretch">
              <Alert
                status="warning"
                variant="left-accent"
                rounded="lg"
                bg="yellow.900"
                borderColor="yellow.500"
              >
                <AlertIcon />
                <Box>
                  <AlertTitle color="yellow.200">Confirm Action</AlertTitle>
                  <AlertDescription color="yellow.300">
                    Are you sure you want to add this document to <Text as="span" fontWeight="bold">{selectedGroup?.name}</Text>?
                  </AlertDescription>
                </Box>
              </Alert>

              <Box
                bg="primary.700"
                p={4}
                rounded="lg"
                border="1px"
                borderColor="primary.600"
              >
                <VStack align="start" spacing={2}>
                  <HStack spacing={2}>
                    <Icon as={FiAlertCircle} color="accent.400" boxSize={4} />
                    <Text color="white" fontWeight="medium" fontSize="sm">
                      What will happen:
                    </Text>
                  </HStack>
                  <VStack align="start" spacing={1} pl={6}>
                    <Text color="gray.300" fontSize="sm">
                      • Document visibility will change to "Group"
                    </Text>
                    <Text color="gray.300" fontSize="sm">
                      • All members of {selectedGroup?.name} can view this document
                    </Text>
                    <Text color="gray.300" fontSize="sm">
                      • Other users outside the group won't be able to access it
                    </Text>
                  </VStack>
                </VStack>
              </Box>
            </VStack>
          ) : (
            <VStack spacing={4} align="stretch">
              <Text color="gray.300" fontSize="sm">
                Select a group to share this document with
              </Text>

              <RadioGroup value={selectedGroupId} onChange={setSelectedGroupId}>
                <VStack spacing={2} align="stretch">
                  {userGroups.map((group) => (
                    <Box
                      key={group.id}
                      p={3}
                      bg="primary.700"
                      rounded="lg"
                      border="2px"
                      borderColor={
                        selectedGroupId === group.id.toString()
                          ? 'accent.500'
                          : 'primary.600'
                      }
                      cursor="pointer"
                      onClick={() => setSelectedGroupId(group.id.toString())}
                      transition="all 0.2s"
                      _hover={{
                        borderColor: 'accent.500',
                        bg: 'primary.600',
                      }}
                    >
                      <HStack justify="space-between">
                        <HStack spacing={3} flex={1}>
                          <Radio value={group.id.toString()} colorScheme="purple">
                            <VStack align="start" spacing={0} ml={2}>
                              <Text color="white" fontWeight="medium">
                                {group.name}
                              </Text>
                              {group.description && (
                                <Text color="gray.400" fontSize="xs">
                                  {group.description}
                                </Text>
                              )}
                            </VStack>
                          </Radio>
                        </HStack>
                        <Text color="gray.500" fontSize="xs">
                          {group.members?.length || 0} members
                        </Text>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </RadioGroup>

              <Button
                variant="ghost"
                color="accent.400"
                size="sm"
                leftIcon={<FiPlus />}
                onClick={() => setShowCreateGroup(true)}
                _hover={{ bg: 'primary.700' }}
              >
                Create New Group
              </Button>

              {showCreateGroup && (
                <Box
                  bg="primary.700"
                  p={4}
                  rounded="lg"
                  border="1px"
                  borderColor="accent.500"
                >
                  <GroupCreationForm onGroupCreated={handleGroupCreated} />
                </Box>
              )}
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {showConfirm ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setShowConfirm(false)}
                color="gray.400"
                _hover={{ bg: 'primary.700' }}
              >
                Back
              </Button>
              <Button
                colorScheme="purple"
                onClick={handleConfirmAdd}
                isLoading={isLoading}
                ml={3}
                leftIcon={<FiUsers />}
              >
                Confirm
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={onClose}
                color="gray.400"
                _hover={{ bg: 'primary.700' }}
              >
                Cancel
              </Button>
              {userGroups.length > 0 && !showCreateGroup && (
                <Button
                  colorScheme="purple"
                  onClick={handleAddToGroup}
                  isDisabled={!selectedGroupId}
                  ml={3}
                  leftIcon={<FiUsers />}
                >
                  Add to Group
                </Button>
              )}
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddDocumentToGroupModal;
