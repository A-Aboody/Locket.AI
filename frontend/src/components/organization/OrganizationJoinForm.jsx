import { useState } from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  FormErrorMessage,
  useToast,
  HStack,
  Box,
  Icon,
  Divider,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import { FiArrowLeft, FiCheck, FiUsers } from 'react-icons/fi';
import { organizationsAPI, apiUtils, authAPI } from '../../utils/api';

const OrganizationJoinForm = ({ onSuccess, onCancel }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [joinedOrg, setJoinedOrg] = useState(null);
  const toast = useToast();

  const validateCode = () => {
    const validation = apiUtils.validateInviteCode(inviteCode);

    if (!validation.valid) {
      setError(validation.error);
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateCode()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await organizationsAPI.joinViaCode(inviteCode.trim());

      // Update user data in localStorage
      const updatedUser = await authAPI.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(updatedUser.data));

      setJoinedOrg(response.data.organization);

      toast({
        title: 'Joined organization!',
        description: `You are now a member of ${response.data.organization.name}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Show success message briefly before continuing
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (error) {
      console.error('Join organization error:', error);

      const errorMessage = apiUtils.handleError(
        error,
        'Failed to join organization'
      );

      // Handle specific error cases
      if (errorMessage.includes('expired')) {
        setError('This invite code has expired');
      } else if (errorMessage.includes('invalid')) {
        setError('Invalid invite code');
      } else if (errorMessage.includes('limit')) {
        setError('This invite code has reached its usage limit');
      } else if (errorMessage.includes('already')) {
        setError('You are already a member of an organization');
      } else {
        setError(errorMessage);
      }

      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setInviteCode(e.target.value);

    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  // Show success view
  if (joinedOrg) {
    return (
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Icon as={FiCheck} boxSize={12} color="green.500" mb={4} />
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            Successfully Joined!
          </Text>
          <Text color="gray.500" fontSize="sm">
            Welcome to {joinedOrg.name}
          </Text>
        </Box>

        <Alert
          status="info"
          borderRadius="md"
          bg="blue.50"
          _dark={{ bg: 'blue.900' }}
        >
          <AlertIcon />
          <AlertDescription fontSize="sm">
            You can now access shared documents and collaborate with your team.
          </AlertDescription>
        </Alert>
      </VStack>
    );
  }

  // Show join form
  return (
    <form onSubmit={handleSubmit}>
      <VStack spacing={5} align="stretch">
        <Box textAlign="center" mb={2}>
          <Icon as={FiUsers} boxSize={10} color="green.500" mb={2} />
          <Text fontSize="sm" color="gray.500">
            Enter the invite code provided by your organization admin
          </Text>
        </Box>

        <FormControl isInvalid={!!error} isRequired>
          <FormLabel fontSize="sm" fontWeight="semibold">
            Invite Code
          </FormLabel>
          <Input
            value={inviteCode}
            onChange={handleInputChange}
            placeholder="Enter invite code"
            size="lg"
            fontFamily="mono"
            textTransform="uppercase"
            autoFocus
            autoComplete="off"
          />
          <FormErrorMessage>{error}</FormErrorMessage>
          <Text fontSize="xs" color="gray.500" mt={2}>
            The invite code is a unique alphanumeric code provided by your
            organization administrator
          </Text>
        </FormControl>

        <Alert
          status="info"
          borderRadius="md"
          fontSize="sm"
          bg="blue.50"
          _dark={{ bg: 'blue.900' }}
        >
          <AlertIcon />
          <AlertDescription>
            After joining, your existing documents will remain private. You can
            choose to share them with the organization later.
          </AlertDescription>
        </Alert>

        <Divider />

        <HStack spacing={3}>
          <Button
            variant="ghost"
            leftIcon={<FiArrowLeft />}
            onClick={onCancel}
            isDisabled={isLoading}
            flex={1}
          >
            Back
          </Button>
          <Button
            type="submit"
            colorScheme="accent"
            isLoading={isLoading}
            loadingText="Joining..."
            flex={2}
            size="lg"
            isDisabled={!inviteCode.trim()}
          >
            Join Organization
          </Button>
        </HStack>
      </VStack>
    </form>
  );
};

export default OrganizationJoinForm;
