import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  InputGroup,
  InputRightElement,
  IconButton,
  useToast,
  Divider,
  Icon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { FiArrowLeft, FiEye, FiEyeOff, FiLock, FiUsers, FiChevronRight, FiAlertTriangle } from 'react-icons/fi';
import AppHeader from '../custom_components/AppHeader';
import PageTransition from '../custom_components/PageTransition';
import { authAPI } from '../utils/api';

const SettingsPage = () => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const handleChangePassword = async (e) => {
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

      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
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

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <Box minH="100vh" bg="background.primary">
      <AppHeader user={user} />

      <Box h="calc(100vh - 73px)" overflowY="auto">
        <PageTransition>
          <Container maxW="container.lg" py={8} px={8}>
            {/* Header */}
            <HStack mb={6} spacing={3}>
              <IconButton
                icon={<FiArrowLeft />}
                onClick={() => navigate(-1)}
                aria-label="Go back"
                variant="ghost"
                color="gray.500"
                size="sm"
                rounded="md"
                _hover={{
                  bg: 'primary.700',
                  color: 'white',
                }}
              />
              <Text fontSize="xl" fontWeight="600" color="white" letterSpacing="-0.01em">
                Settings
              </Text>
            </HStack>

            {/* Settings Content */}
            <VStack spacing={0} align="stretch" divider={<Divider borderColor="primary.600" />}>
              {/* Account Section */}
              <Box py={6}>
                <Text color="white" fontSize="sm" fontWeight="600" mb={4}>
                  Account Information
                </Text>

                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel color="gray.300" fontSize="sm" fontWeight="500" mb={2}>
                      Username
                    </FormLabel>
                    <Input
                      value={user.username}
                      isReadOnly
                      bg="primary.800"
                      border="1px"
                      borderColor="primary.600"
                      color="gray.500"
                      cursor="not-allowed"
                      size="md"
                      rounded="md"
                      _hover={{ borderColor: 'primary.600' }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel color="gray.300" fontSize="sm" fontWeight="500" mb={2}>
                      Email
                    </FormLabel>
                    <Input
                      value={user.email}
                      isReadOnly
                      bg="primary.800"
                      border="1px"
                      borderColor="primary.600"
                      color="gray.500"
                      cursor="not-allowed"
                      size="md"
                      rounded="md"
                      _hover={{ borderColor: 'primary.600' }}
                    />
                  </FormControl>
                </VStack>
              </Box>

              {/* Organization Section */}
              <Box py={6}>
                <Text color="white" fontSize="sm" fontWeight="600" mb={4}>
                  Organization
                </Text>

                {user.organization_id ? (
                  <Box
                    bg="primary.800"
                    border="1px"
                    borderColor="primary.600"
                    borderRadius="md"
                    p={4}
                    _hover={{ borderColor: 'accent.500', cursor: 'pointer' }}
                    transition="all 0.2s"
                    onClick={() => navigate('/organization-settings')}
                  >
                    <HStack justify="space-between">
                      <HStack spacing={3}>
                        <Icon as={FiUsers} color="accent.500" boxSize={5} />
                        <VStack align="start" spacing={0}>
                          <Text color="white" fontWeight="500" fontSize="sm">
                            {user.organization_name || 'My Organization'}
                          </Text>
                          <Text color="gray.400" fontSize="xs">
                            {user.org_role === 'admin' ? 'Administrator' : 'Member'}
                          </Text>
                        </VStack>
                      </HStack>
                      <Icon as={FiChevronRight} color="gray.500" boxSize={5} />
                    </HStack>
                  </Box>
                ) : (
                  <Box
                    bg="primary.800"
                    border="1px"
                    borderColor="primary.600"
                    borderRadius="md"
                    p={4}
                    textAlign="center"
                  >
                    <Text color="gray.400" fontSize="sm" mb={3}>
                      You are not in an organization
                    </Text>
                    <Button
                      size="sm"
                      colorScheme="accent"
                      leftIcon={<FiUsers />}
                      onClick={() => navigate('/organization-onboarding')}
                    >
                      Create or Join Organization
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Change Password Section */}
              <Box py={6}>
                <Text color="white" fontSize="sm" fontWeight="600" mb={4}>
                  Security
                </Text>

                <form onSubmit={handleChangePassword}>
                  <VStack spacing={4} align="stretch">
                    <FormControl isRequired>
                      <FormLabel color="gray.300" fontSize="sm" fontWeight="500" mb={2}>
                        Current Password
                      </FormLabel>
                      <InputGroup size="md">
                        <Input
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="Enter current password"
                          value={formData.currentPassword}
                          onChange={(e) =>
                            setFormData({ ...formData, currentPassword: e.target.value })
                          }
                          bg="primary.800"
                          border="1px"
                          borderColor="primary.600"
                          color="white"
                          rounded="md"
                          _placeholder={{ color: 'gray.600' }}
                          _hover={{ borderColor: 'primary.500' }}
                          _focus={{
                            borderColor: 'accent.500',
                            boxShadow: 'none',
                          }}
                        />
                        <InputRightElement>
                          <IconButton
                            aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                            icon={showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                            variant="ghost"
                            color="gray.500"
                            size="sm"
                            _hover={{ color: 'white', bg: 'transparent' }}
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel color="gray.300" fontSize="sm" fontWeight="500" mb={2}>
                        New Password
                      </FormLabel>
                      <InputGroup size="md">
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="At least 6 characters"
                          value={formData.newPassword}
                          onChange={(e) =>
                            setFormData({ ...formData, newPassword: e.target.value })
                          }
                          bg="primary.800"
                          border="1px"
                          borderColor="primary.600"
                          color="white"
                          rounded="md"
                          _placeholder={{ color: 'gray.600' }}
                          _hover={{ borderColor: 'primary.500' }}
                          _focus={{
                            borderColor: 'accent.500',
                            boxShadow: 'none',
                          }}
                        />
                        <InputRightElement>
                          <IconButton
                            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                            icon={showNewPassword ? <FiEyeOff /> : <FiEye />}
                            variant="ghost"
                            color="gray.500"
                            size="sm"
                            _hover={{ color: 'white', bg: 'transparent' }}
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel color="gray.300" fontSize="sm" fontWeight="500" mb={2}>
                        Confirm New Password
                      </FormLabel>
                      <InputGroup size="md">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter new password"
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            setFormData({ ...formData, confirmPassword: e.target.value })
                          }
                          bg="primary.800"
                          border="1px"
                          borderColor="primary.600"
                          color="white"
                          rounded="md"
                          _placeholder={{ color: 'gray.600' }}
                          _hover={{ borderColor: 'primary.500' }}
                          _focus={{
                            borderColor: 'accent.500',
                            boxShadow: 'none',
                          }}
                        />
                        <InputRightElement>
                          <IconButton
                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            icon={showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                            variant="ghost"
                            color="gray.500"
                            size="sm"
                            _hover={{ color: 'white', bg: 'transparent' }}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    <Button
                      type="submit"
                      bg="accent.500"
                      color="white"
                      size="md"
                      rounded="md"
                      fontWeight="500"
                      _hover={{ bg: 'accent.600' }}
                      _active={{ bg: 'accent.700' }}
                      isLoading={isLoading}
                      isDisabled={
                        !formData.currentPassword ||
                        !formData.newPassword ||
                        !formData.confirmPassword
                      }
                      mt={1}
                      transition="all 0.15s"
                    >
                      Update Password
                    </Button>
                  </VStack>
                </form>
              </Box>
            </VStack>
          </Container>
        </PageTransition>
      </Box>
    </Box>
  );
};

export default SettingsPage;
