// SERVER-ONLY DATA. Contains the answer key.
// Imported only by prisma/seed.ts and tests — never by app/ or components/.

import { ASSESSMENT_SLUG } from "../lib/constants";

export { ASSESSMENT_SLUG };

export type SeedQuestion = {
  label: string;
  type: "single" | "multiple";
  points: number;
  text: string;
  options: string[]; // canonical order A, B, C, ...
  correct: string[]; // letters
};

export const assessmentSeed = {
  slug: ASSESSMENT_SLUG,
  title: "AI Product Management — RAG & AI Application Assessment",
  description:
    "15 questions on retrieval-augmented generation, embeddings, vector search, APIs, deployment, and AI product thinking. Answer every question carefully — you can submit only once.",
};

export const questionSeed: SeedQuestion[] = [
  {
    label: "RAG pipeline sequence",
    type: "single",
    points: 1,
    text: "A user uploads a PDF and asks: “What are the three biggest risks mentioned in this report?” Which sequence best describes what happens in a typical RAG system?",
    options: [
      "PDF → LLM → embeddings → database → answer",
      "PDF → LLM → answer → vector search → verification",
      "PDF → chunks → embeddings → vector database → retrieve relevant chunks → LLM → answer",
      "PDF → vector database → LLM training → embeddings → answer",
    ],
    correct: ["C"],
  },
  {
    label: "Embeddings vs. vectors",
    type: "single",
    points: 1,
    text: "Which statement best explains the relationship between an embedding and a vector?",
    options: [
      "An embedding is a representation of information, commonly expressed as a numerical vector.",
      "A vector is the database where embeddings are stored.",
      "An embedding is the LLM's final answer, while a vector stores the question.",
      "Embeddings are keywords extracted from text, while vectors are the original documents.",
    ],
    correct: ["A"],
  },
  {
    label: "Semantic similarity (vacation vs. leave)",
    type: "single",
    points: 1,
    text: "A user asks: “How much vacation can an employee take every year?” The document contains: “Full-time staff members are entitled to 24 days of annual leave.” Why might a vector-based search retrieve this passage even though the words “vacation” and “leave” are different?",
    options: [
      "The LLM automatically rewrites every document before searching.",
      "The vector database searches for documents containing the same number of words.",
      "The API converts the question directly into a database query.",
      "Embeddings represent semantic relationships, allowing conceptually similar text to be retrieved.",
    ],
    correct: ["D"],
  },
  {
    label: "Semantic retrieval ranking",
    type: "single",
    points: 1,
    text: "A RAG system receives the following candidate chunks for the question: “What is the company's work-from-home policy?” Which chunk would a semantic retrieval system most likely rank highly?",
    options: [
      "The company announced strong revenue growth in Q3.",
      "Employees may work remotely for up to three days each week.",
      "The company's new office opened in Bangalore.",
      "The annual employee satisfaction survey will begin next month.",
    ],
    correct: ["B"],
  },
  {
    label: "Role of the vector database",
    type: "single",
    points: 1,
    text: "A student says: “ChromaDB understands the user's question and writes the answer.” Which response is most accurate?",
    options: [
      "Correct. The vector database generates the answer using the stored documents.",
      "Mostly correct. The vector database generates the answer, while the LLM checks it.",
      "Correct, but only when the database contains more than 1,000 documents.",
      "Incorrect. It stores vector representations and helps retrieve relevant information; the LLM typically generates the response.",
    ],
    correct: ["D"],
  },
  {
    label: "Chunk size trade-offs",
    type: "multiple",
    points: 2,
    text: "You are designing a RAG system for a 300-page employee handbook. Which TWO statements about chunk size are reasonable?",
    options: [
      "Very small chunks can improve retrieval precision but may lose surrounding context.",
      "Larger chunks always produce better answers because the LLM gets more information.",
      "Very large chunks can make retrieval less precise and provide unnecessary information to the LLM.",
      "Chunk size does not matter once embeddings are generated.",
    ],
    correct: ["A", "C"],
  },
  {
    label: "Why build RAG",
    type: "multiple",
    points: 2,
    text: "A CEO asks: “If GPT already knows a lot, why should we build RAG?” Which TWO are valid reasons?",
    options: [
      "RAG guarantees that the LLM will never hallucinate.",
      "RAG can provide access to private or organization-specific information that isn't part of the model's general knowledge.",
      "RAG can ground responses in retrieved source material and potentially improve factual relevance.",
      "RAG permanently retrains the LLM whenever a new document is uploaded.",
    ],
    correct: ["B", "C"],
  },
  {
    label: "Debugging a wrong RAG answer",
    type: "multiple",
    points: 2,
    text: "Your HR RAG chatbot answers: “Employees receive 30 days of parental leave.” The actual policy says 90 days. Which THREE parts of the system would be reasonable to investigate?",
    options: [
      "Whether the relevant policy chunk was retrieved.",
      "Whether the LLM received the correct retrieved context.",
      "Whether the company's GitHub repository has enough stars.",
      "Whether the retrieved information was interpreted correctly by the LLM.",
      "Whether the user's laptop has enough storage.",
    ],
    correct: ["A", "B", "D"],
  },
  {
    label: "Metadata filtering",
    type: "single",
    points: 1,
    text: "Your company has 20,000 documents covering multiple countries and years. A user asks: “What was the 2025 travel reimbursement policy for employees in India?” Which approach could improve retrieval?",
    options: [
      "Filter documents using metadata such as country = India and year = 2025 before or alongside semantic retrieval.",
      "Increase the LLM temperature so it can understand the question better.",
      "Remove embeddings and rely entirely on the LLM's knowledge.",
      "Increase the document size so the entire database is sent to the LLM.",
    ],
    correct: ["A"],
  },
  {
    label: "Weather chatbot architecture",
    type: "single",
    points: 1,
    text: "You build a weather chatbot. A user asks: “What's the weather in Dubai tomorrow?” Which architecture is most appropriate?",
    options: [
      "Ask the LLM to predict tomorrow's weather from its training data.",
      "Search a PDF containing historical Dubai weather and ask the LLM to extrapolate.",
      "Store all possible weather conditions as embeddings and retrieve the closest one.",
      "Call a weather API for current or forecast data and use the LLM to interpret and present the returned information.",
    ],
    correct: ["D"],
  },
  {
    label: "Value of external APIs",
    type: "multiple",
    points: 2,
    text: "Why is an external API useful in the weather chatbot? Select TWO.",
    options: [
      "It provides access to current or forecast data that the LLM cannot reliably know in advance.",
      "It replaces the need for any user interface.",
      "It can provide structured information that the application can pass to the LLM.",
      "It permanently updates the LLM's underlying model every time it is called.",
    ],
    correct: ["A", "C"],
  },
  {
    label: "VS Code / GitHub / Vercel workflow",
    type: "single",
    points: 1,
    text: "Which workflow best represents how VS Code, GitHub and Vercel can work together when building a small AI application?",
    options: [
      "Vercel writes the code → GitHub runs the code → VS Code hosts the application.",
      "VS Code is used to develop the code → GitHub stores and version-controls the code → Vercel can deploy the application.",
      "GitHub generates the application → Vercel trains the AI model → VS Code stores the database.",
      "VS Code stores the production application → Vercel manages Git history → GitHub provides the development environment.",
    ],
    correct: ["B"],
  },
  {
    label: "Deployment env variables",
    type: "single",
    points: 1,
    text: "Your weather chatbot works locally but fails after deployment to Vercel because the weather API cannot authenticate. Which is the most likely issue?",
    options: [
      "Vercel cannot run applications that use APIs.",
      "GitHub automatically deletes all API calls when code is deployed.",
      "The API key may not have been configured as a secure environment variable in the deployed environment.",
      "The LLM cannot work with applications hosted outside VS Code.",
    ],
    correct: ["C"],
  },
  {
    label: "Handling insufficient evidence",
    type: "multiple",
    points: 2,
    text: "HR tells you: “We don't want the chatbot confidently answering questions when the knowledge base doesn't contain enough information.” Which THREE product or system approaches could help?",
    options: [
      "Allow the system to indicate that it does not have sufficient evidence.",
      "Retrieve relevant documents and assess whether the evidence sufficiently supports the answer.",
      "Increase the temperature so the model can generate more possible answers.",
      "Provide citations or references to the retrieved source material where appropriate.",
      "Remove the knowledge base and let the LLM answer from general knowledge.",
    ],
    correct: ["A", "B", "D"],
  },
  {
    label: "PM discovery questions",
    type: "multiple",
    points: 2,
    text: "A CEO says: “Let's connect an LLM to all our company documents and build an AI chatbot.” As the Product Manager, which THREE questions should you ask before starting development?",
    options: [
      "Who is the target user and what specific problem are we trying to solve?",
      "Which programming language does the CEO prefer?",
      "What information does the system need, and is that information accurate, accessible and appropriate to use?",
      "How will we measure whether the AI product actually solves the user's problem?",
      "Which AI framework is currently most popular on social media?",
    ],
    correct: ["A", "C", "D"],
  },
];

export const letterIndex = (letter: string) => letter.charCodeAt(0) - "A".charCodeAt(0);

export const MAX_SCORE = questionSeed.reduce((sum, q) => sum + q.points, 0);
