from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from pathlib import Path
import uuid, os
from dotenv import load_dotenv

# Load env variables since this is run standalone
load_dotenv()

def ingest():
    url = os.environ.get("QDRANT_URL")
    api_key = os.environ.get("QDRANT_API_KEY")
    
    if not url or not api_key:
        print("ERROR: QDRANT_URL or QDRANT_API_KEY not found in environment.")
        return

    print("Loading embedding model...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    
    print("Connecting to Qdrant...")
    client = QdrantClient(url=url, api_key=api_key)

    if not client.collection_exists("placement_knowledge"):
        print("Creating collection 'placement_knowledge'...")
        client.create_collection(
            collection_name="placement_knowledge",
            vectors_config=VectorParams(size=384, distance=Distance.COSINE)
        )
    else:
        print("Collection 'placement_knowledge' already exists.")

    points = []
    base_dir = Path(__file__).parent.parent / "knowledge_base"
    
    if not base_dir.exists():
        print(f"Directory {base_dir} does not exist. No files to ingest.")
        return

    print("Reading markdown files...")
    for md_file in base_dir.rglob("*.md"):
        # parent directory name is the subject (e.g. dbms, os, cn)
        subject = md_file.parent.name 
        text = md_file.read_text(encoding='utf-8')
        
        # Simple chunking — 500 chars with 50 overlap
        chunks = [text[i:i+500] for i in range(0, len(text), 450)]
        for chunk in chunks:
            vector = model.encode(chunk).tolist()
            points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={"text": chunk, "subject": subject, "source": md_file.name}
            ))

    if points:
        print(f"Upserting {len(points)} chunks into Qdrant...")
        client.upsert("placement_knowledge", points=points)
        print("Ingestion complete!")
    else:
        print("No chunks found to ingest.")

if __name__ == "__main__":
    ingest()
