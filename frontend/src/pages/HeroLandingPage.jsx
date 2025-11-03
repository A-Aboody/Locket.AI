import React, { useState } from 'react';
import {
    Box,
    Container,
    VStack,
    HStack,
    Heading,
    Text,
    Button,
    Flex,
    Grid,
    GridItem,
    Icon,
    Badge,
    useBreakpointValue,
    Card,
    CardBody,
    SimpleGrid,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalCloseButton,
    useDisclosure,
} from '@chakra-ui/react';
import { FiSearch, FiLock, FiUpload, FiUsers, FiZap, FiShield, FiArrowRight, FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../custom_components/AuthForm';
import VerificationModal from '../custom_components/VerificationModal';

const HeroLandingPage = () => {
    const navigate = useNavigate();
    const isMobile = useBreakpointValue({ base: true, md: false });
    const { isOpen, onOpen, onClose } = useDisclosure();
    const {
        isOpen: isVerificationOpen,
        onOpen: onVerificationOpen,
        onClose: onVerificationClose
    } = useDisclosure();
    const [user, setUser] = React.useState(null);

    const features = [
        {
            icon: FiSearch,
            title: 'AI-Powered Search',
            description: 'Find documents using natural language - no keywords needed',
        },
        {
            icon: FiLock,
            title: 'Complete Privacy',
            description: 'Everything runs locally - your documents never leave your computer',
        },
        {
            icon: FiZap,
            title: 'Lightning Fast',
            description: 'Get instant results across thousands of documents',
        },
        {
            icon: FiUpload,
            title: 'Multi-Format Support',
            description: 'PDF, DOC, DOCX, TXT - all your documents in one place',
        },
    ];

    const benefits = [
        'No cloud dependencies',
        'Military-grade security',
        'Team collaboration',
        'Real-time search',
        'Easy document sharing',
        'Privacy first'
    ];

    const handleGetStarted = () => {
        navigate('/auth');
    };

    const handleSignIn = () => {
        onOpen();
    };

    const handleAuthSuccess = () => {
        onClose();
        navigate('/dashboard');
    };

    const handleVerificationRequired = (userData) => {
        setUser(userData);
        // Close auth modal and open verification modal
        onClose();
        onVerificationOpen();
    };

    const handleVerificationComplete = (verifiedUser) => {
        setUser(verifiedUser);
        onVerificationClose();
        // Redirect to dashboard after successful verification
        setTimeout(() => {
            navigate('/dashboard');
        }, 1000);
    };

    return (
        <Box minH="100vh" bg="primary.950" color="white">
            {/* Navigation - Made Sticky */}
            <Box
                as="nav"
                py={4}
                borderBottom="1px"
                borderColor="primary.700"
                bg="primary.900"
                position="sticky"
                top={0}
                zIndex={1000}
                backdropFilter="blur(10px)"
            >
                <Container maxW="container.xl">
                    <Flex justify="space-between" align="center">
                        <HStack spacing={4}>
                            <Icon as={FiLock} boxSize={8} color="accent.500" />
                            <VStack spacing={0} align="start">
                                <Heading size="lg" fontWeight="bold" color="white">
                                    LOCKET.AI
                                </Heading>
                                <Text fontSize="xs" color="accent.300" fontWeight="medium">
                                    LOCK IT WITH LOCKET
                                </Text>
                            </VStack>
                        </HStack>

                        <HStack spacing={6}>
                            <Button
                                variant="ghost"
                                color="gray.300"
                                _hover={{ color: 'white', bg: 'primary.700' }}
                                onClick={handleSignIn}
                            >
                                Sign In
                            </Button>
                            <Button
                                colorScheme="accent"
                                rightIcon={<FiArrowRight />}
                                onClick={handleGetStarted}
                                px={8}
                                fontSize="md"
                                fontWeight="semibold"
                            >
                                Get Started
                            </Button>
                        </HStack>
                    </Flex>
                </Container>
            </Box>

            {/* Hero Section */}
            <Box
                bg="primary.900"
                position="relative"
                overflow="hidden"
            >
                {/* Background Elements */}
                <Box
                    position="absolute"
                    top="10%"
                    right="10%"
                    w="400px"
                    h="400px"
                    bg="accent.500"
                    opacity="0.05"
                    borderRadius="full"
                    filter="blur(60px)"
                />
                <Box
                    position="absolute"
                    bottom="10%"
                    left="10%"
                    w="300px"
                    h="300px"
                    bg="purple.500"
                    opacity="0.05"
                    borderRadius="full"
                    filter="blur(60px)"
                />

                <Container maxW="container.xl" py={20} position="relative">
                    <Grid
                        templateColumns={{ base: '1fr', lg: '1.2fr 1fr' }}
                        gap={12}
                        alignItems="center"
                    >
                        <GridItem>
                            <VStack align="start" spacing={8}>
                                <Badge
                                    bg="accent.500"
                                    color="white"
                                    px={4}
                                    py={2}
                                    rounded="full"
                                    fontSize="sm"
                                    fontWeight="bold"
                                >
                                    Intelligent Document Retrieval
                                </Badge>

                                <Heading
                                    size="2xl"
                                    fontWeight="bold"
                                    lineHeight="1.1"
                                >
                                    Find Documents Instantly
                                    <Text
                                        as="span"
                                        display="block"
                                        bgGradient="linear(to-r, accent.400, purple.400)"
                                        bgClip="text"
                                    >
                                        With AI-Powered Search
                                    </Text>
                                </Heading>

                                <Text fontSize="xl" color="gray.300" lineHeight="1.6">
                                    <Text as="b">Lock it with Locket</Text> - the privacy-focused platform that understands your documents and finds exactly what you need.
                                    Your data stays on your machine - always secure, always private.
                                </Text>

                                <HStack spacing={6} pt={4}>
                                    <Button
                                        size="lg"
                                        colorScheme="accent"
                                        rightIcon={<FiArrowRight />}
                                        onClick={handleGetStarted}
                                        px={8}
                                        py={6}
                                        fontSize="lg"
                                        fontWeight="bold"
                                    >
                                        Get Started
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        color="white"
                                        borderColor="white"
                                        _hover={{ bg: 'whiteAlpha.100' }}
                                        onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                                        px={8}
                                        py={6}
                                        fontSize="lg"
                                    >
                                        Learn More
                                    </Button>
                                </HStack>

                                {/* Benefits Grid */}
                                <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4} pt={8}>
                                    {benefits.map((benefit, index) => (
                                        <HStack key={index} spacing={3}>
                                            <Icon as={FiCheck} color="accent.400" boxSize={4} />
                                            <Text color="gray.300" fontSize="sm">
                                                {benefit}
                                            </Text>
                                        </HStack>
                                    ))}
                                </SimpleGrid>
                            </VStack>
                        </GridItem>

                        <GridItem>
                            <Card
                                bg="primary.800"
                                border="1px"
                                borderColor="primary.600"
                                rounded="2xl"
                                overflow="hidden"
                                shadow="2xl"
                            >
                                <CardBody p={0}>
                                    <Box
                                        bg="primary.900"
                                        p={4}
                                        borderBottom="1px"
                                        borderColor="primary.600"
                                    >
                                        <HStack spacing={2}>
                                            <Box w={2} h={2} bg="red.400" rounded="full" />
                                            <Box w={2} h={2} bg="yellow.400" rounded="full" />
                                            <Box w={2} h={2} bg="green.400" rounded="full" />
                                        </HStack>
                                    </Box>

                                    <Box p={8}>
                                        <VStack spacing={6} align="start">
                                            <HStack spacing={4}>
                                                <Box
                                                    p={3}
                                                    bg="accent.500"
                                                    rounded="lg"
                                                >
                                                    <Icon as={FiSearch} boxSize={6} color="white" />
                                                </Box>
                                                <VStack align="start" spacing={1}>
                                                    <Text fontWeight="bold" fontSize="lg" color="white">
                                                        Ask Anything
                                                    </Text>
                                                    <Text color="gray.400" fontSize="sm">
                                                        Natural language search
                                                    </Text>
                                                </VStack>
                                            </HStack>

                                            <Box
                                                bg="primary.700"
                                                p={4}
                                                rounded="lg"
                                                border="1px"
                                                borderColor="primary.600"
                                                w="full"
                                            >
                                                <Text color="white" fontSize="sm" fontWeight="medium">
                                                    "Find all documents related to CIS 4951"
                                                </Text>
                                            </Box>

                                            <Box
                                                bg="primary.900"
                                                p={4}
                                                rounded="lg"
                                                border="1px"
                                                borderColor="accent.500"
                                                w="full"
                                            >
                                                <VStack spacing={3} align="start">
                                                    <HStack spacing={3}>
                                                        <Box w={2} h={2} bg="accent.500" rounded="full" />
                                                        <Text fontSize="sm" color="accent.300" fontWeight="medium">
                                                            Project Team Check-In #1.pdf
                                                        </Text>
                                                    </HStack>
                                                    <HStack spacing={3}>
                                                        <Box w={2} h={2} bg="accent.500" rounded="full" />
                                                        <Text fontSize="sm" color="accent.300" fontWeight="medium">
                                                            Project Team Check-In #2.pdf
                                                        </Text>
                                                    </HStack>
                                                    <HStack spacing={3}>
                                                        <Box w={2} h={2} bg="accent.500" rounded="full" />
                                                        <Text fontSize="sm" color="accent.300" fontWeight="medium">
                                                            Project Team Check-In #3.pdf
                                                        </Text>
                                                    </HStack>
                                                </VStack>
                                            </Box>

                                            <HStack spacing={4} w="full" justify="space-between">
                                                <Text fontSize="sm" color="accent.400" fontWeight="medium">
                                                    ✓ Locked with Locket
                                                </Text>
                                                <Text fontSize="sm" color="gray.400">
                                                    156ms response
                                                </Text>
                                            </HStack>
                                        </VStack>
                                    </Box>
                                </CardBody>
                            </Card>
                        </GridItem>
                    </Grid>
                </Container>
            </Box>

            {/* Features Section */}
            <Box id="features" bg="primary.950" py={24} position="relative">
                {/* Section Background Elements */}
                <Box
                    position="absolute"
                    top="20%"
                    right="10%"
                    w="300px"
                    h="300px"
                    bg="blue.500"
                    opacity={0.02}
                    borderRadius="full"
                    filter="blur(60px)"
                />

                <Container maxW="container.xl" position="relative">
                    <VStack spacing={16}>
                        <VStack spacing={6} textAlign="center" maxW="2xl">
                            <Heading size="xl" color="white" position="relative">
                                Why Choose Locket.ai
                                <Box
                                    position="absolute"
                                    bottom={-4}
                                    left="50%"
                                    transform="translateX(-50%)"
                                    w="100px"
                                    h="2px"
                                    bgGradient="linear(to-r, accent.400, purple.400)"
                                    opacity={0.6}
                                />
                            </Heading>
                            <Text fontSize="xl" color="gray.300">
                                Powerful document intelligence that respects your privacy and works the way you do
                            </Text>
                        </VStack>

                        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8} w="full">
                            {features.map((feature, index) => {
                                const iconGradients = [
                                    'linear(to-br, blue.400, purple.500)',
                                    'linear(to-br, green.400, teal.500)',
                                    'linear(to-br, yellow.400, orange.500)',
                                    'linear(to-br, pink.400, red.500)',
                                ];

                                const currentGradient = iconGradients[index];

                                return (
                                    <Card
                                        key={index}
                                        bg="primary.800"
                                        border="1px"
                                        borderColor="primary.600"
                                        rounded="2xl"
                                        _hover={{
                                            borderColor: 'accent.500',
                                            transform: 'translateY(-8px)',
                                            shadow: '2xl'
                                        }}
                                        transition="all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                        position="relative"
                                        overflow="hidden"
                                    >
                                        {/* Card Glow */}
                                        <Box
                                            position="absolute"
                                            top={0}
                                            left={0}
                                            w="100%"
                                            h="100%"
                                            bgGradient={currentGradient}
                                            opacity={0.03}
                                            filter="blur(20px)"
                                            pointerEvents="none"
                                        />

                                        <CardBody p={8}>
                                            <VStack spacing={6} align="start">
                                                <Box
                                                    p={4}
                                                    bgGradient={currentGradient}
                                                    rounded="xl"
                                                    position="relative"
                                                    _hover={{
                                                        transform: 'scale(1.05) rotate(5deg)'
                                                    }}
                                                    transition="all 0.3s"
                                                >
                                                    <Icon as={feature.icon} boxSize={6} color="white" />
                                                    <Box
                                                        position="absolute"
                                                        top={0}
                                                        left={0}
                                                        w="100%"
                                                        h="100%"
                                                        bgGradient={currentGradient}
                                                        borderRadius="xl"
                                                        opacity={0.4}
                                                        filter="blur(12px)"
                                                    />
                                                </Box>
                                                <VStack spacing={3} align="start">
                                                    <Heading size="md" color="white">
                                                        {feature.title}
                                                    </Heading>
                                                    <Text color="gray.400" lineHeight="1.6">
                                                        {feature.description}
                                                    </Text>
                                                </VStack>
                                            </VStack>
                                        </CardBody>
                                    </Card>
                                );
                            })}
                        </SimpleGrid>
                    </VStack>
                </Container>
            </Box>

            {/* CTA Section */}
            <Box bg="primary.900" py={20}>
                <Container maxW="container.lg">
                    <Card
                        bg="primary.800"
                        border="1px"
                        borderColor="accent.500"
                        rounded="2xl"
                        overflow="hidden"
                    >
                        <CardBody p={12}>
                            <VStack spacing={6} textAlign="center">
                                <Heading size="xl" color="white">
                                    Ready to Lock It With Locket?
                                </Heading>
                                <Text fontSize="xl" color="gray.300" maxW="2xl">
                                    Join users who trust Locket.ai for secure, intelligent document management
                                </Text>
                                <HStack spacing={6} pt={4}>
                                    <Button
                                        size="lg"
                                        colorScheme="accent"
                                        rightIcon={<FiArrowRight />}
                                        onClick={handleGetStarted}
                                        px={8}
                                        py={6}
                                        fontSize="lg"
                                        fontWeight="bold"
                                    >
                                        Get Started Free
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        color="white"
                                        borderColor="white"
                                        _hover={{ bg: 'whiteAlpha.100' }}
                                        onClick={handleSignIn}
                                        px={8}
                                        py={6}
                                        fontSize="lg"
                                    >
                                        Sign In
                                    </Button>
                                </HStack>
                            </VStack>
                        </CardBody>
                    </Card>
                </Container>
            </Box>

            {/* Footer */}
            <Box bg="primary.950" py={12} borderTop="1px" borderColor="primary.700">
                <Container maxW="container.xl">
                    <Flex justify="space-between" align="center">
                        <HStack spacing={3}>
                            <Icon as={FiLock} boxSize={6} color="accent.500" />
                            <VStack spacing={0} align="start">
                                <Heading size="md" color="white">
                                    LOCKET.AI
                                </Heading>
                                <Text fontSize="xs" color="gray.500">
                                    Lock it with Locket
                                </Text>
                            </VStack>
                        </HStack>

                        <Text color="gray.500" fontSize="sm">
                            © 2025 Locket.ai. All rights reserved.
                        </Text>
                    </Flex>
                </Container>
            </Box>

            {/* Auth Modal - Improved Appearance */}
            <Modal isOpen={isOpen} onClose={onClose} isCentered>
                <ModalOverlay backdropFilter="blur(8px)" />
                <ModalContent
                    bg="transparent"
                    shadow="none"
                    alignItems="center"
                    justifyContent="center"
                >
                    <AuthForm
                        onAuthSuccess={handleAuthSuccess}
                        onClose={onClose}
                        onVerificationRequired={handleVerificationRequired}
                    />
                </ModalContent>
            </Modal>

            {/* Verification Modal */}
            <VerificationModal
                isOpen={isVerificationOpen}
                onClose={onVerificationClose}
                user={user}
                onVerificationComplete={handleVerificationComplete}
            />
        </Box>
    );
};

export default HeroLandingPage;