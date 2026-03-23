# backend/chat_service.py
"""
AI Chat Service for document-based question answering
Integrates with search service for document retrieval and provides conversational responses
"""

from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
import database_models as models
import search_service
from datetime import datetime, timezone
import re


FOLLOW_UP_HINTS = {
    'that', 'this', 'it', 'those', 'these', 'them', 'he', 'she', 'they',
    'previous', 'earlier', 'above', 'before', 'latter', 'former',
    'our', 'we', 'us', 'team', 'project'
}

SOURCE_REQUEST_HINTS = {
    'source', 'sources', 'citation', 'citations', 'cite', 'proof', 'reference', 'references'
}

STOP_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'of', 'to', 'in', 'for',
    'on', 'at', 'by', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'tell', 'me', 'about',
    'need', 'more', 'detail', 'details', 'these', 'those', 'this', 'that', 'components', 'configured', 'integrated'
}

QUERY_SYNONYMS = {
    'hardware': ['device', 'pi', 'raspberry', 'node', 'server', 'architecture'],
    'architecture': ['design', 'layout', 'topology', 'node', 'component'],
    'router': ['gateway', 'network', 'pi4', 'pi-4', 'raspberry'],
    'password': ['credential', 'login', 'username', 'auth'],
}


def build_query_terms(query: str) -> List[str]:
    """Expand query into richer terms for better excerpt retrieval."""
    tokens = [
        token for token in re.findall(r'\w+', (query or '').lower())
        if len(token) > 2 and token not in STOP_WORDS
    ]

    expanded = set(tokens)
    for token in tokens:
        for synonym in QUERY_SYNONYMS.get(token, []):
            expanded.add(synonym)

    query_lower = (query or '').lower()
    if 'hardware architecture' in query_lower:
        expanded.update(['hardware', 'architecture', 'node', 'server', 'pi', 'role'])

    return list(expanded)


def is_follow_up_query(query: str) -> bool:
    """Heuristic to detect coreference / follow-up questions that need chat context."""
    if not query:
        return False
    query_lower = query.lower().strip()
    tokens = re.findall(r"\w+", query_lower)
    if len(tokens) <= 10 and any(token in FOLLOW_UP_HINTS for token in tokens):
        return True
    return any(phrase in query_lower for phrase in [
        'based on that', 'from that', 'from the previous', 'continue', 'elaborate', 'more details'
    ])


def get_relevant_documents(
    db: Session,
    user_id: int,
    query: str,
    conversation_history: List[Dict[str, str]] = None,
    limit: int = 5
) -> List[Tuple[models.Document, float, str]]:
    """
    Retrieve relevant documents for the query based on user's accessible documents

    Args:
        db: Database session
        user_id: Current user ID
        query: User's question
        conversation_history: Previous messages for context
        limit: Maximum number of documents to return

    Returns:
        List of (Document, relevance_score, excerpt) tuples
    """
    # Get user's accessible documents (private, public, and group documents)
    user = db.query(models.User).filter(models.User.id == user_id).first()

    # Build query with conversation context
    enhanced_query = query
    if conversation_history:
        # Include last user/assistant turns for context persistence
        recent_user_messages = [
            msg['content'] for msg in conversation_history[-4:]
            if msg['role'] == 'user'
        ][-2:]

        recent_assistant_messages = [
            msg['content'] for msg in conversation_history[-4:]
            if msg['role'] == 'assistant'
        ][-1:]

        context_chunks = []
        if is_follow_up_query(query):
            context_chunks.extend(recent_assistant_messages)
            context_chunks.extend(recent_user_messages)
        else:
            context_chunks.extend(recent_user_messages[-1:])

        if context_chunks:
            enhanced_query = f"{' '.join(context_chunks)} {query}"

    # Generate query embedding
    query_embedding = search_service.generate_embedding(enhanced_query)

    # Get all accessible documents
    accessible_docs = []

    # Private documents
    private_docs = db.query(models.Document).filter(
        models.Document.uploaded_by_id == user_id,
        models.Document.visibility == 'private'
    ).all()
    accessible_docs.extend(private_docs)

    # Public documents
    public_docs = db.query(models.Document).filter(
        models.Document.visibility == 'public'
    ).all()
    accessible_docs.extend(public_docs)

    # Group documents
    user_groups = db.query(models.UserGroupMember).filter(
        models.UserGroupMember.user_id == user_id
    ).all()
    group_ids = [membership.group_id for membership in user_groups]

    if group_ids:
        group_docs = db.query(models.Document).filter(
            models.Document.visibility == 'group',
            models.Document.user_group_id.in_(group_ids)
        ).all()
        accessible_docs.extend(group_docs)

    # Calculate relevance scores and extract excerpts
    scored_documents = []
    for doc in accessible_docs:
        if not doc.content or not doc.embedding:
            continue

        # Calculate hybrid score
        scores = search_service.calculate_hybrid_score(
            query_embedding=query_embedding,
            doc_embedding=doc.embedding,
            query=enhanced_query,
            doc_content=doc.content or "",
            doc_filename=doc.filename
        )

        relevance_score = scores['total']

        # Extract relevant excerpt
        excerpt = extract_relevant_excerpt(enhanced_query, doc.content, max_length=300)

        scored_documents.append((doc, relevance_score, excerpt))

    # Sort by relevance and return top results
    scored_documents.sort(key=lambda x: x[1], reverse=True)
    return scored_documents[:limit]


