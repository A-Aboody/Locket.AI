import { Box, Container, Flex, Heading, Text } from '@chakra-ui/react';
import AuthForm from '../custom_components/AuthForm';

const AuthPage = () => {
  return (
    <Box minH="100vh" bg="gray.100" py={12}>
      <Container maxW="container.sm">
        <Box textAlign="center" mb={10}>
          <Heading size="2xl" mb={3} color="gray.800">
            Document Retrieval System
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Sign in to access your documents or create a new account
          </Text>
        </Box>

        <AuthForm />
      </Container>
    </Box>
  );
};

export default AuthPage;