import { Box, Container, Flex, Heading, Text, Icon, HStack, useDisclosure } from '@chakra-ui/react';
import { FiLock, FiMail } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthForm from '../custom_components/AuthForm';
import VerificationModal from '../custom_components/VerificationModal';
import ResetPasswordModal from '../custom_components/ResetPasswordModal';

const AuthPage = () => {
  const [user, setUser] = useState(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { 
    isOpen: isVerificationOpen, 
    onOpen: onVerificationOpen, 
    onClose: onVerificationClose 
  } = useDisclosure();
  
  const { 
    isOpen: isResetOpen, 
    onOpen: onResetOpen, 
    onClose: onResetClose 
  } = useDisclosure();

  // Check for reset password token in URL
  useEffect(() => {
    const token = searchParams.get('token');
    const userId = searchParams.get('user_id');
    
    if (token && userId) {
      onResetOpen();
    }
  }, [searchParams, onResetOpen]);

  // Check if user is already verified and logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData.email_verified) {
        // User is verified, redirect to dashboard
        navigate('/dashboard');
      } else {
        // User is logged in but not verified, show verification modal
        setUser(userData);
        setRequiresVerification(true);
        onVerificationOpen();
      }
    }
  }, [navigate, onVerificationOpen]);

  const handleAuthSuccess = (userData) => {
    // Only called when user is fully authenticated and verified
    navigate('/dashboard');
  };

  const handleVerificationRequired = (userData) => {
    setUser(userData);
    setRequiresVerification(true);
    // Open verification modal immediately
    onVerificationOpen();
  };

  const handleVerificationComplete = (verifiedUser) => {
    setUser(verifiedUser);
    setRequiresVerification(false);
    
    // Redirect to dashboard after successful verification
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <Box minH="100vh" bg="background.primary" py={12}>
      <Container maxW="container.sm">
        <Box textAlign="center" mb={10}>
          <HStack justify="center" mb={4}>
            <Icon as={FiLock} boxSize={12} color="accent.500" />
          </HStack>
          <Heading size="2xl" mb={3} color="white" fontWeight="bold">
            Locket.AI
          </Heading>
          <Text color="gray.400" fontSize="lg">
            Secure access to your intelligent document management platform
          </Text>
        </Box>

        <AuthForm 
          onAuthSuccess={handleAuthSuccess}
          onVerificationRequired={handleVerificationRequired}
        />

        {/* Verification Modal - Blocks access until verified */}
        <VerificationModal
          isOpen={isVerificationOpen}
          onClose={onVerificationClose}
          user={user}
          onVerificationComplete={handleVerificationComplete}
        />

        {/* Reset Password Modal */}
        <ResetPasswordModal
          isOpen={isResetOpen}
          onClose={onResetClose}
        />
      </Container>
    </Box>
  );
};

export default AuthPage;