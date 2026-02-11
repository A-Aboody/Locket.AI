// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ChakraProvider } from "@chakra-ui/react";
import { HashRouter } from "react-router-dom";
import { PendingFileProvider } from './contexts/PendingFileContext';
import { PendingInviteProvider } from './contexts/PendingInviteContext';
import theme from './theme';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ChakraProvider theme={theme}>
        <PendingFileProvider>
          <PendingInviteProvider>
            <App />
          </PendingInviteProvider>
        </PendingFileProvider>
      </ChakraProvider>
    </HashRouter>
  </React.StrictMode>
);