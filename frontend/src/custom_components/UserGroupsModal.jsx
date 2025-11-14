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
  HStack,
  Box,
  Text,
  Badge,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import { FiPlus, FiUsers } from 'react-icons/fi';
import GroupCreationForm from './user_groups/GroupCreationForm';
import GroupsList from './user_groups/GroupsList';
import DeleteGroupDialog from './user_groups/DeleteGroupDialog';
import { userGroupsAPI, apiUtils } from '../utils/api';

const UserGroupsModal = ({ isOpen, onClose, onViewDocument }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupStats, setGroupStats] = useState({});
  const [deleteGroupId, setDeleteGroupId] = useState(null);
  const [deleteGroupName, setDeleteGroupName] = useState('');
  
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

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
    }
  }, [isOpen]);

  const handleGroupCreated = () => {
    fetchUserGroups();
    setActiveTab(1); // Switch to My Groups tab
  };

  const handleEditGroup = async (groupId, name, description) => {
    if (!name.trim()) {
      toast({
        title: 'Group name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await userGroupsAPI.update(groupId, { name, description });
      toast({
        title: 'Group updated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
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

  const handleDeleteGroup = async () => {
    try {
      await userGroupsAPI.delete(deleteGroupId);
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

  const handleAddMember = async (groupId, userId) => {
    try {
      await userGroupsAPI.addMember(groupId, userId);
      toast({
        title: 'Member added',
        status: 'success',
        duration: 2000,
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

  const handleRemoveMember = async (groupId, userId, username) => {
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

  const openDeleteDialog = (groupId, groupName) => {
    setDeleteGroupId(groupId);
    setDeleteGroupName(groupName);
    onDeleteOpen();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <ModalContent
          bg="primary.900"
          border="1px"
          borderColor="primary.600"
          maxH="88vh"
          mx={4}
        >
          <ModalHeader
            color="white"
            borderBottom="1px"
            borderColor="primary.600"
            py={5}
            px={8}
          >
            <HStack spacing={3} align="center">
              <Text fontSize="xl" fontWeight="600" letterSpacing="-0.01em">
                User Groups
              </Text>
              {userGroups.length > 0 && (
                <Badge
                  bg="primary.700"
                  color="gray.400"
                  fontSize="xs"
                  px={2}
                  py={0.5}
                  rounded="md"
                  fontWeight="500"
                >
                  {userGroups.length}
                </Badge>
              )}
            </HStack>
          </ModalHeader>
          <ModalCloseButton
            color="gray.400"
            _hover={{ color: 'white', bg: 'primary.700' }}
            top={5}
            right={6}
          />

          <ModalBody p={0}>
            <Tabs
              colorScheme="accent"
              variant="unstyled"
              index={activeTab}
              onChange={setActiveTab}
            >
              <Box px={8} pt={4} pb={0} borderBottom="1px" borderColor="primary.600">
                <TabList gap={1}>
                  <Tab
                    color="gray.400"
                    _selected={{
                      color: 'white',
                      borderBottom: '2px solid',
                      borderColor: 'accent.500',
                    }}
                    fontWeight="500"
                    fontSize="sm"
                    px={4}
                    pb={3}
                    pt={0}
                    transition="all 0.15s"
                    _hover={{
                      color: 'gray.300',
                    }}
                  >
                    <HStack spacing={2}>
                      <FiPlus size={14} />
                      <Text>New Group</Text>
                    </HStack>
                  </Tab>
                  <Tab
                    color="gray.400"
                    _selected={{
                      color: 'white',
                      borderBottom: '2px solid',
                      borderColor: 'accent.500',
                    }}
                    fontWeight="500"
                    fontSize="sm"
                    px={4}
                    pb={3}
                    pt={0}
                    transition="all 0.15s"
                    _hover={{
                      color: 'gray.300',
                    }}
                  >
                    <HStack spacing={2}>
                      <FiUsers size={14} />
                      <Text>All Groups</Text>
                    </HStack>
                  </Tab>
                </TabList>
              </Box>

              <TabPanels>
                {/* Create Group Tab */}
                <TabPanel px={8} py={6}>
                  <GroupCreationForm onGroupCreated={handleGroupCreated} />
                </TabPanel>

                {/* My Groups Tab */}
                <TabPanel p={0}>
                  <GroupsList
                    groups={userGroups}
                    groupStats={groupStats}
                    currentUserId={currentUser.id}
                    isLoading={loading}
                    onEdit={handleEditGroup}
                    onDelete={openDeleteDialog}
                    onLeave={handleLeaveGroup}
                    onAddMember={handleAddMember}
                    onRemoveMember={handleRemoveMember}
                    onCreateFirstGroup={() => setActiveTab(0)}
                    onViewDocument={onViewDocument}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <DeleteGroupDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        groupName={deleteGroupName}
        onConfirm={handleDeleteGroup}
      />
    </>
  );
};

export default UserGroupsModal;