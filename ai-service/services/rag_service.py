import re
from pathlib import Path


KNOWLEDGE_FILE = (
    Path(__file__).parent.parent
    / "knowledge"
    / "chennai_iccc_knowledge.txt"
)


def load_knowledge():

    if not KNOWLEDGE_FILE.exists():
        raise FileNotFoundError(
            "Knowledge base file not found."
        )

    return KNOWLEDGE_FILE.read_text(
        encoding="utf-8"
    )


def split_sections(text):

    sections = re.split(
        r"\n(?=SECTION \d+:)",
        text
    )

    return [
        section.strip()
        for section in sections
        if section.strip()
    ]


def retrieve_knowledge(query):

    text = load_knowledge()

    sections = split_sections(text)

    query_words = set(
        word.lower()
        for word in re.findall(
            r"\b[a-zA-Z]+\b",
            query
        )
        if len(word) > 2
    )

    scored_sections = []

    for section in sections:

        section_words = set(
            word.lower()
            for word in re.findall(
                r"\b[a-zA-Z]+\b",
                section
            )
        )

        score = len(
            query_words.intersection(
                section_words
            )
        )

        scored_sections.append(
            (
                score,
                section
            )
        )

    scored_sections.sort(
        key=lambda item: item[0],
        reverse=True
    )

    relevant_sections = [
        section
        for score, section
        in scored_sections[:2]
        if score > 0
    ]

    return relevant_sections