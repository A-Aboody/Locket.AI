# -*- coding: utf-8 -*-
"""
Index all documents with AI embeddings
"""
from db_config import get_db_context
from database_models import Document
import search_service

def index_all_documents():
    """Generate embeddings for all documents"""
    
    with get_db_context() as db:
        # Get all documents
        documents = db.query(Document).all()
        
        if not documents:
            print("[ERROR] No documents found in database")
            return
        
        print(f"\n[INFO] Found {len(documents)} documents to index\n")
        
        indexed_count = 0
        failed_count = 0
        
        for i, doc in enumerate(documents, 1):
            try:
                print(f"[{i}/{len(documents)}] Indexing: {doc.filename}...", end=" ")
                
                # Generate embedding
                index_data = search_service.reindex_document(
                    document_id=doc.id,
                    content=doc.content or "",
                    filename=doc.filename
                )
                
                # Update document
                doc.embedding = index_data['embedding']
                doc.content_preview = index_data['content_preview']
                
                db.commit()
                
                print("[SUCCESS]")
                indexed_count += 1
                
            except Exception as e:
                print(f"[ERROR] {e}")
                failed_count += 1
                continue
        
        print("\n" + "="*60)
        print(f"[SUCCESS] Successfully indexed: {indexed_count}")
        if failed_count > 0:
            print(f"[ERROR] Failed: {failed_count}")
        print("="*60)

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  Document Indexing Script")
    print("="*60)
    
    index_all_documents()
