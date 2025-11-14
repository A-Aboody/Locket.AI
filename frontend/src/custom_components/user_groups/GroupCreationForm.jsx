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
        <FormLabel color="gray.300" fontWeight="500" mb={2} fontSize="sm">
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
          placeholder="e.g., Engineering Team"
          color="white"
          bg="primary.800"
          border="1px"
          borderColor="primary.600"
          _hover={{ borderColor: 'primary.500' }}
          _focus={{
            borderColor: 'accent.500',
            boxShadow: 'none',
          }}
          _placeholder={{ color: 'gray.600' }}
          size="md"
          rounded="md"
          maxLength={MAX_GROUP_NAME_LENGTH}
        />
        {formData.name.length > 0 && (
          <Text fontSize="xs" color="gray.500" mt={1.5}>
            {formData.name.length}/{MAX_GROUP_NAME_LENGTH}
          </Text>
        )}
      </FormControl>

      <FormControl>
        <FormLabel color="gray.300" fontWeight="500" mb={2} fontSize="sm">
          Description <Text as="span" color="gray.500" fontWeight="400">(optional)</Text>
        </FormLabel>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="What's this group for?"
          color="white"
          bg="primary.800"
          border="1px"
          borderColor="primary.600"
          _hover={{ borderColor: 'primary.500' }}
          _focus={{ borderColor: 'accent.500', boxShadow: 'none' }}
          _placeholder={{ color: 'gray.600' }}
          rows={3}
          resize="none"
          rounded="md"
        />
      </FormControl>

      <FormControl>
        <FormLabel color="gray.300" fontWeight="500" mb={2} fontSize="sm">
          Members <Text as="span" color="gray.500" fontWeight="400">(optional)</Text>
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
        bg="accent.500"
        color="white"
        onClick={handleCreateGroup}
        isLoading={isCreating}
        loadingText="Creating..."
        size="md"
        mt={2}
        rounded="md"
        fontWeight="500"
        isDisabled={!formData.name.trim()}
        _hover={{
          bg: 'accent.600',
        }}
        _active={{
          bg: 'accent.700',
        }}
        _disabled={{
          bg: 'primary.700',
          color: 'gray.500',
          cursor: 'not-allowed',
          opacity: 0.6,
        }}
        transition="all 0.15s"
      >
        Create Group
      </Button>
    </VStack>
  );
};

export default GroupCreationForm;