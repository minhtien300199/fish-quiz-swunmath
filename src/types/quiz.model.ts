export interface GameAttempRecord {
    studentId: string;
    learningPathId: string;
    standardId: string;
    gameId: string;
    startedAt: string;
    status: string;
    score: number;
    timeSpentSeconds: number;
    createdAt: string;
    id: string;
    createdBy: string;
    updatedAt: string;
}

export interface QuizQuestionChoice {
    key: string; // A, B, C, D
    text: string; // html string
}

export interface QuizQuestionItem {
    id: string;
    question: string; // html string
    correctAnswer: string;
    questionType: string;
    choices: QuizQuestionChoice[];
}

export interface QuizQuestion {
    metaData?: string; // json string
    question: QuizQuestionItem[];
}
