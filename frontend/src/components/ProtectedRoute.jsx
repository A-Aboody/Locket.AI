import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Spinner, Center, Text, VStack } from '@chakra-ui/react';
import { authAPI } from '../utils/api';
import { usePendingFile } from '../contexts/PendingFileContext';

const ProtectedRoute = ({ children, requireVerification = true }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isVerified, setIsVerified] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const { pendingFilePath } = usePendingFile();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      // First check: Do we have token and user in localStorage?
      if (!token || !storedUser) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Parse user data to check verification status
      let userData;
      try {
        userData = JSON.parse(storedUser);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        // Invalid user data, clear and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Second check: Verify token is still valid with the backend
      try {
        const response = await authAPI.verifyToken();

        // Token is valid
        setIsAuthenticated(true);

        // Check verification status
        if (requireVerification) {
          setIsVerified(userData.email_verified === true);
        } else {
          setIsVerified(true); // Don't require verification for this route
        }
      } catch (error) {
        // Token is invalid or expired
        console.error('Token verification failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setIsVerified(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box minH="100vh" bg="background.primary">
        <Center h="100vh">
          <VStack spacing={4}>
            <Spinner size="xl" color="accent.500" thickness="4px" />
            <Text color="gray.400">Verifying authentication...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  // Not authenticated - redirect to auth page
  if (isAuthenticated === false) {
    return (
      <Navigate
        to="/auth"
        state={{
          from: location,
          hasPendingFile: !!pendingFilePath,
        }}
        replace
      />
    );
  }

  // Authenticated but not verified (and verification is required)
  if (isAuthenticated === true && requireVerification && isVerified === false) {
    return (
      <Navigate
        to="/auth"
        state={{
          from: location,
          needsVerification: true,
          hasPendingFile: !!pendingFilePath,
        }}
        replace
      />
    );
  }

  // All checks passed - render the protected content
  return children;
};

export default ProtectedRoute;
