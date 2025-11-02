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
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
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
      localStorage.setItem('user', JSON.stringify(response.data.user));

      toast({
        title: 'Login successful!',
        description: `Welcome back, ${response.data.user.username}!`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/');
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
        description: `Welcome, ${response.data.user.username}!`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/');
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
    <Box
      bg="primary.700"
      boxShadow="2xl"
      rounded="xl"
      p={10}
      maxW="450px"
      mx="auto"
      border="1px"
      borderColor="primary.600"
    >
      {isLogin ? (
        <>
          <Heading size="lg" mb={8} color="white">
            Log In
          </Heading>

          <form onSubmit={handleLogin}>
            <VStack spacing={6}>
              <FormControl isRequired>
                <FormLabel color="gray.300" fontWeight="medium" mb={2}>
                  Email
                </FormLabel>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({ ...loginData, email: e.target.value })
                  }
                  size="lg"
                  bg="primary.800"
                  borderColor="primary.500"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="gray.300" fontWeight="medium" mb={2}>
                  Password
                </FormLabel>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  size="lg"
                  bg="primary.800"
                  borderColor="primary.500"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="accent"
                width="full"
                size="lg"
                isLoading={isLoading}
                mt={2}
                bg="accent.500"
                _hover={{ bg: 'accent.600' }}
              >
                Log In
              </Button>

              <Text color="gray.400" fontSize="sm" mt={4}>
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
          <Heading size="lg" mb={8} color="white">
            Create Account
          </Heading>

          <form onSubmit={handleRegister}>
            <VStack spacing={5}>
              <FormControl isRequired>
                <FormLabel color="gray.300" fontWeight="medium" mb={2}>
                  Username
                </FormLabel>
                <Input
                  type="text"
                  placeholder="Choose a username"
                  value={registerData.username}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, username: e.target.value })
                  }
                  size="lg"
                  bg="primary.800"
                  borderColor="primary.500"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="gray.300" fontWeight="medium" mb={2}>
                  Email
                </FormLabel>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={registerData.email}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, email: e.target.value })
                  }
                  size="lg"
                  bg="primary.800"
                  borderColor="primary.500"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.300" fontWeight="medium" mb={2}>
                  Full Name (Optional)
                </FormLabel>
                <Input
                  type="text"
                  placeholder="Your full name"
                  value={registerData.full_name}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, full_name: e.target.value })
                  }
                  size="lg"
                  bg="primary.800"
                  borderColor="primary.500"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="gray.300" fontWeight="medium" mb={2}>
                  Password
                </FormLabel>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={registerData.password}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, password: e.target.value })
                  }
                  size="lg"
                  bg="primary.800"
                  borderColor="primary.500"
                  color="white"
                  _placeholder={{ color: 'gray.500' }}
                />
                <Text fontSize="xs" color="gray.500" mt={2}>
                  Password must be at least 6 characters
                </Text>
              </FormControl>

              <Button
                type="submit"
                colorScheme="accent"
                width="full"
                size="lg"
                isLoading={isLoading}
                mt={2}
                bg="accent.500"
                _hover={{ bg: 'accent.600' }}
              >
                Sign Up
              </Button>

              <Text color="gray.400" fontSize="sm" mt={4}>
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
  );
};

export default AuthForm;