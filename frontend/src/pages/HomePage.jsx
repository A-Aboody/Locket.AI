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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import DocumentUpload from '../custom_components/DocumentUpload';
import DocumentList from '../custom_components/DocumentList';
import DocumentViewer from '../custom_components/DocumentViewer';

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewingDocumentId, setViewingDocumentId] = useState(null);
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

  const handleUploadSuccess = () => {
    // Trigger document list refresh
    setRefreshTrigger(prev => prev + 1);
  };

  const handleViewDocument = (documentId) => {
    setViewingDocumentId(documentId);
  };

  const handleCloseViewer = () => {
    setViewingDocumentId(null);
  };

  if (!user) {
    return null;
  }

  return (
    <Box minH="100vh" bg="gray.100" py={8}>
      <Container maxW="container.xl">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box bg="white" p={6} rounded="lg" shadow="md">
            <HStack justify="space-between">
              <Box>
                <Heading size="lg">Document Retrieval System</Heading>
                <HStack mt={2}>
                  <Text color="gray.600">Welcome, {user.username}!</Text>
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

          {/* Main Content */}
          {viewingDocumentId ? (
            <DocumentViewer
              documentId={viewingDocumentId}
              onClose={handleCloseViewer}
            />
          ) : (
            <Tabs colorScheme="blue" variant="enclosed">
              <TabList>
                <Tab>My Documents</Tab>
                <Tab>Upload</Tab>
              </TabList>

              <TabPanels>
                <TabPanel p={0} pt={6}>
                  <DocumentList
                    refreshTrigger={refreshTrigger}
                    onViewDocument={handleViewDocument}
                  />
                </TabPanel>

                <TabPanel p={0} pt={6}>
                  <DocumentUpload onUploadSuccess={handleUploadSuccess} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default HomePage;