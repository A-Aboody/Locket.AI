import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  useToast,
  Flex,
} from '@chakra-ui/react';
import SearchBar from '../custom_components/SearchBar';
import DocumentUpload from '../custom_components/DocumentUpload';
import FloatingMenu from '../custom_components/FloatingMenu';
import AppHeader from '../custom_components/AppHeader';
import NavTabs from '../custom_components/NavTabs';
import PageTransition from '../custom_components/PageTransition';
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
      <AppHeader user={user} />

      <Flex h="calc(100vh - 73px)">
        <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
          <NavTabs />

          {/* Search Bar */}
          <Box bg="primary.800" borderBottom="1px" borderColor="primary.600">
            <Box px={6} pt={4} pb={2}>
              <SearchBar onSearch={handleSearch} isLoading={false} />
            </Box>
          </Box>

          <Box flex={1} overflowY="auto" p={6}>
            <PageTransition>
              <Container maxW="container.md">
                <DocumentUpload onUploadSuccess={handleUploadSuccess} />
              </Container>
            </PageTransition>
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