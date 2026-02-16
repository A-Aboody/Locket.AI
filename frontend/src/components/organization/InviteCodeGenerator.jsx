import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  useToast,
  useClipboard,
  Badge,
  Spinner,
  Center,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Collapse,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
} from '@chakra-ui/react';
import {
  FiCopy,
  FiCheck,
  FiPlus,
  FiX,
  FiMail,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
} from 'react-icons/fi';
import { organizationsAPI, apiUtils } from '../../utils/api';

const InviteCodeGenerator = ({ organization }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [maxUses, setMaxUses] = useState(null);

  // Paginated active invites state
  const [invites, setInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const { isOpen: isAdvancedOpen, onToggle: onAdvancedToggle } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    loadInvites();
  }, [organization?.id, page, pageSize]);

  const loadInvites = async () => {
    if (!organization?.id) return;

    try {
      setIsLoading(true);
      const response = await organizationsAPI.listInvites(organization.id, true, {
        page,
        page_size: pageSize,
      });
      const data = response.data;
      setInvites(data.items || []);
      setTotalCount(data.total_count || 0);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      console.error('Failed to load invites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invites',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const options = {};

      if (expiryDays > 0) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
        options.expires_at = expiryDate.toISOString();
      }

      if (maxUses && maxUses > 0) {
        options.max_uses = maxUses;
      }

      await organizationsAPI.generateInviteCode(organization.id, options);

      toast({
        title: 'Invite code generated',
        description: 'Share the code with team members to join',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset to first page and reload
      setPage(1);
      await loadInvites();
    } catch (error) {
      const errorMsg = apiUtils.handleError(error, 'Failed to generate invite code');
      toast({
        title: 'Error',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      await organizationsAPI.revokeInvite(organization.id, inviteId);

      toast({
        title: 'Invite revoked',
        description: 'The invite code can no longer be used',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      await loadInvites();
    } catch (error) {
      const errorMsg = apiUtils.handleError(error, 'Failed to revoke invite');
      toast({
        title: 'Error',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false;
    const daysUntil = (new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 2;
  };

  return (
    <Box>
      {/* Generate New Invite */}
      <Box
        bg="primary.800"
        borderWidth="1px"
        borderColor="primary.600"
        borderRadius="md"
        p={6}
        mb={6}
      >
        <Text color="white" fontSize="lg" fontWeight="600" mb={4}>
          Generate Invite Code
        </Text>

        <VStack spacing={4} align="stretch">
          <Button
            size="sm"
            variant="ghost"
            onClick={onAdvancedToggle}
            leftIcon={isAdvancedOpen ? <FiChevronUp /> : <FiChevronDown />}
            color="gray.400"
            _hover={{ color: 'white', bg: 'primary.700' }}
          >
            {isAdvancedOpen ? 'Hide' : 'Show'} Advanced Options
          </Button>

          <Collapse in={isAdvancedOpen} animateOpacity>
            <VStack spacing={4} align="stretch" pt={2}>
              <FormControl>
                <FormLabel color="gray.300" fontSize="sm">Expires After (days)</FormLabel>
                <NumberInput
                  value={expiryDays}
                  onChange={(v) => setExpiryDays(parseInt(v) || 0)}
                  min={0} max={365} size="md"
                >
                  <NumberInputField bg="primary.700" borderColor="primary.600" color="white" _hover={{ borderColor: 'primary.500' }} _focus={{ borderColor: 'accent.500' }} />
                  <NumberInputStepper>
                    <NumberIncrementStepper color="gray.400" />
                    <NumberDecrementStepper color="gray.400" />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="gray.500" mt={1}>Set to 0 for no expiration</Text>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.300" fontSize="sm">Maximum Uses</FormLabel>
                <NumberInput
                  value={maxUses || ''}
                  onChange={(v) => setMaxUses(parseInt(v) || null)}
                  min={1} max={1000} size="md"
                >
                  <NumberInputField bg="primary.700" borderColor="primary.600" color="white" placeholder="Unlimited" _hover={{ borderColor: 'primary.500' }} _focus={{ borderColor: 'accent.500' }} />
                  <NumberInputStepper>
                    <NumberIncrementStepper color="gray.400" />
                    <NumberDecrementStepper color="gray.400" />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="gray.500" mt={1}>Leave empty for unlimited uses</Text>
              </FormControl>
            </VStack>
          </Collapse>

          <Button
            colorScheme="accent"
            leftIcon={<FiPlus />}
            onClick={handleGenerateCode}
            isLoading={isGenerating}
            loadingText="Generating..."
          >
            Generate Invite Code
          </Button>
        </VStack>
      </Box>

      {/* Active Invites Table */}
      <Box>
        <Text color="white" fontSize="lg" fontWeight="600" mb={4}>
          Active Invites ({totalCount})
        </Text>

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
                <Text color="gray.400">Loading invites...</Text>
              </VStack>
            </Center>
          ) : invites.length === 0 ? (
            <Center py={8}>
              <VStack spacing={2}>
                <Text color="gray.400">No active invites</Text>
                <Text color="gray.500" fontSize="sm">Generate an invite code to start inviting members</Text>
              </VStack>
            </Center>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th color="gray.400" borderColor="primary.600">Invite Code</Th>
                    <Th color="gray.400" borderColor="primary.600">Type</Th>
                    <Th color="gray.400" borderColor="primary.600">Expires</Th>
                    <Th color="gray.400" borderColor="primary.600">Usage</Th>
                    <Th color="gray.400" borderColor="primary.600" w="120px">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {invites.map((invite) => (
                    <ActiveInviteRow
                      key={invite.id}
                      invite={invite}
                      onRevoke={() => handleRevokeInvite(invite.id)}
                      formatDate={formatDate}
                      isExpiringSoon={isExpiringSoon}
                    />
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
                <IconButton icon={<FiChevronsLeft />} size="xs" variant="ghost" color="gray.400" onClick={() => setPage(1)} isDisabled={page <= 1} aria-label="First page" _hover={{ color: 'white', bg: 'primary.700' }} />
                <IconButton icon={<FiChevronLeft />} size="xs" variant="ghost" color="gray.400" onClick={() => setPage((p) => Math.max(1, p - 1))} isDisabled={page <= 1} aria-label="Previous page" _hover={{ color: 'white', bg: 'primary.700' }} />
                <Text color="gray.300" fontSize="xs" px={2}>Page {page} of {totalPages}</Text>
                <IconButton icon={<FiChevronRight />} size="xs" variant="ghost" color="gray.400" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} isDisabled={page >= totalPages} aria-label="Next page" _hover={{ color: 'white', bg: 'primary.700' }} />
                <IconButton icon={<FiChevronsRight />} size="xs" variant="ghost" color="gray.400" onClick={() => setPage(totalPages)} isDisabled={page >= totalPages} aria-label="Last page" _hover={{ color: 'white', bg: 'primary.700' }} />
              </HStack>
            </HStack>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// Active Invite Row Component
const ActiveInviteRow = ({ invite, onRevoke, formatDate, isExpiringSoon }) => {
  const toast = useToast();
  const inviteLink = organizationsAPI.getInviteLink(invite.invite_code);
  const { hasCopied, onCopy } = useClipboard(invite.invite_code);
  const { hasCopied: hasLinkCopied, onCopy: onLinkCopy } = useClipboard(inviteLink);

  return (
    <Tr _hover={{ bg: 'primary.700' }} transition="background 0.15s">
      {/* Invite Code */}
      <Td borderColor="primary.600">
        <HStack spacing={2}>
          <Text fontFamily="mono" fontSize="xs" color="white" fontWeight="bold">
            {invite.invite_code.substring(0, 12)}...
          </Text>
          <IconButton
            icon={hasCopied ? <FiCheck /> : <FiCopy />}
            size="xs"
            variant="ghost"
            onClick={onCopy}
            colorScheme={hasCopied ? 'green' : 'gray'}
            aria-label="Copy code"
          />
        </HStack>
      </Td>

      {/* Type */}
      <Td borderColor="primary.600">
        <Badge colorScheme="blue" fontSize="xs">
          {invite.invite_type === 'code' ? 'Code' : 'Email'}
        </Badge>
      </Td>

      {/* Expires */}
      <Td borderColor="primary.600">
        {invite.expires_at ? (
          <Badge colorScheme={isExpiringSoon(invite.expires_at) ? 'red' : 'gray'} fontSize="xs">
            {formatDate(invite.expires_at)}
          </Badge>
        ) : (
          <Text color="gray.500" fontSize="xs">Never</Text>
        )}
      </Td>

      {/* Usage */}
      <Td borderColor="primary.600">
        {invite.max_uses ? (
          <Badge colorScheme="purple" fontSize="xs">
            {invite.used_count}/{invite.max_uses}
          </Badge>
        ) : (
          <Badge colorScheme="green" fontSize="xs">
            {invite.used_count} (∞)
          </Badge>
        )}
      </Td>

      {/* Actions */}
      <Td borderColor="primary.600">
        <HStack spacing={1}>
          <Button
            size="xs"
            variant="ghost"
            leftIcon={hasLinkCopied ? <FiCheck /> : <FiMail />}
            onClick={onLinkCopy}
            colorScheme={hasLinkCopied ? 'green' : 'gray'}
          >
            {hasLinkCopied ? 'Copied' : 'Link'}
          </Button>
          <IconButton
            size="xs"
            icon={<FiX />}
            onClick={onRevoke}
            colorScheme="red"
            variant="ghost"
            aria-label="Revoke invite"
          />
        </HStack>
      </Td>
    </Tr>
  );
};

export default InviteCodeGenerator;
