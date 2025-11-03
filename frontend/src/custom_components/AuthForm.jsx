import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
  Heading,
  Link,
  IconButton,
  Checkbox,
  HStack,
  InputGroup,
  InputRightElement,
} from '@chakra-ui/react';
import { FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import ForgotPasswordModal from './ForgotPasswordModal';

const AuthForm = ({ onAuthSuccess, onClose, onVerificationRequired }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const [loginData, setLoginData] = useState({ 
    email: '', 
    password: '',
    remember_me: false 
  });
  
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await authAPI.login(loginData);
      localStorage.setItem('token', response.data.access_token);
      
      if (response.data.refresh_token && loginData.remember_me) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
      }
      
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Check if verification is required
      if (response.data.requires_verification && !response.data.user.email_verified) {
        if (onVerificationRequired) {
          onVerificationRequired(response.data.user);
          // Close the auth form modal so verification modal can be shown
          if (onClose) {
            onClose();
          }
          return;
        }
      }

      toast({
        title: 'Login successful!',
        description: `Welcome back, ${response.data.user.username}!`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      if (onAuthSuccess) onAuthSuccess(response.data.user);
      else navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Login failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await authAPI.register({
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
        full_name: registerData.full_name || null,
      });

      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      toast({
        title: 'Account created!',
        description: response.data.message || 'Please check your email for verification code',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Always show verification for new registrations
      if (onVerificationRequired) {
        onVerificationRequired(response.data.user);
        // Close the auth form modal so verification modal can be shown
        if (onClose) {
          onClose();
        }
      }
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Box
        position="relative"
        bg="primary.800"
        border="1px solid"
        borderColor="primary.600"
        rounded="xl"
        p={{ base: 6, md: 8 }}
        w="100%"
        maxW="400px"
        mx="auto"
        boxShadow="2xl"
      >
        {onClose && (
          <IconButton
            icon={<FiX />}
            aria-label="Close"
            onClick={onClose}
            position="absolute"
            top="10px"
            right="10px"
            size="sm"
            variant="ghost"
            color="gray.300"
            _hover={{ color: 'white', bg: 'primary.700' }}
          />
        )}

        {isLogin ? (
          <>
            <Heading size="lg" mb={6} color="white" textAlign="center">
              Log In
            </Heading>
            <form onSubmit={handleLogin}>
              <VStack spacing={5}>
                <FormControl isRequired>
                  <FormLabel color="gray.300" mb={1}>
                    Email or Username
                  </FormLabel>
                  <Input
                    type="text"
                    placeholder="Enter your email or username"
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    bg="primary.900"
                    borderColor="primary.500"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="gray.300" mb={1}>
                    Password
                  </FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      bg="primary.900"
                      borderColor="primary.500"
                      color="white"
                      _placeholder={{ color: 'gray.500' }}
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

                <HStack w="full" justify="space-between">
                  <Checkbox
                    colorScheme="accent"
                    isChecked={loginData.remember_me}
                    onChange={(e) => setLoginData({ ...loginData, remember_me: e.target.checked })}
                    color="gray.300"
                  >
                    Remember me
                  </Checkbox>
                  
                  <Link
                    color="accent.400"
                    fontSize="sm"
                    onClick={() => setShowForgotPassword(true)}
                    cursor="pointer"
                    _hover={{ color: 'accent.300' }}
                  >
                    Forgot password?
                  </Link>
                </HStack>

                <Button
                  type="submit"
                  colorScheme="accent"
                  width="full"
                  isLoading={isLoading}
                  mt={2}
                >
                  Log In
                </Button>

                <Text color="gray.400" fontSize="sm" textAlign="center">
                  Don't have an account?{' '}
                  <Link
                    color="accent.400"
                    fontWeight="semibold"
                    onClick={() => setIsLogin(false)}
                    cursor="pointer"
                    _hover={{ color: 'accent.300' }}
                  >
                    Sign Up
                  </Link>
                </Text>
              </VStack>
            </form>
          </>
        ) : (
          <>
            <Heading size="lg" mb={6} color="white" textAlign="center">
              Create Account
            </Heading>
            <form onSubmit={handleRegister}>
              <VStack spacing={5}>
                <FormControl isRequired>
                  <FormLabel color="gray.300" mb={1}>
                    Username
                  </FormLabel>
                  <Input
                    type="text"
                    placeholder="Choose a username"
                    value={registerData.username}
                    onChange={(e) =>
                      setRegisterData({
                        ...registerData,
                        username: e.target.value,
                      })
                    }
                    bg="primary.900"
                    borderColor="primary.500"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="gray.300" mb={1}>
                    Email
                  </FormLabel>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={registerData.email}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, email: e.target.value })
                    }
                    bg="primary.900"
                    borderColor="primary.500"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.300" mb={1}>
                    Full Name (optional)
                  </FormLabel>
                  <Input
                    type="text"
                    placeholder="Your full name"
                    value={registerData.full_name}
                    onChange={(e) =>
                      setRegisterData({
                        ...registerData,
                        full_name: e.target.value,
                      })
                    }
                    bg="primary.900"
                    borderColor="primary.500"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="gray.300" mb={1}>
                    Password
                  </FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          password: e.target.value,
                        })
                      }
                      bg="primary.900"
                      borderColor="primary.500"
                      color="white"
                      _placeholder={{ color: 'gray.500' }}
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

                <Button
                  type="submit"
                  colorScheme="accent"
                  width="full"
                  isLoading={isLoading}
                  mt={2}
                >
                  Sign Up
                </Button>

                <Text color="gray.400" fontSize="sm" textAlign="center">
                  Already have an account?{' '}
                  <Link
                    color="accent.400"
                    fontWeight="semibold"
                    onClick={() => setIsLogin(true)}
                    cursor="pointer"
                    _hover={{ color: 'accent.300' }}
                  >
                    Log In
                  </Link>
                </Text>
              </VStack>
            </form>
          </>
        )}
      </Box>

      <ForgotPasswordModal 
        isOpen={showForgotPassword} 
        onClose={() => setShowForgotPassword(false)} 
      />
    </>
  );
};

export default AuthForm;