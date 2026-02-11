import {
  Box,
  Heading,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { FiLock } from 'react-icons/fi';
import ModeSwitcher from './ModeSwitcher';
import { canSwitchModes } from '../utils/modeUtils';

const AppHeader = ({ user, onModeChange }) => {
  const showModeSwitcher = user && canSwitchModes();

  return (
    <Box
      bg="primary.800"
      borderBottom="1px"
      borderColor="primary.600"
      px={6}
      py={4}
      position="sticky"
      top={0}
      zIndex={100}
    >
      <HStack justify="space-between">
        <HStack spacing={4}>
          <Icon as={FiLock} boxSize={6} color="accent.500" />
          <Heading size="md" color="white" fontWeight="bold">
            LOCKET.AI
          </Heading>
        </HStack>

        {/* Mode Switcher - only show for users in an organization */}
        {showModeSwitcher && <ModeSwitcher onModeChange={onModeChange} />}
      </HStack>
    </Box>
  );
};

export default AppHeader;