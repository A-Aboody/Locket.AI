# backend/document_processing.py
"""
Document processing utilities
Extract text content from various document formats
"""

import os
from typing import Optional, Tuple
import PyPDF2
from docx import Document as DocxDocument


def extract_text_from_pdf(file_path: str) -> Tuple[str, int]:
    """
    Extract text content from PDF file
    
    Args:
        file_path: Path to PDF file
    
    Returns:
        Tuple of (extracted_text, page_count)
    """
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            page_count = len(pdf_reader.pages)
            
            text_content = []
            for page_num in range(page_count):
                page = pdf_reader.pages[page_num]
                text_content.append(page.extract_text())
            
            full_text = '\n\n'.join(text_content)
            return full_text, page_count
            
    except Exception as e:
        print(f"[ERROR] PDF extraction failed: {e}")
        return "", 0


def extract_text_from_docx(file_path: str) -> Tuple[str, int]:
    """
    Extract text content from DOCX file
    
    Args:
        file_path: Path to DOCX file
    
    Returns:
        Tuple of (extracted_text, page_count)
    """
    try:
        doc = DocxDocument(file_path)
        
        # Extract all paragraphs
        paragraphs = [paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()]
        full_text = '\n\n'.join(paragraphs)
        
        # Estimate page count (rough estimate: 500 words per page)
        word_count = len(full_text.split())
        page_count = max(1, word_count // 500)
        
        return full_text, page_count
        
    except Exception as e:
        print(f"[ERROR] DOCX extraction failed: {e}")
        return "", 1


def extract_text_from_txt(file_path: str) -> Tuple[str, int]:
    """
    Extract text content from TXT file
    
    Args:
        file_path: Path to TXT file
    
    Returns:
        Tuple of (extracted_text, page_count)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Estimate page count (rough estimate: 3000 characters per page)
        page_count = max(1, len(content) // 3000)
        
        return content, page_count
        
    except UnicodeDecodeError:
        # Try different encoding if UTF-8 fails
        try:
            with open(file_path, 'r', encoding='latin-1') as file:
                content = file.read()
            page_count = max(1, len(content) // 3000)
            return content, page_count
        except Exception as e:
            print(f"[ERROR] TXT extraction failed: {e}")
            return "", 1
    except Exception as e:
        print(f"[ERROR] TXT extraction failed: {e}")
        return "", 1


def process_document(file_path: str, file_type: str) -> Tuple[Optional[str], int]:
    """
    Process document and extract text content based on file type
    
    Args:
        file_path: Path to document file
        file_type: MIME type or file extension
    
    Returns:
        Tuple of (extracted_text, page_count) or (None, 0) if unsupported
    """
    file_type_lower = file_type.lower()
    
    if 'pdf' in file_type_lower or file_path.endswith('.pdf'):
        return extract_text_from_pdf(file_path)
    
    elif 'word' in file_type_lower or file_path.endswith('.docx') or file_path.endswith('.doc'):
        return extract_text_from_docx(file_path)
    
    elif 'text' in file_type_lower or file_path.endswith('.txt'):
        return extract_text_from_txt(file_path)
    
    else:
        print(f"[WARNING] Unsupported file type: {file_type}")
        return None, 0


def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    return os.path.splitext(filename)[1].lower()


def is_allowed_file(filename: str, allowed_extensions: set) -> bool:
    """
    Check if file has allowed extension
    
    Args:
        filename: Name of file
        allowed_extensions: Set of allowed extensions (e.g., {'.pdf', '.txt', '.docx'})
    
    Returns:
        True if file extension is allowed
    """
    ext = get_file_extension(filename)
    return ext in allowed_extensions


def validate_file_size(file_size: int, max_size_mb: int) -> bool:
    """
    Validate file size
    
    Args:
        file_size: File size in bytes
        max_size_mb: Maximum allowed size in MB
    
    Returns:
        True if file size is within limit
    """
    max_size_bytes = max_size_mb * 1024 * 1024
    return file_size <= max_size_bytes