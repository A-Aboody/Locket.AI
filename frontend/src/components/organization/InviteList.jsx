import { useState, useEffect } from 'react';
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
  useClipboard,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { FiMoreVertical, FiCopy, FiX, FiRefreshCw, FiCheck } from 'react-icons/fi';
import { organizationsAPI, apiUtils } from '../../utils/api';
import { useRef } from 'react';

const InviteList = ({ organization, refreshTrigger }) => {
  const [invites, setInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();

  useEffect(() => {
    loadInvites();
  }, [organization?.id, refreshTrigger]);

  const loadInvites = async () => {
    setIsLoading(true);
    try {
      // Load all invites (active_only = false to show history)
      const response = await organizationsAPI.listInvites(organization.id, false);
      setInvites(response.data);
    } catch (error) {
      console.error('Load invites error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitations',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (invite) => {
    setSelectedInvite(invite);
    onOpen();
  };

  const confirmRevoke = async () => {
    if (!selectedInvite) return;

    try {
      await organizationsAPI.revokeInvite(organization.id, selectedInvite.id);

      toast({
        title: 'Invitation revoked',
        description: 'The invitation has been deactivated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Refresh list
      loadInvites();
    } catch (error) {
      console.error('Revoke invite error:', error);
      toast({
        title: 'Error',
        description: apiUtils.handleError(error, 'Failed to revoke invitation'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      onClose();
      setSelectedInvite(null);
    }
  };

  const handleResend = async (invite) => {
    try {
      await organizationsAPI.resendInvite(organization.id, invite.id);

      toast({
        title: 'Invitation resent',
        description: `Email sent to ${invite.email}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Resend invite error:', error);
      toast({
        title: 'Error',
        description: apiUtils.handleError(error, 'Failed to resend invitation'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const getStatusBadge = (invite) => {
    if (!invite.is_active) {
      return <Badge colorScheme="red" fontSize="xs">Revoked</Badge>;
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return <Badge colorScheme="orange" fontSize="xs">Expired</Badge>;
    }

    if (invite.max_uses && invite.used_count >= invite.max_uses) {
      return <Badge colorScheme="gray" fontSize="xs">Used Up</Badge>;
    }

    if (invite.used_count > 0) {
      return <Badge colorScheme="green" fontSize="xs">Active (Used {invite.used_count}x)</Badge>;
    }

    return <Badge colorScheme="blue" fontSize="xs">Pending</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Filter invites by type
  const emailInvites = invites.filter((inv) => inv.invite_type === 'email');
  const codeInvites = invites.filter((inv) => inv.invite_type === 'code');

  if (isLoading) {
    return (
      <Box
        bg="primary.800"
        borderWidth="1px"
        borderColor="primary.600"
        borderRadius="md"
        p={6}
      >
        <Center py={8}>
          <VStack spacing={4}>
            <Spinner size="lg" color="accent.500" />
            <Text color="gray.400">Loading invitations...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

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
            onClick={loadInvites}
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
              Email Invites ({emailInvites.length})
            </Tab>
            <Tab color="gray.400" _selected={{ color: 'white', bg: 'accent.500' }}>
              Code Invites ({codeInvites.length})
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <InviteTable
                invites={emailInvites}
                onRevoke={handleRevoke}
                onResend={handleResend}
                getStatusBadge={getStatusBadge}
                formatDate={formatDate}
                showEmail
              />
            </TabPanel>
            <TabPanel px={0}>
              <InviteTable
                invites={codeInvites}
                onRevoke={handleRevoke}
                getStatusBadge={getStatusBadge}
                formatDate={formatDate}
                showEmail={false}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="primary.800" borderColor="primary.600" borderWidth="1px">
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
              Revoke Invitation
            </AlertDialogHeader>

            <AlertDialogBody color="gray.300">
              Are you sure you want to revoke this invitation? This action cannot be undone.
              {selectedInvite?.email && (
                <Text mt={2} color="accent.400" fontWeight="600">
                  {selectedInvite.email}
                </Text>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} variant="ghost">
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmRevoke} ml={3}>
                Revoke
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

const InviteTable = ({ invites, onRevoke, onResend, getStatusBadge, formatDate, showEmail }) => {
  const toast = useToast();

  if (invites.length === 0) {
    return (
      <Center py={8}>
        <Text color="gray.500">No invitations yet</Text>
      </Center>
    );
  }

  const handleCopyLink = (inviteLink) => {
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: 'Link copied',
      description: 'Invitation link copied to clipboard',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleCopyCode = (inviteCode) => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: 'Code copied',
      description: 'Invitation code copied to clipboard',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Box overflowX="auto">
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            {showEmail && (
              <Th color="gray.400" borderColor="primary.600">
                Email
              </Th>
            )}
            <Th color="gray.400" borderColor="primary.600">
              Code
            </Th>
            <Th color="gray.400" borderColor="primary.600">
              Status
            </Th>
            <Th color="gray.400" borderColor="primary.600">
              Created
            </Th>
            <Th color="gray.400" borderColor="primary.600">
              Expires
            </Th>
            <Th color="gray.400" borderColor="primary.600">
              By
            </Th>
            <Th color="gray.400" borderColor="primary.600">
              Actions
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {invites.map((invite) => (
            <Tr key={invite.id}>
              {showEmail && (
                <Td color="white" borderColor="primary.600">
                  {invite.email}
                </Td>
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
              <Td color="gray.400" borderColor="primary.600" fontSize="xs">
                {formatDate(invite.created_at)}
              </Td>
              <Td color="gray.400" borderColor="primary.600" fontSize="xs">
                {formatDate(invite.expires_at)}
              </Td>
              <Td color="gray.400" borderColor="primary.600" fontSize="xs">
                {invite.created_by_username}
              </Td>
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
                    {invite.invite_type === 'email' && invite.is_active && (
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
  );
};

export default InviteList;