def is_doc_relevant_to_query(query: str, excerpt: str, score: float) -> bool:
    """Filter citations to only keep highly relevant source snippets for this query."""
    if score >= 0.45:
        return True
    if is_follow_up_query(query) and score >= 0.12:
        return True
    if score < 0.12:
        return False

    query_terms = set(build_query_terms(query))
    if not query_terms:
        return score >= 0.2

    excerpt_terms = set(re.findall(r'\w+', (excerpt or '').lower()))
    overlap = len(query_terms.intersection(excerpt_terms))
    return overlap >= 1 and score >= 0.2


def boost_relevance_for_direct_match(query: str, filename: str, excerpt: str, score: float) -> float:
    """Boost score when query terms directly match filename/excerpt (better UX for exact lookups)."""
    query_terms = [
        term for term in re.findall(r'\w+', (query or '').lower())
        if len(term) > 2 and term not in STOP_WORDS
    ]

    if not query_terms:
        return float(min(1.0, max(0.0, score)))

    haystack = f"{(filename or '').lower()} {(excerpt or '').lower()}"
    overlap = sum(1 for term in set(query_terms) if term in haystack)
    overlap_ratio = overlap / max(1, len(set(query_terms)))

    bonus = 0.0
    bonus += 0.25 * overlap_ratio

    if ('password' in query.lower()) and ('password' in haystack):
        bonus += 0.2

    if overlap >= 2:
        bonus += 0.1

    return float(min(1.0, max(0.0, score + bonus)))


def user_requested_sources(query: str) -> bool:
    """True when user explicitly asks for citations/sources."""
    if not query:
        return False
    query_lower = query.lower()
    return any(hint in query_lower for hint in SOURCE_REQUEST_HINTS) or any(
        phrase in query_lower for phrase in ['show me the source', 'where did you get this', 'which document']
    )


def should_attach_citations(query: str, relevant_docs: List[Tuple[models.Document, float, str]]) -> bool:
    """Attach citations only for direct doc-backed answers or explicit user request."""
    if not relevant_docs:
        return False
    if user_requested_sources(query):
        return True
    best_score = max(score for _, score, _ in relevant_docs)
    return best_score >= 0.38


def extract_relevant_excerpt(query: str, content: str, max_length: int = 300) -> str:
    """
    Extract the most relevant excerpt from document content

    Args:
        query: User's query
        content: Document content
        max_length: Maximum excerpt length

    Returns:
        Relevant excerpt from the document
    """
    if not content:
        return ""

    # Normalize text
    content = re.sub(r'\s+', ' ', content.strip())
    if not content:
        return ""

    query_terms = set(build_query_terms(query))

    # Build candidate chunks by paragraph-ish boundaries and lightweight sliding windows
    raw_parts = [p.strip() for p in re.split(r'\n{2,}|\.\s+', content) if len(p.strip()) > 25]
    candidates = raw_parts[:]

    if len(content) > 600:
        step = 320
        window = 680
        for start in range(0, min(len(content), 3000), step):
            chunk = content[start:start + window].strip()
            if len(chunk) > 60:
                candidates.append(chunk)

    if not candidates:
        return content[:max_length] + ("..." if len(content) > max_length else "")

    scored = []
    for chunk in candidates:
        chunk_lower = chunk.lower()
        overlap = sum(1 for term in query_terms if term in chunk_lower)
        overlap_ratio = overlap / max(1, len(query_terms))

        keyword_score = search_service.keyword_match_score(query, chunk)
        fuzzy_score = search_service.fuzzy_match_score(query, chunk)
        score = (0.55 * overlap_ratio) + (0.3 * keyword_score) + (0.15 * fuzzy_score)

        # Small bonus for chunks that include concrete config-ish details
        if any(k in chunk_lower for k in ['ip', 'hostname', 'password', 'username', 'port', 'node']):
            score += 0.05

        scored.append((chunk, score))

    scored.sort(key=lambda item: item[1], reverse=True)

    excerpt_parts = []
    current_length = 0
    for chunk, _ in scored[:4]:
        cleaned = chunk.strip(' .')
        if not cleaned:
            continue
        if current_length + len(cleaned) > max_length:
            continue
        excerpt_parts.append(cleaned)
        current_length += len(cleaned)
        if current_length >= int(max_length * 0.8):
            break

    if not excerpt_parts:
        best = scored[0][0]
        return best[:max_length] + ("..." if len(best) > max_length else "")

    excerpt = ". ".join(excerpt_parts)
    return excerpt + ("..." if len(excerpt) < len(content) else "")


