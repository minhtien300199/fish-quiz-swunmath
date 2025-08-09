// Define the completion data type
export interface CompletionData {
  title: string;
  RarityRate: number; // Chance to catch a rare fish
  Timers: number[]; // Timer in seconds for each question
  TotalFish: number; // Total fish needed to complete the level
}

// Default completion data
const defaultCompletion: CompletionData = {
  "title": "Easy",
  "RarityRate": 0.4, // 40% chance to catch a rare fish
  "Timers": [35], // Timer in seconds for each question
  "TotalFish": 5 // Need to catch 5 fish to complete the level
};

// Mock API endpoint for fetching completion data
export async function fetchCompletionData(): Promise<CompletionData> {
  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => {
      // Use the number of questions from API if available
      const totalQuestions = (window as any).TOTAL_QUESTIONS || defaultCompletion.TotalFish;

      const dynamicCompletion: CompletionData = {
        ...defaultCompletion,
        TotalFish: totalQuestions // Set total fish to equal number of questions
      };

      console.log(`Completion data: ${totalQuestions} questions = ${totalQuestions} fish needed`);

      // In a real app, this would be a fetch call to a backend API
      // For now, we'll return the completion data with dynamic question count
      resolve(dynamicCompletion);
    }, 300); // Simulate a 300ms network delay
  });
}