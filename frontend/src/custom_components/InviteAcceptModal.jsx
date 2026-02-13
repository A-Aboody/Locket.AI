import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
  Box,
  Divider,
} from '@chakra-ui/react';
import { FiUserPlus, FiX, FiLogIn } from 'react-icons/fi';
import { organizationsAPI, apiUtils, authAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const InviteAcceptModal = ({ isOpen, onClose, inviteCode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [alreadyInOrg, setAlreadyInOrg] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (token && user) {
        try {
          const userData = JSON.parse(user);
          setIsAuthenticated(true);
          setIsVerified(userData.email_verified || false);
          setAlreadyInOrg(!!userData.organization_id);
        } catch (error) {
          console.error('[InviteAcceptModal] Error parsing user data:', error);
          setIsAuthenticated(false);
          setIsVerified(false);
          setAlreadyInOrg(false);
        }
      } else {
        setIsAuthenticated(false);
        setIsVerified(false);
        setAlreadyInOrg(false);
      }
    };

    checkAuth();
  }, [isOpen]);

  const handleAccept = async () => {
    if (!isAuthenticated || !isVerified) {
      toast({
        title: 'Authentication required',
        description: 'Please log in and verify your email to accept this invitation.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await organizationsAPI.joinViaCode(inviteCode);

      // Fetch fresh user data from the API to get correct org_role
      const userResponse = await authAPI.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(userResponse.data));

      // Clear any stored pending invite
      sessionStorage.removeItem('pendingInviteCode');

      toast({
        title: 'Success!',
        description: `You've successfully joined ${response.data.name}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onClose();

      // Navigate to the dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (error) {
      console.error('[InviteAcceptModal] Error accepting invite:', error);

      const errorMsg = apiUtils.handleError(error, 'Failed to accept invitation');

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

  const handleLoginFirst = () => {
    // Store the invite code to retry after login
    sessionStorage.setItem('pendingInviteCode', inviteCode);
    onClose();
    navigate('/auth');
  };

  const handleDecline = () => {
    sessionStorage.removeItem('pendingInviteCode');
    toast({
      title: 'Invitation declined',
      description: 'You can accept this invitation later from the email link.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(10px)" />
      <ModalContent bg="primary.800" borderColor="primary.600" borderWidth="1px">
        <ModalHeader color="white">
          <HStack spacing={2}>
            <FiUserPlus color="var(--chakra-colors-accent-500)" size={24} />
            <Text>Organization Invitation</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="gray.400" />

        <ModalBody>
          <VStack spacing={4} align="stretch">
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
                You've been invited to join an organization on Locket.AI.
              </AlertDescription>
            </Alert>

            <Box
              bg="primary.700"
              borderRadius="md"
              p={4}
              borderWidth="1px"
              borderColor="primary.600"
            >
              <VStack spacing={2} align="stretch">
                <Text color="gray.400" fontSize="sm">
                  Invite Code
                </Text>
                <Text
                  color="white"
                  fontFamily="mono"
                  fontSize="md"
                  fontWeight="600"
                  bg="primary.900"
                  p={2}
                  borderRadius="md"
                >
                  {inviteCode}
                </Text>
              </VStack>
            </Box>

            {!isAuthenticated && (
              <Alert
                status="warning"
                variant="subtle"
                borderRadius="md"
                bg="orange.900"
                borderWidth="1px"
                borderColor="orange.700"
              >
                <AlertIcon color="orange.300" />
                <AlertDescription color="gray.300" fontSize="sm">
                  You need to log in or create an account to accept this invitation.
                </AlertDescription>
              </Alert>
            )}

            {isAuthenticated && !isVerified && (
              <Alert
                status="warning"
                variant="subtle"
                borderRadius="md"
                bg="orange.900"
                borderWidth="1px"
                borderColor="orange.700"
              >
                <AlertIcon color="orange.300" />
                <AlertDescription color="gray.300" fontSize="sm">
                  Please verify your email address before joining an organization.
                </AlertDescription>
              </Alert>
            )}

            {isAuthenticated && alreadyInOrg && (
              <Alert
                status="warning"
                variant="subtle"
                borderRadius="md"
                bg="orange.900"
                borderWidth="1px"
                borderColor="orange.700"
              >
                <AlertIcon color="orange.300" />
                <AlertDescription color="gray.300" fontSize="sm">
                  You are already a member of an organization. You must leave your current
                  organization before joining a new one.
                </AlertDescription>
              </Alert>
            )}

            <Divider borderColor="primary.600" />

            <Text color="gray.400" fontSize="sm">
              By accepting this invitation, you'll be able to collaborate with your team,
              share documents securely, and access shared resources.
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} width="full" justify="flex-end">
            <Button
              variant="ghost"
              onClick={handleDecline}
              leftIcon={<FiX />}
              color="gray.400"
              _hover={{ bg: 'primary.700', color: 'white' }}
            >
              Decline
            </Button>

            {!isAuthenticated ? (
              <Button
                colorScheme="accent"
                onClick={handleLoginFirst}
                leftIcon={<FiLogIn />}
              >
                Log In / Sign Up
              </Button>
            ) : (
              <Button
                colorScheme="accent"
                onClick={handleAccept}
                isLoading={isLoading}
                loadingText="Joining..."
                leftIcon={<FiUserPlus />}
                isDisabled={!isVerified || alreadyInOrg}
              >
                Accept & Join
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default InviteAcceptModal;
