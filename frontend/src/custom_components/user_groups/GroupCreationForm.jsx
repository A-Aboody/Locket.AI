import { useState } from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Text,
  useToast,
  HStack,
  Icon,
  Box
} from '@chakra-ui/react';
import { FiPlus, FiAlertCircle } from 'react-icons/fi';
import UserSearchInput from './UserSearchInput';
import SelectedMembersList from './SelectedMembersList';
import { userGroupsAPI, apiUtils } from '../../utils/api';

const MAX_GROUP_NAME_LENGTH = 50;

const GroupCreationForm = ({ onGroupCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: []
  });
  const [isCreating, setIsCreating] = useState(false);
  const toast = useToast();

  const handleAddMember = (user) => {
    if (!formData.members.find(m => m.id === user.id)) {
      setFormData(prev => ({
        ...prev,
        members: [...prev.members, user]
      }));
    }
  };

  const handleRemoveMember = (userId) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== userId)
    }));
  };

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Group name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsCreating(true);
      const groupData = apiUtils.prepareGroupData(
        formData.name,
        formData.description,
        formData.members.map(m => m.id)
      );
      
      await userGroupsAPI.create(groupData);
      
      toast({
        title: 'Group created successfully',
        description: `${formData.name} is ready to use`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setFormData({ name: '', description: '', members: [] });
      
      if (onGroupCreated) {
        onGroupCreated();
      }
    } catch (error) {
      toast({
        title: 'Failed to create group',
        description: apiUtils.handleError(error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <VStack spacing={5} align="stretch">
      <FormControl isRequired>
        <FormLabel color="gray.300" fontWeight="medium" mb={2}>
          Group Name
        </FormLabel>
        <Input
          value={formData.name}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= MAX_GROUP_NAME_LENGTH) {
              setFormData(prev => ({ ...prev, name: value }));
            }
          }}
          placeholder="Enter group name"
          color="white"
          bg="primary.800"
          border="2px"
          borderColor={formData.name.length === MAX_GROUP_NAME_LENGTH ? 'yellow.500' : 'primary.600'}
          _hover={{ borderColor: formData.name.length === MAX_GROUP_NAME_LENGTH ? 'yellow.400' : 'primary.500' }}
          _focus={{ 
            borderColor: formData.name.length === MAX_GROUP_NAME_LENGTH ? 'yellow.500' : 'accent.500', 
            boxShadow: formData.name.length === MAX_GROUP_NAME_LENGTH 
              ? '0 0 0 1px var(--chakra-colors-yellow-500)' 
              : '0 0 0 1px var(--chakra-colors-accent-500)' 
          }}
          size="lg"
          maxLength={MAX_GROUP_NAME_LENGTH}
        />
        <HStack justify="space-between" mt={1}>
          <Text 
            fontSize="xs" 
            color={
              formData.name.length === 0 ? 'gray.500' :
              formData.name.length >= MAX_GROUP_NAME_LENGTH * 0.9 ? 'yellow.400' : 
              'gray.400'
            }
          >
            {formData.name.length === 0 ? 'Maximum 50 characters' : `${formData.name.length}/${MAX_GROUP_NAME_LENGTH} characters`}
          </Text>
          {formData.name.length === MAX_GROUP_NAME_LENGTH && (
            <HStack spacing={1}>
              <Icon as={FiAlertCircle} color="yellow.400" boxSize={3} />
              <Text fontSize="xs" color="yellow.400">
                Character limit reached
              </Text>
            </HStack>
          )}
        </HStack>
      </FormControl>

      <FormControl>
        <FormLabel color="gray.300" fontWeight="medium" mb={2}>
          Description
          <Text as="span" color="gray.500" fontWeight="normal" ml={2}>
            (Optional)
          </Text>
        </FormLabel>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="What's this group for?"
          color="white"
          bg="primary.800"
          border="2px"
          borderColor="primary.600"
          _hover={{ borderColor: 'primary.500' }}
          _focus={{ borderColor: 'accent.500', boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)' }}
          rows={3}
          resize="none"
        />
      </FormControl>

      <FormControl>
        <FormLabel color="gray.300" fontWeight="medium" mb={2}>
          Add Members
        </FormLabel>
        <UserSearchInput
          onUserSelect={handleAddMember}
          selectedUsers={formData.members}
        />
        
        {formData.members.length > 0 && (
          <Box mt={4}>
            <SelectedMembersList
              members={formData.members}
              onRemoveMember={handleRemoveMember}
            />
          </Box>
        )}
      </FormControl>

      <Button
        colorScheme="accent"
        onClick={handleCreateGroup}
        isLoading={isCreating}
        loadingText="Creating..."
        leftIcon={<FiPlus />}
        size="lg"
        mt={2}
        isDisabled={!formData.name.trim()}
        _disabled={{
          bg: 'primary.700',
          color: 'gray.500',
          cursor: 'not-allowed',
        }}
      >
        Create Group
      </Button>
    </VStack>
  );
};

export default GroupCreationForm;