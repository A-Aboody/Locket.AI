# backend/ai_service.py
"""
AI Service - Unified interface for AI providers (Ollama or OpenRouter)
Provides intelligent chat responses and document Q&A
"""

import ollama
import os
from typing import List, Dict, Optional, Tuple
import database_models as models
from config import config


# Default model - can be changed based on what's installed
# Popular options: llama3.2:3b, llama3.1, mistral, phi3, gemma3
DEFAULT_MODEL = "llama3.2:3b"

# Configure Ollama client - uses environment variable for Docker compatibility
# Defaults to localhost for local development
OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
ollama_client = ollama.Client(host=OLLAMA_HOST)


def is_ollama_available() -> bool:
    """Check if Ollama is running and accessible"""
    try:
        ollama_client.list()
        return True
    except Exception as e:
        print(f"[AI_SERVICE WARNING] Ollama not available: {e}")
        return False


def get_available_models() -> List[str]:
    """Get list of available Ollama models"""
    try:
        models_info = ollama_client.list()
        return [model['name'] for model in models_info.get('models', [])]
    except Exception:
        return []


def _generate_chat_response_ollama(
    query: str,
    relevant_docs: List[Tuple[models.Document, float, str]],
    conversation_history: Optional[List[Dict[str, str]]] = None,
    model: str = DEFAULT_MODEL
) -> Optional[str]:
    """
    Generate an intelligent chat response using Ollama (internal function)

    Args:
        query: User's question
        relevant_docs: List of (Document, score, excerpt) tuples
        conversation_history: Previous messages for context
        model: Ollama model to use

    Returns:
        Generated response or None if Ollama is not available
    """
    if not is_ollama_available():
        return None

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
        # Call Ollama using the configured client
        response = ollama_client.chat(
            model=model,
            messages=messages,
            options={
                "temperature": 0.7,
                "num_predict": 2000  # Increased from 500 to allow complete responses
            }
        )

        return response['message']['content']
    except OSError as e:
        # Catch Windows socket errors specifically
        if "Errno 22" in str(e) or "Invalid argument" in str(e):
            error_msg = (
                f"[AI_SERVICE CRITICAL] Windows socket error detected: {e}\n"
                "This error occurs when using ollama module-level functions instead of the client instance.\n"
                "The code should already be using ollama_client.chat() - check for any recent changes.\n"
                f"Current OLLAMA_HOST: {OLLAMA_HOST}\n"
                "See OLLAMA_SETUP.md for details."
            )
            print(error_msg)
            return None
        else:
            print(f"[AI_SERVICE ERROR] Ollama generation failed with OS error: {e}")
            return None
    except Exception as e:
        print(f"[AI_SERVICE ERROR] Ollama generation failed: {e}")
        return None


def _generate_chat_title_ollama(first_message: str, model: str = DEFAULT_MODEL) -> Optional[str]:
    """
    Generate a concise chat title using Ollama (internal function)

    Args:
        first_message: The first user message
        model: Ollama model to use

    Returns:
        Generated title or None if Ollama is not available
    """
    if not is_ollama_available():
        return None

    try:
        response = ollama_client.chat(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "Generate a short, descriptive title (3-6 words max) for a chat based on the user's first message. Only return the title, nothing else."
                },
                {
                    "role": "user",
                    "content": first_message
                }
            ],
            options={
                "temperature": 0.5,
                "num_predict": 20
            }
        )

        return response['message']['content'].strip()
    except Exception as e:
        print(f"[AI_SERVICE ERROR] Title generation failed: {e}")
        return None


def should_cite_sources(query: str, has_relevant_docs: bool) -> bool:
    """
    Determine if response should include source citations
    Simplified - just check if we have docs

    Args:
        query: User's question
        has_relevant_docs: Whether we found relevant documents

    Returns:
        True if sources should be cited
    """
    return has_relevant_docs


# Provider selection and unified interface functions
def generate_chat_response(
    query: str,
    relevant_docs: List[Tuple[models.Document, float, str]],
    conversation_history: Optional[List[Dict[str, str]]] = None,
    model: str = None
) -> Optional[str]:
    """
    Generate an intelligent chat response using the configured AI provider

    Args:
        query: User's question
        relevant_docs: List of (Document, score, excerpt) tuples
        conversation_history: Previous messages for context
        model: Model to use (provider-specific)

    Returns:
        Generated response or None if AI is not available
    """
    if config.AI_PROVIDER == "openrouter":
        try:
            import openrouter_service
            if openrouter_service.is_openrouter_available():
                return openrouter_service.generate_chat_response(
                    query=query,
                    relevant_docs=relevant_docs,
                    conversation_history=conversation_history,
                    model=model
                )
        except Exception as e:
            print(f"[AI_SERVICE ERROR] OpenRouter failed: {e}, falling back to Ollama")

    # Fallback to Ollama
    return _generate_chat_response_ollama(
        query=query,
        relevant_docs=relevant_docs,
        conversation_history=conversation_history,
        model=model or DEFAULT_MODEL
    )


def generate_chat_title(first_message: str, model: str = None) -> Optional[str]:
    """
    Generate a concise chat title using the configured AI provider

    Args:
        first_message: The first user message
        model: Model to use (provider-specific)

    Returns:
        Generated title or None if AI is not available
    """
    if config.AI_PROVIDER == "openrouter":
        try:
            import openrouter_service
            if openrouter_service.is_openrouter_available():
                return openrouter_service.generate_chat_title(
                    first_message=first_message,
                    model=model
                )
        except Exception as e:
            print(f"[AI_SERVICE ERROR] OpenRouter title generation failed: {e}")

    # Fallback to Ollama
    return _generate_chat_title_ollama(
        first_message=first_message,
        model=model or DEFAULT_MODEL
    )


# Initialize and log provider status
print(f"[AI_SERVICE] AI service loaded")
print(f"[AI_SERVICE] Configured provider: {config.AI_PROVIDER}")

if config.AI_PROVIDER == "openrouter":
    try:
        import openrouter_service
        if openrouter_service.is_openrouter_available():
            print(f"[AI_SERVICE] OpenRouter is ready")
            print(f"[AI_SERVICE] Model: {config.OPENROUTER_MODEL}")
        else:
            print(f"[AI_SERVICE WARNING] OpenRouter API key not configured")
            print(f"[AI_SERVICE] Add OPENROUTER_API_KEY to your .env file")
    except ImportError:
        print(f"[AI_SERVICE ERROR] OpenRouter service not available")
else:
    if is_ollama_available():
        available_models = get_available_models()
        print(f"[AI_SERVICE] Ollama is ready")
        print(f"[AI_SERVICE] Available models: {', '.join(available_models) if available_models else 'None'}")
        print(f"[AI_SERVICE] Default model: {DEFAULT_MODEL}")
    else:
        print(f"[AI_SERVICE WARNING] Ollama is not running at {OLLAMA_HOST}")
        print(f"[AI_SERVICE] Install from https://ollama.com and run 'ollama pull llama3.2'")