def is_greeting(query: str) -> bool:
    """Check if the query is a greeting"""
    greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'howdy', 'sup', 'yo']
    query_lower = query.lower().strip()
    return any(greeting in query_lower for greeting in greetings) and len(query_lower.split()) <= 3


def is_about_locket(query: str) -> bool:
    """Check if the query is asking about Locket"""
    locket_keywords = ['what is locket', 'what are you', 'who are you', 'tell me about yourself', 'what do you do', 'your purpose', 'what can you do']
    query_lower = query.lower().strip()
    return any(keyword in query_lower for keyword in locket_keywords)


def is_general_conversation(query: str) -> bool:
    """Check if the query is general conversation (not document-specific)"""
    general_patterns = [
        'how are you', 'what\'s up', 'thank you', 'thanks', 'bye', 'goodbye',
        'nice', 'cool', 'okay', 'ok', 'got it', 'i see', 'interesting'
    ]
    query_lower = query.lower().strip()
    return any(pattern in query_lower for pattern in general_patterns) and len(query_lower.split()) <= 5


def generate_chat_response(
    query: str,
    relevant_docs: List[Tuple[models.Document, float, str]],
    conversation_history: List[Dict[str, str]] = None
) -> str:
    """
    Generate a chat response based on relevant documents and conversation history

    Args:
        query: User's question
        relevant_docs: List of (Document, score, excerpt) tuples
        conversation_history: Previous messages for context

    Returns:
        Generated response text
    """
    # Handle greetings
    if is_greeting(query):
        return "Hello! I'm Locket, your AI document assistant. I can help you find information in your uploaded documents, answer questions, and have a conversation about your content. What would you like to know?"

    # Handle questions about Locket
    if is_about_locket(query):
        return ("I'm Locket, an AI-powered document retrieval assistant. I help you find and understand information from your uploaded documents.\n\n"
                "Here's what I can do:\n"
                "• Answer questions based on your documents\n"
                "• Search through PDFs, Word docs, and text files\n"
                "• Provide cited sources for my answers\n"
                "• Remember our conversation for context\n"
                "• Help you discover insights from your content\n\n"
                "Just ask me anything about your documents, and I'll search through them to find the most relevant information!")

    # Handle general conversation
    if is_general_conversation(query):
        responses = {
            'thank': "You're welcome! Feel free to ask me anything else about your documents.",
            'bye': "Goodbye! Come back anytime you need help with your documents.",
            'how are you': "I'm doing great, thanks for asking! Ready to help you with your documents. What would you like to know?",
            'nice': "Glad I could help! Let me know if you have any other questions.",
            'okay': "Great! Is there anything else you'd like to know?",
        }
        for keyword, response in responses.items():
            if keyword in query.lower():
                return response
        return "I'm here to help! Ask me anything about your documents."

    # Check if we should use documents or provide a general response
    if not relevant_docs:
        # Try to be helpful even without documents
        return generate_no_documents_response(query)

    # Build context from relevant documents
    context_parts = []
    for i, (doc, score, excerpt) in enumerate(relevant_docs, 1):
        context_parts.append(f"From '{doc.filename}':\n{excerpt}\n")

    context = "\n".join(context_parts)

    # Generate response based on query type
    response = generate_contextual_response(query, context, relevant_docs)

    return response


