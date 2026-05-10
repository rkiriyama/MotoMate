"""
retriever.py — Corpus chunking and TF-IDF retrieval for MotoMate.

Public API
----------
rebuild_index(corpus_dir)   Load all .txt files, chunk them, fit TF-IDF matrix.
retrieve(query)             Return (top_chunks, max_score) using cosine similarity.
"""

import os
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ---------------------------------------------------------------------------
# Module-level cache — rebuilt at startup and on corpus update
# ---------------------------------------------------------------------------
_chunks: list[dict] = []          # list of {text, file, chunk_index}
_vectorizer: TfidfVectorizer | None = None
_matrix = None                     # sparse TF-IDF matrix (n_chunks × vocab)

CHUNK_SIZE = 300    # approximate max words per chunk
OVERLAP    = 50     # approximate words of overlap from previous chunk


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _split_sentences(text: str) -> list[str]:
    """Split text into sentences using a simple regex."""
    # Split on . ! ? followed by whitespace or end-of-string
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]


def _chunk_text(text: str, file_name: str) -> list[dict]:
    """
    Split *text* into overlapping word-bounded chunks.

    Each chunk is at most CHUNK_SIZE words.  The last OVERLAP words of the
    previous chunk are prepended to the next chunk for context continuity.

    Returns a list of dicts: {text, file, chunk_index}
    """
    sentences = _split_sentences(text)
    chunks = []
    current_words: list[str] = []
    chunk_index = 0
    overlap_words: list[str] = []  # tail of the previous chunk

    for sentence in sentences:
        sentence_words = sentence.split()

        # If adding this sentence would exceed CHUNK_SIZE, flush current chunk
        if current_words and len(current_words) + len(sentence_words) > CHUNK_SIZE:
            chunk_text = " ".join(current_words)
            chunks.append({
                "text": chunk_text,
                "file": file_name,
                "chunk_index": chunk_index,
            })
            # Keep the last OVERLAP words as overlap for the next chunk
            overlap_words = current_words[-OVERLAP:] if len(current_words) > OVERLAP else current_words[:]
            current_words = overlap_words + sentence_words
            chunk_index += 1
        else:
            current_words.extend(sentence_words)

    # Flush whatever remains
    if current_words:
        chunks.append({
            "text": " ".join(current_words),
            "file": file_name,
            "chunk_index": chunk_index,
        })

    return chunks


def _load_corpus(corpus_dir: str) -> list[dict]:
    """Read all .txt files in *corpus_dir* and return all chunks."""
    all_chunks = []
    if not os.path.isdir(corpus_dir):
        return all_chunks
    for fname in sorted(os.listdir(corpus_dir)):
        if not fname.endswith(".txt"):
            continue
        fpath = os.path.join(corpus_dir, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                text = f.read()
            all_chunks.extend(_chunk_text(text, fname))
        except OSError:
            pass  # skip unreadable files silently
    return all_chunks


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def rebuild_index(corpus_dir: str) -> None:
    """
    Load all corpus .txt files, chunk them, and (re)fit the TF-IDF index.
    Call this once at startup and again whenever a new file is added.
    """
    global _chunks, _vectorizer, _matrix

    _chunks = _load_corpus(corpus_dir)

    if not _chunks:
        _vectorizer = None
        _matrix = None
        return

    texts = [c["text"] for c in _chunks]
    _vectorizer = TfidfVectorizer(
        strip_accents="unicode",
        lowercase=True,
        ngram_range=(1, 2),   # unigrams + bigrams improve recall slightly
        min_df=1,
        sublinear_tf=True,    # log(1+tf) dampens high-frequency terms
    )
    _matrix = _vectorizer.fit_transform(texts)


def retrieve(
    query: str,
    top_k: int = 3,
    threshold: float = 0.10,
) -> tuple[list[dict], float]:
    """
    Return the top-k chunks most similar to *query* and the highest score.

    Returns
    -------
    (top_chunks, max_score)
        top_chunks : list of chunk dicts with an added 'score' key
        max_score  : float — highest cosine similarity in the result set,
                     or 0.0 if the index is empty / no chunks score above 0
    """
    if _vectorizer is None or _matrix is None or not _chunks:
        return [], 0.0

    query_vec = _vectorizer.transform([query])
    scores = cosine_similarity(query_vec, _matrix).flatten()

    # Pair each chunk with its score and sort descending
    scored = sorted(
        zip(scores, _chunks),
        key=lambda x: x[0],
        reverse=True,
    )

    max_score = float(scored[0][0]) if scored else 0.0

    # Return only the top_k chunks that meet the threshold
    top_chunks = []
    for score, chunk in scored[:top_k]:
        if float(score) < threshold:
            break
        top_chunks.append({**chunk, "score": round(float(score), 4)})

    return top_chunks, max_score
