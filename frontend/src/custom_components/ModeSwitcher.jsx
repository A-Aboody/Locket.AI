import { useState, useEffect } from 'react';
import {
  HStack,
  Button,
  Text,
  Icon,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { FiUser, FiUsers } from 'react-icons/fi';
import { MODES, getUserMode, setUserMode, getOrganizationName } from '../utils/modeUtils';

const ModeSwitcher = ({ onModeChange }) => {
  const [currentMode, setCurrentMode] = useState(getUserMode());
  const toast = useToast();
  const orgName = getOrganizationName();

  useEffect(() => {
    const handleModeChange = (event) => {
      setCurrentMode(event.detail.mode);
    };

    window.addEventListener('modeChanged', handleModeChange);
    return () => window.removeEventListener('modeChanged', handleModeChange);
  }, []);

  const handleModeSwitch = (mode) => {
    if (mode === currentMode) return;

    setUserMode(mode);
    setCurrentMode(mode);

    toast({
      title: mode === MODES.PERSONAL ? 'Switched to Personal Mode' : 'Switched to Organization Mode',
      description: mode === MODES.PERSONAL
        ? 'Your uploads will be private by default'
        : `Working with ${orgName || 'your organization'}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

    if (onModeChange) {
      onModeChange(mode);
    }
  };

  return (
    <HStack
      spacing={0}
      bg="primary.900"
      rounded="lg"
      p={1}
      border="1px"
      borderColor="primary.600"
    >
      <Tooltip label="Personal workspace - your private documents" placement="bottom">
        <Button
          size="sm"
          leftIcon={<Icon as={FiUser} />}
          onClick={() => handleModeSwitch(MODES.PERSONAL)}
          bg={currentMode === MODES.PERSONAL ? 'accent.500' : 'transparent'}
          color={currentMode === MODES.PERSONAL ? 'white' : 'gray.400'}
          _hover={{
            bg: currentMode === MODES.PERSONAL ? 'accent.600' : 'primary.700',
            color: 'white',
          }}
          _active={{
            bg: currentMode === MODES.PERSONAL ? 'accent.700' : 'primary.600',
          }}
          transition="all 0.2s"
          fontWeight="medium"
          fontSize="sm"
          px={3}
        >
          Personal
        </Button>
      </Tooltip>

      <Tooltip
        label={`Organization workspace - collaborate with ${orgName || 'your team'}`}
        placement="bottom"
      >
        <Button
          size="sm"
          leftIcon={<Icon as={FiUsers} />}
          onClick={() => handleModeSwitch(MODES.ORGANIZATION)}
          bg={currentMode === MODES.ORGANIZATION ? 'accent.500' : 'transparent'}
          color={currentMode === MODES.ORGANIZATION ? 'white' : 'gray.400'}
          _hover={{
            bg: currentMode === MODES.ORGANIZATION ? 'accent.600' : 'primary.700',
            color: 'white',
          }}
          _active={{
            bg: currentMode === MODES.ORGANIZATION ? 'accent.700' : 'primary.600',
          }}
          transition="all 0.2s"
          fontWeight="medium"
          fontSize="sm"
          px={3}
        >
          {orgName || 'Organization'}
        </Button>
      </Tooltip>
    </HStack>
  );
};

export default ModeSwitcher;
