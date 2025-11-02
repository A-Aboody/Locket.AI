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
  Tag,
  TagLabel,
  TagCloseButton,
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
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import { FiPlus, FiUsers, FiTrash2, FiLogOut, FiEdit, FiSave, FiX, FiUser, FiFile, FiCalendar } from 'react-icons/fi';
import { userGroupsAPI, usersAPI, documentsAPI, apiUtils } from '../utils/api';

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
  
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [deleteGroupId, setDeleteGroupId] = useState(null);
  
  const toast = useToast();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Fetch user groups
  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      const response = await userGroupsAPI.list();
      setUserGroups(response.data);
      
      // Fetch stats for each group
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
    }
  }, [isOpen]);

  // Search users with debounce
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

  const handleAddMember = (user) => {
    if (!createForm.members.find(m => m.id === user.id)) {
      setCreateForm(prev => ({
        ...prev,
        members: [...prev.members, user]
      }));
      setUserSearch('');
      setSearchResults([]);
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
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setCreateForm({ name: '', description: '', members: [] });
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

  const handleLeaveGroup = async (groupId) => {
    try {
      await userGroupsAPI.leaveGroup(groupId);
      toast({
        title: 'Left group successfully',
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
        title: 'Group deleted successfully',
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
        title: 'Group updated successfully',
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
        title: 'Member added successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
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

  const handleRemoveMemberFromGroup = async (groupId, userId) => {
    try {
      await userGroupsAPI.removeMember(groupId, userId);
      toast({
        title: 'Member removed successfully',
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

  const getMemberCount = (group) => {
    return group.members ? group.members.length + 1 : 1; // +1 for creator
  };

  const renderGroupStatistics = (groupId) => {
    const stats = groupStats[groupId];
    if (!stats) {
      return (
        <HStack spacing={4} mt={2}>
          <Stat size="sm">
            <StatLabel>Members</StatLabel>
            <StatNumber>--</StatNumber>
          </Stat>
          <Stat size="sm">
            <StatLabel>Documents</StatLabel>
            <StatNumber>--</StatNumber>
          </Stat>
        </HStack>
      );
    }

    return (
      <HStack spacing={4} mt={2}>
        <Stat size="sm">
          <StatLabel>Members</StatLabel>
          <StatNumber>{stats.member_count}</StatNumber>
        </Stat>
        <Stat size="sm">
          <StatLabel>Documents</StatLabel>
          <StatNumber>{stats.document_count}</StatNumber>
        </Stat>
        {stats.last_activity && (
          <Stat size="sm">
            <StatLabel>Last Activity</StatLabel>
            <StatHelpText>
              {apiUtils.formatDate(stats.last_activity)}
            </StatHelpText>
          </Stat>
        )}
      </HStack>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg="primary.800" border="1px" borderColor="primary.600" maxH="90vh">
        <ModalHeader color="white">Manage User Groups</ModalHeader>
        <ModalCloseButton color="gray.400" />
        
        <ModalBody pb={6}>
          <Tabs colorScheme="accent" variant="enclosed">
            <TabList>
              <Tab color="gray.400" _selected={{ color: 'accent.500', borderColor: 'accent.500' }}>
                Create Group
              </Tab>
              <Tab color="gray.400" _selected={{ color: 'accent.500', borderColor: 'accent.500' }}>
                My Groups ({userGroups.length})
              </Tab>
            </TabList>

            <TabPanels>
              {/* Create Group Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired>
                    <FormLabel color="gray.300">Group Name</FormLabel>
                    <Input
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter group name"
                      color="white"
                      borderColor="primary.500"
                      _hover={{ borderColor: 'accent.500' }}
                      _focus={{ borderColor: 'accent.500', boxShadow: 'none' }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.300">Description (Optional)</FormLabel>
                    <Textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter group description"
                      color="white"
                      borderColor="primary.500"
                      _hover={{ borderColor: 'accent.500' }}
                      _focus={{ borderColor: 'accent.500', boxShadow: 'none' }}
                      rows={3}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.300">Add Members</FormLabel>
                    <VStack spacing={3}>
                      <Input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search users by username or email"
                        color="white"
                        borderColor="primary.500"
                        _hover={{ borderColor: 'accent.500' }}
                        _focus={{ borderColor: 'accent.500', boxShadow: 'none' }}
                      />
                      
                      {/* Search Results */}
                      {searching && (
                        <Box w="full" textAlign="center" py={2}>
                          <Spinner size="sm" color="accent.500" />
                          <Text color="gray.400" fontSize="sm" mt={2}>Searching...</Text>
                        </Box>
                      )}
                      
                      {searchResults.length > 0 && (
                        <Box w="full" bg="primary.700" rounded="md" p={2} maxH="200px" overflowY="auto">
                          {searchResults.map(user => (
                            <Card
                              key={user.id}
                              bg="primary.600"
                              mb={2}
                              cursor="pointer"
                              onClick={() => handleAddMember(user)}
                              _hover={{ bg: 'primary.500' }}
                              size="sm"
                            >
                              <CardBody p={3}>
                                <HStack justify="space-between">
                                  <VStack align="start" spacing={0}>
                                    <Text color="white" fontSize="sm" fontWeight="medium">
                                      {user.username}
                                    </Text>
                                    <Text color="gray.400" fontSize="xs">
                                      {user.email}
                                    </Text>
                                  </VStack>
                                  <FiPlus color="#A0AEC0" />
                                </HStack>
                              </CardBody>
                            </Card>
                          ))}
                        </Box>
                      )}

                      {/* Selected Members */}
                      {createForm.members.length > 0 && (
                        <Box w="full">
                          <Text color="gray.300" fontSize="sm" mb={2}>
                            Selected Members ({createForm.members.length}):
                          </Text>
                          <SimpleGrid columns={2} spacing={2}>
                            {createForm.members.map(member => (
                              <Card key={member.id} bg="primary.700" size="sm">
                                <CardBody p={2}>
                                  <HStack justify="space-between">
                                    <VStack align="start" spacing={0}>
                                      <Text color="white" fontSize="xs" fontWeight="medium">
                                        {member.username}
                                      </Text>
                                      <Text color="gray.400" fontSize="xs">
                                        {member.email}
                                      </Text>
                                    </VStack>
                                    <IconButton
                                      icon={<FiX />}
                                      size="xs"
                                      variant="ghost"
                                      color="red.400"
                                      onClick={() => handleRemoveMember(member.id)}
                                      aria-label="Remove member"
                                    />
                                  </HStack>
                                </CardBody>
                              </Card>
                            ))}
                          </SimpleGrid>
                        </Box>
                      )}
                    </VStack>
                  </FormControl>

                  <Button
                    colorScheme="accent"
                    onClick={handleCreateGroup}
                    isLoading={loading}
                    loadingText="Creating Group..."
                    leftIcon={<FiPlus />}
                    mt={4}
                    isDisabled={!createForm.name.trim()}
                  >
                    Create Group
                  </Button>
                </VStack>
              </TabPanel>

              {/* My Groups Tab */}
              <TabPanel>
                {loading ? (
                  <Box textAlign="center" py={8}>
                    <Spinner size="xl" color="accent.500" />
                    <Text mt={4} color="gray.400">Loading groups...</Text>
                  </Box>
                ) : userGroups.length === 0 ? (
                  <Box textAlign="center" py={8}>
                    <FiUsers size={48} color="#4A5568" />
                    <Text color="gray.400" mt={4} fontSize="lg">
                      You are not in any groups yet.
                    </Text>
                    <Button
                      colorScheme="accent"
                      mt={4}
                      onClick={() => setActiveTab(0)}
                      leftIcon={<FiPlus />}
                    >
                      Create Your First Group
                    </Button>
                  </Box>
                ) : (
                  <VStack spacing={4} align="stretch">
                    {userGroups.map(group => (
                      <Card
                        key={group.id}
                        bg="primary.700"
                        border="1px"
                        borderColor="primary.600"
                      >
                        <CardBody>
                          {/* Group Header */}
                          <HStack justify="space-between" mb={3}>
                            <HStack>
                              {editingGroup === group.id ? (
                                <HStack flex={1}>
                                  <VStack align="start" flex={1} spacing={2}>
                                    <Input
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      size="sm"
                                      color="white"
                                      placeholder="Group name"
                                    />
                                    <Textarea
                                      value={editDescription}
                                      onChange={(e) => setEditDescription(e.target.value)}
                                      size="sm"
                                      color="white"
                                      placeholder="Group description"
                                      rows={2}
                                    />
                                  </VStack>
                                  <IconButton
                                    icon={<FiSave />}
                                    size="sm"
                                    colorScheme="accent"
                                    onClick={() => saveEdit(group.id)}
                                    aria-label="Save changes"
                                  />
                                  <IconButton
                                    icon={<FiX />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEdit}
                                    aria-label="Cancel edit"
                                  />
                                </HStack>
                              ) : (
                                <VStack align="start" spacing={1}>
                                  <HStack>
                                    <Text color="white" fontWeight="semibold" fontSize="lg">
                                      {group.name}
                                    </Text>
                                    {isGroupOwner(group) && (
                                      <Badge colorScheme="accent" fontSize="xs">
                                        Owner
                                      </Badge>
                                    )}
                                  </HStack>
                                  {group.description && (
                                    <Text color="gray.400" fontSize="sm">
                                      {group.description}
                                    </Text>
                                  )}
                                </VStack>
                              )}
                            </HStack>
                            
                            {/* Action Buttons */}
                            {!editingGroup && (
                              <HStack>
                                {isGroupOwner(group) && (
                                  <IconButton
                                    icon={<FiEdit />}
                                    size="sm"
                                    variant="ghost"
                                    color="accent.400"
                                    onClick={() => startEditing(group)}
                                    aria-label="Edit group"
                                  />
                                )}
                                
                                {isGroupOwner(group) ? (
                                  <IconButton
                                    icon={<FiTrash2 />}
                                    size="sm"
                                    variant="ghost"
                                    color="red.400"
                                    onClick={() => {
                                      setDeleteGroupId(group.id);
                                      onDeleteOpen();
                                    }}
                                    aria-label="Delete group"
                                  />
                                ) : (
                                  <IconButton
                                    icon={<FiLogOut />}
                                    size="sm"
                                    variant="ghost"
                                    color="orange.400"
                                    onClick={() => handleLeaveGroup(group.id)}
                                    aria-label="Leave group"
                                  />
                                )}
                              </HStack>
                            )}
                          </HStack>

                          {/* Statistics */}
                          {renderGroupStatistics(group.id)}

                          {/* Members List */}
                          <Box mt={4}>
                            <Text color="gray.300" fontSize="sm" mb={2}>
                              Members ({getMemberCount(group)}):
                            </Text>
                            <SimpleGrid columns={2} spacing={2}>
                              {/* Creator */}
                              <Card bg="primary.600" size="sm">
                                <CardBody p={2}>
                                  <HStack>
                                    <FiUser color="#48BB78" size={14} />
                                    <VStack align="start" spacing={0} flex={1}>
                                      <Text color="white" fontSize="xs" fontWeight="medium">
                                        {group.creator_username || 'Creator'}
                                      </Text>
                                      <Text color="green.400" fontSize="xs">
                                        Owner
                                      </Text>
                                    </VStack>
                                  </HStack>
                                </CardBody>
                              </Card>

                              {/* Other Members */}
                              {group.members?.map(member => (
                                <Card key={member.user_id} bg="primary.600" size="sm">
                                  <CardBody p={2}>
                                    <HStack justify="space-between">
                                      <HStack>
                                        <FiUser color="#A0AEC0" size={14} />
                                        <VStack align="start" spacing={0}>
                                          <Text color="white" fontSize="xs" fontWeight="medium">
                                            {member.username}
                                          </Text>
                                          <Text color="gray.400" fontSize="xs">
                                            Member
                                          </Text>
                                        </VStack>
                                      </HStack>
                                      {isGroupOwner(group) && member.user_id !== currentUser.id && (
                                        <IconButton
                                          icon={<FiX />}
                                          size="xs"
                                          variant="ghost"
                                          color="red.400"
                                          onClick={() => handleRemoveMemberFromGroup(group.id, member.user_id)}
                                          aria-label="Remove member"
                                        />
                                      )}
                                    </HStack>
                                  </CardBody>
                                </Card>
                              ))}
                            </SimpleGrid>
                          </Box>

                          {/* Add Member Section for Group Owners */}
                          {isGroupOwner(group) && (
                            <Box mt={4}>
                              <Text color="gray.300" fontSize="sm" mb={2}>
                                Add More Members:
                              </Text>
                              <HStack>
                                <Input
                                  placeholder="Search users..."
                                  size="sm"
                                  color="white"
                                  value={userSearch}
                                  onChange={(e) => setUserSearch(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && searchResults.length > 0) {
                                      handleAddMemberToGroup(group.id, searchResults[0].id);
                                    }
                                  }}
                                />
                                {searchResults.slice(0, 3).map(user => (
                                  <Tag key={user.id} size="sm" colorScheme="accent">
                                    <TagLabel>{user.username}</TagLabel>
                                    <TagCloseButton 
                                      onClick={() => handleAddMemberToGroup(group.id, user.id)}
                                    />
                                  </Tag>
                                ))}
                              </HStack>
                            </Box>
                          )}
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <AlertDialogOverlay>
          <AlertDialogContent bg="primary.800" border="1px" borderColor="primary.600">
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
              Delete Group
            </AlertDialogHeader>

            <AlertDialogBody color="gray.300">
              Are you sure you want to delete this group? This action cannot be undone and all documents in this group will become private.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={onDeleteClose} variant="ghost" color="gray.400">
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={() => handleDeleteGroup(deleteGroupId)}
                ml={3}
              >
                Delete Group
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Modal>
  );
};

export default UserGroupsModal;