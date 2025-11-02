import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  Badge,
  Icon,
  useToast,
  Tabs,
  TabList,
  Tab,
  Flex,
} from '@chakra-ui/react';
import { FiLock } from 'react-icons/fi';
import SearchBar from '../custom_components/SearchBar';
import DocumentUpload from '../custom_components/DocumentUpload';
import FloatingMenu from '../custom_components/FloatingMenu';
import { searchAPI } from '../utils/api';

const UploadPage = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

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

  const handleProfile = () => {
    toast({
      title: 'Profile',
      description: 'Profile management coming soon!',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleSettings = () => {
    toast({
      title: 'Settings',
      description: 'Settings panel coming soon!',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleUploadSuccess = () => {
    toast({
      title: 'Document uploaded',
      description: 'Your document has been uploaded and indexed successfully',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

    navigate('/my-uploads');
  };

  const handleSearch = () => {
    // Placeholder - search not needed on upload page
  };

  if (!user) {
    return null;
  }

  return (
    <Box minH="100vh" bg="background.primary">
      <Box
        bg="primary.800"
        borderBottom="1px"
        borderColor="primary.600"
        px={6}
        py={4}
        position="sticky"
        top={0}
        zIndex={100}
      >
        <HStack justify="space-between">
          <HStack spacing={4}>
            <Icon as={FiLock} boxSize={6} color="accent.500" />
            <Heading size="md" color="white" fontWeight="bold">
              LOCKET.AI
            </Heading>
          </HStack>

          <HStack spacing={4}>
            <Text color="gray.400" fontSize="sm">
              {user.username}
            </Text>
            <Badge
              colorScheme={user.role === 'admin' ? 'purple' : 'accent'}
              fontSize="xs"
              px={3}
              py={1}
            >
              {user.role}
            </Badge>
          </HStack>
        </HStack>
      </Box>

      <Flex h="calc(100vh - 73px)">
        <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
          <Box bg="primary.800" borderBottom="1px" borderColor="primary.600">
            <Box px={6} pt={4} pb={2}>
              <SearchBar onSearch={handleSearch} isLoading={false} />
            </Box>
            
            <Tabs colorScheme="accent" variant="line" px={6} defaultIndex={3}>
              <TabList borderBottom="none">
                <Tab
                  color="gray.400"
                  _selected={{ color: 'accent.500', borderColor: 'accent.500' }}
                  onClick={() => navigate('/')}
                >
                  Home
                </Tab>
                <Tab
                  color="gray.400"
                  _selected={{ color: 'accent.500', borderColor: 'accent.500' }}
                  onClick={() => navigate('/documents')}
                >
                  Documents
                </Tab>
                <Tab
                  color="gray.400"
                  _selected={{ color: 'accent.500', borderColor: 'accent.500' }}
                  onClick={() => navigate('/my-uploads')}
                >
                  My Uploads
                </Tab>
                <Tab
                  color="gray.400"
                  _selected={{ color: 'accent.500', borderColor: 'accent.500' }}
                >
                  Upload
                </Tab>
              </TabList>
            </Tabs>
          </Box>

          <Box flex={1} overflowY="auto" p={6}>
            <Container maxW="container.md">
              <DocumentUpload onUploadSuccess={handleUploadSuccess} />
            </Container>
          </Box>
        </Box>
      </Flex>

      <FloatingMenu
        onProfile={handleProfile}
        onSettings={handleSettings}
        onLogout={handleLogout}
      />
    </Box>
  );
};

export default UploadPage;