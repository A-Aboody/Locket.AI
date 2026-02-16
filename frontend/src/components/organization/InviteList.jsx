import { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Spinner,
  Center,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Select,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiMoreVertical, FiCopy, FiX, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight,
} from 'react-icons/fi';
import { organizationsAPI, apiUtils } from '../../utils/api';

const InviteList = ({ organization, refreshTrigger }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();

  // Separate pagination state for each tab
  const [emailState, setEmailState] = useState({
    items: [], isLoading: true, page: 1, pageSize: 10, totalCount: 0, totalPages: 1,
  });
  const [codeState, setCodeState] = useState({
    items: [], isLoading: true, page: 1, pageSize: 10, totalCount: 0, totalPages: 1,
  });

  // Refresh trigger for after revoke/resend
  const [internalRefresh, setInternalRefresh] = useState(0);

  useEffect(() => {
    loadEmailInvites();
  }, [organization?.id, refreshTrigger, internalRefresh, emailState.page, emailState.pageSize]);

  useEffect(() => {
    loadCodeInvites();
  }, [organization?.id, refreshTrigger, internalRefresh, codeState.page, codeState.pageSize]);

  const loadEmailInvites = async () => {
    if (!organization?.id) return;
    setEmailState((s) => ({ ...s, isLoading: true }));
    try {
      const response = await organizationsAPI.listInvites(organization.id, false, {
        page: emailState.page,
        page_size: emailState.pageSize,
        invite_type: 'email',
      });
      const data = response.data;
      setEmailState((s) => ({
        ...s,
        items: data.items || [],
        totalCount: data.total_count || 0,
        totalPages: data.total_pages || 1,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Load email invites error:', error);
      toast({ title: 'Error', description: 'Failed to load email invitations', status: 'error', duration: 5000, isClosable: true });
      setEmailState((s) => ({ ...s, isLoading: false }));
    }
  };

  const loadCodeInvites = async () => {
    if (!organization?.id) return;
    setCodeState((s) => ({ ...s, isLoading: true }));
    try {
      const response = await organizationsAPI.listInvites(organization.id, false, {
        page: codeState.page,
        page_size: codeState.pageSize,
        invite_type: 'code',
      });
      const data = response.data;
      setCodeState((s) => ({
        ...s,
        items: data.items || [],
        totalCount: data.total_count || 0,
        totalPages: data.total_pages || 1,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Load code invites error:', error);
      toast({ title: 'Error', description: 'Failed to load code invitations', status: 'error', duration: 5000, isClosable: true });
      setCodeState((s) => ({ ...s, isLoading: false }));
    }
  };

  const handleRevoke = (invite) => {
    setSelectedInvite(invite);
    onOpen();
  };

  const confirmRevoke = async () => {
    if (!selectedInvite) return;
    try {
      await organizationsAPI.revokeInvite(organization.id, selectedInvite.id);
      toast({ title: 'Invitation revoked', description: 'The invitation has been deactivated', status: 'success', duration: 3000, isClosable: true });
      setInternalRefresh((r) => r + 1);
    } catch (error) {
      toast({ title: 'Error', description: apiUtils.handleError(error, 'Failed to revoke invitation'), status: 'error', duration: 5000, isClosable: true });
    } finally {
      onClose();
      setSelectedInvite(null);
    }
  };

  const handleResend = async (invite) => {
    try {
      await organizationsAPI.resendInvite(organization.id, invite.id);
      toast({ title: 'Invitation resent', description: `Email sent to ${invite.email}`, status: 'success', duration: 3000, isClosable: true });
    } catch (error) {
      toast({ title: 'Error', description: apiUtils.handleError(error, 'Failed to resend invitation'), status: 'error', duration: 5000, isClosable: true });
    }
  };

  const handleRefresh = () => {
    setInternalRefresh((r) => r + 1);
  };

  return (
    <Box
      bg="primary.800"
      borderWidth="1px"
      borderColor="primary.600"
      borderRadius="md"
      p={6}
    >
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text color="white" fontSize="lg" fontWeight="600">
            Invitation History
          </Text>
          <Button
            size="sm"
            variant="ghost"
            colorScheme="accent"
            onClick={handleRefresh}
            leftIcon={<FiRefreshCw />}
          >
            Refresh
          </Button>
        </HStack>

        <Tabs
          index={activeTab}
          onChange={setActiveTab}
          variant="soft-rounded"
          colorScheme="accent"
        >
          <TabList mb={4}>
            <Tab color="gray.400" _selected={{ color: 'white', bg: 'accent.500' }}>
              Email Invites ({emailState.totalCount})
            </Tab>
            <Tab color="gray.400" _selected={{ color: 'white', bg: 'accent.500' }}>
              Code Invites ({codeState.totalCount})
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <PaginatedInviteTable
                state={emailState}
                setState={setEmailState}
                onRevoke={handleRevoke}
                onResend={handleResend}
                showEmail
              />
            </TabPanel>
            <TabPanel px={0}>
              <PaginatedInviteTable
                state={codeState}
                setState={setCodeState}
                onRevoke={handleRevoke}
                showEmail={false}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent bg="primary.800" borderColor="primary.600" borderWidth="1px">
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
              Revoke Invitation
            </AlertDialogHeader>
            <AlertDialogBody color="gray.300">
              Are you sure you want to revoke this invitation? This action cannot be undone.
              {selectedInvite?.email && (
                <Text mt={2} color="accent.400" fontWeight="600">{selectedInvite.email}</Text>
              )}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} variant="ghost">Cancel</Button>
              <Button colorScheme="red" onClick={confirmRevoke} ml={3}>Revoke</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

// ===================================
// Paginated Invite Table Sub-component
// ===================================

const getStatusBadge = (invite) => {
  if (!invite.is_active) return <Badge colorScheme="red" fontSize="xs">Revoked</Badge>;
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return <Badge colorScheme="orange" fontSize="xs">Expired</Badge>;
  if (invite.max_uses && invite.used_count >= invite.max_uses) return <Badge colorScheme="gray" fontSize="xs">Used Up</Badge>;
  if (invite.used_count > 0) return <Badge colorScheme="green" fontSize="xs">Active ({invite.used_count}x)</Badge>;
  return <Badge colorScheme="blue" fontSize="xs">Pending</Badge>;
};

const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const PaginatedInviteTable = ({ state, setState, onRevoke, onResend, showEmail }) => {
  const toast = useToast();
  const { items, isLoading, page, pageSize, totalCount, totalPages } = state;

  const handleCopyLink = (inviteLink) => {
    navigator.clipboard.writeText(inviteLink);
    toast({ title: 'Link copied', status: 'success', duration: 2000, isClosable: true });
  };

  const handleCopyCode = (inviteCode) => {
    navigator.clipboard.writeText(inviteCode);
    toast({ title: 'Code copied', status: 'success', duration: 2000, isClosable: true });
  };

  if (isLoading) {
    return (
      <Center py={8}>
        <VStack spacing={4}>
          <Spinner size="lg" color="accent.500" />
          <Text color="gray.400">Loading invitations...</Text>
        </VStack>
      </Center>
    );
  }

  if (items.length === 0) {
    return (
      <Center py={8}>
        <Text color="gray.500">No invitations yet</Text>
      </Center>
    );
  }

  return (
    <Box>
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              {showEmail && <Th color="gray.400" borderColor="primary.600">Email</Th>}
              <Th color="gray.400" borderColor="primary.600">Code</Th>
              <Th color="gray.400" borderColor="primary.600">Status</Th>
              <Th color="gray.400" borderColor="primary.600">Created</Th>
              <Th color="gray.400" borderColor="primary.600">Expires</Th>
              <Th color="gray.400" borderColor="primary.600">By</Th>
              <Th color="gray.400" borderColor="primary.600">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map((invite) => (
              <Tr key={invite.id} _hover={{ bg: 'primary.700' }} transition="background 0.15s">
                {showEmail && (
                  <Td color="white" borderColor="primary.600" fontSize="sm">{invite.email}</Td>
                )}
                <Td color="gray.300" borderColor="primary.600">
                  <HStack spacing={2}>
                    <Text fontFamily="mono" fontSize="xs">
                      {invite.invite_code.substring(0, 8)}...
                    </Text>
                    <IconButton
                      icon={<FiCopy />}
                      size="xs"
                      variant="ghost"
                      aria-label="Copy code"
                      onClick={() => handleCopyCode(invite.invite_code)}
                      color="gray.400"
                      _hover={{ color: 'accent.400' }}
                    />
                  </HStack>
                </Td>
                <Td borderColor="primary.600">{getStatusBadge(invite)}</Td>
                <Td color="gray.400" borderColor="primary.600" fontSize="xs">{formatDate(invite.created_at)}</Td>
                <Td color="gray.400" borderColor="primary.600" fontSize="xs">{formatDate(invite.expires_at)}</Td>
                <Td color="gray.400" borderColor="primary.600" fontSize="xs">{invite.created_by_username}</Td>
                <Td borderColor="primary.600">
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<FiMoreVertical />}
                      variant="ghost"
                      size="sm"
                      aria-label="Options"
                      color="gray.400"
                      _hover={{ color: 'white', bg: 'primary.700' }}
                    />
                    <MenuList bg="primary.700" borderColor="primary.600">
                      <MenuItem
                        icon={<FiCopy />}
                        onClick={() => handleCopyLink(invite.invite_link)}
                        bg="primary.700"
                        color="white"
                        _hover={{ bg: 'primary.600' }}
                      >
                        Copy Link
                      </MenuItem>
                      {invite.invite_type === 'email' && invite.is_active && onResend && (
                        <MenuItem
                          icon={<FiRefreshCw />}
                          onClick={() => onResend(invite)}
                          bg="primary.700"
                          color="white"
                          _hover={{ bg: 'primary.600' }}
                        >
                          Resend Email
                        </MenuItem>
                      )}
                      {invite.is_active && (
                        <MenuItem
                          icon={<FiX />}
                          onClick={() => onRevoke(invite)}
                          bg="primary.700"
                          color="red.400"
                          _hover={{ bg: 'red.900' }}
                        >
                          Revoke
                        </MenuItem>
                      )}
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <HStack
          justify="space-between"
          px={4}
          py={3}
          borderTopWidth="1px"
          borderColor="primary.600"
        >
          <HStack spacing={2}>
            <Text color="gray.400" fontSize="xs">
              Showing {Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)} of {totalCount}
            </Text>
            <Select
              size="xs"
              value={pageSize}
              onChange={(e) => setState((s) => ({ ...s, pageSize: Number(e.target.value), page: 1 }))}
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
              onClick={() => setState((s) => ({ ...s, page: 1 }))}
              isDisabled={page <= 1}
              aria-label="First page"
              _hover={{ color: 'white', bg: 'primary.700' }}
            />
            <IconButton
              icon={<FiChevronLeft />}
              size="xs"
              variant="ghost"
              color="gray.400"
              onClick={() => setState((s) => ({ ...s, page: Math.max(1, s.page - 1) }))}
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
              onClick={() => setState((s) => ({ ...s, page: Math.min(s.totalPages, s.page + 1) }))}
              isDisabled={page >= totalPages}
              aria-label="Next page"
              _hover={{ color: 'white', bg: 'primary.700' }}
            />
            <IconButton
              icon={<FiChevronsRight />}
              size="xs"
              variant="ghost"
              color="gray.400"
              onClick={() => setState((s) => ({ ...s, page: s.totalPages }))}
              isDisabled={page >= totalPages}
              aria-label="Last page"
              _hover={{ color: 'white', bg: 'primary.700' }}
            />
          </HStack>
        </HStack>
      )}
    </Box>
  );
};

export default InviteList;
