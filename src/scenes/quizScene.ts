import { GameState } from '../types/gameState';
import { CompletionData, fetchCompletionData } from '../datas/completion';
import { FishType, fishSizes, FishVariantType, fishVariants } from '../const/fishType';
import { FishFactory, FishState, FishSizeCategory } from '../factories/fishFactory';
import { CursorManager } from '../managers/cursorManager';

interface QuizQuestion {
  question: string;
  choices: { key: string; text: string }[];
  correctAnswer: string;
  difficulty: number;
  questionType: string; // 'MC' for multiple choice, 'MS' for multiple selection
}

export class QuizScene extends Phaser.Scene {
  private gameState!: GameState;
  private currentFish!: FishType;
  private questions: QuizQuestion[] = [];
  private currentQuestion!: QuizQuestion;
  private questionText!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private optionButtons: Phaser.GameObjects.Rectangle[] = [];
  private choiceImages: Phaser.GameObjects.Image[] = []; // Store choice images for cleanup
  private timerText!: Phaser.GameObjects.Text;
  private timerEvent!: Phaser.Time.TimerEvent;
  private timeRemaining: number = 15;
  private paperBg!: Phaser.GameObjects.Image; // Paper background for quiz
  private panel!: Phaser.GameObjects.Image;
  private fishSprite!: Phaser.GameObjects.Image;
  private fishNameText!: Phaser.GameObjects.Text;
  private completionData: CompletionData | null = null;
  private selectedAnswers: Set<string> = new Set(); // Track selected answer keys
  private submitButton!: Phaser.GameObjects.Rectangle;
  private submitButtonText!: Phaser.GameObjects.Text;
  private correctAnswerKeys: string[] = []; // Parsed correct answers

  constructor() {
    super({ key: 'QuizScene' });
  }

  init(data: { gameState: GameState; currentFish: FishType; completionData?: CompletionData }): void {
    this.gameState = data.gameState;
    this.currentFish = data.currentFish;
    this.completionData = data.completionData || null;

    // Validate currentFish - provide fallback if missing
    if (!this.currentFish) {
      console.error('QuizScene: currentFish is missing from init data, using default bass');
      this.currentFish = FishType.bass;
    }

    // Set timer based on completion data or default to 15 seconds
    if (this.completionData && this.completionData.Timers && this.completionData.Timers.length > 0) {
      this.timeRemaining = this.completionData.Timers[0];

    } else {
      this.timeRemaining = 15; // Default timer

    }
  }

