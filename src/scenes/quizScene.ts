import { GameState } from '../types/gameState';
import { CompletionData, fetchCompletionData } from '../datas/completion';
import { FishType, fishSizes, FishVariantType, fishVariants } from '../const/fishType';

interface QuizQuestion {
  question: string;
  choices: { key: string; text: string }[];
  correctAnswer: string;
  difficulty: number;
}

export class QuizScene extends Phaser.Scene {
  private gameState!: GameState;
  private currentFish!: FishType;
  private questions: QuizQuestion[] = [];
  private currentQuestion!: QuizQuestion;
  private questionText!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private optionButtons: Phaser.GameObjects.Rectangle[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private timerEvent!: Phaser.Time.TimerEvent;
  private timeRemaining: number = 15;
  private paperBg!: Phaser.GameObjects.Image; // Paper background for quiz
  private panel!: Phaser.GameObjects.Image;
  private fishImage!: Phaser.GameObjects.Image;
  private completionData: CompletionData | null = null;

  constructor() {
    super({ key: 'QuizScene' });
  }

  init(data: { gameState: GameState; currentFish: FishType; completionData?: CompletionData }): void {
    this.gameState = data.gameState;
    this.currentFish = data.currentFish;
    this.completionData = data.completionData || null;
    
    // Set timer based on completion data or default to 15 seconds
    if (this.completionData && this.completionData.Timers && this.completionData.Timers.length > 0) {
      this.timeRemaining = this.completionData.Timers[0];
      console.log(`Setting quiz timer to ${this.timeRemaining} seconds from completion data`);
    } else {
      this.timeRemaining = 15; // Default timer
      console.log('Using default quiz timer of 15 seconds');
    }
  }

  create(): void {
    // Create quiz questions
    this.createQuizQuestions();
    
    console.log(`Loaded ${this.questions.length} questions from ${window.QUIZ_QUESTIONS ? 'API' : 'fallback'}`); 
    
    // Select a random question
    this.currentQuestion = this.questions[Phaser.Math.Between(0, this.questions.length - 1)];
    console.log('Selected question:', this.currentQuestion.question.substring(0, 50) + '...');
    
    // Create UI with paper background
    this.createPaperBackground();
    this.createQuizUI();
    
    // Start timer
    this.startTimer();
  }
  
  private createPaperBackground(): void {
    // Check if paper-bg asset exists, otherwise create a custom one
    if (!this.textures.exists('paper-bg')) {
      // Create a custom paper texture if the asset doesn't exist
      const graphics = this.make.graphics();
      
      // Create the main paper background (light gray)
      graphics.fillStyle(0xf0f0f0);
      graphics.fillRect(0, 0, 400, 500);
      
      // Add notebook lines
      graphics.lineStyle(1, 0xccccff, 0.5);
      for (let y = 40; y < 500; y += 30) {
        graphics.beginPath();
        graphics.moveTo(20, y);
        graphics.lineTo(380, y);
        graphics.strokePath();
      }
      
      // Add left margin with holes (notebook binding)
      graphics.fillStyle(0xdddddd);
      graphics.fillRect(0, 0, 20, 500);
      
      // Add notebook holes
      graphics.fillStyle(0x333333);
      for (let y = 50; y < 500; y += 80) {
        graphics.fillCircle(10, y, 5);
      }
      
      // Generate texture
      graphics.generateTexture('paper-bg', 400, 500);
      graphics.destroy();
    }
    
    // Calculate dimensions for the paper background
    const width = this.cameras.main.width * 0.8;
    const height = this.cameras.main.height * 0.85; // Increased height to cover more of the screen
    
    // Add the paper background
    this.paperBg = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'paper-bg'
    )
    .setDisplaySize(width, height)
    .setDepth(0); // Set to back layer
  }

  update(): void {
    // Update timer text
    this.timerText.setText(`Time: ${this.timeRemaining}`);
  }

  private createQuizQuestions(): void {
    // Use questions from the mock API (global variable)
    if (window.QUIZ_QUESTIONS && window.QUIZ_QUESTIONS.length > 0) {
      console.log('Using questions from API:', window.QUIZ_QUESTIONS.length);
      this.questions = window.QUIZ_QUESTIONS;
    } else {
      // Fallback to default questions if API data is not available
      console.warn('API questions not available, using fallback questions');
      this.questions = [
        {
          question: 'What is 7 + 8?',
          choices: [
            { key: 'A', text: '12' },
            { key: 'B', text: '15' },
            { key: 'C', text: '14' },
            { key: 'D', text: '16' }
          ],
          correctAnswer: 'B',
          difficulty: 0
        },
        {
          question: 'What is 12 - 5?',
          choices: [
            { key: 'A', text: '5' },
            { key: 'B', text: '6' },
            { key: 'C', text: '7' },
            { key: 'D', text: '8' }
          ],
          correctAnswer: 'C',
          difficulty: 0
        }
      ];
    }
  }

