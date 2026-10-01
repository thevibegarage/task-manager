// Feedback band shown with the student's score. Safe for the client.
export function resultMessage(percentage: number): string {
  if (percentage >= 90) return "Excellent understanding of the concepts assessed.";
  if (percentage >= 80) return "Strong understanding of the concepts assessed.";
  if (percentage >= 70) return "Good understanding with some areas to reinforce.";
  if (percentage >= 60) return "Developing understanding. Review the core RAG concepts.";
  return "Several core concepts would benefit from review.";
}
