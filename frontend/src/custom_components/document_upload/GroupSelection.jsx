import {
  Box,
  VStack,
  Button,
  Card,
  CardBody,
  HStack,
  Avatar,
  Text,
  Spinner,
} from '@chakra-ui/react';
import { FiUsers, FiPlus } from 'react-icons/fi';

const GroupSelection = ({ 
  visibility, 
  selectedGroup, 
  userGroups, 
  loadingGroups, 
  uploading,
  onOpenGroupModal,
  onCreateGroup 
}) => {
  if (visibility !== 'group') return null;

  return (
    <Box mt={3}>
      {loadingGroups ? (
        <Button
          leftIcon={<Spinner size="sm" />}
          w="full"
          size="lg"
          variant="outline"
          colorScheme="accent"
          isDisabled
          bg="primary.800"
        >
          Loading groups...
        </Button>
      ) : selectedGroup ? (
        <Card bg="primary.800" border="1px" borderColor="accent.500">
          <CardBody p={4}>
            <HStack justify="space-between">
              <HStack spacing={3}>
                <Avatar 
                  name={selectedGroup.name} 
                  size="sm" 
                  bg="accent.500"
                />
                <VStack align="start" spacing={0}>
                  <Text color="white" fontWeight="medium" fontSize="sm">
                    {selectedGroup.name}
                  </Text>
                  <Text color="gray.400" fontSize="xs">
                    {selectedGroup.members?.length || 0} members
                  </Text>
                </VStack>
              </HStack>
              <Button
                size="sm"
                variant="ghost"
                onClick={onOpenGroupModal}
                color="accent.400"
                _hover={{ bg: 'primary.700' }}
                isDisabled={uploading}
              >
                Change
              </Button>
            </HStack>
          </CardBody>
        </Card>
      ) : (
        <VStack spacing={2}>
          <Button
            leftIcon={<FiUsers />}
            onClick={onOpenGroupModal}
            w="full"
            size="lg"
            colorScheme="accent"
            variant="outline"
            bg="primary.800"
            _hover={{ bg: 'primary.700' }}
            isDisabled={uploading}
          >
            Select Group
          </Button>
          {userGroups.length === 0 && !loadingGroups && (
            <Button
              leftIcon={<FiPlus />}
              onClick={onCreateGroup}
              w="full"
              size="md"
              colorScheme="accent"
              variant="ghost"
              isDisabled={uploading}
            >
              Create New Group
            </Button>
          )}
        </VStack>
      )}
    </Box>
  );
};

export default GroupSelection;