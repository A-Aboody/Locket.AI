import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, VStack, HStack, Text, Icon, IconButton } from '@chakra-ui/react';
import { FiDownload, FiCheck, FiX, FiAlertCircle, FiChevronUp, FiChevronDown, FiFolder, FiLoader } from 'react-icons/fi';

const DownloadStatusPanel = ({ downloads = [], onDismiss, onDismissAll }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (downloads.length === 0) return null;

  const activeCount = downloads.filter(d => d.status === 'preparing' || d.status === 'downloading').length;
  const doneCount = downloads.filter(d => d.status === 'done').length;

  const headerLabel = activeCount > 0
    ? `${activeCount} download${activeCount !== 1 ? 's' : ''} in progress`
    : `${doneCount} download${doneCount !== 1 ? 's' : ''} complete`;

  const panel = (
    <Box
      position="fixed"
      bottom="24px"
      right="24px"
      zIndex={20000}
      w="320px"
      bg="primary.800"
      border="1px"
      borderColor="primary.600"
      rounded="xl"
      boxShadow="0 8px 40px rgba(0, 0, 0, 0.5)"
      overflow="hidden"
      style={{
        opacity: 1,
        transform: 'translateY(0)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* Header */}
      <HStack
        px={4}
        py={3}
        bg="primary.700"
        cursor="pointer"
        onClick={() => setIsCollapsed(c => !c)}
        justify="space-between"
        borderBottom={isCollapsed ? 'none' : '1px'}
        borderColor="primary.600"
        _hover={{ bg: 'primary.600' }}
        transition="background 0.1s"
      >
        <HStack spacing={2}>
          <Icon as={FiDownload} boxSize={4} color="accent.400" />
          <Text fontSize="sm" fontWeight="600" color="white">
            {headerLabel}
          </Text>
        </HStack>
        <HStack spacing={1}>
          <IconButton
            icon={isCollapsed ? <FiChevronUp /> : <FiChevronDown />}
            size="xs"
            variant="ghost"
            color="gray.400"
            aria-label="Toggle panel"
            onClick={(e) => { e.stopPropagation(); setIsCollapsed(c => !c); }}
            _hover={{ color: 'white', bg: 'whiteAlpha.200' }}
          />
          <IconButton
            icon={<FiX />}
            size="xs"
            variant="ghost"
            color="gray.400"
            aria-label="Dismiss all"
            onClick={(e) => { e.stopPropagation(); onDismissAll && onDismissAll(); }}
            _hover={{ color: 'white', bg: 'whiteAlpha.200' }}
          />
        </HStack>
      </HStack>

      {/* Download list */}
      {!isCollapsed && (
        <VStack spacing={0} align="stretch" maxH="240px" overflowY="auto">
          {downloads.map((dl) => (
            <HStack
              key={dl.id}
              px={4}
              py={3}
              spacing={3}
              borderBottom="1px"
              borderColor="primary.700"
              _last={{ borderBottom: 'none' }}
            >
              <Icon as={FiFolder} boxSize={4} color="accent.400" flexShrink={0} />
              <VStack align="start" spacing={0.5} flex={1} minW={0}>
                <Text fontSize="sm" color="white" noOfLines={1} fontWeight="500">
                  {dl.name}.zip
                </Text>
                <Text
                  fontSize="xs"
                  color={
                    dl.status === 'done' ? 'green.400' :
                    dl.status === 'error' ? 'red.400' :
                    'gray.400'
                  }
                >
                  {dl.status === 'preparing' ? 'Preparing download...' :
                   dl.status === 'downloading' ? 'Downloading...' :
                   dl.status === 'done' ? 'Download complete' :
                   'Download failed'}
                </Text>
              </VStack>

              {/* Status icon */}
              {(dl.status === 'preparing' || dl.status === 'downloading') && (
                <Box flexShrink={0}>
                  <Box
                    as="span"
                    display="inline-block"
                    w="14px"
                    h="14px"
                    border="2px solid"
                    borderColor="accent.400"
                    borderTopColor="transparent"
                    borderRadius="full"
                    style={{ animation: 'spin 0.8s linear infinite' }}
                  />
                </Box>
              )}
              {dl.status === 'done' && (
                <Icon as={FiCheck} boxSize={4} color="green.400" flexShrink={0} />
              )}
              {dl.status === 'error' && (
                <Icon as={FiAlertCircle} boxSize={4} color="red.400" flexShrink={0} />
              )}
              {(dl.status === 'done' || dl.status === 'error') && (
                <IconButton
                  icon={<FiX />}
                  size="xs"
                  variant="ghost"
                  color="gray.500"
                  aria-label="Dismiss"
                  onClick={() => onDismiss && onDismiss(dl.id)}
                  _hover={{ color: 'white', bg: 'primary.600' }}
                  flexShrink={0}
                />
              )}
            </HStack>
          ))}
        </VStack>
      )}
    </Box>
  );

  return createPortal(panel, document.body);
};

export default DownloadStatusPanel;
