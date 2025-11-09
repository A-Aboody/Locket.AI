import { useState, useEffect, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { documentsAPI } from '../../utils/api';
import { renderAsync } from 'docx-preview';

export const useDocumentData = (documentId, onClose) => {
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [extractedContent, setExtractedContent] = useState('');
  const toast = useToast();
  const blobUrlRef = useRef(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);

        const metaResponse = await documentsAPI.get(documentId);
        const docData = metaResponse.data;
        setDocumentData(docData);

        const extension = docData.filename.split('.').pop().toLowerCase();
        setFileType(extension);

        try {
          const contentResponse = await documentsAPI.getContent(documentId);
          setExtractedContent(contentResponse.data.content);
        } catch (err) {
          console.warn('Could not fetch extracted content:', err);
        }

        if (['pdf', 'docx', 'doc'].includes(extension)) {
          setViewerLoading(true);
          try {
            const fileResponse = await documentsAPI.downloadFile(documentId);

            if (extension === 'pdf') {
              if (fileResponse.data instanceof Blob) {
                if (blobUrlRef.current) {
                  URL.revokeObjectURL(blobUrlRef.current);
                }
                const url = URL.createObjectURL(fileResponse.data);
                blobUrlRef.current = url;
                setPdfFile(url);
              } else {
                throw new Error('Invalid PDF data received from server');
              }
            } else {
              setPdfFile(fileResponse.data);
            }
          } catch (fileError) {
            console.error('Failed to load file for viewing:', fileError);
            toast({
              title: 'File viewer unavailable',
              description: 'The file could not be loaded for viewing. You can still download it.',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
          } finally {
            setViewerLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to load document:', error);
        toast({
          title: 'Failed to load document',
          description: error.response?.data?.detail || error.message || 'An error occurred',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [documentId, onClose, toast]);

  const handleDownload = async () => {
    try {
      const response = await documentsAPI.downloadFile(documentId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', documentData.filename);
      window.document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error.response?.data?.detail || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const renderDocx = async (docxContainerRef) => {
    if (!docxContainerRef.current || !pdfFile) return;

    try {
      setViewerLoading(true);
      docxContainerRef.current.innerHTML = '';

      await renderAsync(pdfFile, docxContainerRef.current, null, {
        className: 'docx-wrapper',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
        useBase64URL: true,
      });

      setViewerLoading(false);
    } catch (error) {
      console.error('Error rendering DOCX:', error);
      setViewerLoading(false);
      toast({
        title: 'DOCX rendering failed',
        description: 'Switching to text view',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return false;
    }
    return true;
  };

  return {
    documentData,
    loading,
    viewerLoading,
    pdfFile,
    fileType,
    extractedContent,
    handleDownload,
    renderDocx,
  };
};
