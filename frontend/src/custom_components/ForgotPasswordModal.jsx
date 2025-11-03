import { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Text,
  Input,
  Button,
  useToast,
  Box,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { authAPI } from '../utils/api';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setIsSuccess(true);
    } catch (error) {
      // Don't show error - we don't want to reveal if email exists
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setIsSuccess(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay backdropFilter="blur(8px)" />
      <ModalContent bg="primary.800" border="1px" borderColor="primary.600" color="white">
        <ModalHeader textAlign="center" borderBottom="1px" borderColor="primary.600">
          Reset Your Password
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={6}>
          {isSuccess ? (
            <VStack spacing={4}>
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Check your email</Text>
                  <Text fontSize="sm">
                    If an account with {email} exists, we've sent password reset instructions.
                  </Text>
                </Box>
              </Alert>
              <Button onClick={handleClose} colorScheme="accent" w="full">
                Close
              </Button>
            </VStack>
          ) : (
            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <Text textAlign="center" color="gray.300">
                  Enter your email address and we'll send you instructions to reset your password.
                </Text>

                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  bg="primary.900"
                  borderColor="primary.500"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                  _focus={{
                    borderColor: 'accent.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
                  }}
                />

                <Button
                  type="submit"
                  colorScheme="accent"
                  w="full"
                  isLoading={isLoading}
                >
                  Send Reset Instructions
                </Button>
              </VStack>
            </form>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ForgotPasswordModal;