import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Badge,
} from '@chakra-ui/react';

const HomePage = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      navigate('/auth');
      return;
    }

    setUser(JSON.parse(storedUser));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  if (!user) {
    return null;
  }

  return (
    <Box minH="100vh" bg="gray.100" py={8}>
      <Container maxW="container.xl">
        <VStack spacing={6} align="stretch">
          <Box bg="white" p={6} rounded="lg" shadow="md">
            <HStack justify="space-between">
              <Box>
                <Heading size="lg">Welcome, {user.username}!</Heading>
                <HStack mt={2}>
                  <Text color="gray.600">{user.email}</Text>
                  <Badge colorScheme={user.role === 'admin' ? 'purple' : 'blue'}>
                    {user.role}
                  </Badge>
                </HStack>
              </Box>
              <Button colorScheme="red" onClick={handleLogout}>
                Logout
              </Button>
            </HStack>
          </Box>

          <Box bg="white" p={8} rounded="lg" shadow="md" minH="400px">
            <Heading size="md" mb={4}>Dashboard</Heading>
            <Text color="gray.600">
              Home page. Content will be added here later.
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default HomePage;