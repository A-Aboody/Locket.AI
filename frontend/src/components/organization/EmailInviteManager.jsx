import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  useToast,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import { FiMail, FiSend } from 'react-icons/fi';
import { organizationsAPI, apiUtils } from '../../utils/api';

const EmailInviteManager = ({ organization, onInviteSent }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const toast = useToast();

  // Email validation
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();

    // Validate email
    if (!email.trim()) {
      setEmailError('Email address is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setEmailError('');

    try {
      await organizationsAPI.sendEmailInvite(organization.id, email);

      toast({
        title: 'Invitation sent!',
        description: `An invitation email has been sent to ${email}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Clear input
      setEmail('');

      // Notify parent to refresh invite list
      if (onInviteSent) {
        onInviteSent();
      }
    } catch (error) {
      console.error('Send invite error:', error);

      const errorMsg = apiUtils.handleError(error, 'Failed to send invitation');

      toast({
        title: 'Error',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
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
        <HStack spacing={2}>
          <FiMail color="var(--chakra-colors-accent-500)" size={20} />
          <Text color="white" fontSize="lg" fontWeight="600">
            Send Email Invitation
          </Text>
        </HStack>

        <form onSubmit={handleSendInvite}>
          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={!!emailError} isRequired>
              <FormLabel color="gray.300" fontSize="sm">
                Email Address
              </FormLabel>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                bg="primary.700"
                borderColor="primary.600"
                color="white"
                _hover={{ borderColor: 'primary.500' }}
                _focus={{ borderColor: 'accent.500', boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)' }}
              />
              {emailError && (
                <FormErrorMessage>{emailError}</FormErrorMessage>
              )}
            </FormControl>

            <Button
              type="submit"
              colorScheme="accent"
              leftIcon={<FiSend />}
              isLoading={isLoading}
              loadingText="Sending..."
              isDisabled={!email.trim()}
            >
              Send Invitation
            </Button>

            <Alert
              status="info"
              variant="subtle"
              borderRadius="md"
              bg="blue.900"
              borderWidth="1px"
              borderColor="blue.700"
            >
              <AlertIcon color="blue.300" />
              <AlertDescription color="gray.300" fontSize="sm">
                The recipient will receive an email with a magic link to join {organization.name}.
                They'll need to install the app if they don't have it already.
              </AlertDescription>
            </Alert>
          </VStack>
        </form>
      </VStack>
    </Box>
  );
};

export default EmailInviteManager;
