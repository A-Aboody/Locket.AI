import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Text,
  Input,
  Button,
  useToast,
  HStack,
  PinInput,
  PinInputField,
  Box,
  Alert,
  AlertIcon,
  Progress,
} from '@chakra-ui/react';
import { authAPI } from '../utils/api';

const VerificationModal = ({ isOpen, onClose, user, onVerificationComplete }) => {
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const toast = useToast();

  // Countdown timer for resend
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const startCountdown = () => {
    setCountdown(30); // 30 seconds countdown
  };

  const handleVerification = async () => {
    const code = verificationCode.join('');
    
    if (code.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter the 6-digit verification code',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.verifyEmail({
        user_id: user.id,
        verification_code: code,
      });

      // Update local storage with verified status
      const updatedUser = { ...user, email_verified: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast({
        title: 'Email verified!',
        description: 'Your email has been successfully verified',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      if (onVerificationComplete) {
        onVerificationComplete(updatedUser);
      }
      
      onClose();
    } catch (error) {
      toast({
        title: 'Verification failed',
        description: error.response?.data?.detail || 'Invalid verification code',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      await authAPI.resendVerification();
      startCountdown();
      
      toast({
        title: 'Code sent!',
        description: 'A new verification code has been sent to your email',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to resend code',
        description: error.response?.data?.detail || 'Please try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsResending(false);
    }
  };

  const handlePinChange = (index, value) => {
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace to focus previous input
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      isCentered 
      closeOnOverlayClick={false}
      size="md"
    >
      <ModalOverlay backdropFilter="blur(8px)" />
      <ModalContent bg="primary.800" border="1px" borderColor="primary.600" color="white">
        <ModalHeader textAlign="center" borderBottom="1px" borderColor="primary.600">
          Verify Your Email
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={6}>
          <VStack spacing={6}>
            <Alert status="info" borderRadius="md" bg="accent.500" color="white">
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">Verification Required</Text>
                <Text fontSize="sm">
                  You need to verify your email before accessing the application
                </Text>
              </Box>
            </Alert>

            <Text textAlign="center" color="gray.300">
              We've sent a 6-digit verification code to{' '}
              <Text as="span" fontWeight="bold" color="white">
                {user?.email}
              </Text>
            </Text>

            <VStack spacing={4} w="full">
              <Text fontSize="sm" color="gray.400" textAlign="center">
                Enter the code below:
              </Text>
              
              <HStack spacing={3} justify="center">
                {verificationCode.map((digit, index) => (
                  <PinInput key={index} otp>
                    <PinInputField
                      id={`pin-${index}`}
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      bg="primary.900"
                      borderColor="primary.500"
                      color="white"
                      fontSize="lg"
                      fontWeight="bold"
                      textAlign="center"
                      w="45px"
                      h="45px"
                      _focus={{
                        borderColor: 'accent.500',
                        boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
                      }}
                    />
                  </PinInput>
                ))}
              </HStack>
            </VStack>

            <VStack spacing={3} w="full">
              <Button
                colorScheme="accent"
                w="full"
                onClick={handleVerification}
                isLoading={isLoading}
                isDisabled={verificationCode.join('').length !== 6}
                size="lg"
              >
                Verify Email
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendCode}
                isLoading={isResending}
                isDisabled={countdown > 0}
                color="gray.400"
                _hover={{ color: 'white', bg: 'primary.700' }}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
              </Button>

              {countdown > 0 && (
                <Progress 
                  value={((30 - countdown) / 30) * 100} 
                  size="xs" 
                  colorScheme="accent" 
                  w="full" 
                  borderRadius="full"
                />
              )}
            </VStack>

            <Box textAlign="center">
              <Text fontSize="xs" color="gray.500">
                Didn't receive the email? Check your spam folder or try resending.
              </Text>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default VerificationModal;