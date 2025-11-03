# backend/search_service.py
"""
AI-Powered Search Service
Implements semantic search, keyword matching, and hybrid ranking
"""

import numpy as np
from typing import List, Tuple, Dict, Optional
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
from functools import lru_cache

# Initialize models (loaded once, cached in memory)
_embedding_model = None
_tfidf_vectorizer = None


def get_embedding_model():
    """Get or initialize the sentence transformer model"""
    global _embedding_model
    if _embedding_model is None:
        print("[INFO] Loading sentence transformer model...")
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("[INFO] Model loaded successfully")
    return _embedding_model


def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding vector for text
    
    Args:
        text: Text to embed
    
    Returns:
        384-dimensional embedding vector
    """
    if not text or not text.strip():
        return [0.0] * 384  # Return zero vector for empty text
    
    model = get_embedding_model()
    embedding = model.encode(text, convert_to_numpy=True)
    return embedding.tolist()


def cosine_similarity_score(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculate cosine similarity between two vectors
    
    Args:
        vec1: First vector
        vec2: Second vector
    
    Returns:
        Similarity score between 0 and 1
    """
    if not vec1 or not vec2:
        return 0.0
    
    vec1_np = np.array(vec1)
    vec2_np = np.array(vec2)
    
    # Handle zero vectors
    norm1 = np.linalg.norm(vec1_np)
    norm2 = np.linalg.norm(vec2_np)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    similarity = np.dot(vec1_np, vec2_np) / (norm1 * norm2)
    return float(similarity)


def keyword_match_score(query: str, text: str) -> float:
    """
    Calculate keyword matching score using TF-IDF
    
    Args:
        query: Search query
        text: Document text
    
    Returns:
        Keyword match score between 0 and 1
    """
    if not query or not text:
        return 0.0
    
    try:
        # Simple TF-IDF for two documents
        vectorizer = TfidfVectorizer(lowercase=True, stop_words='english')
        tfidf_matrix = vectorizer.fit_transform([query.lower(), text.lower()])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(similarity)
    except:
        return 0.0


def fuzzy_match_score(query: str, text: str) -> float:
    """
    Calculate fuzzy matching score for handling typos
    
    Args:
        query: Search query
        text: Document text
    
    Returns:
        Fuzzy match score between 0 and 1
    """
    if not query or not text:
        return 0.0
    
    query_lower = query.lower()
    text_lower = text.lower()
    
    # Check for exact substring match
    if query_lower in text_lower:
        return 1.0
    
    # Check for word matches
    query_words = set(query_lower.split())
    text_words = set(text_lower.split())
    
    if not query_words:
        return 0.0
    
    # Calculate overlap
    overlap = len(query_words.intersection(text_words))
    score = overlap / len(query_words)
    
    return float(score)


def filename_match_score(query: str, filename: str) -> float:
    """
    Calculate filename relevance score
    
    Args:
        query: Search query
        filename: Document filename
    
    Returns:
        Filename match score between 0 and 1
    """
    if not query or not filename:
        return 0.0
    
    query_lower = query.lower()
    filename_lower = filename.lower()
    
    # Exact match
    if query_lower == filename_lower:
        return 1.0
    
    # Substring match
    if query_lower in filename_lower:
        return 0.8
    
    # Word overlap
    query_words = set(query_lower.split())
    filename_words = set(re.findall(r'\w+', filename_lower))
    
    if not query_words:
        return 0.0
    
    overlap = len(query_words.intersection(filename_words))
    return float(overlap / len(query_words)) * 0.6


def calculate_hybrid_score(
    query_embedding: List[float],
    doc_embedding: List[float],
    query: str,
    doc_content: str,
    doc_filename: str
) -> Dict[str, float]:
    """
    Calculate comprehensive relevance score using multiple signals
    
    Args:
        query_embedding: Query embedding vector
        doc_embedding: Document embedding vector
        query: Original query text
        doc_content: Document content text
        doc_filename: Document filename
    
    Returns:
        Dictionary with individual scores and total score
    """
    # Semantic similarity (most important)
    semantic_score = cosine_similarity_score(query_embedding, doc_embedding)
    
    # Keyword matching
    keyword_score = keyword_match_score(query, doc_content or "")
    
    # Fuzzy matching (handles typos)
    fuzzy_score = fuzzy_match_score(query, doc_content or "")
    
    # Filename relevance
    filename_score = filename_match_score(query, doc_filename)
    
    # Weighted combination
    # Semantic: 50%, Keyword: 25%, Filename: 15%, Fuzzy: 10%
    total_score = (
        semantic_score * 0.50 +
        keyword_score * 0.25 +
        filename_score * 0.15 +
        fuzzy_score * 0.10
    )
    
    return {
        "semantic": round(semantic_score, 4),
        "keyword": round(keyword_score, 4),
        "fuzzy": round(fuzzy_score, 4),
        "filename": round(filename_score, 4),
        "total": round(total_score, 4)
    }


def extract_relevant_snippet(query: str, content: str, max_length: int = 200) -> str:
    """
    Extract relevant snippet from document content
    
    Args:
        query: Search query
        content: Full document content
        max_length: Maximum snippet length
    
    Returns:
        Relevant snippet with query context
    """
    if not content:
        return ""
    
    query_lower = query.lower()
    content_lower = content.lower()
    
    # Try to find query in content
    idx = content_lower.find(query_lower)
    
    if idx != -1:
        # Extract context around query
        start = max(0, idx - 50)
        end = min(len(content), idx + len(query) + 150)
        snippet = content[start:end]
        
        # Add ellipsis
        if start > 0:
            snippet = "..." + snippet
        if end < len(content):
            snippet = snippet + "..."
        
        return snippet
    
    # If no exact match, return beginning
    snippet = content[:max_length]
    if len(content) > max_length:
        snippet += "..."
    
    return snippet


def rank_search_results(
    query: str,
    documents: List[Dict],
    min_score: float = 0.1
) -> List[Dict]:
    """
    Rank documents by relevance to query
    
    Args:
        query: Search query
        documents: List of document dicts with content and embeddings
        min_score: Minimum score threshold
    
    Returns:
        Ranked list of documents with scores and snippets
    """
    if not query or not documents:
        return []
    
    # Generate query embedding
    query_embedding = generate_embedding(query)
    
    results = []
    
    for doc in documents:
        # Calculate scores
        scores = calculate_hybrid_score(
            query_embedding=query_embedding,
            doc_embedding=doc.get('embedding', []),
            query=query,
            doc_content=doc.get('content', ''),
            doc_filename=doc.get('filename', '')
        )
        
        # Skip low-relevance results
        if scores['total'] < min_score:
            continue
        
        # Extract snippet
        snippet = extract_relevant_snippet(
            query=query,
            content=doc.get('content', ''),
            max_length=200
        )
        
        results.append({
            **doc,
            'relevance_score': scores['total'],
            'score_breakdown': scores,
            'snippet': snippet
        })
    
    # Sort by relevance score (descending)
    results.sort(key=lambda x: x['relevance_score'], reverse=True)
    
    return results


def reindex_document(document_id: int, content: str, filename: str) -> Dict:
    """
    Generate embeddings and metadata for a document
    
    Args:
        document_id: Document ID
        content: Document text content
        filename: Document filename
    
    Returns:
        Dictionary with embedding and preview
    """
    # Generate embedding from content + filename
    combined_text = f"{filename}\n\n{content or ''}"
    embedding = generate_embedding(combined_text)
    
    # Create preview
    preview = content[:500] if content else ""
    
    return {
        'embedding': embedding,
        'content_preview': preview
    }