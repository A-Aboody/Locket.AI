import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Box,
  FormControl,
  FormLabel,
  useToast,
  Badge,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Spinner,
  Textarea,
  Card,
  CardBody,
  SimpleGrid,
  Avatar,
  Divider,
  Collapse,
  useBreakpointValue,
  Wrap,
  WrapItem,
  Tooltip,
  InputGroup,
  InputLeftElement,
  Flex,
  Center,
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiUsers, 
  FiTrash2, 
  FiLogOut, 
  FiEdit, 
  FiSave, 
  FiX, 
  FiUser, 
  FiSearch,
  FiFile,
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiUserPlus,
  FiUserMinus,
  FiSettings,
} from 'react-icons/fi';
import { userGroupsAPI, usersAPI, apiUtils } from '../utils/api';

const UserGroupsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    members: []
  });
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [groupStats, setGroupStats] = useState({});
  const [memberSearchByGroup, setMemberSearchByGroup] = useState({});
  const [memberSearchResults, setMemberSearchResults] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [addingMemberTo, setAddingMemberTo] = useState(null);
  
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [deleteGroupId, setDeleteGroupId] = useState(null);
  const [deleteGroupName, setDeleteGroupName] = useState('');
  
  const toast = useToast();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isMobile = useBreakpointValue({ base: true, md: false });

  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      const response = await userGroupsAPI.list();
      setUserGroups(response.data);
      
      const statsPromises = response.data.map(group => 
        userGroupsAPI.getGroupStats(group.id).catch(() => null)
      );
      const statsResults = await Promise.all(statsPromises);
      
      const statsMap = {};
      response.data.forEach((group, index) => {
        if (statsResults[index]?.data) {
          statsMap[group.id] = statsResults[index].data;
        }
      });
      setGroupStats(statsMap);
      
    } catch (error) {
      toast({
        title: 'Failed to load user groups',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUserGroups();
      setCreateForm({ name: '', description: '', members: [] });
      setUserSearch('');
      setSearchResults([]);
      setMemberSearchByGroup({});
      setMemberSearchResults({});
      setExpandedGroups({});
      setAddingMemberTo(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!userSearch.trim() || userSearch.length < 2) {
        setSearchResults([]);
        return;
      }
      
      try {
        setSearching(true);
        const response = await usersAPI.search(userSearch);
        setSearchResults(response.data);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [userSearch]);

  useEffect(() => {
    const searchUsersForGroups = async () => {
      const searchPromises = Object.entries(memberSearchByGroup).map(async ([groupId, query]) => {
        if (!query.trim() || query.length < 2) {
          return { groupId, results: [] };
        }
        
        try {
          const response = await usersAPI.search(query);
          return { groupId, results: response.data };
        } catch (error) {
          return { groupId, results: [] };
        }
      });

      const results = await Promise.all(searchPromises);
      const resultsMap = {};
      results.forEach(({ groupId, results }) => {
        resultsMap[groupId] = results;
      });
      setMemberSearchResults(resultsMap);
    };

    const timeoutId = setTimeout(searchUsersForGroups, 300);
    return () => clearTimeout(timeoutId);
  }, [memberSearchByGroup]);

  const handleAddMember = (user) => {
    if (!createForm.members.find(m => m.id === user.id)) {
      setCreateForm(prev => ({
        ...prev,
        members: [...prev.members, user]
      }));
    }
  };

  const handleRemoveMember = (userId) => {
    setCreateForm(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== userId)
    }));
  };

  const handleCreateGroup = async () => {
    if (!createForm.name.trim()) {
      toast({
        title: 'Group name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      const groupData = apiUtils.prepareGroupData(
        createForm.name,
        createForm.description,
        createForm.members.map(m => m.id)
      );
      
      await userGroupsAPI.create(groupData);
      
      toast({
        title: 'Group created successfully',
        description: `${createForm.name} is ready to use`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setCreateForm({ name: '', description: '', members: [] });
      setUserSearch('');
      await fetchUserGroups();
      setActiveTab(1);
    } catch (error) {
      toast({
        title: 'Failed to create group',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async (groupId, groupName) => {
    try {
      await userGroupsAPI.leaveGroup(groupId);
      toast({
        title: 'Left group',
        description: `You have left ${groupName}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      await fetchUserGroups();
    } catch (error) {
      toast({
        title: 'Failed to leave group',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await userGroupsAPI.delete(groupId);
      toast({
        title: 'Group deleted',
        description: `${deleteGroupName} has been deleted`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      await fetchUserGroups();
      onDeleteClose();
    } catch (error) {
      toast({
        title: 'Failed to delete group',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const startEditing = (group) => {
    setEditingGroup(group.id);
    setEditName(group.name);
    setEditDescription(group.description || '');
  };

  const saveEdit = async (groupId) => {
    if (!editName.trim()) {
      toast({
        title: 'Group name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await userGroupsAPI.update(groupId, {
        name: editName,
        description: editDescription
      });
      toast({
        title: 'Group updated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setEditingGroup(null);
      await fetchUserGroups();
    } catch (error) {
      toast({
        title: 'Failed to update group',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const cancelEdit = () => {
    setEditingGroup(null);
    setEditName('');
    setEditDescription('');
  };

  const handleAddMemberToGroup = async (groupId, userId) => {
    try {
      await userGroupsAPI.addMember(groupId, userId);
      toast({
        title: 'Member added',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
      setMemberSearchByGroup(prev => ({
        ...prev,
        [groupId]: ''
      }));
      setMemberSearchResults(prev => ({
        ...prev,
        [groupId]: []
      }));
      setAddingMemberTo(null);
      
      await fetchUserGroups();
    } catch (error) {
      toast({
        title: 'Failed to add member',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleRemoveMemberFromGroup = async (groupId, userId, username) => {
    try {
      await userGroupsAPI.removeMember(groupId, userId);
      toast({
        title: 'Member removed',
        description: `${username} has been removed from the group`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      await fetchUserGroups();
    } catch (error) {
      toast({
        title: 'Failed to remove member',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const isGroupOwner = (group) => group.created_by_id === currentUser.id;
  const isGroupMember = (group) => {
    return group.members?.some(member => member.user_id === currentUser.id) || 
           group.created_by_id === currentUser.id;
  };

  const toggleGroupExpansion = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleMemberSearchChange = (groupId, value) => {
    setMemberSearchByGroup(prev => ({
      ...prev,
      [groupId]: value
    }));
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" />
      <ModalContent 
        bg="primary.900" 
        border="1px" 
        borderColor="primary.600" 
        maxH="85vh"
        mx={4}
      >
        <ModalHeader 
          color="white" 
          borderBottom="1px" 
          borderColor="primary.600"
          pb={4}
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
              <FiUsers size={20} color="white" />
            </Box>
            <Text fontSize="xl">User Groups</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="gray.400" _hover={{ color: 'white', bg: 'primary.700' }} />
        
        <ModalBody p={0}>
          <Tabs 
            colorScheme="accent" 
            variant="soft-rounded"
            index={activeTab} 
            onChange={setActiveTab}
          >
            <Box px={6} pt={4} pb={2} bg="primary.800">
              <TabList bg="primary.700" p={1} rounded="lg">
                <Tab 
                  color="gray.400" 
                  _selected={{ color: 'white', bg: 'accent.500' }}
                  fontWeight="medium"
                  flex={1}
                >
                  <HStack spacing={2}>
                    <FiPlus size={16} />
                    <Text>Create Group</Text>
                  </HStack>
                </Tab>
                <Tab 
                  color="gray.400" 
                  _selected={{ color: 'white', bg: 'accent.500' }}
                  fontWeight="medium"
                  flex={1}
                >
                  <HStack spacing={2}>
                    <FiUsers size={16} />
                    <Text>My Groups</Text>
                    <Badge 
                      colorScheme="accent" 
                      fontSize="xs" 
                      px={2} 
                      rounded="full"
                    >
                      {userGroups.length}
                    </Badge>
                  </HStack>
                </Tab>
              </TabList>
            </Box>

            <TabPanels>
              {/* Create Group Tab */}
              <TabPanel p={6}>
                <VStack spacing={5} align="stretch">
                  <FormControl isRequired>
                    <FormLabel color="gray.300" fontWeight="medium" mb={2}>
                      Group Name
                    </FormLabel>
                    <Input
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter group name"
                      color="white"
                      bg="primary.800"
                      border="2px"
                      borderColor="primary.600"
                      _hover={{ borderColor: 'primary.500' }}
                      _focus={{ borderColor: 'accent.500', boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)' }}
                      size="lg"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.300" fontWeight="medium" mb={2}>
                      Description
                      <Text as="span" color="gray.500" fontWeight="normal" ml={2}>
                        (Optional)
                      </Text>
                    </FormLabel>
                    <Textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="What's this group for?"
                      color="white"
                      bg="primary.800"
                      border="2px"
                      borderColor="primary.600"
                      _hover={{ borderColor: 'primary.500' }}
                      _focus={{ borderColor: 'accent.500', boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)' }}
                      rows={3}
                      resize="none"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.300" fontWeight="medium" mb={2}>
                      Add Members
                    </FormLabel>
                    <InputGroup size="lg">
                      <InputLeftElement pointerEvents="none">
                        <FiSearch color="#718096" />
                      </InputLeftElement>
                      <Input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
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
                    
                    {searching && (
                      <Center py={4}>
                        <Spinner size="sm" color="accent.500" />
                      </Center>
                    )}
                    
                    {searchResults.length > 0 && (
                      <VStack 
                        mt={3} 
                        spacing={2} 
                        align="stretch" 
                        maxH="200px" 
                        overflowY="auto"
                        bg="primary.800"
                        rounded="lg"
                        p={2}
                      >
                        {searchResults.map(user => {
                          const alreadyAdded = createForm.members.find(m => m.id === user.id);
                          return (
                            <Box
                              key={user.id}
                              p={3}
                              bg={alreadyAdded ? 'primary.600' : 'primary.700'}
                              rounded="md"
                              cursor={alreadyAdded ? 'default' : 'pointer'}
                              onClick={() => !alreadyAdded && handleAddMember(user)}
                              _hover={!alreadyAdded ? { bg: 'primary.600', transform: 'translateX(4px)' } : {}}
                              transition="all 0.2s"
                              border="1px"
                              borderColor={alreadyAdded ? 'accent.500' : 'transparent'}
                            >
                              <HStack justify="space-between">
                                <HStack spacing={3}>
                                  <Avatar 
                                    name={user.username} 
                                    size="sm" 
                                    bg="accent.500"
                                    color="white"
                                  />
                                  <VStack align="start" spacing={0}>
                                    <Text color="white" fontSize="sm" fontWeight="medium">
                                      {user.username}
                                    </Text>
                                    <Text color="gray.400" fontSize="xs">
                                      {user.email}
                                    </Text>
                                  </VStack>
                                </HStack>
                                {alreadyAdded ? (
                                  <Box p={1} bg="accent.500" rounded="full">
                                    <FiCheck color="white" size={12} />
                                  </Box>
                                ) : (
                                  <FiUserPlus color="#A0AEC0" size={18} />
                                )}
                              </HStack>
                            </Box>
                          );
                        })}
                      </VStack>
                    )}

                    {createForm.members.length > 0 && (
                      <Box mt={4}>
                        <Text color="gray.400" fontSize="sm" mb={3}>
                          Selected Members ({createForm.members.length})
                        </Text>
                        <Wrap spacing={2}>
                          {createForm.members.map(member => (
                            <WrapItem key={member.id}>
                              <HStack
                                bg="primary.700"
                                px={3}
                                py={2}
                                rounded="full"
                                spacing={2}
                                border="1px"
                                borderColor="primary.600"
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
                                  _hover={{ color: 'red.400', bg: 'primary.600' }}
                                  onClick={() => handleRemoveMember(member.id)}
                                  aria-label="Remove member"
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
                    isLoading={loading}
                    loadingText="Creating..."
                    leftIcon={<FiPlus />}
                    size="lg"
                    mt={2}
                    isDisabled={!createForm.name.trim()}
                    _disabled={{
                      bg: 'primary.700',
                      color: 'gray.500',
                      cursor: 'not-allowed',
                    }}
                  >
                    Create Group
                  </Button>
                </VStack>
              </TabPanel>

              {/* My Groups Tab */}
              <TabPanel p={0}>
                {loading ? (
                  <Center py={20}>
                    <VStack spacing={4}>
                      <Spinner size="xl" color="accent.500" thickness="3px" />
                      <Text color="gray.400">Loading your groups...</Text>
                    </VStack>
                  </Center>
                ) : userGroups.length === 0 ? (
                  <Center py={20} px={6}>
                    <VStack spacing={4}>
                      <Box 
                        p={6} 
                        bg="primary.800" 
                        rounded="full"
                        border="2px dashed"
                        borderColor="primary.600"
                      >
                        <FiUsers size={48} color="#4A5568" />
                      </Box>
                      <Text color="white" fontSize="lg" fontWeight="medium">
                        No Groups Yet
                      </Text>
                      <Text color="gray.400" textAlign="center" maxW="300px">
                        Create your first group to start collaborating and sharing documents
                      </Text>
                      <Button
                        colorScheme="accent"
                        mt={2}
                        onClick={() => setActiveTab(0)}
                        leftIcon={<FiPlus />}
                        size="lg"
                      >
                        Create Your First Group
                      </Button>
                    </VStack>
                  </Center>
                ) : (
                  <VStack spacing={0} align="stretch">
                    {userGroups.map((group, index) => {
                      const isExpanded = expandedGroups[group.id];
                      const stats = groupStats[group.id];
                      const isOwner = isGroupOwner(group);
                      const isMember = isGroupMember(group);
                      
                      return (
                        <Box 
                          key={group.id}
                          borderBottom="1px"
                          borderColor="primary.600"
                          bg={isExpanded ? 'primary.800' : 'transparent'}
                          transition="all 0.2s"
                        >
                          {/* Group Header */}
                          <Box
                            p={5}
                            cursor="pointer"
                            onClick={() => toggleGroupExpansion(group.id)}
                            _hover={{ bg: 'primary.800' }}
                            transition="all 0.2s"
                          >
                            {editingGroup === group.id ? (
                              <VStack 
                                spacing={3} 
                                align="stretch"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <HStack>
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Group name"
                                    color="white"
                                    bg="primary.700"
                                    size="md"
                                    autoFocus
                                  />
                                  <IconButton
                                    icon={<FiSave />}
                                    colorScheme="accent"
                                    onClick={() => saveEdit(group.id)}
                                    aria-label="Save"
                                  />
                                  <IconButton
                                    icon={<FiX />}
                                    variant="ghost"
                                    onClick={cancelEdit}
                                    aria-label="Cancel"
                                  />
                                </HStack>
                                <Textarea
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  placeholder="Description"
                                  color="white"
                                  bg="primary.700"
                                  size="sm"
                                  rows={2}
                                />
                              </VStack>
                            ) : (
                              <HStack justify="space-between">
                                <HStack spacing={4} flex={1}>
                                  <Box 
                                    p={3} 
                                    bg="accent.500" 
                                    rounded="lg"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                  >
                                    <FiUsers size={20} color="white" />
                                  </Box>
                                  <VStack align="start" spacing={1} flex={1}>
                                    <HStack>
                                      <Text color="white" fontWeight="semibold" fontSize="lg">
                                        {group.name}
                                      </Text>
                                      {isOwner && (
                                        <Badge colorScheme="accent" fontSize="xs">
                                          Owner
                                        </Badge>
                                      )}
                                    </HStack>
                                    {group.description && (
                                      <Text color="gray.400" fontSize="sm" noOfLines={1}>
                                        {group.description}
                                      </Text>
                                    )}
                                    <HStack spacing={4} fontSize="xs" color="gray.500">
                                      <HStack spacing={1}>
                                        <FiUser size={12} />
                                        <Text>{stats?.member_count || group.members?.length || 0} members</Text>
                                      </HStack>
                                      <HStack spacing={1}>
                                        <FiFile size={12} />
                                        <Text>{stats?.document_count || 0} documents</Text>
                                      </HStack>
                                    </HStack>
                                  </VStack>
                                </HStack>
                                
                                <HStack spacing={2} onClick={(e) => e.stopPropagation()}>
                                  {isOwner && (
                                    <>
                                      <Tooltip label="Edit group">
                                        <IconButton
                                          icon={<FiEdit />}
                                          size="sm"
                                          variant="ghost"
                                          color="gray.400"
                                          _hover={{ color: 'accent.400', bg: 'primary.700' }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditing(group);
                                          }}
                                          aria-label="Edit group"
                                        />
                                      </Tooltip>
                                      <Tooltip label="Delete group">
                                        <IconButton
                                          icon={<FiTrash2 />}
                                          size="sm"
                                          variant="ghost"
                                          color="gray.400"
                                          _hover={{ color: 'red.400', bg: 'primary.700' }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteGroupId(group.id);
                                            setDeleteGroupName(group.name);
                                            onDeleteOpen();
                                          }}
                                          aria-label="Delete group"
                                        />
                                      </Tooltip>
                                    </>
                                  )}
                                  {!isOwner && (
                                    <Tooltip label="Leave group">
                                      <IconButton
                                        icon={<FiLogOut />}
                                        size="sm"
                                        variant="ghost"
                                        color="gray.400"
                                        _hover={{ color: 'orange.400', bg: 'primary.700' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleLeaveGroup(group.id, group.name);
                                        }}
                                        aria-label="Leave group"
                                      />
                                    </Tooltip>
                                  )}
                                  <IconButton
                                    icon={isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                    size="sm"
                                    variant="ghost"
                                    color="gray.400"
                                    aria-label={isExpanded ? "Collapse" : "Expand"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGroupExpansion(group.id);
                                    }}
                                  />
                                </HStack>
                              </HStack>
                            )}
                          </Box>

                          {/* Expanded Content */}
                          <Collapse in={isExpanded} animateOpacity>
                            <Box px={5} pb={5}>
                              <Divider borderColor="primary.600" mb={4} />
                              
                              {/* Members Section */}
                              <Box mb={4}>
                                <Text color="gray.300" fontSize="sm" fontWeight="medium" mb={3}>
                                  Members
                                </Text>
                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                                  {group.members?.map(member => (
                                    <Box
                                      key={member.user_id}
                                      p={3}
                                      bg="primary.700"
                                      rounded="md"
                                      border="1px"
                                      borderColor="primary.600"
                                    >
                                      <HStack justify="space-between">
                                        <HStack spacing={3}>
                                          <Avatar 
                                            name={member.username} 
                                            size="sm" 
                                            bg={member.user_id === group.created_by_id ? "green.500" : "accent.500"}
                                          />
                                          <VStack align="start" spacing={0}>
                                            <Text color="white" fontSize="sm" fontWeight="medium">
                                              {member.username}
                                            </Text>
                                            <Text 
                                              color={member.user_id === group.created_by_id ? "green.400" : "gray.400"} 
                                              fontSize="xs"
                                            >
                                              {member.user_id === group.created_by_id ? 'Owner' : 'Member'}
                                            </Text>
                                          </VStack>
                                        </HStack>
                                        {isOwner && member.user_id !== currentUser.id && (
                                          <Tooltip label="Remove member">
                                            <IconButton
                                              icon={<FiUserMinus />}
                                              size="xs"
                                              variant="ghost"
                                              color="gray.400"
                                              _hover={{ color: 'red.400', bg: 'primary.600' }}
                                              onClick={() => handleRemoveMemberFromGroup(group.id, member.user_id, member.username)}
                                              aria-label="Remove member"
                                            />
                                          </Tooltip>
                                        )}
                                      </HStack>
                                    </Box>
                                  ))}
                                </SimpleGrid>
                              </Box>

                              {/* Add Member Section */}
                              {isMember && (
                                <Box>
                                  {addingMemberTo === group.id ? (
                                    <VStack spacing={3} align="stretch">
                                      <InputGroup>
                                        <InputLeftElement pointerEvents="none">
                                          <FiSearch color="#718096" />
                                        </InputLeftElement>
                                        <Input
                                          placeholder="Search users to add..."
                                          size="md"
                                          color="white"
                                          bg="primary.700"
                                          value={memberSearchByGroup[group.id] || ''}
                                          onChange={(e) => handleMemberSearchChange(group.id, e.target.value)}
                                          autoFocus
                                        />
                                        <IconButton
                                          icon={<FiX />}
                                          size="sm"
                                          variant="ghost"
                                          color="gray.400"
                                          onClick={() => {
                                            setAddingMemberTo(null);
                                            setMemberSearchByGroup(prev => ({ ...prev, [group.id]: '' }));
                                            setMemberSearchResults(prev => ({ ...prev, [group.id]: [] }));
                                          }}
                                          aria-label="Cancel"
                                          ml={2}
                                        />
                                      </InputGroup>
                                      
                                      {memberSearchResults[group.id]?.length > 0 && (
                                        <VStack 
                                          spacing={2} 
                                          align="stretch" 
                                          maxH="150px" 
                                          overflowY="auto"
                                          bg="primary.700"
                                          rounded="md"
                                          p={2}
                                        >
                                          {memberSearchResults[group.id].map(user => (
                                            <Box
                                              key={user.id}
                                              p={2}
                                              bg="primary.600"
                                              rounded="md"
                                              cursor="pointer"
                                              onClick={() => handleAddMemberToGroup(group.id, user.id)}
                                              _hover={{ bg: 'primary.500' }}
                                              transition="all 0.2s"
                                            >
                                              <HStack justify="space-between">
                                                <HStack spacing={2}>
                                                  <Avatar 
                                                    name={user.username} 
                                                    size="xs" 
                                                    bg="accent.500"
                                                  />
                                                  <VStack align="start" spacing={0}>
                                                    <Text color="white" fontSize="xs" fontWeight="medium">
                                                      {user.username}
                                                    </Text>
                                                    <Text color="gray.400" fontSize="xs">
                                                      {user.email}
                                                    </Text>
                                                  </VStack>
                                                </HStack>
                                                <FiUserPlus color="#A0AEC0" size={14} />
                                              </HStack>
                                            </Box>
                                          ))}
                                        </VStack>
                                      )}
                                    </VStack>
                                  ) : (
                                    <Button
                                      leftIcon={<FiUserPlus />}
                                      size="sm"
                                      variant="outline"
                                      colorScheme="accent"
                                      w="full"
                                      onClick={() => setAddingMemberTo(group.id)}
                                    >
                                      Add Member
                                    </Button>
                                  )}
                                </Box>
                              )}
                            </Box>
                          </Collapse>
                        </Box>
                      );
                    })}
                  </VStack>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        isOpen={isDeleteOpen} 
        onClose={onDeleteClose}
        isCentered
      >
        <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <AlertDialogContent bg="primary.800" border="1px" borderColor="red.500" mx={4}>
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
            <HStack spacing={3}>
              <Box p={2} bg="red.500" rounded="lg">
                <FiTrash2 size={20} color="white" />
              </Box>
              <Text>Delete Group</Text>
            </HStack>
          </AlertDialogHeader>

          <AlertDialogBody color="gray.300">
            <VStack align="start" spacing={3}>
              <Text>
                Are you sure you want to delete <Text as="span" fontWeight="bold" color="white">{deleteGroupName}</Text>?
              </Text>
              <Box 
                p={3} 
                bg="red.900" 
                border="1px" 
                borderColor="red.700" 
                rounded="md"
                w="full"
              >
                <Text fontSize="sm" color="red.200">
                  This action cannot be undone. All documents in this group will become private.
                </Text>
              </Box>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button 
              onClick={onDeleteClose} 
              variant="ghost" 
              color="gray.400"
              _hover={{ bg: 'primary.700' }}
            >
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() => handleDeleteGroup(deleteGroupId)}
              ml={3}
              leftIcon={<FiTrash2 />}
            >
              Delete Group
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Modal>
  );
};

export default UserGroupsModal;