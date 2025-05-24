import { GameState } from '../types/gameState';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export class QuizScene extends Phaser.Scene {
  private gameState!: GameState;
  private currentFish!: string;
  private questions: QuizQuestion[] = [];
  private currentQuestion!: QuizQuestion;
  private questionText!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private optionButtons: Phaser.GameObjects.Rectangle[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private timerEvent!: Phaser.Time.TimerEvent;
  private timeRemaining: number = 15;
  private panel!: Phaser.GameObjects.Image;
  private fishImage!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: 'QuizScene' });
  }

  init(data: { gameState: GameState; currentFish: string }): void {
    this.gameState = data.gameState;
    this.currentFish = data.currentFish;
    this.timeRemaining = 15;
  }

  create(): void {
    // Create quiz questions
    this.createQuizQuestions();
    
    // Select a random question
    this.currentQuestion = this.questions[Phaser.Math.Between(0, this.questions.length - 1)];
    
    // Create UI
    this.createQuizUI();
    
    // Start timer
    this.startTimer();
  }

  update(): void {
    // Update timer text
    this.timerText.setText(`Time: ${this.timeRemaining}`);
  }

  private createQuizQuestions(): void {
    // Create a set of math questions for the quiz
    this.questions = [
      {
        question: 'What is 7 + 8?',
        options: ['12', '15', '14', '16'],
        correctAnswer: 1
      },
      {
        question: 'What is 12 - 5?',
        options: ['5', '6', '7', '8'],
        correctAnswer: 2
      },
      {
        question: 'What is 4 × 6?',
        options: ['22', '24', '26', '28'],
        correctAnswer: 1
      },
      {
        question: 'What is 20 ÷ 4?',
        options: ['4', '5', '6', '7'],
        correctAnswer: 1
      },
      {
        question: 'What is 3² (3 squared)?',
        options: ['6', '9', '12', '15'],
        correctAnswer: 1
      },
      {
        question: 'If a fish swims 3 meters per second, how far will it swim in 5 seconds?',
        options: ['8 meters', '12 meters', '15 meters', '18 meters'],
        correctAnswer: 2
      },
      {
        question: 'If you catch 4 fish and release 2, how many fish do you have?',
        options: ['1', '2', '3', '4'],
        correctAnswer: 1
      },
      {
        question: 'What is the square root of 25?',
        options: ['4', '5', '6', '7'],
        correctAnswer: 1
      },
      {
        question: 'If a boat travels at 8 km/h, how long will it take to travel 24 km?',
        options: ['2 hours', '3 hours', '4 hours', '5 hours'],
        correctAnswer: 1
      },
      {
        question: 'What is 1/4 of 20?',
        options: ['4', '5', '6', '7'],
        correctAnswer: 0
      }
    ];
  }

  private createQuizUI(): void {
    // Add semi-transparent background
    this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    );
    
    // Add panel
    this.panel = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'panel'
    ).setScale(5);
    
    // Add fish image
    this.fishImage = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 150,
      `fish-${this.currentFish}`
    ).setScale(2);
    
    // Add question text
    this.questionText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50,
      this.currentQuestion.question,
      {
        fontSize: '28px',
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    
    // Add timer text
    this.timerText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 100,
      `Time: ${this.timeRemaining}`,
      {
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    
    // Add options
    for (let i = 0; i < this.currentQuestion.options.length; i++) {
      // Create button background
      const buttonY = this.cameras.main.height / 2 + 20 + (i * 60);
      const button = this.add.rectangle(
        this.cameras.main.width / 2,
        buttonY,
        300,
        50,
        0x333333
      ).setInteractive();
      
      // Create option text
      const optionText = this.add.text(
        this.cameras.main.width / 2,
        buttonY,
        `${String.fromCharCode(65 + i)}. ${this.currentQuestion.options[i]}`,
        {
          fontSize: '24px',
          color: '#ffffff'
        }
      ).setOrigin(0.5);
      
      // Add hover effect
      button.on('pointerover', () => {
        button.setFillStyle(0x666666);
      });
      
      button.on('pointerout', () => {
        button.setFillStyle(0x333333);
      });
      
      // Add click event
      button.on('pointerdown', () => {
        this.checkAnswer(i);
      });
      
      this.optionButtons.push(button);
      this.optionTexts.push(optionText);
    }
  }

  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeRemaining--;
        
        if (this.timeRemaining <= 0) {
          // Time's up, player loses
          this.timerEvent.remove();
          this.showResult(false);
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  private checkAnswer(selectedIndex: number): void {
    // Stop the timer
    this.timerEvent.remove();
    
    // Check if the answer is correct
    const isCorrect = selectedIndex === this.currentQuestion.correctAnswer;
    
    // Show result
    this.showResult(isCorrect);
  }

  private showResult(isCorrect: boolean): void {
    // Disable option buttons
    this.optionButtons.forEach(button => {
      button.disableInteractive();
    });
    
    // Highlight correct answer
    this.optionButtons[this.currentQuestion.correctAnswer].setFillStyle(0x00ff00);
    
    // Show result text
    const resultText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 250,
      isCorrect ? 'Correct! You caught the fish!' : 'Wrong! The fish got away!',
      {
        fontSize: '32px',
        color: isCorrect ? '#00ff00' : '#ff0000',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    
    // Wait a moment before returning to the game
    this.time.delayedCall(2000, () => {
      this.scene.resume('GameScene', { success: isCorrect });
      this.scene.stop();
    });
  }
}
