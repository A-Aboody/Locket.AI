# backend/openrouter_service.py
"""
OpenRouter AI Service for document-based question answering
Uses OpenRouter API for LLM inference
"""

import requests
from typing import List, Dict, Optional, Tuple
import database_models as models
from config import config


def is_openrouter_available() -> bool:
    """Check if OpenRouter API key is configured"""
    return config.OPENROUTER_API_KEY is not None and len(config.OPENROUTER_API_KEY) > 0


def generate_chat_response(
    query: str,
    relevant_docs: List[Tuple[models.Document, float, str]],
    conversation_history: Optional[List[Dict[str, str]]] = None,
    model: str = None
) -> Optional[str]:
    """
    Generate an intelligent chat response using OpenRouter

    Args:
        query: User's question
        relevant_docs: List of (Document, score, excerpt) tuples
        conversation_history: Previous messages for context
        model: OpenRouter model to use (defaults to config)

    Returns:
        Generated response or None if OpenRouter is not available
    """
    if not is_openrouter_available():
        print("[OPENROUTER ERROR] API key not configured")
        return None

    # Use configured model or override
    model_to_use = model or config.OPENROUTER_MODEL

    # Build the system prompt - clear and direct
    system_prompt = """You are Locket, a helpful AI assistant for document management.

CRITICAL RULES:
1. If I provide documents with the question - USE THEM to answer. Reference the document name in your response.
2. ONLY add the warning "⚠️ Note: This information was not found in your uploaded documents." if:
   - I provide NO documents, OR
   - The provided documents don't contain relevant information to answer the question
3. If documents ARE provided and relevant - DO NOT add the warning. Just answer using the documents.
4. For greetings (hi, hello) - respond naturally without mentioning documents.

Be direct and helpful. Always check if documents are provided before deciding whether to add the warning."""

    # Check if this is a greeting or casual conversation
    query_lower = query.lower().strip()
    casual_phrases = [
        'hi', 'hello', 'hey', 'sup', 'yo', 'howdy', 'greetings',
        'how are you', "how's it going", "what's up", 'good morning',
        'good afternoon', 'good evening', 'thanks', 'thank you'
    ]
    is_casual = any(phrase == query_lower or query_lower.startswith(phrase + ' ')
                    for phrase in casual_phrases) or len(query_lower.split()) <= 3

    # Build messages for the conversation
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history (last 5 messages)
    if conversation_history:
        for msg in conversation_history[-5:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

    # Build the user message
    if is_casual:
        # For casual conversation, don't include documents
        user_message = query
    elif relevant_docs and len(relevant_docs) > 0:
        # Filter documents by a lower threshold to catch more matches
        usable_docs = [
            (doc, score, excerpt) for doc, score, excerpt in relevant_docs[:8]
            if score > 0.15  # Very low threshold to catch all potentially relevant documents
        ]

        if usable_docs:
            # Sort by relevance and format
            doc_context = "\n\n".join([
                f"[Document: {doc.filename} | Relevance: {int(score * 100)}%]\n{excerpt[:600]}"
                for doc, score, excerpt in usable_docs
            ])

            user_message = f"""Question: {query}

DOCUMENTS PROVIDED (use these to answer):
{doc_context}

IMPORTANT: Since I'm providing documents, use them to answer the question. Only add the "not found" warning if these documents don't actually contain the answer."""
        else:
            user_message = query
    else:
        user_message = query

    messages.append({"role": "user", "content": user_message})

    try:
        # Call OpenRouter API
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {config.OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://locket.ai",  # Optional, for rankings
                "X-Title": "Locket AI",  # Optional, for rankings
                "Content-Type": "application/json"
            },
            json={
                "model": model_to_use,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 2000  # Increased from 500 to allow complete responses
            },
            timeout=30
        )

        response.raise_for_status()
        result = response.json()

        # Extract the response
        if "choices" in result and len(result["choices"]) > 0:
            return result["choices"][0]["message"]["content"]
        else:
            print(f"[OPENROUTER ERROR] Unexpected response format: {result}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"[OPENROUTER ERROR] API request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"[OPENROUTER ERROR] Response: {error_detail}")
            except:
                print(f"[OPENROUTER ERROR] Response: {e.response.text}")
        return None
    except Exception as e:
        print(f"[OPENROUTER ERROR] Unexpected error: {e}")
        return None


def generate_chat_title(first_message: str, model: str = None) -> Optional[str]:
    """
    Generate a concise chat title using OpenRouter

    Args:
        first_message: The first user message
        model: OpenRouter model to use (defaults to config)

    Returns:
        Generated title or None if OpenRouter is not available
    """
    if not is_openrouter_available():
        return None

    # Use configured model or override
    model_to_use = model or config.OPENROUTER_MODEL

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {config.OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://locket.ai",
                "X-Title": "Locket AI",
                "Content-Type": "application/json"
            },
            json={
                "model": model_to_use,
                "messages": [
                    {
                        "role": "system",
                        "content": "Generate a short, descriptive title (3-6 words max) for a chat based on the user's first message. Only return the title, nothing else."
                    },
                    {
                        "role": "user",
                        "content": first_message
                    }
                ],
                "temperature": 0.5,
                "max_tokens": 20
            },
            timeout=10
        )

        response.raise_for_status()
        result = response.json()

        if "choices" in result and len(result["choices"]) > 0:
            return result["choices"][0]["message"]["content"].strip()
        else:
            return None

    except Exception as e:
        print(f"[OPENROUTER ERROR] Title generation failed: {e}")
        return None


def should_cite_sources(query: str, has_relevant_docs: bool) -> bool:
    """
    Determine if response should include source citations

    Args:
        query: User's question
        has_relevant_docs: Whether we found relevant documents

    Returns:
        True if sources should be cited
    """
    if not has_relevant_docs:
        return False

    query_lower = query.lower().strip()

    # Don't cite for simple greetings
    simple_greetings = ['hi', 'hello', 'hey', 'sup', 'yo', 'howdy']
    if query_lower in simple_greetings or len(query_lower.split()) <= 2:
        return False

    # Don't cite for conversational phrases
    conversational = ['how are you', 'how\'s it going', 'what\'s up', 'thank you', 'thanks', 'bye', 'goodbye']
    if any(phrase in query_lower for phrase in conversational):
        return False

    # Don't cite for questions about Locket itself
    if any(phrase in query_lower for phrase in ['what is locket', 'who are you', 'what are you', 'what do you do']):
        return False

    # Cite for everything else that looks like a real question
    return True


print(f"[OPENROUTER_SERVICE] OpenRouter AI service loaded")
if is_openrouter_available():
    print(f"[OPENROUTER_SERVICE] API key configured")
    print(f"[OPENROUTER_SERVICE] Default model: {config.OPENROUTER_MODEL}")
else:
    print(f"[OPENROUTER_SERVICE WARNING] API key not set. Add OPENROUTER_API_KEY to your .env file")
