// frontend/src/theme.js
import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  colors: {
    primary: {
      50: '#f5f5f5',
      100: '#e0e0e0',
      200: '#c2c2c2',
      300: '#a3a3a3',
      400: '#858585',
      500: '#525252', // Primary
      600: '#424242',
      700: '#313131', // Secondary
      800: '#242424',
      900: '#1E1E1E', // Background
    },
    accent: {
      50: '#e6f7f7',
      100: '#b3e8e9',
      200: '#80d9db',
      300: '#4dcacd',
      400: '#2ebbbf',
      500: '#248A8E', // Accent
      600: '#1d6f72',
      700: '#165356',
      800: '#0f383a',
      900: '#081c1e',
    },
    background: {
      primary: '#1E1E1E',
      secondary: '#313131',
      tertiary: '#525252',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'background.primary',
        color: 'gray.100',
      },
    },
  },
  components: {
    Button: {
      variants: {
        solid: {
          bg: 'accent.500',
          color: 'white',
          _hover: {
            bg: 'accent.600',
          },
          _active: {
            bg: 'accent.700',
          },
        },
        ghost: {
          color: 'gray.300',
          _hover: {
            bg: 'primary.700',
            color: 'white',
          },
        },
        outline: {
          borderColor: 'accent.500',
          color: 'accent.500',
          _hover: {
            bg: 'accent.500',
            color: 'white',
          },
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'primary.700',
            borderColor: 'primary.500',
            color: 'white',
            _placeholder: {
              color: 'gray.500',
            },
            _hover: {
              borderColor: 'accent.500',
            },
            _focus: {
              borderColor: 'accent.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
            },
          },
        },
        filled: {
          field: {
            bg: 'primary.700',
            color: 'white',
            _placeholder: {
              color: 'gray.500',
            },
            _hover: {
              bg: 'primary.600',
            },
            _focus: {
              bg: 'primary.600',
              borderColor: 'accent.500',
            },
          },
        },
      },
      defaultProps: {
        variant: 'outline',
      },
    },
    Textarea: {
      variants: {
        outline: {
          bg: 'primary.700',
          borderColor: 'primary.500',
          color: 'white',
          _placeholder: {
            color: 'gray.500',
          },
          _hover: {
            borderColor: 'accent.500',
          },
          _focus: {
            borderColor: 'accent.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
          },
        },
      },
    },
    Table: {
      variants: {
        simple: {
          th: {
            color: 'gray.400',
            borderColor: 'primary.600',
            textTransform: 'none',
            fontWeight: 'semibold',
          },
          td: {
            color: 'gray.200',
            borderColor: 'primary.600',
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          bg: 'primary.800',
        },
        header: {
          color: 'white',
        },
        body: {
          color: 'gray.200',
        },
      },
    },
    Tabs: {
      variants: {
        enclosed: {
          tab: {
            color: 'gray.400',
            borderColor: 'primary.600',
            _selected: {
              color: 'accent.500',
              borderColor: 'accent.500',
              borderBottomColor: 'transparent',
              bg: 'primary.800',
            },
            _hover: {
              color: 'accent.400',
            },
          },
          tabpanel: {
            bg: 'primary.800',
            borderColor: 'primary.600',
          },
        },
        line: {
          tab: {
            color: 'gray.400',
            _selected: {
              color: 'accent.500',
              borderColor: 'accent.500',
            },
            _hover: {
              color: 'accent.400',
            },
          },
        },
      },
    },
  },
});

export default theme;