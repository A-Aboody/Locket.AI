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
        # Include last 2 user messages for context
        recent_user_messages = [
            msg['content'] for msg in conversation_history[-4:]
            if msg['role'] == 'user'
        ][-2:]
        if recent_user_messages:
            enhanced_query = f"{' '.join(recent_user_messages)} {query}"

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
            query=query,
            doc_content=doc.content or "",
            doc_filename=doc.filename
        )

        relevance_score = scores['total']

        # Extract relevant excerpt
        excerpt = extract_relevant_excerpt(query, doc.content, max_length=300)

        scored_documents.append((doc, relevance_score, excerpt))

    # Sort by relevance and return top results
    scored_documents.sort(key=lambda x: x[1], reverse=True)
    return scored_documents[:limit]


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
    content = content.strip()
    query_lower = query.lower()

    # Split into sentences
    sentences = re.split(r'[.!?]+', content)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

    if not sentences:
        return content[:max_length] + "..." if len(content) > max_length else content

    # Find sentences containing query keywords
    query_words = set(re.findall(r'\w+', query_lower))
    query_words = {w for w in query_words if len(w) > 3}  # Filter short words

    scored_sentences = []
    for sentence in sentences:
        sentence_lower = sentence.lower()
        # Count keyword matches
        matches = sum(1 for word in query_words if word in sentence_lower)
        scored_sentences.append((sentence, matches))

    # Sort by relevance
    scored_sentences.sort(key=lambda x: x[1], reverse=True)

    # Build excerpt from top sentences
    excerpt_parts = []
    current_length = 0

    for sentence, score in scored_sentences[:3]:  # Take top 3 sentences
        if current_length + len(sentence) > max_length:
            break
        excerpt_parts.append(sentence)
        current_length += len(sentence)

    if not excerpt_parts:
        # Fallback to first sentence or content preview
        return sentences[0] if sentences else content[:max_length]

    excerpt = ". ".join(excerpt_parts)
    if len(excerpt) < len(content):
        excerpt += "..."

    return excerpt


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

    # Main content from excerpts - be more intelligent about presentation
    for i, (doc, score, excerpt) in enumerate(relevant_docs[:3], 1):  # Top 3 docs
        if excerpt:
            # Clean up the excerpt for better readability
            cleaned_excerpt = excerpt.strip()

            # Add conversational markers for multiple documents
            if doc_count > 1:
                response_parts.append(f"\n**From {doc.filename}:**\n{cleaned_excerpt}\n")
            else:
                response_parts.append(f"\n{cleaned_excerpt}\n")

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
