import { Box, Container, Flex, Heading, Text, Icon, HStack } from '@chakra-ui/react';
import { FiLock } from 'react-icons/fi';
import AuthForm from '../custom_components/AuthForm';

const AuthPage = () => {
  return (
    <Box minH="100vh" bg="background.primary" py={12}>
      <Container maxW="container.sm">
        <Box textAlign="center" mb={10}>
          <HStack justify="center" mb={4}>
            <Icon as={FiLock} boxSize={12} color="accent.500" />
          </HStack>
          <Heading size="2xl" mb={3} color="white" fontWeight="bold">
            Document Retrieval System
          </Heading>
          <Text color="gray.400" fontSize="lg">
            Secure access to your intelligent document management platform
          </Text>
        </Box>

        <AuthForm />
      </Container>
    </Box>
  );
};

export default AuthPage;