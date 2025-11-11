import { Box, Text } from '@chakra-ui/react';

const TextView = ({ extractedContent, highlightedText, highlightRefs }) => {
  if (!extractedContent) {
    return (
      <Box textAlign="center" py={12}>
        <Text color="gray.500">No text content available</Text>
      </Box>
    );
  }

  return (
    <Box
      bg="primary.800"
      p={6}
      rounded="md"
      border="1px"
      borderColor="primary.600"
      fontFamily="mono"
      fontSize="sm"
      whiteSpace="pre-wrap"
      color="gray.300"
      lineHeight="tall"
      maxW="900px"
      mx="auto"
    >
      {Array.isArray(highlightedText) ? (
        highlightedText.map((part) =>
          part.type === 'text' ? (
            <span key={part.key}>{part.content}</span>
          ) : (
            <mark
              key={part.key}
              ref={(el) => {
                if (el) highlightRefs.current[part.index] = el;
              }}
              style={{
                backgroundColor: part.isCurrent ? '#ff9800' : '#ffeb3b',
                color: '#000',
                padding: '2px 4px',
                borderRadius: '2px',
                boxShadow: part.isCurrent ? '0 0 0 2px #ff5722' : 'none',
              }}
            >
              {part.content}
            </mark>
          )
        )
      ) : (
        highlightedText
      )}
    </Box>
  );
};

export default TextView;
