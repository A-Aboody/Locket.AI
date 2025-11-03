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
  FormControl,
  FormLabel,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi'; // Using React Icons instead
import { authAPI } from '../utils/api';
import { useSearchParams } from 'react-router-dom';

const ResetPasswordModal = ({ isOpen, onClose }) => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const token = searchParams.get('token');
  const userId = searchParams.get('user_id');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token || !userId) {
      toast({
        title: 'Invalid reset link',
        description: 'This password reset link is invalid or has expired',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are identical',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.resetPassword({
        user_id: parseInt(userId),
        reset_token: token,
        new_password: formData.newPassword,
      });

      toast({
        title: 'Password reset!',
        description: 'Your password has been successfully reset',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onClose();
      
      // Redirect to login
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);
    } catch (error) {
      toast({
        title: 'Reset failed',
        description: error.response?.data?.detail || 'This reset link may have expired',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ newPassword: '', confirmPassword: '' });
    onClose();
  };

  if (!token || !userId) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} isCentered>
        <ModalOverlay backdropFilter="blur(8px)" />
        <ModalContent bg="primary.800" border="1px" borderColor="primary.600" color="white">
          <ModalHeader textAlign="center">Invalid Reset Link</ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={4}>
              <Text textAlign="center" color="gray.300">
                This password reset link is invalid or has expired.
                Please request a new reset link.
              </Text>
              <Button onClick={handleClose} colorScheme="accent" w="full">
                Close
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay backdropFilter="blur(8px)" />
      <ModalContent bg="primary.800" border="1px" borderColor="primary.600" color="white">
        <ModalHeader textAlign="center" borderBottom="1px" borderColor="primary.600">
          Set New Password
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={6}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <Text textAlign="center" color="gray.300">
                Please enter your new password below.
              </Text>

              <FormControl isRequired>
                <FormLabel color="gray.300">New Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    bg="primary.900"
                    borderColor="primary.500"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                    _focus={{
                      borderColor: 'accent.500',
                      boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      icon={showPassword ? <FiEyeOff /> : <FiEye />}
                      variant="ghost"
                      color="gray.400"
                      _hover={{ color: 'white' }}
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="gray.300">Confirm Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    bg="primary.900"
                    borderColor="primary.500"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                    _focus={{
                      borderColor: 'accent.500',
                      boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      icon={showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      variant="ghost"
                      color="gray.400"
                      _hover={{ color: 'white' }}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <Button
                type="submit"
                colorScheme="accent"
                w="full"
                isLoading={isLoading}
                isDisabled={!formData.newPassword || !formData.confirmPassword}
              >
                Reset Password
              </Button>
            </VStack>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ResetPasswordModal;