"""
Semantic Chunking and Vector Store Module

This module handles:
1. Breaking LLM payloads into semantic chunks
2. Generating embeddings (placeholder implementation)
3. Storing chunks in the vector store
4. Searching for relevant chunks
"""

import json
import hashlib
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import numpy as np


@dataclass
class SemanticChunk:
    """Represents a semantic chunk of clinical data"""
    chunk_id: str
    patient_id: str
    encounter_id: str
    episode_id: str
    chunk_type: str  # SIGNAL_SUMMARY, TIMELINE_PHASE, NOTE_EXCERPT, etc.
    chunk_phase: str  # PRE_LINE, LINE_PLACEMENT, MONITORING, CULTURE, POST_CULTURE
    chunk_index: int
    chunk_text: str
    chunk_metadata: Dict[str, Any]
    embedding_vector: Optional[List[float]] = None


class SemanticChunker:
    """
    Breaks down CLABSI LLM payloads into semantic chunks
    """

    def __init__(self, embedding_dimensions: int = 1536):
        self.embedding_dimensions = embedding_dimensions

    def chunk_payload(self, payload: Dict[str, Any]) -> List[SemanticChunk]:
        """
        Breaks a CLABSI payload into semantic chunks

        Args:
            payload: The full LLM payload from GOLD_AI

        Returns:
            List of SemanticChunk objects
        """
        chunks = []
        metadata = payload.get('metadata', {})
        patient_id = metadata.get('patient_id')
        encounter_id = metadata.get('encounter_id')
        episode_id = metadata.get('episode_id')

        chunk_index = 0

        # Chunk 1: Metadata summary
        chunks.append(self._create_metadata_chunk(
            patient_id, encounter_id, episode_id, chunk_index, metadata
        ))
        chunk_index += 1

        # Chunk 2-N: Signals by category
        signals = payload.get('signals', [])
        signal_chunks = self._chunk_signals(
            patient_id, encounter_id, episode_id, chunk_index, signals
        )
        chunks.extend(signal_chunks)
        chunk_index += len(signal_chunks)

        # Chunk N+1: Timeline by phase
        timelines = payload.get('timelines', [])
        timeline_chunks = self._chunk_timelines(
            patient_id, encounter_id, episode_id, chunk_index, timelines
        )
        chunks.extend(timeline_chunks)
        chunk_index += len(timeline_chunks)

        # Chunk: Rule flags summary
        rule_flags = payload.get('rule_flags', {})
        chunks.append(self._create_rule_flags_chunk(
            patient_id, encounter_id, episode_id, chunk_index, rule_flags
        ))
        chunk_index += 1

        # Chunk: Metrics summary
        metrics = payload.get('metrics', {})
        chunks.append(self._create_metrics_chunk(
            patient_id, encounter_id, episode_id, chunk_index, metrics
        ))

        return chunks

    def _create_metadata_chunk(
        self, patient_id: str, encounter_id: str, episode_id: str,
        chunk_index: int, metadata: Dict[str, Any]
    ) -> SemanticChunk:
        """Create a chunk from metadata"""
        chunk_text = f"""
Patient: {metadata.get('mrn')}
Age: {metadata.get('age')} years
Gender: {metadata.get('gender')}
Department: {metadata.get('department')}
Admission: {metadata.get('admission_date')}
Length of Stay: {metadata.get('los_days')} days
        """.strip()

        chunk_id = self._generate_chunk_id(patient_id, encounter_id, 'METADATA', chunk_index)

        return SemanticChunk(
            chunk_id=chunk_id,
            patient_id=patient_id,
            encounter_id=encounter_id,
            episode_id=episode_id,
            chunk_type='METADATA',
            chunk_phase='PRE_LINE',
            chunk_index=chunk_index,
            chunk_text=chunk_text,
            chunk_metadata=metadata,
            embedding_vector=self._generate_embedding(chunk_text)
        )

    def _chunk_signals(
        self, patient_id: str, encounter_id: str, episode_id: str,
        start_index: int, signals: List[Dict[str, Any]]
    ) -> List[SemanticChunk]:
        """Chunk signals by severity and type"""
        chunks = []

        # Group signals by severity
        critical_signals = [s for s in signals if s.get('severity') == 'CRITICAL']
        warning_signals = [s for s in signals if s.get('severity') == 'WARNING']

        if critical_signals:
            chunk_text = "Critical Signals:\n" + "\n".join([
                f"- {s.get('signal_name')}: {s.get('value')} ({s.get('rationale')})"
                for s in critical_signals
            ])

            chunk_id = self._generate_chunk_id(
                patient_id, encounter_id, 'SIGNALS_CRITICAL', start_index
            )

            chunks.append(SemanticChunk(
                chunk_id=chunk_id,
                patient_id=patient_id,
                encounter_id=encounter_id,
                episode_id=episode_id,
                chunk_type='SIGNALS_CRITICAL',
                chunk_phase='MONITORING',
                chunk_index=start_index,
                chunk_text=chunk_text,
                chunk_metadata={'count': len(critical_signals)},
                embedding_vector=self._generate_embedding(chunk_text)
            ))

        if warning_signals:
            chunk_text = "Warning Signals:\n" + "\n".join([
                f"- {s.get('signal_name')}: {s.get('value')} ({s.get('rationale')})"
                for s in warning_signals
            ])

            chunk_id = self._generate_chunk_id(
                patient_id, encounter_id, 'SIGNALS_WARNING', start_index + 1
            )

            chunks.append(SemanticChunk(
                chunk_id=chunk_id,
                patient_id=patient_id,
                encounter_id=encounter_id,
                episode_id=episode_id,
                chunk_type='SIGNALS_WARNING',
                chunk_phase='MONITORING',
                chunk_index=start_index + 1,
                chunk_text=chunk_text,
                chunk_metadata={'count': len(warning_signals)},
                embedding_vector=self._generate_embedding(chunk_text)
            ))

        return chunks

    def _chunk_timelines(
        self, patient_id: str, encounter_id: str, episode_id: str,
        start_index: int, timelines: List[Dict[str, Any]]
    ) -> List[SemanticChunk]:
        """Chunk timelines by phase"""
        chunks = []

        for idx, timeline_phase in enumerate(timelines):
            phase = timeline_phase.get('phase', 'UNKNOWN')
            events = timeline_phase.get('events', [])

            chunk_text = f"Phase: {phase}\n" + "\n".join([
                f"- {e.get('event_datetime')}: {e.get('event_type')} - {e.get('description')}"
                for e in events
            ])

            chunk_id = self._generate_chunk_id(
                patient_id, encounter_id, f'TIMELINE_{phase}', start_index + idx
            )

            chunks.append(SemanticChunk(
                chunk_id=chunk_id,
                patient_id=patient_id,
                encounter_id=encounter_id,
                episode_id=episode_id,
                chunk_type='TIMELINE_PHASE',
                chunk_phase=phase,
                chunk_index=start_index + idx,
                chunk_text=chunk_text,
                chunk_metadata={'event_count': len(events), 'phase': phase},
                embedding_vector=self._generate_embedding(chunk_text)
            ))

        return chunks

    def _create_rule_flags_chunk(
        self, patient_id: str, encounter_id: str, episode_id: str,
        chunk_index: int, rule_flags: Dict[str, Any]
    ) -> SemanticChunk:
        """Create chunk from rule flags"""
        chunk_text = "CLABSI Criteria:\n" + "\n".join([
            f"- {key.replace('_', ' ').title()}: {'Yes' if value else 'No'}"
            for key, value in rule_flags.items()
        ])

        chunk_id = self._generate_chunk_id(
            patient_id, encounter_id, 'RULE_FLAGS', chunk_index
        )

        return SemanticChunk(
            chunk_id=chunk_id,
            patient_id=patient_id,
            encounter_id=encounter_id,
            episode_id=episode_id,
            chunk_type='RULE_FLAGS',
            chunk_phase='POST_CULTURE',
            chunk_index=chunk_index,
            chunk_text=chunk_text,
            chunk_metadata=rule_flags,
            embedding_vector=self._generate_embedding(chunk_text)
        )

    def _create_metrics_chunk(
        self, patient_id: str, encounter_id: str, episode_id: str,
        chunk_index: int, metrics: Dict[str, Any]
    ) -> SemanticChunk:
        """Create chunk from metrics"""
        chunk_text = "Clinical Metrics:\n" + "\n".join([
            f"- {key.replace('_', ' ').title()}: {value}"
            for key, value in metrics.items()
        ])

        chunk_id = self._generate_chunk_id(
            patient_id, encounter_id, 'METRICS', chunk_index
        )

        return SemanticChunk(
            chunk_id=chunk_id,
            patient_id=patient_id,
            encounter_id=encounter_id,
            episode_id=episode_id,
            chunk_type='METRICS',
            chunk_phase='POST_CULTURE',
            chunk_index=chunk_index,
            chunk_text=chunk_text,
            chunk_metadata=metrics,
            embedding_vector=self._generate_embedding(chunk_text)
        )

    def _generate_chunk_id(
        self, patient_id: str, encounter_id: str, chunk_type: str, index: int
    ) -> str:
        """Generate unique chunk ID"""
        content = f"{patient_id}_{encounter_id}_{chunk_type}_{index}"
        return f"CHUNK_{hashlib.md5(content.encode()).hexdigest()[:12]}"

    def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text

        NOTE: This is a placeholder implementation using random vectors.
        In production, you would use:
        - OpenAI's text-embedding-ada-002
        - Sentence transformers
        - Snowflake Cortex embedding functions
        """
        # Use hash to create deterministic "embeddings"
        hash_int = int(hashlib.sha256(text.encode()).hexdigest(), 16)
        np.random.seed(hash_int % (2**32))
        return np.random.randn(self.embedding_dimensions).tolist()


class VectorStore:
    """
    Simple in-memory vector store for demonstration
    In production, this would interface with Snowflake's vector capabilities
    """

    def __init__(self):
        self.chunks: Dict[str, SemanticChunk] = {}

    def upsert_chunks(self, chunks: List[SemanticChunk]):
        """Insert or update chunks in the vector store"""
        for chunk in chunks:
            self.chunks[chunk.chunk_id] = chunk

    def search(
        self, query: str, patient_id: Optional[str] = None,
        encounter_id: Optional[str] = None, top_k: int = 5
    ) -> List[SemanticChunk]:
        """
        Search for chunks similar to the query

        NOTE: This is a simplified implementation. In production, use:
        - Snowflake's VECTOR_COSINE_SIMILARITY function
        - Dedicated vector databases (Pinecone, Weaviate, etc.)
        """
        chunker = SemanticChunker()
        query_embedding = chunker._generate_embedding(query)

        # Filter chunks by patient/encounter if specified
        candidate_chunks = list(self.chunks.values())
        if patient_id:
            candidate_chunks = [c for c in candidate_chunks if c.patient_id == patient_id]
        if encounter_id:
            candidate_chunks = [c for c in candidate_chunks if c.encounter_id == encounter_id]

        # Calculate similarity scores (cosine similarity)
        scored_chunks = []
        for chunk in candidate_chunks:
            if chunk.embedding_vector:
                similarity = self._cosine_similarity(query_embedding, chunk.embedding_vector)
                scored_chunks.append((similarity, chunk))

        # Sort by similarity and return top-k
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        return [chunk for _, chunk in scored_chunks[:top_k]]

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)
        return float(np.dot(vec1_np, vec2_np) / (np.linalg.norm(vec1_np) * np.linalg.norm(vec2_np)))

    def get_chunks_by_patient(self, patient_id: str, encounter_id: Optional[str] = None) -> List[SemanticChunk]:
        """Retrieve all chunks for a patient/encounter"""
        chunks = [c for c in self.chunks.values() if c.patient_id == patient_id]
        if encounter_id:
            chunks = [c for c in chunks if c.encounter_id == encounter_id]
        return sorted(chunks, key=lambda c: c.chunk_index)


# Example usage
if __name__ == "__main__":
    # Sample payload
    sample_payload = {
        "metadata": {
            "patient_id": "PAT001",
            "encounter_id": "ENC001",
            "episode_id": "EP001",
            "mrn": "MRN100001",
            "age": 59,
            "gender": "MALE",
            "department": "ICU",
            "admission_date": "2024-01-10",
            "los_days": 15
        },
        "signals": [
            {
                "signal_name": "POSITIVE_BLOOD_CULTURE",
                "value": "S. aureus",
                "severity": "CRITICAL",
                "rationale": "Recognized pathogen in blood culture"
            }
        ],
        "timelines": [
            {
                "phase": "LINE_PLACEMENT",
                "events": [
                    {
                        "event_datetime": "2024-01-10 16:00:00",
                        "event_type": "CENTRAL_LINE_INSERTION",
                        "description": "Right subclavian triple-lumen catheter placed"
                    }
                ]
            }
        ],
        "rule_flags": {
            "has_central_line": True,
            "positive_blood_culture": True
        },
        "metrics": {
            "risk_score": 85.0
        }
    }

    # Create chunker and chunk the payload
    chunker = SemanticChunker()
    chunks = chunker.chunk_payload(sample_payload)

    print(f"Created {len(chunks)} semantic chunks")
    for chunk in chunks:
        print(f"\nChunk {chunk.chunk_index}: {chunk.chunk_type}")
        print(f"Text: {chunk.chunk_text[:100]}...")

    # Create vector store and upsert chunks
    vector_store = VectorStore()
    vector_store.upsert_chunks(chunks)

    # Search for relevant chunks
    results = vector_store.search("What organism was found?", patient_id="PAT001")
    print(f"\nSearch results: {len(results)} chunks")
    for result in results:
        print(f"- {result.chunk_type}: {result.chunk_text[:80]}...")
