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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Heading,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const AuthForm = () => {
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
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: loginData.email,
        password: loginData.password,
      });

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
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
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
    <Box bg="white" boxShadow="xl" rounded="lg" p={8} maxW="500px" mx="auto">
      <Tabs isFitted variant="enclosed">
        <TabList mb={6}>
          <Tab color="gray.700" _selected={{ color: 'blue.600', borderColor: 'blue.600' }}>
            Login
          </Tab>
          <Tab color="gray.700" _selected={{ color: 'blue.600', borderColor: 'blue.600' }}>
            Sign Up
          </Tab>
        </TabList>

        <TabPanels>
          {/* Login Panel */}
          <TabPanel>
            <Heading size="md" mb={6} textAlign="center" color="black">
              Welcome Back
            </Heading>

            <form onSubmit={handleLogin}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel color="black" fontWeight="medium">Email</FormLabel>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    bg="white"
                    color="black"
                    borderColor="gray.300"
                    _placeholder={{ color: 'gray.400' }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="black" fontWeight="medium">Password</FormLabel>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    bg="white"
                    color="black"
                    borderColor="gray.300"
                    _placeholder={{ color: 'gray.400' }}
                  />
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  width="full"
                  isLoading={isLoading}
                  mt={2}
                >
                  Login
                </Button>
              </VStack>
            </form>
          </TabPanel>

          {/* Sign Up Panel */}
          <TabPanel>
            <Heading size="md" mb={6} textAlign="center" color="black">
              Create Account
            </Heading>

            <form onSubmit={handleRegister}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel color="black" fontWeight="medium">Username</FormLabel>
                  <Input
                    type="text"
                    placeholder="Choose a username"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    bg="white"
                    color="black"
                    borderColor="gray.300"
                    _placeholder={{ color: 'gray.400' }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="black" fontWeight="medium">Email</FormLabel>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    bg="white"
                    color="black"
                    borderColor="gray.300"
                    _placeholder={{ color: 'gray.400' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel color="black" fontWeight="medium">Full Name (Optional)</FormLabel>
                  <Input
                    type="text"
                    placeholder="Your full name"
                    value={registerData.full_name}
                    onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                    bg="white"
                    color="black"
                    borderColor="gray.300"
                    _placeholder={{ color: 'gray.400' }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="black" fontWeight="medium">Password</FormLabel>
                  <Input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    bg="white"
                    color="black"
                    borderColor="gray.300"
                    _placeholder={{ color: 'gray.400' }}
                  />
                  <Text fontSize="xs" color="gray.600" mt={1}>
                    Password must be at least 6 characters
                  </Text>
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  width="full"
                  isLoading={isLoading}
                  mt={2}
                >
                  Sign Up
                </Button>
              </VStack>
            </form>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default AuthForm;