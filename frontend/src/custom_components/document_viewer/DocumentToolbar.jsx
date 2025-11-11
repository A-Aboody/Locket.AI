import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Badge,
  IconButton,
  Divider,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiX,
  FiFile,
  FiDownload,
  FiZoomIn,
  FiZoomOut,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiMaximize2,
  FiMinimize2,
} from 'react-icons/fi';
import { formatFileSize, getFileTypeColor } from '../../utils/formatters';
import DocumentSearchBar from '../DocumentSearchBar';

const DocumentToolbar = ({
  documentData,
  fileType,
  viewMode,
  numPages,
  currentPage,
  scale,
  fitWidth,
  searchOpen,
  onClose,
  onDownload,
  onToggleSearch,
  onCloseSearch,
  onPreviousPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onToggleFitWidth,
}) => {
  const getFileExtension = (filename) => {
    return filename.split('.').pop().toUpperCase();
  };

  return (
    <Box
      bg="primary.800"
      borderBottom="1px"
      borderColor="primary.600"
      px={4}
      py={3}
      flexShrink={0}
    >
      <HStack justify="space-between" spacing={4}>
        <HStack spacing={4} flex={1} minW={0}>
          <Icon as={FiFile} boxSize={5} color={`${getFileTypeColor(documentData.filename)}.400`} />
          <VStack align="start" spacing={0} minW={0}>
            <Text fontWeight="semibold" fontSize="md" color="white" noOfLines={1} maxW="400px">
              {documentData.filename}
            </Text>
            <HStack spacing={2} fontSize="xs" color="gray.400">
              <Badge colorScheme={getFileTypeColor(documentData.filename)} fontSize="xs">
                {getFileExtension(documentData.filename)}
              </Badge>
              <Text>{formatFileSize(documentData.file_size)}</Text>
              {numPages && (
                <>
                  <Text>•</Text>
                  <Text>
                    {numPages} {numPages === 1 ? 'page' : 'pages'}
                  </Text>
                </>
              )}
            </HStack>
          </VStack>
        </HStack>

        {fileType === 'pdf' && viewMode === 'native' && numPages && (
          <HStack spacing={2}>
            <IconButton
              icon={<FiChevronLeft />}
              onClick={onPreviousPage}
              isDisabled={currentPage <= 1}
              size="sm"
              aria-label="Previous page"
              variant="ghost"
              color="gray.400"
              _hover={{ bg: 'primary.700', color: 'white' }}
            />
            <HStack bg="primary.700" px={3} py={1} rounded="md" minW="100px" justify="center">
              <Text fontSize="sm" fontWeight="medium" color="white">
                {currentPage}
              </Text>
              <Text fontSize="sm" color="gray.400">
                / {numPages}
              </Text>
            </HStack>
            <IconButton
              icon={<FiChevronRight />}
              onClick={onNextPage}
              isDisabled={currentPage >= numPages}
              size="sm"
              aria-label="Next page"
              variant="ghost"
              color="gray.400"
              _hover={{ bg: 'primary.700', color: 'white' }}
            />

            <Divider orientation="vertical" h={6} borderColor="primary.600" mx={2} />

            <IconButton
              icon={<FiZoomOut />}
              onClick={onZoomOut}
              isDisabled={scale <= 0.5 && !fitWidth}
              size="sm"
              aria-label="Zoom out"
              variant="ghost"
              color="gray.400"
              _hover={{ bg: 'primary.700', color: 'white' }}
            />
            <HStack bg="primary.700" px={3} py={1} rounded="md" minW="70px" justify="center">
              <Text fontSize="sm" fontWeight="medium" color="white">
                {fitWidth ? 'Fit' : `${Math.round(scale * 100)}%`}
              </Text>
            </HStack>
            <IconButton
              icon={<FiZoomIn />}
              onClick={onZoomIn}
              isDisabled={scale >= 3.0 && !fitWidth}
              size="sm"
              aria-label="Zoom in"
              variant="ghost"
              color="gray.400"
              _hover={{ bg: 'primary.700', color: 'white' }}
            />
            <Tooltip label={fitWidth ? 'Actual size' : 'Fit to width'}>
              <IconButton
                icon={fitWidth ? <FiMinimize2 /> : <FiMaximize2 />}
                onClick={onToggleFitWidth}
                size="sm"
                aria-label="Toggle fit width"
                variant="ghost"
                color="gray.400"
                _hover={{ bg: 'primary.700', color: 'white' }}
              />
            </Tooltip>
          </HStack>
        )}

        <HStack spacing={2}>
          <Tooltip label="Search in document (Ctrl+F)">
            <IconButton
              icon={<FiSearch />}
              onClick={onToggleSearch}
              size="sm"
              aria-label="Search"
              variant="ghost"
              color={searchOpen ? 'accent.400' : 'gray.400'}
              _hover={{ bg: 'primary.700', color: 'accent.400' }}
            />
          </Tooltip>
          <Button
            size="sm"
            leftIcon={<FiDownload />}
            onClick={onDownload}
            variant="ghost"
            color="gray.400"
            _hover={{ bg: 'primary.700', color: 'white' }}
          >
            Download
          </Button>
          <IconButton
            icon={<FiX />}
            onClick={onClose}
            size="sm"
            aria-label="Close"
            variant="ghost"
            color="gray.400"
            _hover={{ bg: 'primary.700', color: 'white' }}
          />
        </HStack>
      </HStack>

      {searchOpen && (
        <Box mt={3}>
          <DocumentSearchBar onClose={onCloseSearch} />
        </Box>
      )}
    </Box>
  );
};

export default DocumentToolbar;
