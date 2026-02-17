import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Text,
  HStack,
  VStack,
  Box,
  Icon,
  useToast,
} from '@chakra-ui/react';
import { FiFolder, FiLock, FiGlobe, FiUsers } from 'react-icons/fi';
import { foldersAPI, userGroupsAPI } from '../utils/api';

const CreateFolderModal = ({
  isOpen,
  onClose,
  parentId = null,
  onSuccess,
  inheritedScope = null,
  inheritedGroupId = null,
  currentMode = 'personal',
}) => {
  const [folderName, setFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [scope, setScope] = useState('private');
  const [groupId, setGroupId] = useState(null);
  const [groups, setGroups] = useState([]);
  const toast = useToast();

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isOrgMode = currentMode === 'organization';
  // Lock scope when inside a parent folder OR when creating from a group context
  const scopeLocked = (parentId != null && inheritedScope != null) || (inheritedGroupId != null && inheritedScope != null);

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      if (scopeLocked) {
        setScope(inheritedScope);
        setGroupId(inheritedGroupId);
      } else {
        setScope(isOrgMode ? 'private' : 'private');
        setGroupId(null);
      }
    }
  }, [isOpen, inheritedScope, inheritedGroupId, scopeLocked, isOrgMode]);

  useEffect(() => {
    if (isOpen && isOrgMode && !scopeLocked) {
      fetchGroups();
    }
  }, [isOpen, isOrgMode, scopeLocked]);

  const fetchGroups = async () => {
    try {
      const response = await userGroupsAPI.list();
      setGroups(response.data?.groups || response.data || []);
    } catch {
      setGroups([]);
    }
  };

  const handleCreate = async () => {
    if (!folderName.trim()) return;

    setIsCreating(true);
    try {
      const data = {
        name: folderName.trim(),
        parent_id: parentId,
        scope,
      };
      if (scope === 'organization' && groupId) {
        data.group_id = groupId;
      }
      await foldersAPI.create(data);
      toast({
        title: 'Folder created',
        description: `"${folderName.trim()}" has been created`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setFolderName('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: 'Failed to create folder',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && folderName.trim()) {
      handleCreate();
    }
  };

  const scopeOptions = [
    { value: 'private', label: 'Private', icon: FiLock, color: 'gray.400', description: 'Only visible to you' },
    { value: 'organization', label: 'Organization', icon: FiGlobe, color: 'blue.400', description: 'Visible to all org members' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <ModalContent bg="primary.800" border="1px" borderColor="primary.600" mx={4}>
        <ModalHeader color="white">
          <HStack spacing={3}>
            <Box p={2} bg="accent.500" rounded="lg">
              <FiFolder size={20} color="white" />
            </Box>
            <Text>New Folder</Text>
          </HStack>
        </ModalHeader>

        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Input
              placeholder="Folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              bg="primary.700"
              border="1px"
              borderColor="primary.600"
              color="white"
              _placeholder={{ color: 'gray.500' }}
              _focus={{ borderColor: 'accent.500' }}
              autoFocus
            />

            {/* Scope selector - only in org mode and when not inherited from parent */}
            {isOrgMode && !scopeLocked && currentUser.organization_id && (
              <VStack spacing={2} align="stretch">
                <Text fontSize="xs" color="gray.500" fontWeight="500" textTransform="uppercase" letterSpacing="0.05em">
                  Folder Scope
                </Text>
                <HStack spacing={2}>
                  {scopeOptions.map((opt) => (
                    <Box
                      key={opt.value}
                      flex={1}
                      p={3}
                      bg={scope === opt.value ? 'primary.700' : 'primary.800'}
                      border="1px"
                      borderColor={scope === opt.value ? 'accent.500' : 'primary.600'}
                      borderRadius="md"
                      cursor="pointer"
                      onClick={() => {
                        setScope(opt.value);
                        if (opt.value === 'private') setGroupId(null);
                      }}
                      _hover={{ borderColor: scope === opt.value ? 'accent.500' : 'primary.500' }}
                      transition="all 0.15s"
                    >
                      <HStack spacing={2} mb={1}>
                        <Icon as={opt.icon} boxSize={3.5} color={scope === opt.value ? opt.color : 'gray.600'} />
                        <Text fontSize="sm" color={scope === opt.value ? 'white' : 'gray.500'} fontWeight="500">
                          {opt.label}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.600">
                        {opt.description}
                      </Text>
                    </Box>
                  ))}
                </HStack>

                {/* Group restriction (optional, only for org scope) */}
                {scope === 'organization' && groups.length > 0 && (
                  <VStack spacing={2} align="stretch" mt={1}>
                    <Text fontSize="xs" color="gray.500" fontWeight="500">
                      Restrict to group (optional)
                    </Text>
                    <HStack spacing={2} flexWrap="wrap">
                      <Box
                        px={3}
                        py={1.5}
                        bg={!groupId ? 'primary.700' : 'transparent'}
                        border="1px"
                        borderColor={!groupId ? 'accent.500' : 'primary.600'}
                        borderRadius="md"
                        cursor="pointer"
                        onClick={() => setGroupId(null)}
                        _hover={{ borderColor: !groupId ? 'accent.500' : 'primary.500' }}
                        transition="all 0.15s"
                      >
                        <Text fontSize="xs" color={!groupId ? 'white' : 'gray.500'}>All members</Text>
                      </Box>
                      {groups.map((g) => (
                        <Box
                          key={g.id}
                          px={3}
                          py={1.5}
                          bg={groupId === g.id ? 'primary.700' : 'transparent'}
                          border="1px"
                          borderColor={groupId === g.id ? 'purple.500' : 'primary.600'}
                          borderRadius="md"
                          cursor="pointer"
                          onClick={() => setGroupId(g.id)}
                          _hover={{ borderColor: groupId === g.id ? 'purple.500' : 'primary.500' }}
                          transition="all 0.15s"
                        >
                          <HStack spacing={1.5}>
                            <Icon as={FiUsers} boxSize={3} color={groupId === g.id ? 'purple.400' : 'gray.600'} />
                            <Text fontSize="xs" color={groupId === g.id ? 'white' : 'gray.500'}>{g.name}</Text>
                          </HStack>
                        </Box>
                      ))}
                    </HStack>
                  </VStack>
                )}
              </VStack>
            )}

            {/* Info when scope is inherited */}
            {scopeLocked && inheritedScope === 'organization' && (
              <HStack spacing={2} p={2} bg="primary.700" rounded="md">
                <Icon as={inheritedGroupId ? FiUsers : FiGlobe} boxSize={3.5} color={inheritedGroupId ? 'purple.400' : 'blue.400'} />
                <Text fontSize="xs" color="gray.400">
                  {parentId ? 'Inherits scope from parent folder' : 'This folder will be shared with the group'}
                </Text>
              </HStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            onClick={onClose}
            variant="ghost"
            color="gray.400"
            _hover={{ bg: 'primary.700' }}
            mr={3}
          >
            Cancel
          </Button>
          <Button
            colorScheme="accent"
            bg="accent.500"
            onClick={handleCreate}
            isLoading={isCreating}
            isDisabled={!folderName.trim()}
          >
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreateFolderModal;