def generate_contextual_response(
    query: str,
    context: str,
    relevant_docs: List[Tuple[models.Document, float, str]]
) -> str:
    """
    Generate a contextual response based on the query and document context

    Args:
        query: User's question
        context: Aggregated context from relevant documents
        relevant_docs: List of relevant documents with scores

    Returns:
        Generated response
    """
    query_lower = query.lower()

    # Extract key information from context
    doc_count = len(relevant_docs)
    doc_names = [doc.filename for doc, _, _ in relevant_docs]

    # Check if it's a high-quality match (high relevance score)
    best_score = relevant_docs[0][1] if relevant_docs else 0
    is_strong_match = best_score > 0.5

    # Build response
    response_parts = []

    # Conversational introduction
    if is_strong_match:
        intro_phrases = [
            "Great question! I found some very relevant information.",
            "I can help with that! Here's what I found in your documents.",
            "Perfect! I have good information about that.",
        ]
        import random
        response_parts.append(random.choice(intro_phrases) + "\n")
    elif doc_count == 1:
        response_parts.append(f"I found this in '{doc_names[0]}':\n")
    else:
        response_parts.append(f"I found information in {doc_count} documents that might help:\n")

    # Smarter evidence extraction from top excerpts
    query_terms = set(build_query_terms(query))
    evidence = []
    for doc, score, excerpt in relevant_docs[:4]:
        snippets = re.split(r'(?<=[.!?])\s+|\s*;\s*', excerpt or '')
        for snippet in snippets:
            s = snippet.strip()
            if len(s) < 30:
                continue
            s_lower = s.lower()
            overlap = sum(1 for term in query_terms if term in s_lower)
            if overlap == 0 and score < 0.5:
                continue
            evidence.append((s, overlap, score, doc.filename))

    evidence.sort(key=lambda item: (item[1], item[2], len(item[0])), reverse=True)
    picked = []
    seen = set()
    for snippet, _, _, filename in evidence:
        key = snippet.lower()
        if key in seen:
            continue
        seen.add(key)
        picked.append((snippet, filename))
        if len(picked) >= 3:
            break

    if picked:
        if len(picked) == 1:
            response_parts.append(f"\n{picked[0][0]}\n")
        else:
            response_parts.append("\nBased on your documents:\n")
            for snippet, filename in picked:
                response_parts.append(f"• {snippet} _(from {filename})_")
    else:
        # Fallback to top excerpt when sentence-level extraction fails
        top_doc, _, top_excerpt = relevant_docs[0]
        response_parts.append(f"\n{(top_excerpt or '').strip()} _(from {top_doc.filename})_\n")

    # Add helpful conclusion based on context
    if doc_count > 3:
        additional = doc_count - 3
        response_parts.append(f"\n[+] I also found {additional} other document(s) with related information. Let me know if you'd like more details!")
    elif is_strong_match:
        response_parts.append("\n\nDoes this answer your question? Feel free to ask for clarification or more details!")
    else:
        response_parts.append("\n\nThis is what I found that's most relevant. If you need different information, try rephrasing your question!")

    return "\n".join(response_parts)


def generate_no_documents_response(query: str) -> str:
    """
    Generate a response when no relevant documents are found

    Args:
        query: User's question

    Returns:
        Helpful response indicating no documents were found
    """
    # Check if it's a question that seems like it should have documents
    query_lower = query.lower()

    # If it's a very specific question, be more helpful
    if any(word in query_lower for word in ['how', 'what', 'why', 'when', 'where', 'who', 'explain', 'describe', 'tell me']):
        return (
            "I searched through your documents but couldn't find specific information about that topic.\n\n"
            "Here are some suggestions:\n"
            "• Try rephrasing your question with different keywords\n"
            "• Check if you have uploaded documents related to this topic\n"
            "• Make sure the documents containing this information are uploaded and processed\n\n"
            "I'm here to help with any information in your documents. What else would you like to know?"
        )

    return (
        "I don't have any documents that contain information about that yet. "
        "If you upload documents related to this topic, I'll be able to help answer your questions!\n\n"
        "In the meantime, feel free to ask me about anything in your currently uploaded documents."
    )


def create_chat_citations(
    db: Session,
    chat_id: int,
    message_id: int,
    relevant_docs: List[Tuple[models.Document, float, str]]
) -> List[models.ChatCitation]:
    """
    Create citation records for documents used in the response

    Args:
        db: Database session
        chat_id: Chat ID
        message_id: Message ID
        relevant_docs: List of (Document, score, excerpt) tuples

    Returns:
        List of created ChatCitation objects
    """
    citations = []

    for doc, score, excerpt in relevant_docs:
        # Convert score to 0-100 range
        relevance_score = int(score * 100)

        citation = models.ChatCitation(
            chat_id=chat_id,
            message_id=message_id,
            document_id=doc.id,
            relevance_score=relevance_score,
            excerpt=excerpt[:500] if excerpt else None,  # Limit excerpt length
            created_at=datetime.now(timezone.utc)
        )
        db.add(citation)
        citations.append(citation)

    db.commit()
    return citations


def generate_chat_title(first_message: str, max_length: int = 50) -> str:
    """
    Generate a chat title from the first user message

    Args:
        first_message: First message in the chat
        max_length: Maximum title length

    Returns:
        Generated title
    """
    # Clean and truncate the message
    title = first_message.strip()

    # Remove extra whitespace
    title = re.sub(r'\s+', ' ', title)

    # Truncate to max length
    if len(title) > max_length:
        title = title[:max_length].rsplit(' ', 1)[0] + "..."

    return title
