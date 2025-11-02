import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  HStack,
  VStack,
  Box,
  Text,
} from '@chakra-ui/react';
import { FiTrash2 } from 'react-icons/fi';

const DeleteGroupDialog = ({ isOpen, onClose, groupName, onConfirm }) => {
  return (
    <AlertDialog 
      isOpen={isOpen} 
      onClose={onClose}
      isCentered
    >
      <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <AlertDialogContent bg="primary.800" border="1px" borderColor="red.500" mx={4}>
        <AlertDialogHeader fontSize="lg" fontWeight="bold" color="white">
          <HStack spacing={3}>
            <Box p={2} bg="red.500" rounded="lg">
              <FiTrash2 size={20} color="white" />
            </Box>
            <Text>Delete Group</Text>
          </HStack>
        </AlertDialogHeader>

        <AlertDialogBody color="gray.300">
          <VStack align="start" spacing={3}>
            <Text>
              Are you sure you want to delete <Text as="span" fontWeight="bold" color="white">{groupName}</Text>?
            </Text>
            <Box 
              p={3} 
              bg="red.900" 
              border="1px" 
              borderColor="red.700" 
              rounded="md"
              w="full"
            >
              <Text fontSize="sm" color="red.200">
                This action cannot be undone. All documents in this group will become private.
              </Text>
            </Box>
          </VStack>
        </AlertDialogBody>

        <AlertDialogFooter>
          <Button 
            onClick={onClose} 
            variant="ghost" 
            color="gray.400"
            _hover={{ bg: 'primary.700' }}
          >
            Cancel
          </Button>
          <Button
            colorScheme="red"
            onClick={onConfirm}
            ml={3}
            leftIcon={<FiTrash2 />}
          >
            Delete Group
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteGroupDialog;