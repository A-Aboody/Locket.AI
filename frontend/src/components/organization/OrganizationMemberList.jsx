import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
  Center,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { FiMoreVertical, FiUserPlus, FiUserMinus, FiShield, FiUser, FiAward } from 'react-icons/fi';
import { organizationsAPI, apiUtils } from '../../utils/api';
import { useRef } from 'react';

const OrganizationMemberList = ({ organization, currentUser, onMemberUpdate }) => {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();

  useEffect(() => {
    loadMembers();
  }, [organization?.id]);

  const loadMembers = async () => {
    if (!organization?.id) return;

    try {
      const response = await organizationsAPI.listMembers(organization.id);
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organization members',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromote = async (member) => {
    setActionLoading(`promote_${member.user_id}`);
    try {
      await organizationsAPI.updateMemberRole(organization.id, member.user_id, 'admin');

      toast({
        title: 'Member promoted',
        description: `${member.username} is now an administrator`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      await loadMembers();
      if (onMemberUpdate) onMemberUpdate();
    } catch (error) {
      const errorMsg = apiUtils.handleError(error, 'Failed to promote member');
      toast({
        title: 'Error',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemote = async (member) => {
    setActionLoading(`demote_${member.user_id}`);
    try {
      await organizationsAPI.updateMemberRole(organization.id, member.user_id, 'member');

      toast({
        title: 'Member demoted',
        description: `${member.username} is now a regular member`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      await loadMembers();
      if (onMemberUpdate) onMemberUpdate();
    } catch (error) {
      const errorMsg = apiUtils.handleError(error, 'Failed to demote member');
      toast({
        title: 'Error',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveClick = (member) => {
    setSelectedMember(member);
    onOpen();
  };

  const handleRemoveConfirm = async () => {
    if (!selectedMember) return;

    setActionLoading(`remove_${selectedMember.user_id}`);
    try {
      await organizationsAPI.removeMember(organization.id, selectedMember.user_id);

      toast({
        title: 'Member removed',
        description: `${selectedMember.username} has been removed from the organization`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      await loadMembers();
      if (onMemberUpdate) onMemberUpdate();
      onClose();
    } catch (error) {
      const errorMsg = apiUtils.handleError(error, 'Failed to remove member');
      toast({
        title: 'Error',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setActionLoading(null);
      setSelectedMember(null);
    }
  };

  if (isLoading) {
    return (
      <Center py={12}>
        <VStack spacing={4}>
          <Spinner size="lg" color="accent.500" />
          <Text color="gray.400">Loading members...</Text>
        </VStack>
      </Center>
    );
  }

  const isCreator = (member) => member.user_id === organization.created_by_id;
  const canManageMember = (member) => {
    return apiUtils.canPerformOrgAction('promote_member', currentUser, organization, member);
  };
  const canRemoveMember = (member) => {
    return apiUtils.canPerformOrgAction('remove_member', currentUser, organization, member);
  };

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Text color="white" fontSize="lg" fontWeight="600">
          Members ({members.length})
        </Text>
      </HStack>

      <VStack spacing={3} align="stretch">
        {members.map((member) => (
          <Box
            key={member.user_id}
            bg="primary.800"
            borderWidth="1px"
            borderColor="primary.600"
            borderRadius="md"
            p={4}
            _hover={{
              borderColor: 'primary.500',
            }}
            transition="all 0.2s"
          >
            <HStack justify="space-between">
              <HStack spacing={4} flex={1}>
                {/* Member Icon and Info */}
                <Box
                  bg="primary.700"
                  p={2}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="primary.600"
                >
                  {isCreator(member) ? (
                    <FiAward color="#F6AD55" size={20} />
                  ) : member.role === 'admin' ? (
                    <FiShield color="#9F7AEA" size={20} />
                  ) : (
                    <FiUser color="#718096" size={20} />
                  )}
                </Box>

                <VStack align="start" spacing={1} flex={1}>
                  <HStack spacing={2}>
                    <Text color="white" fontWeight="600" fontSize="sm">
                      {member.username}
                    </Text>
                    {member.user_id === currentUser.id && (
                      <Badge colorScheme="blue" fontSize="xs">
                        You
                      </Badge>
                    )}
                    {isCreator(member) && (
                      <Badge colorScheme="orange" fontSize="xs">
                        Creator
                      </Badge>
                    )}
                  </HStack>
                  <Text color="gray.400" fontSize="xs">
                    {member.email}
                  </Text>
                </VStack>

                <Badge
                  colorScheme={apiUtils.getOrgRoleBadgeColor(member.role)}
                  fontSize="xs"
                  px={3}
                  py={1}
                  borderRadius="full"
                >
                  {organizationsAPI.getRoleDisplayName(member.role)}
                </Badge>
              </HStack>

              {/* Actions Menu */}
              {(canManageMember(member) || canRemoveMember(member)) && (
                <Menu>
                  <MenuButton
                    as={IconButton}
                    icon={<FiMoreVertical />}
                    variant="ghost"
                    size="sm"
                    color="gray.400"
                    _hover={{ color: 'white', bg: 'primary.700' }}
                    isLoading={actionLoading === `promote_${member.user_id}` ||
                              actionLoading === `demote_${member.user_id}` ||
                              actionLoading === `remove_${member.user_id}`}
                  />
                  <MenuList bg="primary.700" borderColor="primary.600">
                    {canManageMember(member) && member.role === 'member' && (
                      <MenuItem
                        icon={<FiUserPlus />}
                        onClick={() => handlePromote(member)}
                        bg="primary.700"
                        _hover={{ bg: 'primary.600' }}
                        color="white"
                      >
                        Promote to Admin
                      </MenuItem>
                    )}
                    {canManageMember(member) && member.role === 'admin' && !isCreator(member) && (
                      <MenuItem
                        icon={<FiUserMinus />}
                        onClick={() => handleDemote(member)}
                        bg="primary.700"
                        _hover={{ bg: 'primary.600' }}
                        color="white"
                      >
                        Demote to Member
                      </MenuItem>
                    )}
                    {canRemoveMember(member) && (
                      <MenuItem
                        icon={<FiUserMinus />}
                        onClick={() => handleRemoveClick(member)}
                        bg="primary.700"
                        _hover={{ bg: 'red.600' }}
                        color="red.300"
                      >
                        {member.user_id === currentUser.id ? 'Leave Organization' : 'Remove Member'}
                      </MenuItem>
                    )}
                  </MenuList>
                </Menu>
              )}
            </HStack>
          </Box>
        ))}
      </VStack>

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="primary.800" borderColor="primary.600">
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
              {selectedMember?.user_id === currentUser.id
                ? 'Leave Organization'
                : 'Remove Member'}
            </AlertDialogHeader>

            <AlertDialogBody color="gray.300">
              {selectedMember?.user_id === currentUser.id ? (
                <>
                  Are you sure you want to leave <strong>{organization.name}</strong>? You will lose
                  access to all shared documents and groups.
                </>
              ) : (
                <>
                  Are you sure you want to remove <strong>{selectedMember?.username}</strong> from{' '}
                  <strong>{organization.name}</strong>?
                </>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} variant="ghost">
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleRemoveConfirm}
                ml={3}
                isLoading={actionLoading === `remove_${selectedMember?.user_id}`}
              >
                {selectedMember?.user_id === currentUser.id ? 'Leave' : 'Remove'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default OrganizationMemberList;
