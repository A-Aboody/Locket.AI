import { Box, Container, Flex, Heading, Text, Icon, Image, useDisclosure, HStack, Alert, AlertIcon } from '@chakra-ui/react';
import { FiLock, FiShield, FiZap, FiCpu } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import AuthForm from '../custom_components/AuthForm';
import VerificationModal from '../custom_components/VerificationModal';
import ResetPasswordModal from '../custom_components/ResetPasswordModal';
import logo from '../assets/Locket.AI-Logo.png';

const AuthPage = () => {
  const [user, setUser] = useState(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const hasPendingFile = location.state?.hasPendingFile;

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
        // User is logged in but not verified
        // Do NOT auto-prompt - only show verification when they try to login
        // Clear the unverified session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, [navigate]);

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

    // Close verification modal
    onVerificationClose();

    // Navigate to organization onboarding page
    setTimeout(() => {
      navigate('/organization-onboarding');
    }, 500);
  };

  return (
    <Flex minH="100vh" bg="primary.950" position="relative" overflow="hidden">
      {/* Show alert if user needs to log in to view file */}
      {hasPendingFile && (
        <Box
          position="fixed"
          top={4}
          left="50%"
          transform="translateX(-50%)"
          zIndex={10000}
          w="90%"
          maxW="md"
        >
          <Alert
            status="info"
            bg="primary.800"
            borderRadius="md"
            border="1px"
            borderColor="accent.500"
          >
            <AlertIcon color="accent.500" />
            <Text color="gray.300">Please sign in to open the file</Text>
          </Alert>
        </Box>
      )}

      {/* Ambient background glows */}
      <Box
        position="absolute"
        top="20%"
        right="15%"
        w="500px"
        h="500px"
        bg="accent.500"
        opacity="0.08"
        borderRadius="full"
        filter="blur(100px)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="10%"
        left="10%"
        w="400px"
        h="400px"
        bg="purple.500"
        opacity="0.06"
        borderRadius="full"
        filter="blur(80px)"
        pointerEvents="none"
      />

      {/* Mobile Logo - Fixed at top */}
      <Box
        display={{ base: 'block', md: 'none' }}
        position="absolute"
        top={0}
        left={0}
        right={0}
        textAlign="center"
        py={6}
        zIndex={10}
        bg="primary.950"
        borderBottom="1px"
        borderColor="primary.700"
      >
        <Image src={logo} alt="Locket.AI" boxSize="64px" objectFit="contain" mx="auto" mb={3} />
        <Heading size="xl" color="white" mb={2} fontWeight="bold">
          LOCKET.AI
        </Heading>
        <Text color="accent.300" fontSize="sm" fontWeight="medium">
          LOCK IT WITH LOCKET
        </Text>
      </Box>

      {/* Desktop Layout - Split panels */}
      <Flex
        display={{ base: 'none', md: 'flex' }}
        w="100%"
        h="100vh"
        position="relative"
      >
        {/* Content Panel - Slides between left and right */}
        <Box
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          width="50%"
          transition="transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
          transform={isLogin ? 'translateX(0)' : 'translateX(100%)'}
          zIndex={1}
        >
          <Box
            position="absolute"
            inset={0}
            bg="primary.900"
            display="flex"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
          >
            {/* Animated gradient background */}
            <Box
              position="absolute"
              inset={0}
              bgGradient="linear(135deg, accent.500 0%, purple.600 50%, accent.600 100%)"
              opacity="0.15"
            />

            {/* Decorative grid pattern */}
            <Box
              position="absolute"
              inset={0}
              opacity="0.03"
              backgroundImage="linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)"
              backgroundSize="50px 50px"
            />

            {/* Glow orbs */}
            <Box
              position="absolute"
              top="30%"
              left="20%"
              w="200px"
              h="200px"
              bgGradient="radial(accent.400, transparent 70%)"
              opacity="0.2"
              filter="blur(40px)"
            />
            <Box
              position="absolute"
              bottom="20%"
              right="25%"
              w="250px"
              h="250px"
              bgGradient="radial(purple.400, transparent 70%)"
              opacity="0.15"
              filter="blur(50px)"
            />

            <Box position="relative" zIndex="1" textAlign="center" px={12} maxW="600px">
              {isLogin ? (
                <>
                  <Heading
                    size="2xl"
                    color="white"
                    mb={6}
                    fontWeight="bold"
                    lineHeight="1.1"
                  >
                    Welcome Back
                  </Heading>
                  <Text fontSize="xl" color="gray.300" lineHeight="1.6" maxW="500px" mx="auto">
                    Sign in to continue accessing your secure documents and AI-powered insights
                  </Text>
                </>
              ) : (
                <>
                  <Box position="relative" display="inline-block" mb={6}>
                    <Image src={logo} alt="Locket.AI" boxSize="80px" objectFit="contain" />
                    <Box
                      position="absolute"
                      top="50%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                      w="100px"
                      h="100px"
                      bgGradient="radial(accent.400, transparent 70%)"
                      opacity="0.4"
                      filter="blur(20px)"
                    />
                  </Box>
                  <Heading size="2xl" color="white" mb={2} fontWeight="bold">
                    LOCKET.AI
                  </Heading>
                  <Text fontSize="sm" color="accent.300" fontWeight="medium" mb={6}>
                    LOCK IT WITH LOCKET
                  </Text>
                  <Text fontSize="xl" color="gray.300" lineHeight="1.6" maxW="500px" mx="auto">
                    Your intelligent document management platform with AI-powered retrieval
                  </Text>
                </>
              )}

              {/* Feature badges */}
              <Flex gap={4} justify="center" mt={12} flexWrap="wrap">
                <HStack
                  px={4}
                  py={2}
                  bg="primary.800"
                  rounded="lg"
                  border="1px"
                  borderColor="primary.600"
                  spacing={2}
                  _hover={{ borderColor: 'accent.500' }}
                  transition="all 0.2s"
                >
                  <Icon as={FiShield} color="accent.500" boxSize={4} />
                  <Text color="gray.300" fontSize="sm">
                    Privacy First
                  </Text>
                </HStack>
                <HStack
                  px={4}
                  py={2}
                  bg="primary.800"
                  rounded="lg"
                  border="1px"
                  borderColor="primary.600"
                  spacing={2}
                  _hover={{ borderColor: 'accent.500' }}
                  transition="all 0.2s"
                >
                  <Icon as={FiZap} color="accent.500" boxSize={4} />
                  <Text color="gray.300" fontSize="sm">
                    Lightning Fast
                  </Text>
                </HStack>
                <HStack
                  px={4}
                  py={2}
                  bg="primary.800"
                  rounded="lg"
                  border="1px"
                  borderColor="primary.600"
                  spacing={2}
                  _hover={{ borderColor: 'accent.500' }}
                  transition="all 0.2s"
                >
                  <Icon as={FiCpu} color="accent.500" boxSize={4} />
                  <Text color="gray.300" fontSize="sm">
                    AI-Powered
                  </Text>
                </HStack>
              </Flex>
            </Box>
          </Box>
        </Box>

        {/* Auth Form Panel - Slides between left and right */}
        <Box
          position="absolute"
          right={0}
          top={0}
          bottom={0}
          width="50%"
          transition="transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
          transform={isLogin ? 'translateX(0)' : 'translateX(-100%)'}
          zIndex={2}
        >
          <Flex
            position="absolute"
            inset={0}
            bg="primary.950"
            alignItems="center"
            justifyContent="center"
            p={8}
          >
            <Box w="full" maxW="550px">
              <AuthForm
                isLogin={isLogin}
                onToggleMode={() => setIsLogin(!isLogin)}
                onAuthSuccess={handleAuthSuccess}
                onVerificationRequired={handleVerificationRequired}
              />
            </Box>
          </Flex>
        </Box>
      </Flex>

      {/* Mobile Layout */}
      <Flex
        display={{ base: 'flex', md: 'none' }}
        flexDirection="column"
        w="100%"
        minH="100vh"
        pt="200px"
        pb={8}
      >
        <Container maxW="480px" px={6}>
          <AuthForm
            isLogin={isLogin}
            onToggleMode={() => setIsLogin(!isLogin)}
            onAuthSuccess={handleAuthSuccess}
            onVerificationRequired={handleVerificationRequired}
          />
        </Container>
      </Flex>

      {/* Verification Modal */}
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

    </Flex>
  );
};

export default AuthPage;