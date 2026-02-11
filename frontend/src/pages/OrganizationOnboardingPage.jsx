import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
  Button,
  Heading,
} from '@chakra-ui/react';
import { FiUser, FiPlusCircle, FiUsers } from 'react-icons/fi';
import { OrganizationCreationForm, OrganizationJoinForm } from '../components/organization';
import PageTransition from '../custom_components/PageTransition';

const OrganizationOnboardingPage = () => {
  const [selectedOption, setSelectedOption] = useState(null);
  const navigate = useNavigate();

  const handlePersonalMode = () => {
    navigate('/dashboard');
  };

  const handleOrgCreated = () => {
    navigate('/dashboard');
  };

  const handleOrgJoined = () => {
    navigate('/dashboard');
  };

  const options = [
    {
      id: 'personal',
      icon: FiUser,
      title: 'Continue in Personal Mode',
      description: 'Work independently with your own documents and AI assistant',
      color: 'gray',
      iconBg: 'gray.700',
    },
    {
      id: 'create',
      icon: FiPlusCircle,
      title: 'Create New Organization',
      description: 'Start a new organization and invite team members',
      color: 'blue',
      iconBg: 'blue.600',
    },
    {
      id: 'join',
      icon: FiUsers,
      title: 'Join Existing Organization',
      description: 'Use an invite code to join your team',
      color: 'green',
      iconBg: 'green.600',
    },
  ];

  const renderContent = () => {
    if (!selectedOption) {
      return (
        <VStack spacing={8} w="full">
          <VStack spacing={3} textAlign="center">
            <Heading size="xl" color="white">
              Welcome to Locket.AI
            </Heading>
            <Text color="gray.400" fontSize="lg" maxW="600px">
              Choose how you'd like to use Locket.AI
            </Text>
          </VStack>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full" maxW="1200px">
            {options.map((option) => (
              <Card
                key={option.id}
                bg="primary.800"
                border="2px"
                borderColor="primary.600"
                cursor="pointer"
                onClick={() => {
                  if (option.id === 'personal') {
                    handlePersonalMode();
                  } else {
                    setSelectedOption(option.id);
                  }
                }}
                _hover={{
                  borderColor: `${option.color}.500`,
                  transform: 'translateY(-4px)',
                  shadow: 'xl',
                }}
                transition="all 0.3s"
                height="280px"
              >
                <CardBody p={8}>
                  <VStack spacing={6} align="center" h="full" justify="center">
                    <Box
                      p={6}
                      bg={option.iconBg}
                      borderRadius="full"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Icon as={option.icon} boxSize={12} color="white" />
                    </Box>
                    <VStack spacing={3} textAlign="center">
                      <Text
                        fontSize="xl"
                        fontWeight="bold"
                        color="white"
                      >
                        {option.title}
                      </Text>
                      <Text
                        color="gray.400"
                        fontSize="sm"
                      >
                        {option.description}
                      </Text>
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </VStack>
      );
    }

    if (selectedOption === 'create') {
      return (
        <VStack spacing={6} w="full" maxW="600px">
          <VStack spacing={2} textAlign="center" w="full">
            <Heading size="lg" color="white">
              Create Your Organization
            </Heading>
            <Text color="gray.400">
              Set up your organization and start collaborating
            </Text>
          </VStack>

          <Box w="full" bg="primary.800" borderRadius="xl" border="1px" borderColor="primary.600" p={8}>
            <OrganizationCreationForm
              onSuccess={handleOrgCreated}
              onCancel={() => setSelectedOption(null)}
            />
          </Box>
        </VStack>
      );
    }

    if (selectedOption === 'join') {
      return (
        <VStack spacing={6} w="full" maxW="600px">
          <VStack spacing={2} textAlign="center" w="full">
            <Heading size="lg" color="white">
              Join an Organization
            </Heading>
            <Text color="gray.400">
              Enter your invite code to join your team
            </Text>
          </VStack>

          <Box w="full" bg="primary.800" borderRadius="xl" border="1px" borderColor="primary.600" p={8}>
            <OrganizationJoinForm
              onSuccess={handleOrgJoined}
              onCancel={() => setSelectedOption(null)}
            />
          </Box>
        </VStack>
      );
    }
  };

  return (
    <PageTransition>
      <Box minH="100vh" bg="background.primary" py={20} px={6}>
        <Container maxW="container.xl">
          <VStack spacing={12} align="center" w="full">
            {renderContent()}

            {!selectedOption && (
              <Text color="gray.500" fontSize="sm" textAlign="center">
                You can change this later in your settings
              </Text>
            )}
          </VStack>
        </Container>
      </Box>
    </PageTransition>
  );
};

export default OrganizationOnboardingPage;