  create(): void {
    // Create quiz questions
    this.createQuizQuestions();

    // Select a random question
    this.currentQuestion = this.questions[Phaser.Math.Between(0, this.questions.length - 1)];

    // Parse correct answers (support comma-separated values)
    this.correctAnswerKeys = this.currentQuestion.correctAnswer.split(',').map(key => key.trim());

    // Reset selected answers
    this.selectedAnswers.clear();

    // Create UI with paper background
    this.createPaperBackground();
    this.createQuizUI();

    // Start timer
    this.startTimer();

    // Initialize cursor management for this scene
    CursorManager.createCursor(this);
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
          difficulty: 0,
          questionType: 'MC' // Multiple choice
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
          difficulty: 0,
          questionType: 'MC' // Multiple choice
        }
      ];
    }
  }

  private createQuizUI(): void {
    // Clean up any existing choice images
    this.cleanupChoiceImages();
    
    // Additional safety check for currentFish
    if (!this.currentFish) {
      console.error('QuizScene.createQuizUI: currentFish is undefined, using default bass');
      this.currentFish = FishType.bass;
    }

    // Create fish image at the top of the paper using FishFactory
    this.fishSprite = FishFactory.createFish(
      this,
      this.cameras.main.width / 2,
      this.paperBg.y - (this.paperBg.displayHeight / 2) + 60, // Position at the top area of the paper
      this.currentFish,
      FishState.NORMAL // Use normal state for the quiz display
    );

    // Set depth to ensure it's on top
    this.fishSprite.setDepth(2);

    // Get fish size category and adjust scale accordingly
    const sizeCategory = FishFactory.getFishSizeCategory(this.currentFish);

    // Scale the fish based on its size category
    switch (sizeCategory) {
      case FishSizeCategory.LARGE:
        this.fishSprite.setScale(1);
        break;
      case FishSizeCategory.MEDIUM:
        this.fishSprite.setScale(1);
        break;
      case FishSizeCategory.SMALL:
      default:
        this.fishSprite.setScale(1);
        break;
    }

    // Add fish name below the fish image
    const fishName = this.formatFishName(this.currentFish);
    this.fishNameText = this.add.text(
      this.cameras.main.width / 2,
      this.fishSprite.y + (this.fishSprite.displayHeight / 2) + 5, // Reduced spacing from 20px to 5px
      fishName,
      {
        fontSize: '24px',
        color: '#2c3e50', // Dark blue-gray color for good readability on paper
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 2
      }
    ).setOrigin(0.5).setDepth(2); // Center aligned and on top layer

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

    // Add options - position them in a 2x2 grid in the lower part of the paper
    const firstButtonY = this.cameras.main.height * 0.55; // Move down to fit within the taller paper
    const gridSpacingX = 220; // Horizontal spacing between buttons
    const gridSpacingY = 100; // Vertical spacing between buttons
    
    for (let i = 0; i < this.currentQuestion.choices.length; i++) {
      // Calculate position in 2x2 grid
      const row = Math.floor(i / 2); // 0 for first row, 1 for second row
      const col = i % 2; // 0 for left column, 1 for right column
      
      // Calculate button position
      const buttonX = (this.cameras.main.width / 2) + ((col === 0) ? -gridSpacingX : gridSpacingX);
      const buttonY = firstButtonY + (row * gridSpacingY);
      
      console.log('choice', this.currentQuestion.choices[i]);
      
      // Get choice and parse HTML content if needed
      const choice = this.currentQuestion.choices[i];
      const choiceDiv = document.createElement('div');
      choiceDiv.innerHTML = choice.text;
      
      // Process HTML content to create a formatted text representation
      let displayText = `${choice.key}. `;
      
      // Process child nodes to preserve some formatting
      Array.from(choiceDiv.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          // Add text content
          displayText += node.textContent || '';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.tagName.toLowerCase() === 'img') {
            // For images, we'll indicate there's an image but the actual image will be displayed separately
            displayText += ' [Image] ';
          } else {
            // For other elements, add their text content
            displayText += element.textContent || '';
          }
        }
      });
      
      // Create temporary text to measure dimensions
      const tempText = this.add.text(0, 0, displayText, {
        fontSize: '22px',
        color: '#000000',
        fontStyle: 'bold',
        wordWrap: { width: 400 } // Temporary wrap width for measurement
      });
      
      // Calculate button dimensions based on text
      const textWidth = tempText.width;
      const textHeight = tempText.height;
      
      // Clean up temporary text
      tempText.destroy();
      
      // Calculate button dimensions (add padding)
      const buttonWidth = Math.max(400, textWidth + 80); // Minimum 400px width
      const buttonHeight = Math.max(90, textHeight + 50); // Minimum 90px height
      
      // Create a paper-style answer button with dynamic size
      const button = this.add.rectangle(
        buttonX,
        buttonY,
        buttonWidth,
        buttonHeight,
        0xf5f5f5 // Light color for paper-like appearance
      )
        .setStrokeStyle(2, 0x90caf9) // Blue border like notebook paper
        .setInteractive();

      // Create option text
      const optionText = this.add.text(
        buttonX,
        buttonY,
        displayText,
        {
          fontSize: '24px', // Larger font size
          color: '#000000', // Black text for better readability on light background
          fontStyle: 'bold',
          wordWrap: { width: buttonWidth - 60 } // Wrap text to fit within button
        }
      ).setOrigin(0.5).setDepth(2);

      // Check for images in the choice and process them
      const choiceImages = choiceDiv.querySelectorAll('img');
      if (choiceImages.length > 0) {
        // Process each image
        choiceImages.forEach((img, imgIndex) => {
          const src = img.getAttribute('src');
          if (src && src.startsWith('data:image')) {
            // Load base64 image
            this.loadBase64Image(src, `choice-${i}-img-${imgIndex}`, (textureKey) => {
              // Position image within the button area
              const imageY = buttonY; // Center vertically within button
              const imageX = buttonX + (buttonWidth / 2) - 50; // Position to the right within button
              
              const choiceImage = this.add.image(imageX, imageY, textureKey);
              // Scale image to fit within button height
              const maxImageHeight = buttonHeight * 0.7;
              choiceImage.setScale(Math.min(1.2, maxImageHeight / choiceImage.height));
              choiceImage.setDepth(3); // Ensure it appears above button
              
              // Store reference for cleanup
              this.choiceImages.push(choiceImage);
            });
          }
        });
      }

      // Add hover effect
      button.on('pointerover', () => {
        button.setFillStyle(0xe3f2fd); // Light blue highlight
        button.setStrokeStyle(3, 0x2196f3); // Thicker blue border
        optionText.setStyle({ fontSize: '23px' }); // Slightly larger text
      });

      button.on('pointerout', () => {
        // Check if this answer is currently selected
        const selectedKey = this.currentQuestion.choices[i].key;
        const isSelected = this.selectedAnswers.has(selectedKey);
        
        if (isSelected) {
          // Keep selected style
          button.setFillStyle(0x2e7d32); // Dark green for selected
          button.setStrokeStyle(3, 0x1b5e20); // Darker green border
        } else {
          // Reset to default style
          button.setFillStyle(0xf5f5f5); // Light color (unselected)
          button.setStrokeStyle(2, 0x90caf9); // Normal border
        }
        
        // Only reset font size, not color
        optionText.setStyle({ fontSize: '22px' });
      });

      // Add click event
      button.on('pointerdown', () => {
        this.toggleAnswer(i);
      });

      this.optionButtons.push(button);
      this.optionTexts.push(optionText);
    }

    // Add submit button below all options
    const submitButtonY = firstButtonY + (this.currentQuestion.choices.length * 70) + 30;
    
    this.submitButton = this.add.rectangle(
      this.cameras.main.width / 2,
      submitButtonY,
      200,
      50,
      0xcccccc // Gray (disabled initially)
    )
      .setStrokeStyle(2, 0x999999)
      .setDepth(1);

    this.submitButtonText = this.add.text(
      this.cameras.main.width / 2,
      submitButtonY,
      'Submit Answer',
      {
        fontSize: '20px',
        color: '#666666',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(2);

    // Initially disabled
    this.submitButton.disableInteractive();

    // Add hover effects for submit button
    this.submitButton.on('pointerover', () => {
      if (this.selectedAnswers.size > 0) {
        this.submitButton.setFillStyle(0x1976d2); // Darker blue on hover
      }
    });

    this.submitButton.on('pointerout', () => {
      if (this.selectedAnswers.size > 0) {
        this.submitButton.setFillStyle(0x2196f3); // Back to normal blue
      }
    });

    // Add click event for submit
    this.submitButton.on('pointerdown', () => {
      this.submitAnswer();
    });
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

  private toggleAnswer(selectedIndex: number): void {
    const selectedKey = this.currentQuestion.choices[selectedIndex].key;
    const button = this.optionButtons[selectedIndex];
    
    // Handle different question types
    if (this.currentQuestion.questionType === 'MC') {
      // Single choice - deselect all other options first
      this.selectedAnswers.forEach(key => {
        const index = this.currentQuestion.choices.findIndex(choice => choice.key === key);
        if (index !== -1) {
          const otherButton = this.optionButtons[index];
          otherButton.setFillStyle(0xf5f5f5); // Light color (unselected)
          otherButton.setStrokeStyle(2, 0x90caf9); // Normal border
        }
      });
      
      // Clear all selections and select only the current one
      this.selectedAnswers.clear();
      this.selectedAnswers.add(selectedKey);
      
      // Update all button styles
      this.optionButtons.forEach((btn, index) => {
        // Ensure we don't go out of bounds
        if (index < this.currentQuestion.choices.length) {
          const key = this.currentQuestion.choices[index].key;
          if (key === selectedKey) {
            btn.setFillStyle(0x2e7d32); // Darker green for selected
            btn.setStrokeStyle(3, 0x1b5e20); // Darker green border
          } else {
            btn.setFillStyle(0xf5f5f5); // Light color (unselected)
            btn.setStrokeStyle(2, 0x90caf9); // Normal border
          }
        }
      });
    } else {
      // Multiple selection (MS) - toggle selection normally
      if (this.selectedAnswers.has(selectedKey)) {
        // Deselect
        this.selectedAnswers.delete(selectedKey);
        button.setFillStyle(0xf5f5f5); // Light color (unselected)
        button.setStrokeStyle(2, 0x90caf9); // Normal border
      } else {
        // Select
        this.selectedAnswers.add(selectedKey);
        button.setFillStyle(0x2e7d32); // Darker green for better contrast
        button.setStrokeStyle(3, 0x1b5e20); // Darker green border
      }
    }

    // Update submit button state
    this.updateSubmitButton();
  }

  private updateSubmitButton(): void {
    let shouldEnable = false;
    
    if (this.currentQuestion.questionType === 'MC') {
      // For single choice, enable submit button when exactly one answer is selected
      shouldEnable = this.selectedAnswers.size === 1;
    } else {
      // For multiple selection, enable submit button when at least one answer is selected
      shouldEnable = this.selectedAnswers.size > 0;
    }
    
    if (shouldEnable) {
      this.submitButton.setFillStyle(0x2196f3); // Blue (enabled)
      this.submitButton.setStrokeStyle(3, 0x1976d2);
      this.submitButtonText.setStyle({ color: '#ffffff' });
      this.submitButton.setInteractive();
    } else {
      this.submitButton.setFillStyle(0xcccccc); // Gray (disabled)
      this.submitButton.setStrokeStyle(2, 0x999999);
      this.submitButtonText.setStyle({ color: '#666666' });
      this.submitButton.disableInteractive();
    }
  }

  private submitAnswer(): void {
    if (this.selectedAnswers.size === 0) return;

    // Stop the timer
    this.timerEvent.remove();

    // Check if the answer is correct based on question type
    let isCorrect = false;
    const selectedArray = Array.from(this.selectedAnswers).sort();
    const correctArray = this.correctAnswerKeys.sort();
    
    if (this.currentQuestion.questionType === 'MC') {
      // For single choice, user must select exactly one correct answer
      isCorrect = selectedArray.length === 1 && correctArray.includes(selectedArray[0]);
    } else {
      // For multiple selection, user must select all correct answers and no incorrect ones
      isCorrect = selectedArray.length === correctArray.length && 
                  selectedArray.every(key => correctArray.includes(key));
    }

    // Calculate time bonus - how much time is left
    const timeBonus = this.timeRemaining;

    // Create user answer string for display
    const userAnswer = selectedArray.join(', ');

    // Show result and pass time bonus and user answer
    this.showResult(isCorrect, timeBonus, userAnswer);
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
        debugger;
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

  private showResult(isCorrect: boolean, timeBonus: number = 0, userAnswer?: string): void {
    // Disable option buttons - safely check each button before disabling
    this.optionButtons.forEach(button => {
      if (button && button.input) {
        button.disableInteractive();
      }
    });

    // Disable submit button
    if (this.submitButton && this.submitButton.input) {
      this.submitButton.disableInteractive();
    }

    // Update fish state based on result
    if (this.fishSprite) {
      FishFactory.updateFishAnimation(
        this.fishSprite,
        isCorrect ? FishState.CAUGHT : FishState.ESCAPED
      );
    }

    // Highlight all correct answers
    this.correctAnswerKeys.forEach(correctKey => {
      const correctAnswerIndex = this.currentQuestion.choices.findIndex(
        choice => choice.key === correctKey
      );
      
      if (correctAnswerIndex >= 0 && correctAnswerIndex < this.optionButtons.length) {
        this.optionButtons[correctAnswerIndex].setFillStyle(0x00ff00); // Green for correct
        // Remove text style change to avoid Phaser errors
      }
    });

    // Highlight user's incorrect selections in red
    this.selectedAnswers.forEach(selectedKey => {
      if (!this.correctAnswerKeys.includes(selectedKey)) {
        const incorrectIndex = this.currentQuestion.choices.findIndex(
          choice => choice.key === selectedKey
        );
        
        if (incorrectIndex >= 0 && incorrectIndex < this.optionButtons.length) {
          this.optionButtons[incorrectIndex].setFillStyle(0xff0000); // Red for incorrect
          // Remove text style change to avoid Phaser errors
        }
      }
    });

    // Show result text - position it more prominently
    const resultText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50, // More visible position
      isCorrect ? 'CORRECT! You caught the fish!' : 'WRONG! The fish got away!',
      {
        fontSize: '36px',
        color: isCorrect ? '#00ff00' : '#ff0000',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(10); // Higher depth to ensure visibility
    
    // Add explanation text for incorrect answers
    if (!isCorrect) {
      // Create a string showing the correct answers
      const correctAnswersText = 'Correct answer' + 
        (this.correctAnswerKeys.length > 1 ? 's' : '') + 
        ': ' + this.correctAnswerKeys.join(', ');
      
      const explanationText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2, // Just below the result text
        correctAnswersText,
        {
          fontSize: '28px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3
        }
      ).setOrigin(0.5).setDepth(10);
    }

    // Wait a moment before returning to the game
    this.time.delayedCall(2000, () => {
      this.scene.resume('GameScene', {
        success: isCorrect,
        timeBonus: timeBonus,
        quizData: {
          fishType: this.currentFish,
          question: this.currentQuestion.question,
          choices: this.currentQuestion.choices,
          correctAnswer: this.currentQuestion.correctAnswer,
          userAnswer: userAnswer,
          isCorrect: isCorrect,
          timeBonus: timeBonus
        }
      });
      this.scene.stop();
    });
  }

  private formatFishName(fish: FishType): string {
    // Convert fish enum to readable name
    // Replace underscores with spaces and capitalize each word
    return fish
      .replace(/_/g, ' ') // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
      .join(' ');
  }

  /**
   * Load a base64 image and create a texture from it
   * @param base64Data The base64 image data
   * @param key The texture key to use
   * @param callback Callback function to execute when image is loaded
   */
  private loadBase64Image(base64Data: string, key: string, callback: (textureKey: string) => void): void {
    // Check if texture already exists
    if (this.textures.exists(key)) {
      callback(key);
      return;
    }

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
        this.textures.addCanvas(key, canvas);
        callback(key);
      }
    };
    tempImg.src = base64Data;
  }

  /**
   * Clean up choice images to prevent memory leaks
   */
  private cleanupChoiceImages(): void {
    // Destroy choice images
    this.choiceImages.forEach(image => {
      if (image && image.scene) {
        image.destroy();
      }
    });
    this.choiceImages = [];
  }
}
