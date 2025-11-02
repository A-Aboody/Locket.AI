import { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  HStack,
  Text,
  Box,
  IconButton,
  VStack,
  Button,
  Divider,
  Card,
  CardBody,
  Avatar,
  Badge,
  Center,
  Spinner,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  InputGroup,
  InputLeftElement,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { FiUsers, FiPlus, FiArrowLeft, FiSearch, FiUserPlus, FiX, FiCheck } from 'react-icons/fi';
import { userGroupsAPI, usersAPI, apiUtils } from '../../utils/api';

const GroupSelectionModal = ({ 
  isOpen, 
  onClose, 
  userGroups, 
  loadingGroups, 
  selectedGroup,
  onGroupSelect,
  onGroupsUpdate 
}) => {
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [searchingMembers, setSearchingMembers] = useState(false);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
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
      
      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupMembers([]);
      setMemberSearch('');
      setMemberSearchResults([]);
      setShowCreateGroup(false);
      
      // Refresh groups and select the new one
      await onGroupsUpdate();
      onGroupSelect(response.data);
      onClose();
      
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAddMember = (user) => {
    if (!newGroupMembers.find(m => m.id === user.id)) {
      setNewGroupMembers(prev => [...prev, user]);
    }
  };

  const handleRemoveMember = (userId) => {
    setNewGroupMembers(prev => prev.filter(m => m.id !== userId));
  };

  const handleSearchMembers = async (query) => {
    if (!query.trim() || query.length < 2) {
      setMemberSearchResults([]);
      return;
    }
    
    try {
      setSearchingMembers(true);
      const response = await usersAPI.search(query);
      setMemberSearchResults(response.data || []);
    } catch (error) {
      console.error('Search failed:', error);
      setMemberSearchResults([]);
    } finally {
      setSearchingMembers(false);
    }
  };

  const handleMemberSearchChange = (value) => {
    setMemberSearch(value);
    const timeoutId = setTimeout(() => handleSearchMembers(value), 300);
    return () => clearTimeout(timeoutId);
  };

  const handleClose = () => {
    onClose();
    setShowCreateGroup(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupMembers([]);
    setMemberSearch('');
    setMemberSearchResults([]);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
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
                    onChange={(e) => handleMemberSearchChange(e.target.value)}
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
                              <FiUserPlus color="#A0AEC0" size={18} />
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
                        onClick={() => onGroupSelect(group)}
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
  );
};

export default GroupSelectionModal;