  private createQuizUI(): void {
    // Check if the current fish has variants
    const variants = fishVariants[this.currentFish];
    let fishKey = `fish-${this.currentFish}`;
    
    // If this fish has variants, randomly select one
    if (variants && variants.length > 0) {
      const randomVariant = variants[Math.floor(Math.random() * variants.length)];
      // Use the variant-specific image key
      fishKey = `fish-${this.currentFish}-${randomVariant}`;
      console.log(`Selected random variant for ${this.currentFish}: ${randomVariant}`);
    }
    
    // Add fish image at the top of the paper (using either base fish or a variant)
    this.fishImage = this.add.image(
      this.cameras.main.width / 2,
      this.paperBg.y - (this.paperBg.displayHeight / 2) + 60, // Position at the top area of the paper
      fishKey
    ).setDepth(2); // Ensure it's on top
    
    // Show only the first frame by setting the frame explicitly
    this.fishImage.setFrame(0);
    
    // Adjust scale based on fish size
    const fishSize = fishSizes[this.currentFish];
    
    // For shark_whale which is 16x48, we need to adjust the scale differently
    // to maintain proper proportions
    if (this.currentFish === FishType.shark_whale) {
      // For wider fish, use a smaller scale to fit properly but still larger than before
      this.fishImage.setScale(2.0);
      // Rotate the fish to display horizontally
      this.fishImage.setAngle(90);
    } else {
      // Scale up all fish to 3.0 as requested
      this.fishImage.setScale(3.0);
    }
    
    // Extract and display question content
    this.displayQuestionContent();
    
    
    // Add timer text - position at the top of the screen
    this.timerText = this.add.text(
      this.cameras.main.width - 80, // Position in top-right corner
      30, // Near the top
      `Time: ${this.timeRemaining}`,
      {
        fontSize: '28px',
        color: '#ffff00', // Yellow color for better visibility
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold' // Make it bold for emphasis
      }
    ).setOrigin(1, 0.5); // Right-align the text
    
    // Add options - position them in the lower part of the paper
    const firstButtonY = this.cameras.main.height * 0.6; // Move down to fit within the taller paper
    for (let i = 0; i < this.currentQuestion.choices.length; i++) {
      // Create button background with more spacing for better layout
      const buttonY = firstButtonY + (i * 70); // Increased spacing between buttons
      
      // Create a paper-style answer button
      const button = this.add.rectangle(
        this.cameras.main.width / 2,
        buttonY,
        300,
        50,
        0xf5f5f5 // Light color for paper-like appearance
      )
      .setStrokeStyle(2, 0x90caf9) // Blue border like notebook paper
      .setInteractive();
      
      // Get choice and parse HTML content if needed
      const choice = this.currentQuestion.choices[i];
      const choiceDiv = document.createElement('div');
      choiceDiv.innerHTML = choice.text;
      const plainChoiceText = choiceDiv.textContent || choiceDiv.innerText || choice.text;
      
      // Create option text
      const optionText = this.add.text(
        this.cameras.main.width / 2,
        buttonY,
        `${choice.key}. ${plainChoiceText}`,
        {
          fontSize: '22px',
          color: '#000000', // Black text for better readability on light background
          fontStyle: 'bold'
        }
      ).setOrigin(0.5).setDepth(2);
      
      // Add hover effect
      button.on('pointerover', () => {
        button.setFillStyle(0xe3f2fd); // Light blue highlight
        button.setStrokeStyle(3, 0x2196f3); // Thicker blue border
        optionText.setStyle({ fontSize: '23px' }); // Slightly larger text
      });
      
      button.on('pointerout', () => {
        button.setFillStyle(0xf5f5f5); // Back to light color
        button.setStrokeStyle(2, 0x90caf9); // Normal border
        optionText.setStyle({ fontSize: '22px', color: '#000000', fontStyle: 'bold' }); // Normal text
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
    const selectedKey = this.currentQuestion.choices[selectedIndex].key;
    const isCorrect = selectedKey === this.currentQuestion.correctAnswer;
    
    // Calculate time bonus - how much time is left
    const timeBonus = this.timeRemaining;
    console.log(`Answer selected with ${timeBonus} seconds remaining`);
    
    // Show result and pass time bonus
    this.showResult(isCorrect, timeBonus);
  }

  private displayQuestionContent(): void {
    // Position question content on the paper background below the fish image
    // Use the upper-middle area of the paper for positioning
    const questionY = this.paperBg.y - (this.paperBg.displayHeight * 0.25); // Position in the upper-middle part of the paper
    
    // Parse HTML content to extract images and text
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(this.currentQuestion.question, 'text/html');
    
    // Check for images in the question
    const images = htmlDoc.querySelectorAll('img');
    let hasImage = false;
    
    if (images.length > 0) {
      // Handle the first image (for simplicity)
      const img = images[0];
      const src = img.getAttribute('src');
      
      if (src && src.startsWith('data:image')) {
        hasImage = true;
        // Create a temporary image element to load the base64 image
        const tempImg = new Image();
        tempImg.onload = () => {
          // Create a canvas to convert the image to a texture
          const canvas = document.createElement('canvas');
          canvas.width = tempImg.width;
          canvas.height = tempImg.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(tempImg, 0, 0);
            // Create a texture from the canvas
            const texture = this.textures.addCanvas('question-image', canvas);
            // Add the image to the scene
            const questionImage = this.add.image(
              this.cameras.main.width / 2,
              questionY,
              'question-image'
            );
            // Set depth to appear above paper but below UI elements
            questionImage.setDepth(1);
            
            // Scale the image to fit within the paper width
            const paperWidth = this.paperBg.displayWidth * 0.7; // Leave some margin
            if (questionImage.width > paperWidth) {
              const scale = paperWidth / questionImage.width;
              questionImage.setScale(scale);
            }
            
            // Limit the height to avoid overflow
            const maxHeight = this.paperBg.displayHeight * 0.3;
            if (questionImage.height * questionImage.scaleY > maxHeight) {
              const heightScale = maxHeight / questionImage.height;
              questionImage.setScale(Math.min(questionImage.scaleX, heightScale));
            }
          }
        };
        tempImg.src = src;
      }
    }
    
    // Extract text content (excluding image tags and elements with display:none)
    let textContent = '';
  
    // Function to check if an element or its parents have display:none
    const hasDisplayNone = (element: Element): boolean => {
      // Check inline style
      if (element.getAttribute('style')?.includes('display:none') || 
          element.getAttribute('style')?.includes('display: none')) {
        return true;
      }
      
      // Check for spans with display:none
      if (element.tagName.toLowerCase() === 'span' && 
          element.getAttribute('style')?.includes("display:none")) {
        return true;
      }
      
      // Check parent recursively
      return element.parentElement ? hasDisplayNone(element.parentElement) : false;
    };
    
    // Process nodes and filter out display:none elements
    const processNode = (node: Node): string => {
      // Text node - just return the content
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      
      // Element node - check if it's visible
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        
        // Skip image tags
        if (element.tagName.toLowerCase() === 'img') {
          return '';
        }
        
        // Skip elements with display:none
        if (hasDisplayNone(element)) {
          return '';
        }
        
        // Process children for visible elements
        let content = '';
        Array.from(element.childNodes).forEach(child => {
          content += processNode(child);
        });
        
        return content;
      }
      
      return '';
    };
    
    // Process the entire body
    Array.from(htmlDoc.body.childNodes).forEach(node => {
      textContent += processNode(node);
    });
    
    // Clean up the text
    textContent = textContent.trim();
    
    // Add text below the image if there is one, or at the default position
    // Adjust the vertical spacing based on whether there's an image
    const textY = hasImage ? questionY + 80 : questionY;
    
    this.questionText = this.add.text(
      this.cameras.main.width / 2,
      textY,
      textContent,
      {
        fontSize: '22px', // Smaller font for better fit on paper
        color: '#000000', // Black text like on notebook paper
        align: 'center',
        wordWrap: { width: this.paperBg.displayWidth * 0.7 },
        lineSpacing: 8 // Add line spacing for better readability on the lined paper
      }
    ).setOrigin(0.5).setDepth(1); // Set depth to appear above paper
    
    // Limit text height to avoid overlap with answer options
    const maxTextHeight = this.paperBg.displayHeight * 0.4;
    if (this.questionText.height > maxTextHeight) {
      // If text is too long, truncate and add ellipsis
      let truncatedText = textContent;
      while (this.questionText.height > maxTextHeight && truncatedText.length > 10) {
        truncatedText = truncatedText.substring(0, truncatedText.length - 10) + '...'; 
        this.questionText.setText(truncatedText);
      }
    }
  }

  private showResult(isCorrect: boolean, timeBonus: number = 0): void {
    // Disable option buttons - safely check each button before disabling
    this.optionButtons.forEach(button => {
      if (button && button.input) {
        button.disableInteractive();
      }
    });
    
    // Find the index of the correct answer
    const correctAnswerIndex = this.currentQuestion.choices.findIndex(
      choice => choice.key === this.currentQuestion.correctAnswer
    );
    
    // Highlight correct answer if found
    if (correctAnswerIndex >= 0 && correctAnswerIndex < this.optionButtons.length) {
      this.optionButtons[correctAnswerIndex].setFillStyle(0x00ff00);
    }
    
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
      this.scene.resume('GameScene', { 
        success: isCorrect,
        timeBonus: timeBonus
      });
      this.scene.stop();
    });
  }
}
