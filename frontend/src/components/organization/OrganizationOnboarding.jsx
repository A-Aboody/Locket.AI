import { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Box,
  Text,
  SimpleGrid,
  Icon,
  useColorModeValue,
  Heading,
} from '@chakra-ui/react';
import { FiUser, FiUsers, FiPlusCircle } from 'react-icons/fi';
import OrganizationCreationForm from './OrganizationCreationForm';
import OrganizationJoinForm from './OrganizationJoinForm';

const OrganizationOnboarding = ({ isOpen, onClose, onComplete }) => {
  const [selectedOption, setSelectedOption] = useState(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.600');
  const cardHoverBg = useColorModeValue('gray.50', 'gray.700');
  const cardHoverBorder = useColorModeValue('accent.500', 'accent.400');

  const handleOptionSelect = (option) => {
    if (option === 'personal') {
      // Continue without organization - just close and complete
      if (onComplete) onComplete();
      onClose();
    } else {
      setSelectedOption(option);
    }
  };

  const handleFormComplete = () => {
    if (onComplete) onComplete();
    onClose();
  };

  const handleFormBack = () => {
    setSelectedOption(null);
  };

  const options = [
    {
      id: 'personal',
      icon: FiUser,
      title: 'Continue in Personal Mode',
      description: 'Work independently with your own documents and AI assistant',
      color: 'gray',
    },
    {
      id: 'create',
      icon: FiPlusCircle,
      title: 'Create New Organization',
      description: 'Start a new organization and invite team members',
      color: 'blue',
    },
    {
      id: 'join',
      icon: FiUsers,
      title: 'Join Existing Organization',
      description: 'Use an invite code to join your team',
      color: 'green',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={selectedOption ? 'md' : 'xl'}
      closeOnOverlayClick={false}
      isCentered
    >
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <ModalContent
        bg={useColorModeValue('white', 'gray.800')}
        borderRadius="xl"
        boxShadow="2xl"
        maxW={selectedOption ? '500px' : '800px'}
      >
        <ModalHeader>
          <Heading size="lg" color={useColorModeValue('gray.800', 'white')}>
            {selectedOption === null && 'Welcome to Locket.ai'}
            {selectedOption === 'create' && 'Create Organization'}
            {selectedOption === 'join' && 'Join Organization'}
          </Heading>
          {selectedOption === null && (
            <Text fontSize="sm" color="gray.500" fontWeight="normal" mt={2}>
              Choose how you want to use Locket.ai
            </Text>
          )}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody pb={6}>
          {selectedOption === null ? (
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              {options.map((option) => (
                <Box
                  key={option.id}
                  as="button"
                  onClick={() => handleOptionSelect(option.id)}
                  p={6}
                  bg={cardBg}
                  border="2px solid"
                  borderColor={cardBorder}
                  borderRadius="lg"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{
                    bg: cardHoverBg,
                    borderColor: cardHoverBorder,
                    transform: 'translateY(-4px)',
                    boxShadow: 'lg',
                  }}
                  _active={{
                    transform: 'translateY(-2px)',
                  }}
                  height="100%"
                >
                  <VStack spacing={3} align="center">
                    <Icon
                      as={option.icon}
                      boxSize={10}
                      color={`${option.color}.500`}
                    />
                    <Text
                      fontSize="md"
                      fontWeight="bold"
                      color={useColorModeValue('gray.800', 'white')}
                      textAlign="center"
                    >
                      {option.title}
                    </Text>
                    <Text
                      fontSize="sm"
                      color="gray.500"
                      textAlign="center"
                      lineHeight="short"
                    >
                      {option.description}
                    </Text>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          ) : selectedOption === 'create' ? (
            <OrganizationCreationForm
              onSuccess={handleFormComplete}
              onCancel={handleFormBack}
            />
          ) : (
            <OrganizationJoinForm
              onSuccess={handleFormComplete}
              onCancel={handleFormBack}
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default OrganizationOnboarding;
