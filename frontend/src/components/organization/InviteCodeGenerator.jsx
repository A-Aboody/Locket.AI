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
} from '@chakra-ui/react';
import {
  FiCopy,
  FiCheck,
  FiPlus,
  FiX,
  FiMail,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { organizationsAPI, apiUtils } from '../../utils/api';

const InviteCodeGenerator = ({ organization }) => {
  const [invites, setInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [maxUses, setMaxUses] = useState(null);

  const { isOpen: isAdvancedOpen, onToggle: onAdvancedToggle } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    loadInvites();
  }, [organization?.id]);

  const loadInvites = async () => {
    if (!organization?.id) return;

    try {
      const response = await organizationsAPI.listInvites(organization.id, true);
      setInvites(response.data);
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
        // Calculate expiry date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
        options.expires_at = expiryDate.toISOString();
      }

      if (maxUses && maxUses > 0) {
        options.max_uses = maxUses;
      }

      const response = await organizationsAPI.generateInviteCode(organization.id, options);

      toast({
        title: 'Invite code generated',
        description: 'Share the code with team members to join',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

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

  if (isLoading) {
    return (
      <Center py={12}>
        <VStack spacing={4}>
          <Spinner size="lg" color="accent.500" />
          <Text color="gray.400">Loading invites...</Text>
        </VStack>
      </Center>
    );
  }

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
          {/* Advanced Options Toggle */}
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

          {/* Advanced Options */}
          <Collapse in={isAdvancedOpen} animateOpacity>
            <VStack spacing={4} align="stretch" pt={2}>
              <FormControl>
                <FormLabel color="gray.300" fontSize="sm">
                  Expires After (days)
                </FormLabel>
                <NumberInput
                  value={expiryDays}
                  onChange={(valueString) => setExpiryDays(parseInt(valueString) || 0)}
                  min={0}
                  max={365}
                  size="md"
                >
                  <NumberInputField
                    bg="primary.700"
                    borderColor="primary.600"
                    color="white"
                    _hover={{ borderColor: 'primary.500' }}
                    _focus={{ borderColor: 'accent.500' }}
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper color="gray.400" />
                    <NumberDecrementStepper color="gray.400" />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Set to 0 for no expiration
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.300" fontSize="sm">
                  Maximum Uses
                </FormLabel>
                <NumberInput
                  value={maxUses || ''}
                  onChange={(valueString) => setMaxUses(parseInt(valueString) || null)}
                  min={1}
                  max={1000}
                  size="md"
                >
                  <NumberInputField
                    bg="primary.700"
                    borderColor="primary.600"
                    color="white"
                    placeholder="Unlimited"
                    _hover={{ borderColor: 'primary.500' }}
                    _focus={{ borderColor: 'accent.500' }}
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper color="gray.400" />
                    <NumberDecrementStepper color="gray.400" />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Leave empty for unlimited uses
                </Text>
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

      {/* Active Invites */}
      <Box>
        <Text color="white" fontSize="lg" fontWeight="600" mb={4}>
          Active Invites ({invites.length})
        </Text>

        {invites.length === 0 ? (
          <Box
            bg="primary.800"
            borderWidth="1px"
            borderColor="primary.600"
            borderRadius="md"
            p={8}
            textAlign="center"
          >
            <Text color="gray.400">No active invites</Text>
            <Text color="gray.500" fontSize="sm" mt={2}>
              Generate an invite code to start inviting members
            </Text>
          </Box>
        ) : (
          <VStack spacing={3} align="stretch">
            {invites.map((invite) => (
              <InviteCodeCard
                key={invite.id}
                invite={invite}
                onRevoke={() => handleRevokeInvite(invite.id)}
              />
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
};

// Invite Code Card Component
const InviteCodeCard = ({ invite, onRevoke }) => {
  const inviteLink = organizationsAPI.getInviteLink(invite.invite_code);
  const { hasCopied, onCopy } = useClipboard(invite.invite_code);
  const { hasCopied: hasLinkCopied, onCopy: onLinkCopy } = useClipboard(inviteLink);

  const isExpiringSoon = () => {
    if (!invite.expires_at) return false;
    const expiryDate = new Date(invite.expires_at);
    const now = new Date();
    const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 2;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Box
      bg="primary.800"
      borderWidth="1px"
      borderColor="primary.600"
      borderRadius="md"
      p={4}
      _hover={{ borderColor: 'primary.500' }}
      transition="all 0.2s"
    >
      <VStack spacing={3} align="stretch">
        {/* Invite Code */}
        <InputGroup size="md">
          <Input
            value={invite.invite_code}
            readOnly
            fontFamily="mono"
            fontWeight="bold"
            bg="primary.700"
            borderColor="primary.600"
            color="white"
            pr="4.5rem"
          />
          <InputRightElement width="4.5rem">
            <IconButton
              h="1.75rem"
              size="sm"
              onClick={onCopy}
              icon={hasCopied ? <FiCheck /> : <FiCopy />}
              colorScheme={hasCopied ? 'green' : 'gray'}
              aria-label="Copy invite code"
            />
          </InputRightElement>
        </InputGroup>

        {/* Metadata */}
        <HStack justify="space-between" flexWrap="wrap" spacing={2}>
          <HStack spacing={2} flexWrap="wrap">
            <Badge colorScheme="blue" fontSize="xs">
              {invite.invite_type === 'code' ? 'Code' : 'Email'}
            </Badge>
            {invite.expires_at && (
              <Badge colorScheme={isExpiringSoon() ? 'red' : 'gray'} fontSize="xs">
                Expires {formatDate(invite.expires_at)}
              </Badge>
            )}
            {invite.max_uses && (
              <Badge colorScheme="purple" fontSize="xs">
                {invite.used_count}/{invite.max_uses} uses
              </Badge>
            )}
            {!invite.max_uses && (
              <Badge colorScheme="green" fontSize="xs">
                Unlimited uses ({invite.used_count} used)
              </Badge>
            )}
          </HStack>

          <HStack spacing={2}>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={hasLinkCopied ? <FiCheck /> : <FiMail />}
              onClick={onLinkCopy}
              colorScheme={hasLinkCopied ? 'green' : 'gray'}
            >
              {hasLinkCopied ? 'Copied' : 'Copy Link'}
            </Button>
            <IconButton
              size="sm"
              icon={<FiX />}
              onClick={onRevoke}
              colorScheme="red"
              variant="ghost"
              aria-label="Revoke invite"
            />
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
};

export default InviteCodeGenerator;
