import { GameState } from '../types/gameState';
import { CompletionData, fetchCompletionData } from '../datas/completion';
import { FishType, fishSizes, FishVariantType, fishVariants } from '../const/fishType';
import { FishFactory, FishState, FishSizeCategory } from '../factories/fishFactory';
import { CursorManager } from '../managers/cursorManager';
// @ts-ignore
import gameSdk from '../service/apiService.js';

interface QuizQuestion {
  id?: string; // Question ID from backend API
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
  private questionStartTime: number = 0; // Track when question started
  private htmlQuestionContainer: HTMLDivElement | null = null; // HTML container for question content

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
    //console.log('QuizScene: Creating scene...');

    // Ensure clean state before creating new elements
    this.resetScene();
    
    // Clean up any existing HTML containers
    this.disposeHtmlContainer();

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

    // Record when the question started for time tracking
    this.questionStartTime = Date.now();

    // Initialize cursor management for this scene
    CursorManager.createCursor(this);

    //console.log('QuizScene: Scene creation completed');
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
      console.log(`Loaded ${this.questions.length} questions from API for quiz`);
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

      // Update the global total if we're using fallback
      if (!(window as any).TOTAL_QUESTIONS) {
        (window as any).TOTAL_QUESTIONS = this.questions.length;
      }
    }
  }

  private createQuizUI(): void {
    // Clean up any existing choice images and UI elements
    this.cleanupChoiceImages();
    this.cleanupUIElements();

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
    const firstButtonY = this.cameras.main.height * 0.55 + 160; // Move down by additional 20px
    const gridSpacingX = 220; // Horizontal spacing between buttons
    const gridSpacingY = 100; // Vertical spacing between buttons

    for (let i = 0; i < this.currentQuestion.choices.length; i++) {
      // Calculate position in 2x2 grid
      const row = Math.floor(i / 2); // 0 for first row, 1 for second row
      const col = i % 2; // 0 for left column, 1 for right column

      // Calculate button position
      const buttonX = (this.cameras.main.width / 2) + ((col === 0) ? -gridSpacingX : gridSpacingX);
      const buttonY = firstButtonY + (row * gridSpacingY);

      //console.log('choice', this.currentQuestion.choices[i]);

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

      // Store button index for event handlers
      button.setData('buttonIndex', i);
      optionText.setData('buttonIndex', i);

      // Add hover effect
      button.on('pointerover', () => {
        const buttonIndex = button.getData('buttonIndex');
        const currentKey = this.currentQuestion.choices[buttonIndex].key;
        const isCurrentlySelected = this.selectedAnswers.has(currentKey);

        if (isCurrentlySelected) {
          // For selected buttons, show a darker green hover effect
          button.setFillStyle(0x1b5e20); // Even darker green for selected hover
          button.setStrokeStyle(3, 0x0d4f17); // Very dark green border
        } else {
          // For unselected buttons, show blue hover effect
          button.setFillStyle(0xe3f2fd); // Light blue highlight
          button.setStrokeStyle(3, 0x2196f3); // Thicker blue border
        }

        // Find the corresponding text element and increase font size
        const textIndex = optionText.getData('buttonIndex');
        if (textIndex === buttonIndex) {
          optionText.setStyle({ fontSize: '23px' });
        }
      });

      button.on('pointerout', () => {
        // Use the centralized button style update method
        // This ensures consistency with the current selection state
        this.updateAllButtonStyles();

        // Reset font size for all option texts
        this.optionTexts.forEach(text => {
          if (text && text.scene) {
            text.setStyle({ fontSize: '22px' });
          }
        });
      });

      // Add click event
      button.on('pointerdown', () => {
        const buttonIndex = button.getData('buttonIndex');
        this.toggleAnswer(buttonIndex);
      });

      this.optionButtons.push(button);
      this.optionTexts.push(optionText);
    }

    // Add submit button below all options
    const submitButtonY = firstButtonY + (this.currentQuestion.choices.length * 70) - 70;

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

          // Calculate time spent and save timeout attempt
          const timeSpentMs = Date.now() - this.questionStartTime;
          const timeSpentSeconds = Math.round(timeSpentMs / 1000);

          // No answer selected for timeout
          this.saveQuestionAttempt(timeSpentSeconds, '', false, 0);
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
      //console.log('question is MC');
      //console.log('Before - selectedAnswers: ', Array.from(this.selectedAnswers));

      // Clear all selections first
      this.selectedAnswers.clear();

      // Add only the current selection
      this.selectedAnswers.add(selectedKey);
      //console.log('After - selectedAnswers: ', Array.from(this.selectedAnswers));

      // Update ALL button styles based on current selectedAnswers state
      this.updateAllButtonStyles();
    } else {
      //console.log('question is MS');
      // Multiple selection (MS) - toggle selection normally
      if (this.selectedAnswers.has(selectedKey)) {
        // Deselect
        this.selectedAnswers.delete(selectedKey);
      } else {
        // Select
        this.selectedAnswers.add(selectedKey);
      }

      // Update ALL button styles based on current selectedAnswers state
      this.updateAllButtonStyles();
    }

    // Force immediate visual update
    this.time.delayedCall(10, () => {
      this.updateAllButtonStyles();
    });

    // Update submit button state
    this.updateSubmitButton();
  }

  /**
 * Update all button styles based on current selectedAnswers state
 * This ensures visual consistency across all buttons
 */
  private updateAllButtonStyles(): void {
    //console.log('updateAllButtonStyles called, selectedAnswers:', Array.from(this.selectedAnswers));

    this.optionButtons.forEach((btn, index) => {
      if (index < this.currentQuestion.choices.length) {
        const key = this.currentQuestion.choices[index].key;
        const isSelected = this.selectedAnswers.has(key);

        if (isSelected) {
          btn.setFillStyle(0x2e7d32); // Darker green for selected
          btn.setStrokeStyle(3, 0x1b5e20); // Darker green border
          //console.log(`Button ${index} (key: ${key}) set to SELECTED`);
        } else {
          btn.setFillStyle(0xf5f5f5); // Light color (unselected)
          btn.setStrokeStyle(2, 0x90caf9); // Normal border
          //console.log(`Button ${index} (key: ${key}) set to UNSELECTED`);
        }
      }
    });

    // Force a render update by triggering scene events
    this.events.emit('update-buttons');
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

    // Calculate time spent on this question (in seconds)
    const timeSpentMs = Date.now() - this.questionStartTime;
    const timeSpentSeconds = Math.round(timeSpentMs / 1000);

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
    const userAnswer = selectedArray.join(','); // Use comma without space for API

    // Call API to save question attempt before showing results
    this.saveQuestionAttempt(timeSpentSeconds, userAnswer, isCorrect, timeBonus);
  }

  /**
   * Save question attempt to the backend API
   */
  private saveQuestionAttempt(timeSpent: number, submitAnswer: string, isCorrect: boolean, timeBonus: number): void {
    // Prepare payload for API
    const payload = {
      GameAttemptId: window.GAME_ATTEMPT_ID || '',
      questionId: this.currentQuestion.id || '', // Assuming questions have an id field
      timespent: timeSpent,
      submittedAnswer: submitAnswer
    };

    console.log('Saving question attempt:', payload);

    // Call the postQuestion API
    gameSdk.postQuestiion(
      payload,
      (result: any) => {
        console.log('Question saved successfully:', result);
        // Show result after successful API call
        this.showResult(isCorrect, timeBonus, submitAnswer);
      },
      () => {
        console.error('Failed to save question');
        // Show result even if API fails to prevent blocking the user
        this.showResult(isCorrect, timeBonus, submitAnswer);
      }
    );
  }

  private displayQuestionContent(): void {
    // Create HTML container outside canvas for proper HTML rendering
    this.createHtmlContainer();
    
    // Create a placeholder text in canvas to maintain layout
    const questionY = this.paperBg.y - (this.paperBg.displayHeight * 0.25);
    
    this.questionText = this.add.text(
      this.cameras.main.width / 2,
      questionY,
      '', // Empty text as placeholder
      {
        fontSize: '22px',
        color: 'transparent', // Make it invisible
        align: 'center',
        wordWrap: { width: this.paperBg.displayWidth * 0.7 },
        lineSpacing: 8
      }
    ).setOrigin(0.5).setDepth(1);
  }
  
  private createHtmlContainer(): void {
    // Remove any existing HTML container
    this.disposeHtmlContainer();
    
    // Create HTML container
    this.htmlQuestionContainer = document.createElement('div');
    this.htmlQuestionContainer.innerHTML = this.currentQuestion.question;
    
    // Calculate position based on canvas and paper background
    const canvas = this.game.canvas as HTMLCanvasElement;
    const canvasRect = canvas.getBoundingClientRect();
    
    // Get the actual canvas scale factors
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;
    
    // Calculate the question position in world coordinates
    const questionY = this.paperBg.y - (this.paperBg.displayHeight * 0.25);
    
    // Convert world coordinates to screen coordinates
    const worldX = this.cameras.main.width / 2;
    const worldY = questionY;
    
    const screenX = canvasRect.left + (worldX * scaleX);
    const screenY = canvasRect.top + (worldY * scaleY) + 150;
    
    // Style the HTML container to blend seamlessly with canvas
    this.htmlQuestionContainer.style.position = 'fixed';
    this.htmlQuestionContainer.style.left = screenX + 'px';
    this.htmlQuestionContainer.style.top = screenY + 'px';
    this.htmlQuestionContainer.style.transform = 'translate(-50%, -50%)';
    this.htmlQuestionContainer.style.width = Math.min(500, this.paperBg.displayWidth * 0.7 * scaleX) + 'px';
    this.htmlQuestionContainer.style.maxHeight = Math.min(250, this.paperBg.displayHeight * 0.4 * scaleY) + 'px';
    this.htmlQuestionContainer.style.overflow = 'auto';
    this.htmlQuestionContainer.style.zIndex = '1000';
    this.htmlQuestionContainer.style.backgroundColor = 'transparent'; // Transparent background
    this.htmlQuestionContainer.style.padding = '15px';
    this.htmlQuestionContainer.style.borderRadius = '0px'; // No border radius
    this.htmlQuestionContainer.style.boxShadow = 'none'; // No drop shadow
    this.htmlQuestionContainer.style.fontSize = '16px';
    this.htmlQuestionContainer.style.lineHeight = '1.5';
    this.htmlQuestionContainer.style.color = '#000000';
    this.htmlQuestionContainer.style.textAlign = 'left';
    this.htmlQuestionContainer.style.fontFamily = 'Arial, sans-serif';
    this.htmlQuestionContainer.style.border = 'none'; // No border
    
    // Handle images in the HTML content
    const images = this.htmlQuestionContainer.querySelectorAll('img');
    images.forEach(img => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '10px auto';
      img.style.borderRadius = '5px';
    });
    
    // Handle MathML if present
    const mathElements = this.htmlQuestionContainer.querySelectorAll('math');
    mathElements.forEach(math => {
      math.style.display = 'block';
      math.style.margin = '10px auto';
      math.style.textAlign = 'center';
    });
    
    // Handle any custom styling elements
    const styleElements = this.htmlQuestionContainer.querySelectorAll('style');
    styleElements.forEach(style => {
      if (style.textContent) {
        style.textContent = style.textContent.replace(/margin-left:\s*30%/g, 'margin-left: auto');
      }
    });
    
    // Add to document body
    document.body.appendChild(this.htmlQuestionContainer);
    
    // Update position on window resize
    const updatePosition = () => {
      if (this.htmlQuestionContainer && canvas.parentElement) {
        const newCanvasRect = canvas.getBoundingClientRect();
        const newScaleX = newCanvasRect.width / canvas.width;
        const newScaleY = newCanvasRect.height / canvas.height;
        
        const newScreenX = newCanvasRect.left + (worldX * newScaleX);
        const newScreenY = newCanvasRect.top + (worldY * newScaleY);
        
        this.htmlQuestionContainer.style.left = newScreenX + 'px';
        this.htmlQuestionContainer.style.top = newScreenY + 'px';
        this.htmlQuestionContainer.style.width = Math.min(500, this.paperBg.displayWidth * 0.7 * newScaleX) + 'px';
        this.htmlQuestionContainer.style.maxHeight = Math.min(250, this.paperBg.displayHeight * 0.4 * newScaleY) + 'px';
      }
    };
    
    window.addEventListener('resize', updatePosition);
    
    // Store the resize handler for cleanup
    (this.htmlQuestionContainer as any).resizeHandler = updatePosition;
  }
  
  private disposeHtmlContainer(): void {
    if (this.htmlQuestionContainer) {
      // Remove resize event listener
      const resizeHandler = (this.htmlQuestionContainer as any).resizeHandler;
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      
      // Remove from DOM
      if (this.htmlQuestionContainer.parentNode) {
        this.htmlQuestionContainer.parentNode.removeChild(this.htmlQuestionContainer);
      }
      
      this.htmlQuestionContainer = null;
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
      //console.log('QuizScene: Preparing to return to GameScene...');

      // Clean up HTML container before transitioning
      this.disposeHtmlContainer();

      // Prepare data for GameScene
      const gameData = {
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
      };

      // Resume GameScene with data
      this.scene.resume('GameScene', gameData);

      // Stop this scene (this will trigger shutdown/cleanup)
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

  /**
   * Clean up existing UI elements before creating new ones
   * This prevents event handler conflicts and ensures clean state
   */
  private cleanupUIElements(): void {
    // Clean up existing option buttons
    this.optionButtons.forEach(button => {
      if (button && button.scene) {
        button.removeAllListeners();
        button.destroy();
      }
    });
    this.optionButtons = [];

    // Clean up existing option texts
    this.optionTexts.forEach(text => {
      if (text && text.scene) {
        text.destroy();
      }
    });
    this.optionTexts = [];

    // Clean up other UI elements that might exist from previous questions
    if (this.submitButton && this.submitButton.scene) {
      this.submitButton.removeAllListeners();
      this.submitButton.destroy();
      this.submitButton = null as any;
    }

    if (this.submitButtonText && this.submitButtonText.scene) {
      this.submitButtonText.destroy();
      this.submitButtonText = null as any;
    }

    if (this.questionText && this.questionText.scene) {
      this.questionText.destroy();
      this.questionText = null as any;
    }

    if (this.fishNameText && this.fishNameText.scene) {
      this.fishNameText.destroy();
      this.fishNameText = null as any;
    }

    if (this.fishSprite && this.fishSprite.scene) {
      this.fishSprite.destroy();
      this.fishSprite = null as any;
    }
  }

  /**
   * Comprehensive cleanup of all quiz scene resources
   * Called when scene is destroyed or needs to be reset
   */
  private cleanup(): void {
    //console.log('QuizScene: Starting cleanup...');

    // Stop and remove timer
    if (this.timerEvent) {
      this.timerEvent.remove();
      this.timerEvent = null as any;
    }

    // Clean up choice images
    this.cleanupChoiceImages();

    // Destroy all UI elements
    if (this.questionText) {
      this.questionText.destroy();
      this.questionText = null as any;
    }

    if (this.fishSprite) {
      this.fishSprite.destroy();
      this.fishSprite = null as any;
    }

    if (this.fishNameText) {
      this.fishNameText.destroy();
      this.fishNameText = null as any;
    }

    if (this.timerText) {
      this.timerText.destroy();
      this.timerText = null as any;
    }

    if (this.paperBg) {
      this.paperBg.destroy();
      this.paperBg = null as any;
    }

    if (this.submitButton) {
      this.submitButton.destroy();
      this.submitButton = null as any;
    }

    if (this.submitButtonText) {
      this.submitButtonText.destroy();
      this.submitButtonText = null as any;
    }

    // Clean up option buttons and texts
    this.optionButtons.forEach(button => {
      if (button && button.scene) {
        button.destroy();
      }
    });
    this.optionButtons = [];

    this.optionTexts.forEach(text => {
      if (text && text.scene) {
        text.destroy();
      }
    });
    this.optionTexts = [];

    // Clear data structures
    this.selectedAnswers.clear();
    this.correctAnswerKeys = [];
    this.questions = [];

    // Clean up dynamically created textures
    this.cleanupDynamicTextures();
    // Clean up HTML container before transitioning
    this.disposeHtmlContainer();

    //console.log('QuizScene: Cleanup completed');
  }

  /**
   * Clean up dynamically created textures to prevent memory leaks
   */
  private cleanupDynamicTextures(): void {
    const texturesToRemove: string[] = [];

    // Find dynamically created textures by checking texture manager keys
    const textureKeys = Object.keys(this.textures.list);
    textureKeys.forEach((key: string) => {
      if (key.startsWith('choice-') || key === 'question-image' || key === 'paper-bg') {
        texturesToRemove.push(key);
      }
    });

    // Remove them
    texturesToRemove.forEach((key: string) => {
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }
    });

    //console.log(`QuizScene: Removed ${texturesToRemove.length} dynamic textures`);
  }

  /**
   * Reset the scene state for fresh quiz session
   */
  private resetScene(): void {
    //console.log('QuizScene: Resetting scene state...');

    // Reset timer
    this.timeRemaining = 15;

    // Reset data
    this.selectedAnswers.clear();
    this.correctAnswerKeys = [];
    this.questions = [];
    this.currentQuestion = null as any;
    this.completionData = null;

    //console.log('QuizScene: Scene state reset completed');
  }

  /**
   * Phaser lifecycle method - called when scene is shutdown
   * This is the proper cleanup point for Phaser scenes
   */
  shutdown(): void {
    //console.log('QuizScene: Shutdown called');
    // Ensure HTML container is disposed before cleanup
    this.disposeHtmlContainer();
    this.cleanup();
  }
}
