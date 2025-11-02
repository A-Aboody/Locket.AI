// frontend/src/custom_components/NavTabs.jsx
import {
  Tabs,
  TabList,
  Tab,
  Box,
} from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';

const NavTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on current route - computed directly
  const getActiveTabIndex = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 0;
    if (path === '/documents') return 1;
    if (path === '/my-uploads') return 2;
    if (path === '/upload') return 3;
    return 0;
  };

  const handleTabChange = (index) => {
    // Prevent unnecessary navigation if already on the tab
    if (index === getActiveTabIndex()) return;
    
    switch (index) {
      case 0:
        navigate('/dashboard');
        break;
      case 1:
        navigate('/documents');
        break;
      case 2:
        navigate('/my-uploads');
        break;
      case 3:
        navigate('/upload');
        break;
      default:
        navigate('/dashboard');
    }
  };

  return (
    <Box 
      bg="primary.800" 
      borderBottom="1px" 
      borderColor="primary.600"
      sx={{
        '.chakra-tabs__tab': {
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          _before: {
            content: '""',
            position: 'absolute',
            bottom: '0',
            left: '50%',
            width: '0%',
            height: '2px',
            bg: 'accent.500',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateX(-50%)',
          },
          _hover: {
            color: 'accent.300',
            transform: 'translateY(-1px)',
            _before: {
              width: '60%',
            },
          },
          _selected: {
            color: 'accent.500',
            _before: {
              width: '80%',
            },
          },
        },
      }}
    >
      <Tabs 
        colorScheme="accent" 
        variant="unstyled"
        px={6} 
        index={getActiveTabIndex()}
        onChange={handleTabChange}
        isLazy
        lazyBehavior="keepMounted"
      >
        <TabList borderBottom="none" minH="48px">
          <Tab
            color="gray.400"
            fontWeight="medium"
            fontSize="sm"
            py={3}
            _selected={{ 
              color: 'accent.500',
            }}
            sx={{
              '&[data-selected]': {
                fontWeight: 'semibold',
              }
            }}
          >
            Home
          </Tab>
          <Tab
            color="gray.400"
            fontWeight="medium"
            fontSize="sm"
            py={3}
            _selected={{ 
              color: 'accent.500',
            }}
            sx={{
              '&[data-selected]': {
                fontWeight: 'semibold',
              }
            }}
          >
            Documents
          </Tab>
          <Tab
            color="gray.400"
            fontWeight="medium"
            fontSize="sm"
            py={3}
            _selected={{ 
              color: 'accent.500',
            }}
            sx={{
              '&[data-selected]': {
                fontWeight: 'semibold',
              }
            }}
          >
            My Uploads
          </Tab>
          <Tab
            color="gray.400"
            fontWeight="medium"
            fontSize="sm"
            py={3}
            _selected={{ 
              color: 'accent.500',
            }}
            sx={{
              '&[data-selected]': {
                fontWeight: 'semibold',
              }
            }}
          >
            Upload
          </Tab>
        </TabList>
      </Tabs>
    </Box>
  );
};

export default NavTabs;