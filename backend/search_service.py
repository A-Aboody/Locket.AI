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
    Calculate filename relevance score with better keyword extraction

    Args:
        query: Search query
        filename: Document filename

    Returns:
        Filename match score between 0 and 1
    """
    if not query or not filename:
        return 0.0

    query_lower = query.lower()

    # Clean filename: remove extension, numbers at start, underscores, special chars
    filename_clean = filename.lower()
    filename_clean = re.sub(r'\.(pdf|docx?|txt|xlsx?|pptx?)$', '', filename_clean)  # Remove extension
    filename_clean = re.sub(r'^\d+[_\-\s]*', '', filename_clean)  # Remove leading numbers like "5008_"
    filename_clean = re.sub(r'[_\-]', ' ', filename_clean)  # Replace underscores/hyphens with spaces

    # Exact match after cleaning
    if query_lower == filename_clean:
        return 1.0

    # Substring match in cleaned filename
    if query_lower in filename_clean or filename_clean in query_lower:
        return 0.9

    # Extract meaningful words (remove common stop words)
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'of', 'to', 'in', 'for', 'on', 'what', 'when', 'where', 'who', 'how', 'why'}

    query_words = set([w for w in query_lower.split() if w not in stop_words and len(w) > 2])
    filename_words = set([w for w in filename_clean.split() if w not in stop_words and len(w) > 2])

    if not query_words:
        return 0.0

    # Calculate word overlap
    overlap = len(query_words.intersection(filename_words))

    # High score if most query words are in filename
    if overlap > 0:
        overlap_ratio = overlap / len(query_words)
        # Boost score significantly for filename matches
        return min(1.0, overlap_ratio * 1.3)

    # No overlap found
    return 0.0


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
    # Filename gets higher weight for better title/filename matching
    # Semantic: 40%, Filename: 30%, Keyword: 20%, Fuzzy: 10%
    total_score = (
        semantic_score * 0.40 +
        filename_score * 0.30 +
        keyword_score * 0.20 +
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


def generate_document_summary(content: str, filename: str, max_sentences: int = 4) -> str:
    """
    Generate an intelligent extractive summary using sentence embeddings and content analysis.
    Selects the most representative and informative sentences from the document.

    Args:
        content: Full document text content
        filename: Document filename for context
        max_sentences: Maximum number of sentences in summary (default: 4 for conciseness)

    Returns:
        Extractive summary as a string
    """
    if not content or not content.strip():
        return "This document appears to be empty or contains no readable text."

    import re

    # Clean up the content first - normalize whitespace
    content = re.sub(r'\s+', ' ', content)

    # Remove common header/footer artifacts
    content = re.sub(r'\b(page|Page|PAGE)\s+\d+\b', '', content)
    content = re.sub(r'\d+\s+of\s+\d+', '', content)

    # Split content into sentences with improved regex
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', content.strip())

    # Key content indicators (words that suggest important information)
    key_indicators = [
        'purpose', 'objective', 'goal', 'aims', 'designed', 'focuses', 'examines',
        'proposes', 'describes', 'presents', 'introduces', 'analyzes', 'discusses',
        'demonstrates', 'explores', 'investigates', 'reveals', 'shows', 'finds',
        'concludes', 'recommends', 'suggests', 'argues', 'claims', 'emphasizes',
        'highlights', 'important', 'significant', 'critical', 'essential', 'key',
        'main', 'primary', 'fundamental', 'central', 'major', 'crucial'
    ]

    def is_quality_sentence(sent: str) -> bool:
        """Enhanced quality check for sentences"""
        sent = sent.strip()

        # Length check - prefer medium to long sentences (8-50 words)
        word_count = len(sent.split())
        if word_count < 8 or word_count > 50:
            return False

        # Skip sentences that are mostly dots (table of contents)
        if sent.count('.') > word_count * 0.4:
            return False

        # Skip sentences with excessive punctuation
        punct_ratio = sum(c in '.,;:!?-()[]{}' for c in sent) / len(sent)
        if punct_ratio > 0.25:
            return False

        # Skip if too many numbers/dates (likely metadata)
        digit_ratio = sum(c.isdigit() for c in sent) / len(sent)
        if digit_ratio > 0.15:
            return False

        # Skip common metadata patterns
        skip_patterns = [
            r'^\d+\.?\s*\d*\.?\s*[A-Z]',  # "1.2 SECTION"
            r'\.{3,}',  # "....."
            r'^\s*\d+\s*$',  # Just numbers
            r'table\s+of\s+contents',
            r'appendix\s+[A-Z]',
            r'copyright|©|\(c\)',  # Copyright notices
            r'^(figure|fig\.|table|tbl\.)\s+\d+',  # Figure/table references
            r'^\s*references?\s*$',  # Reference headers
            r'^\s*bibliography\s*$',
        ]
        for pattern in skip_patterns:
            if re.search(pattern, sent, re.IGNORECASE):
                return False

        # Must be mostly words (not symbols/numbers)
        word_chars = sum(c.isalpha() or c.isspace() for c in sent)
        if word_chars < len(sent) * 0.65:
            return False

        # Skip if sentence is just a title/header (all caps or title case with no verbs)
        if sent.isupper() or (sent.istitle() and not any(word in sent.lower() for word in ['is', 'are', 'was', 'were', 'has', 'have', 'will', 'can', 'should'])):
            return False

        return True

    def get_sentence_importance_score(sent: str) -> float:
        """Calculate importance score based on content indicators"""
        sent_lower = sent.lower()
        score = 0.0

        # Check for key indicator words
        for indicator in key_indicators:
            if indicator in sent_lower:
                score += 0.5

        # Bonus for sentences with specific patterns
        if re.search(r'\b(this\s+(paper|document|study|research|report|article))', sent_lower):
            score += 1.0
        if re.search(r'\b(we\s+(present|propose|introduce|describe|analyze|demonstrate))', sent_lower):
            score += 0.8
        if re.search(r'\b(results?\s+(show|indicate|suggest|demonstrate|reveal))', sent_lower):
            score += 0.7

        return score

    # Filter and score sentences
    quality_sentences = []
    importance_scores = []

    for sent in sentences:
        if is_quality_sentence(sent):
            quality_sentences.append(sent.strip())
            importance_scores.append(get_sentence_importance_score(sent))

    if not quality_sentences:
        # Relaxed criteria fallback
        quality_sentences = [s.strip() for s in sentences if s.strip() and 5 <= len(s.split()) <= 40]
        importance_scores = [0.0] * len(quality_sentences)

    if not quality_sentences:
        return "Unable to generate summary - no valid sentences found in document."

    # If document is very short, return it all
    if len(quality_sentences) <= max_sentences:
        return " ".join(quality_sentences[:max_sentences])

    try:
        model = get_embedding_model()

        # Generate embeddings
        sentence_embeddings = model.encode(quality_sentences, convert_to_numpy=True)
        doc_embedding = model.encode([content], convert_to_numpy=True)[0]

        # Calculate comprehensive scores
        sentence_scores = []
        for i, sent_emb in enumerate(sentence_embeddings):
            # Semantic similarity to overall document
            doc_sim = np.dot(sent_emb, doc_embedding) / (
                np.linalg.norm(sent_emb) * np.linalg.norm(doc_embedding)
            )

            # Position weight - heavily favor beginning, moderately favor middle
            position_ratio = i / len(quality_sentences)
            if position_ratio < 0.15:  # First 15% - intro/abstract
                position_weight = 1.5
            elif position_ratio < 0.35:  # Next 20% - main concepts
                position_weight = 1.3
            elif position_ratio > 0.85:  # Last 15% - conclusions
                position_weight = 1.1
            else:  # Middle sections
                position_weight = 0.9

            # Length optimization - prefer 15-30 word sentences
            word_count = len(quality_sentences[i].split())
            if 15 <= word_count <= 30:
                length_weight = 1.2
            elif 10 <= word_count <= 35:
                length_weight = 1.0
            else:
                length_weight = 0.8

            # Content importance score
            importance_weight = 1.0 + importance_scores[i]

            # Diversity bonus - calculate similarity to already selected sentences
            diversity_penalty = 0.0

            # Combined score with all factors
            score = doc_sim * position_weight * length_weight * importance_weight
            sentence_scores.append((i, score, quality_sentences[i]))

        # Select top sentences with diversity consideration
        selected_sentences = []
        remaining_scores = sorted(sentence_scores, key=lambda x: x[1], reverse=True)

        while len(selected_sentences) < max_sentences and remaining_scores:
            # Take the highest scored sentence
            best = remaining_scores.pop(0)
            selected_sentences.append(best)

            # Apply diversity penalty to remaining sentences
            if len(selected_sentences) < max_sentences and remaining_scores:
                best_embedding = sentence_embeddings[best[0]]
                new_remaining = []
                for item in remaining_scores:
                    item_embedding = sentence_embeddings[item[0]]
                    similarity = np.dot(best_embedding, item_embedding) / (
                        np.linalg.norm(best_embedding) * np.linalg.norm(item_embedding)
                    )
                    # Reduce score if too similar to already selected sentence
                    diversity_penalty = similarity * 0.3
                    new_score = item[1] * (1 - diversity_penalty)
                    new_remaining.append((item[0], new_score, item[2]))
                remaining_scores = sorted(new_remaining, key=lambda x: x[1], reverse=True)

        # Re-order by original position for coherence
        selected_sentences.sort(key=lambda x: x[0])

        # Create final summary
        summary = " ".join([sent[2] for sent in selected_sentences])

        # Ensure summary isn't too long (max ~500 chars for conciseness)
        if len(summary) > 600:
            # If too long, reduce to 3 sentences
            if len(selected_sentences) > 3:
                selected_sentences = selected_sentences[:3]
                summary = " ".join([sent[2] for sent in selected_sentences])

        return summary

    except Exception as e:
        # Fallback to importance-based selection
        print(f"[WARNING] Summary generation failed: {e}")
        # Sort by importance scores and take top sentences
        scored = list(zip(quality_sentences, importance_scores))
        scored.sort(key=lambda x: x[1], reverse=True)
        fallback = [s[0] for s in scored[:max_sentences]]
        return " ".join(fallback)