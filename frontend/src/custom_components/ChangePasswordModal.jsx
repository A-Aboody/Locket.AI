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
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { authAPI } from '../utils/api';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both new passwords are identical',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'New password must be at least 6 characters long',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.changePassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
      });

      toast({
        title: 'Password updated!',
        description: 'Your password has been successfully changed',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      handleClose();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error.response?.data?.detail || 'Current password is incorrect',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay backdropFilter="blur(8px)" />
      <ModalContent bg="primary.800" border="1px" borderColor="primary.600" color="white">
        <ModalHeader textAlign="center" borderBottom="1px" borderColor="primary.600">
          Change Password
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={6}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="gray.300">Current Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter your current password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
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
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                      icon={showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                      variant="ghost"
                      color="gray.400"
                      _hover={{ color: 'white' }}
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="gray.300">New Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
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
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      icon={showNewPassword ? <FiEyeOff /> : <FiEye />}
                      variant="ghost"
                      color="gray.400"
                      _hover={{ color: 'white' }}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="gray.300">Confirm New Password</FormLabel>
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
                isDisabled={!formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
              >
                Update Password
              </Button>
            </VStack>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ChangePasswordModal;