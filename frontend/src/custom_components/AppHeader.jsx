import {
  Box,
  Heading,
  HStack,
  Image,
} from '@chakra-ui/react';
import ModeSwitcher from './ModeSwitcher';
import { canSwitchModes } from '../utils/modeUtils';
import logo from '../assets/Locket.AI-Logo.png';

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
        <HStack spacing={3}>
          <Image src={logo} alt="Locket.AI" boxSize="32px" objectFit="contain" />
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
