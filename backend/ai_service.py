# backend/ai_service.py
"""
AI Service using Ollama for local LLM inference
Provides intelligent chat responses and document Q&A
"""

import ollama
import os
from typing import List, Dict, Optional, Tuple
import database_models as models


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


def generate_chat_response(
    query: str,
    relevant_docs: List[Tuple[models.Document, float, str]],
    conversation_history: Optional[List[Dict[str, str]]] = None,
    model: str = DEFAULT_MODEL
) -> Optional[str]:
    """
    Generate an intelligent chat response using Ollama

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

    # Build the system prompt
    system_prompt = """You are Locket, a helpful AI assistant who helps users understand their uploaded documents.

Your job is to ANSWER questions intelligently. Key guidelines:

1. ANSWER the question - Use the document information to formulate a complete, natural answer in your own words
2. Be conversational - Talk like a helpful assistant, not a search engine
3. For casual chat (greetings, "what's up", "thanks") - Respond naturally without mentioning documents
4. When asked about a specific document - Provide a clear summary of what's in it based on the content provided
5. When documents are irrelevant - If the documents don't relate to the question, honestly say you don't have relevant information
6. Be intelligent - If a user asks "tell me about document X" or "what's in the econ essay", actually summarize the document content
7. Be concise but complete - Give full answers, not fragments

Remember: You KNOW what's in the documents when they're provided to you. Don't say you're confused or ask what's in them - just read and summarize the content."""

    # Determine if this needs document context with lower threshold for better matching
    has_good_docs = relevant_docs and relevant_docs[0][1] > 0.25  # Lower threshold for better recall

    # Build messages for the conversation
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history (last 5 messages)
    if conversation_history:
        for msg in conversation_history[-5:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

    # Build the user message with or without document context
    if has_good_docs:
        # Create context from relevant documents (lowered threshold)
        doc_context = "\n\n".join([
            f"From '{doc.filename}':\n{excerpt[:500]}"
            for doc, score, excerpt in relevant_docs[:3]
            if score > 0.25
        ])

        user_message = f"""User's Question: {query}

Information from uploaded documents:
{doc_context}

Please ANSWER the user's question using this information. Synthesize a complete answer in your own words, don't just repeat excerpts. If the documents don't actually relate to the question, tell the user honestly."""

    elif relevant_docs and relevant_docs[0][1] > 0.15:
        # Weak matches - let AI determine if they're actually relevant
        doc_context = "\n\n".join([
            f"From '{doc.filename}':\n{excerpt[:500]}"
            for doc, score, excerpt in relevant_docs[:3]
            if score > 0.15
        ])

        user_message = f"""User's Question: {query}

Potentially relevant documents (low relevance score):
{doc_context}

These documents may or may not be relevant to the question. If they help answer the question, use them. If they're not actually related to "{query}", tell the user you don't have relevant documents and suggest they upload information about this topic."""

    else:
        # No document matches - just conversational
        user_message = query

    messages.append({"role": "user", "content": user_message})

    try:
        # Call Ollama using the configured client
        response = ollama_client.chat(
            model=model,
            messages=messages,
            options={
                "temperature": 0.7,
                "num_predict": 500  # Max tokens
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


def generate_chat_title(first_message: str, model: str = DEFAULT_MODEL) -> Optional[str]:
    """
    Generate a concise chat title using Ollama

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


print(f"[AI_SERVICE] Ollama AI service loaded (host: {OLLAMA_HOST})")
if is_ollama_available():
    available_models = get_available_models()
    print(f"[AI_SERVICE] Available models: {', '.join(available_models) if available_models else 'None'}")
    print(f"[AI_SERVICE] Default model: {DEFAULT_MODEL}")
else:
    print(f"[AI_SERVICE WARNING] Ollama is not running at {OLLAMA_HOST}. Install from https://ollama.com and run 'ollama pull llama3.2'")
