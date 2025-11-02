import { Box, VStack, Text, Button, Icon, Heading } from '@chakra-ui/react';
import { FiHome, FiFile, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Box minH="100vh" bg="background.primary" display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={8} textAlign="center" px={6}>
        {/* 404 Number */}
        <Box>
          <Heading
            fontSize={{ base: '120px', md: '180px' }}
            fontWeight="bold"
            color="primary.600"
            lineHeight="1"
            opacity="0.8"
          >
            404
          </Heading>
        </Box>

        {/* Message */}
        <VStack spacing={4}>
          <Heading size="xl" color="white" fontWeight="semibold">
            Page Not Found
          </Heading>
          <Text fontSize="lg" color="gray.400" maxW="md">
            The page you're looking for doesn't exist or has been moved.
          </Text>
        </VStack>

        {/* Action Buttons */}
        <VStack spacing={4} pt={4}>
          <Button
            leftIcon={<FiArrowLeft />}
            onClick={() => navigate(-1)}
            variant="outline"
            color="accent.500"
            borderColor="accent.500"
            _hover={{ bg: 'accent.500', color: 'white' }}
            size="lg"
          >
            Go Back
          </Button>
          
          <Button
            leftIcon={<FiHome />}
            onClick={() => navigate('/')}
            colorScheme="accent"
            bg="accent.500"
            _hover={{ bg: 'accent.600' }}
            size="lg"
          >
            Go Home
          </Button>
        </VStack>

        {/* Quick Links */}
        <VStack spacing={3} pt={8}>
          <Text color="gray.500" fontSize="sm">
            Or try one of these pages:
          </Text>
          <Box display="flex" gap={4} flexWrap="wrap" justifyContent="center">
            <Button
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'accent.400', bg: 'primary.700' }}
              onClick={() => navigate('/documents')}
              leftIcon={<FiFile />}
              size="sm"
            >
              All Documents
            </Button>
            <Button
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'accent.400', bg: 'primary.700' }}
              onClick={() => navigate('/my-uploads')}
              leftIcon={<FiFile />}
              size="sm"
            >
              My Uploads
            </Button>
            <Button
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'accent.400', bg: 'primary.700' }}
              onClick={() => navigate('/upload')}
              leftIcon={<FiFile />}
              size="sm"
            >
              Upload
            </Button>
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
};

export default NotFoundPage;