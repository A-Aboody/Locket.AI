import { Box } from '@chakra-ui/react';

const DOCXViewer = ({ docxContainerRef }) => {
  return (
    <Box
      ref={docxContainerRef}
      w="100%"
      maxW="850px"
      bg="white"
      p={8}
      boxShadow="0 2px 8px rgba(0,0,0,0.3)"
      my={6}
    />
  );
};

export default DOCXViewer;
