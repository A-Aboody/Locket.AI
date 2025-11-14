import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  useToast,
  Flex,
  IconButton,
  Tooltip,
  HStack,
  Text,
} from '@chakra-ui/react';
import { FiArrowLeft } from 'react-icons/fi';
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
  const location = useLocation();
  const toast = useToast();

  // Store the previous page when component mounts
  const previousPage = location.state?.from || '/dashboard';

  useEffect(() => {
    // Get user data from localStorage (ProtectedRoute already verified auth)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

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
    navigate('/settings');
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

  const handleBack = () => {
    navigate(previousPage);
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
                {/* Back Button and Title */}
                <HStack mb={6} spacing={4}>
                    <IconButton
                      icon={<FiArrowLeft />}
                      onClick={handleBack}
                      aria-label="Go back"
                      size="md"
                      variant="ghost"
                      colorScheme="gray"
                      color="gray.400"
                      borderRadius="lg"
                      _hover={{
                        bg: 'primary.700',
                        color: 'accent.400',
                        transform: 'translateX(-2px)',
                      }}
                      _active={{
                        bg: 'primary.600',
                        transform: 'translateX(0)',
                      }}
                      transition="all 0.2s ease-in-out"
                    />
                  <Text fontSize="2xl" fontWeight="bold" color="white">
                    Upload Document
                  </Text>
                </HStack>

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
        onViewDocument={undefined}
      />
    </Box>
  );
};

export default UploadPage;