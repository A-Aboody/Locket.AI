import { useState } from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Text,
  FormErrorMessage,
  useToast,
  HStack,
  Box,
  Icon,
  Divider,
  Code,
  useClipboard,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { FiArrowLeft, FiCheck, FiCopy } from 'react-icons/fi';
import { organizationsAPI, apiUtils, authAPI } from '../../utils/api';

const OrganizationCreationForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const toast = useToast();

  const { hasCopied, onCopy } = useClipboard(inviteCode || '');

  const validateForm = () => {
    const newErrors = {};

    // Validate organization name
    const nameValidation = apiUtils.validateOrgName(formData.name);
    if (!nameValidation.valid) {
      newErrors.name = nameValidation.error;
    }

    // Description is optional but has max length
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const orgData = apiUtils.prepareOrganizationData(
        formData.name,
        formData.description
      );

      const response = await organizationsAPI.create(orgData);

      // Update user data in localStorage
      const updatedUser = await authAPI.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(updatedUser.data));

      setInviteCode(response.data.invite_code);

      toast({
        title: 'Organization created!',
        description: `${response.data.name} has been created successfully. Share the invite code with your team.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Don't immediately close - let user see and copy invite code
      // User can click "Continue" to proceed
    } catch (error) {
      console.error('Organization creation error:', error);

      const errorMessage = apiUtils.handleError(
        error,
        'Failed to create organization'
      );

      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (onSuccess) onSuccess();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Show success view with invite code
  if (inviteCode) {
    return (
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Icon as={FiCheck} boxSize={12} color="green.500" mb={4} />
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            Organization Created!
          </Text>
          <Text color="gray.500" fontSize="sm">
            Share this invite code with your team members
          </Text>
        </Box>

        <Box
          bg="primary.800"
          p={4}
          borderRadius="md"
          borderWidth="1px"
          borderColor="primary.600"
        >
          <Text fontSize="xs" color="gray.400" mb={2} fontWeight="semibold" letterSpacing="wider">
            INVITE CODE
          </Text>
          <InputGroup size="lg">
            <Input
              value={inviteCode}
              readOnly
              fontFamily="mono"
              fontWeight="bold"
              fontSize="lg"
              bg="primary.700"
              borderColor="primary.600"
              color="white"
              _hover={{ borderColor: 'primary.500' }}
              pr="4.5rem"
            />
            <InputRightElement width="4.5rem">
              <IconButton
                h="1.75rem"
                size="sm"
                onClick={onCopy}
                icon={hasCopied ? <FiCheck /> : <FiCopy />}
                colorScheme={hasCopied ? 'green' : 'gray'}
                aria-label="Copy invite code"
              />
            </InputRightElement>
          </InputGroup>
          <Text fontSize="xs" color="gray.500" mt={2}>
            Team members can use this code to join your organization
          </Text>
        </Box>

        <Button
          colorScheme="accent"
          size="lg"
          onClick={handleContinue}
          width="100%"
        >
          Continue to Dashboard
        </Button>
      </VStack>
    );
  }

  // Show creation form
  return (
    <form onSubmit={handleSubmit}>
      <VStack spacing={5} align="stretch">
        <FormControl isInvalid={!!errors.name} isRequired>
          <FormLabel fontSize="sm" fontWeight="semibold">
            Organization Name
          </FormLabel>
          <Input
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter organization name"
            size="lg"
            autoFocus
          />
          <FormErrorMessage>{errors.name}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.description}>
          <FormLabel fontSize="sm" fontWeight="semibold">
            Description (Optional)
          </FormLabel>
          <Textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="What does your organization do?"
            size="lg"
            rows={3}
            resize="none"
          />
          <FormErrorMessage>{errors.description}</FormErrorMessage>
          <Text fontSize="xs" color="gray.500" mt={1}>
            {formData.description.length}/500 characters
          </Text>
        </FormControl>

        <Divider />

        <HStack spacing={3}>
          <Button
            variant="ghost"
            leftIcon={<FiArrowLeft />}
            onClick={onCancel}
            isDisabled={isLoading}
            flex={1}
          >
            Back
          </Button>
          <Button
            type="submit"
            colorScheme="accent"
            isLoading={isLoading}
            loadingText="Creating..."
            flex={2}
            size="lg"
          >
            Create Organization
          </Button>
        </HStack>
      </VStack>
    </form>
  );
};

export default OrganizationCreationForm;
