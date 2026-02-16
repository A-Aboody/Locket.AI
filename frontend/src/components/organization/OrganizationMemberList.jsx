import { useState, useEffect, useRef, useCallback } from 'react';
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
} from '@chakra-ui/react';
import {
  FiMoreVertical, FiUserPlus, FiUserMinus, FiShield, FiUser, FiAward,
  FiSearch, FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
} from 'react-icons/fi';
import { organizationsAPI, apiUtils } from '../../utils/api';

const OrganizationMemberList = ({ organization, currentUser, onMemberUpdate }) => {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    loadMembers();
  }, [organization?.id, page, pageSize, searchDebounce]);

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchDebounce(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const loadMembers = async () => {
    if (!organization?.id) return;

    try {
      setIsLoading(true);
      const params = { page, page_size: pageSize };
      if (searchDebounce) params.search = searchDebounce;

      const response = await organizationsAPI.listMembers(organization.id, params);
      const data = response.data;
      setMembers(data.items || []);
      setTotalCount(data.total_count || 0);
      setTotalPages(data.total_pages || 1);
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

  const isCreator = (member) => member.user_id === organization.created_by_id;
  const canManageMember = (member) => {
    return apiUtils.canPerformOrgAction('promote_member', currentUser, organization, member);
  };
  const canRemoveMember = (member) => {
    return apiUtils.canPerformOrgAction('remove_member', currentUser, organization, member);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Box>
      {/* Header with search and count */}
      <HStack justify="space-between" mb={4}>
        <Text color="white" fontSize="lg" fontWeight="600">
          Members ({totalCount})
        </Text>
        <HStack spacing={3}>
          <InputGroup size="sm" maxW="250px">
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray" />
            </InputLeftElement>
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              bg="primary.700"
              borderColor="primary.600"
              color="white"
              _placeholder={{ color: 'gray.500' }}
              _hover={{ borderColor: 'primary.500' }}
              _focus={{ borderColor: 'accent.500' }}
            />
          </InputGroup>
        </HStack>
      </HStack>

      {/* Members Table */}
      <Box
        bg="primary.800"
        borderWidth="1px"
        borderColor="primary.600"
        borderRadius="md"
        overflow="hidden"
      >
        {isLoading ? (
          <Center py={12}>
            <VStack spacing={4}>
              <Spinner size="lg" color="accent.500" />
              <Text color="gray.400">Loading members...</Text>
            </VStack>
          </Center>
        ) : members.length === 0 ? (
          <Center py={12}>
            <Text color="gray.500">
              {searchDebounce ? 'No members match your search' : 'No members found'}
            </Text>
          </Center>
        ) : (
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th color="gray.400" borderColor="primary.600" py={3}>Member</Th>
                  <Th color="gray.400" borderColor="primary.600" py={3}>Email</Th>
                  <Th color="gray.400" borderColor="primary.600" py={3}>Role</Th>
                  <Th color="gray.400" borderColor="primary.600" py={3}>Joined</Th>
                  <Th color="gray.400" borderColor="primary.600" py={3} w="60px">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {members.map((member) => (
                  <Tr
                    key={member.user_id}
                    _hover={{ bg: 'primary.700' }}
                    transition="background 0.15s"
                  >
                    {/* Member name + badges */}
                    <Td borderColor="primary.600" py={3}>
                      <HStack spacing={3}>
                        <Box
                          bg="primary.700"
                          p={1.5}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="primary.600"
                          flexShrink={0}
                        >
                          {isCreator(member) ? (
                            <FiAward color="#F6AD55" size={16} />
                          ) : member.role === 'admin' ? (
                            <FiShield color="#9F7AEA" size={16} />
                          ) : (
                            <FiUser color="#718096" size={16} />
                          )}
                        </Box>
                        <VStack align="start" spacing={0}>
                          <HStack spacing={2}>
                            <Text color="white" fontWeight="600" fontSize="sm">
                              {member.username}
                            </Text>
                            {member.user_id === currentUser.id && (
                              <Badge colorScheme="blue" fontSize="2xs">You</Badge>
                            )}
                            {isCreator(member) && (
                              <Badge colorScheme="orange" fontSize="2xs">Creator</Badge>
                            )}
                          </HStack>
                          {member.full_name && (
                            <Text color="gray.500" fontSize="xs">{member.full_name}</Text>
                          )}
                        </VStack>
                      </HStack>
                    </Td>

                    {/* Email */}
                    <Td color="gray.400" borderColor="primary.600" fontSize="sm" py={3}>
                      {member.email}
                    </Td>

                    {/* Role badge */}
                    <Td borderColor="primary.600" py={3}>
                      <Badge
                        colorScheme={apiUtils.getOrgRoleBadgeColor(member.role)}
                        fontSize="xs"
                        px={2}
                        py={0.5}
                        borderRadius="full"
                      >
                        {organizationsAPI.getRoleDisplayName(member.role)}
                      </Badge>
                    </Td>

                    {/* Joined date */}
                    <Td color="gray.400" borderColor="primary.600" fontSize="xs" py={3}>
                      {formatDate(member.joined_at)}
                    </Td>

                    {/* Actions */}
                    <Td borderColor="primary.600" py={3}>
                      {(canManageMember(member) || canRemoveMember(member)) ? (
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<FiMoreVertical />}
                            variant="ghost"
                            size="sm"
                            color="gray.400"
                            _hover={{ color: 'white', bg: 'primary.700' }}
                            isLoading={
                              actionLoading === `promote_${member.user_id}` ||
                              actionLoading === `demote_${member.user_id}` ||
                              actionLoading === `remove_${member.user_id}`
                            }
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
                      ) : (
                        <Text color="gray.600" fontSize="xs">—</Text>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <HStack
            justify="space-between"
            px={4}
            py={3}
            borderTopWidth="1px"
            borderColor="primary.600"
            bg="primary.850"
          >
            <HStack spacing={2}>
              <Text color="gray.400" fontSize="xs">
                Showing {Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)} of {totalCount}
              </Text>
              <Select
                size="xs"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                w="70px"
                bg="primary.700"
                borderColor="primary.600"
                color="white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </Select>
              <Text color="gray.500" fontSize="xs">per page</Text>
            </HStack>

            <HStack spacing={1}>
              <IconButton
                icon={<FiChevronsLeft />}
                size="xs"
                variant="ghost"
                color="gray.400"
                onClick={() => setPage(1)}
                isDisabled={page <= 1}
                aria-label="First page"
                _hover={{ color: 'white', bg: 'primary.700' }}
              />
              <IconButton
                icon={<FiChevronLeft />}
                size="xs"
                variant="ghost"
                color="gray.400"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                isDisabled={page <= 1}
                aria-label="Previous page"
                _hover={{ color: 'white', bg: 'primary.700' }}
              />
              <Text color="gray.300" fontSize="xs" px={2}>
                Page {page} of {totalPages}
              </Text>
              <IconButton
                icon={<FiChevronRight />}
                size="xs"
                variant="ghost"
                color="gray.400"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                isDisabled={page >= totalPages}
                aria-label="Next page"
                _hover={{ color: 'white', bg: 'primary.700' }}
              />
              <IconButton
                icon={<FiChevronsRight />}
                size="xs"
                variant="ghost"
                color="gray.400"
                onClick={() => setPage(totalPages)}
                isDisabled={page >= totalPages}
                aria-label="Last page"
                _hover={{ color: 'white', bg: 'primary.700' }}
              />
            </HStack>
          </HStack>
        )}
      </Box>

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
