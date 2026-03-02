import { GameState } from '../types/gameState';
import { CompletionData, fetchCompletionData } from '../datas/completion';
import { FishType, fishSizes, FishVariantType, fishVariants } from '../const/fishType';
import { FishFactory, FishState, FishSizeCategory } from '../factories/fishFactory';
import { CursorManager } from '../managers/cursorManager';
// @ts-ignore
import gameSdk, { replaceURL } from '../service/apiService.js';

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
  private currentQuestionIndex: number = 0; // Track current question index
  private questionText!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private optionButtons: Phaser.GameObjects.Rectangle[] = [];
  private choiceImages: Phaser.GameObjects.Image[] = []; // Store choice images for cleanup
  private timerText!: Phaser.GameObjects.Text;
  private timerEvent!: Phaser.Time.TimerEvent;
  private timeRemaining: number = 0; // Will be set by getQuizTimeRemaining()
  private readonly DEFAULT_TIME_REMAINING: number = 35; // Default time in seconds
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
  private htmlAnswersContainer: HTMLDivElement | null = null; // HTML container for answer choices
  private handleWindowResize: (() => void) | null = null; // Window resize handler
  private htmlCursor: HTMLImageElement | null = null; // HTML cursor overlay
  private mouseMoveHandler: ((event: MouseEvent) => void) | null = null; // Mouse move handler

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

    // Initialize timer from centralized method
    this.timeRemaining = this.getQuizTimeRemaining();
  }

  create(): void {
    //console.log('QuizScene: Creating scene...');

    // Ensure clean state before creating new elements
    this.resetScene();
    
    // Clean up any existing HTML containers and cursor
    this.disposeHtmlContainer();
    this.disposeHtmlCursor();

    // Create quiz questions
    this.createQuizQuestions();

    // Load saved question index from localStorage
    const savedIndex = localStorage.getItem('fishQuizQuestionIndex');
    if (savedIndex !== null) {
      this.currentQuestionIndex = parseInt(savedIndex, 10);
      // Reset to 0 if we've gone through all questions
      if (this.currentQuestionIndex >= this.questions.length) {
        this.currentQuestionIndex = 0;
        localStorage.setItem('fishQuizQuestionIndex', '0');
      }
    }

    console.log(`Loading question ${this.currentQuestionIndex + 1} of ${this.questions.length}`);

    // Select the current question based on index
    this.currentQuestion = this.questions[this.currentQuestionIndex];

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
    const fishSprite = FishFactory.createFish(this, this.cameras.main.width / 2, 288, this.currentFish);
    fishSprite.setScale(0.5);
    this.fishSprite = fishSprite;

    // Create HTML cursor overlay for proper display over HTML elements
    this.createHtmlCursor();

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

    // PHASER ANSWER BUTTONS HIDDEN - Only HTML answers are shown
    // The following code creates Phaser answer buttons but they are commented out
    // to only show HTML-based answer options
    
    /*
    // Add options - position them in a 2x2 grid in the lower part of the paper
    const firstButtonY = this.cameras.main.height * 0.55 + 160; // Move down by additional 20px
    const gridSpacingX = 280; // Increased horizontal spacing between buttons (from 220 to 280)
    const gridSpacingY = 160; // Increased vertical spacing between buttons (from 100 to 160)

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
    */
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

  // DISABLED - This method is no longer used since we only use HTML submission
  // private submitAnswer(): void {
  //   if (this.selectedAnswers.size === 0) return;

  //   // Stop the timer
  //   this.timerEvent.remove();

  //   // Calculate time spent on this question (in seconds)
  //   const timeSpentMs = Date.now() - this.questionStartTime;
  //   const timeSpentSeconds = Math.round(timeSpentMs / 1000);

  //   // Check if the answer is correct based on question type
  //   let isCorrect = false;
  //   const selectedArray = Array.from(this.selectedAnswers).sort();
  //   const correctArray = this.correctAnswerKeys.sort();

  //   if (this.currentQuestion.questionType === 'MC') {
  //     // For single choice, user must select exactly one correct answer
  //     isCorrect = selectedArray.length === 1 && correctArray.includes(selectedArray[0]);
  //   } else {
  //     // For multiple selection, user must select all correct answers and no incorrect ones
  //     isCorrect = selectedArray.length === correctArray.length &&
  //       selectedArray.every(key => correctArray.includes(key));
  //   }

  //   // Calculate time bonus - how much time is left
  //   const timeBonus = this.timeRemaining;

  //   // Create user answer string for display
  //   const userAnswer = selectedArray.join(','); // Use comma without space for API

  //   // Call API to save question attempt before showing results
  //   this.saveQuestionAttempt(timeSpentSeconds, userAnswer, isCorrect, timeBonus);
  // }

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
    
    // Create HTML answers container for rich answer content
    this.createHtmlAnswersContainer();
  }
  
  private createHtmlContainer(): void {
    // Remove any existing HTML container
    this.disposeHtmlContainer();
    
    // Create HTML container
    this.htmlQuestionContainer = document.createElement('div');
    
    // Process question content through replaceURL function
    const processedQuestionContent = replaceURL(this.currentQuestion.question);
    
    // Create a wrapper for dynamic content sizing
    const contentWrapper = document.createElement('div');
    contentWrapper.innerHTML = processedQuestionContent;
    this.htmlQuestionContainer.appendChild(contentWrapper);
    
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
    const screenY = canvasRect.top + (worldY * scaleY) + 100;
    
    // Style the HTML container to blend seamlessly with canvas
    this.htmlQuestionContainer.style.position = 'fixed';
    this.htmlQuestionContainer.style.left = screenX + 'px';
    this.htmlQuestionContainer.style.top = screenY + 'px';
    this.htmlQuestionContainer.style.transform = 'translate(-50%, -50%)';
    this.htmlQuestionContainer.style.width = '500px';
    this.htmlQuestionContainer.style.height = '350px'; // Fixed height
    this.htmlQuestionContainer.style.overflow = 'hidden'; // No scrolling
    this.htmlQuestionContainer.style.zIndex = '1000';
    this.htmlQuestionContainer.style.backgroundColor = 'transparent';
    this.htmlQuestionContainer.style.padding = '15px';
    this.htmlQuestionContainer.style.borderRadius = '0px';
    this.htmlQuestionContainer.style.boxShadow = 'none';
    this.htmlQuestionContainer.style.fontSize = '16px';
    this.htmlQuestionContainer.style.lineHeight = '1.5';
    this.htmlQuestionContainer.style.color = '#000000';
    this.htmlQuestionContainer.style.textAlign = 'left';
    this.htmlQuestionContainer.style.fontFamily = 'Arial, sans-serif';
    this.htmlQuestionContainer.style.border = 'none';
    this.htmlQuestionContainer.style.boxSizing = 'border-box';
    this.htmlQuestionContainer.style.display = 'flex';
    this.htmlQuestionContainer.style.flexDirection = 'column';
    this.htmlQuestionContainer.style.justifyContent = 'center';
    
    // Process content to fit without scrolling and add hover functionality
    this.processQuestionContentNoScroll();
    
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
        this.htmlQuestionContainer.style.maxHeight = Math.min(400, this.paperBg.displayHeight * 0.4 * newScaleY) + 'px';
      }
    };
    
    window.addEventListener('resize', updatePosition);
    
    // Store the resize handler for cleanup
    this.handleWindowResize = updatePosition;
  }
  
  /**
   * Process question content to fit in no-scroll container with image hover functionality
   */
  private processQuestionContentNoScroll(): void {
    if (!this.htmlQuestionContainer) return;
    
    // Get all images in the container and make them small with hover functionality
    const images = this.htmlQuestionContainer.querySelectorAll('img');
    images.forEach(img => {
      const imageElement = img as HTMLImageElement;
      
      // Make images small to fit in container
      imageElement.style.maxWidth = '150px';
      imageElement.style.maxHeight = '100px';
      imageElement.style.width = 'auto';
      imageElement.style.height = 'auto';
      imageElement.style.cursor = 'none';
      imageElement.style.display = 'block';
      imageElement.style.margin = '5px auto';
      imageElement.style.borderRadius = '5px';
      imageElement.style.transition = 'transform 0.2s ease';
      
      // Store original source for hover preview
      const originalSrc = imageElement.src;
      
      // Add hover functionality for full-size preview
      imageElement.addEventListener('mouseenter', () => {
        // Create hover preview overlay
        const hoverOverlay = document.createElement('div');
        hoverOverlay.style.position = 'fixed';
        hoverOverlay.style.top = '0';
        hoverOverlay.style.left = '0';
        hoverOverlay.style.width = '100vw';
        hoverOverlay.style.height = '100vh';
        hoverOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        hoverOverlay.style.zIndex = '2000';
        hoverOverlay.style.display = 'flex';
        hoverOverlay.style.justifyContent = 'center';
        hoverOverlay.style.alignItems = 'center';
        hoverOverlay.style.cursor = 'none';
        
        // Create full-size image
        const fullImage = document.createElement('img');
        fullImage.src = originalSrc;
        fullImage.style.maxWidth = '90vw';
        fullImage.style.maxHeight = '90vh';
        fullImage.style.objectFit = 'contain';
        fullImage.style.borderRadius = '8px';
        fullImage.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
        
        hoverOverlay.appendChild(fullImage);
        document.body.appendChild(hoverOverlay);
        
        // Store reference for cleanup
        (imageElement as any).hoverOverlay = hoverOverlay;
        
        // Remove overlay on click
        const removeOverlay = () => {
          if (hoverOverlay.parentNode) {
            document.body.removeChild(hoverOverlay);
          }
          (imageElement as any).hoverOverlay = null;
        };
        
        hoverOverlay.addEventListener('click', removeOverlay);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          if ((imageElement as any).hoverOverlay === hoverOverlay) {
            removeOverlay();
          }
        }, 3000);
      });
      
      imageElement.addEventListener('mouseleave', () => {
        // Small delay before removing overlay to prevent flicker
        setTimeout(() => {
          const overlay = (imageElement as any).hoverOverlay;
          if (overlay && overlay.parentNode) {
            document.body.removeChild(overlay);
            (imageElement as any).hoverOverlay = null;
          }
        }, 100);
      });
    });
    
    // Handle MathML elements if present
    const mathElements = this.htmlQuestionContainer.querySelectorAll('math');
    mathElements.forEach(math => {
      (math as HTMLElement).style.display = 'block';
      (math as HTMLElement).style.margin = '5px auto';
      (math as HTMLElement).style.textAlign = 'center';
      (math as HTMLElement).style.fontSize = '14px';
    });
    
    // Adjust font size based on content length to ensure it fits
    const textContent = this.htmlQuestionContainer.textContent || '';
    const contentLength = textContent.length;
    
    if (contentLength > 600) {
      this.htmlQuestionContainer.style.fontSize = '12px';
      this.htmlQuestionContainer.style.lineHeight = '1.3';
    } else if (contentLength > 400) {
      this.htmlQuestionContainer.style.fontSize = '14px';
      this.htmlQuestionContainer.style.lineHeight = '1.4';
    } else {
      this.htmlQuestionContainer.style.fontSize = '16px';
      this.htmlQuestionContainer.style.lineHeight = '1.5';
    }
  }

  /**
   * Create HTML cursor that displays above HTML overlays
   */
  private createHtmlCursor(): void {
    // Remove any existing cursor
    this.disposeHtmlCursor();

    // Global cleanup: Remove ALL cursor overlays from DOM to prevent duplicates
    this.removeAllCursorOverlays();

    // Destroy Phaser cursor to avoid having 2 cursors
    CursorManager.destroy();

    // Hide browser cursor globally
    document.body.style.cursor = 'none';

    // Create HTML cursor image
    this.htmlCursor = document.createElement('img');
    this.htmlCursor.src = 'assets/ui/control_ui/pointer_0001.png';
    this.htmlCursor.style.position = 'fixed';
    this.htmlCursor.style.pointerEvents = 'none';
    this.htmlCursor.style.zIndex = '10000'; // Higher than all overlays
    this.htmlCursor.style.width = '16px';
    this.htmlCursor.style.height = '16px';
    this.htmlCursor.style.transform = 'scale(3)';
    this.htmlCursor.style.transformOrigin = 'top left';
    document.body.appendChild(this.htmlCursor);

    // Setup global mouse tracking
    const canvas = this.game.canvas;
    this.mouseMoveHandler = (event: MouseEvent) => {
      if (this.scene.isActive()) {
        // Update HTML cursor position
        if (this.htmlCursor) {
          this.htmlCursor.style.left = event.clientX + 'px';
          this.htmlCursor.style.top = event.clientY + 'px';
        }

        // Update Phaser cursor
        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = this.cameras.main.width / canvasRect.width;
        const scaleY = this.cameras.main.height / canvasRect.height;
        const gameX = (event.clientX - canvasRect.left) * scaleX;
        const gameY = (event.clientY - canvasRect.top) * scaleY;
        CursorManager.updatePosition(gameX, gameY);
      }
    };
    document.addEventListener('mousemove', this.mouseMoveHandler);
  }

  /**
   * Dispose of HTML cursor
   */
  private disposeHtmlCursor(): void {
    if (this.htmlCursor && this.htmlCursor.parentNode) {
      this.htmlCursor.parentNode.removeChild(this.htmlCursor);
      this.htmlCursor = null;
    }

    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = null;
    }

    // Global cleanup: Remove any orphaned cursor overlays
    this.removeAllCursorOverlays();

    // Restore browser cursor
    document.body.style.cursor = 'auto';
  }

  /**
   * Remove all cursor overlay images from DOM
   * This ensures no duplicate cursors remain from previous scenes
   */
  private removeAllCursorOverlays(): void {
    const allImages = document.querySelectorAll('img');
    allImages.forEach(img => {
      // Check if this is a cursor overlay by matching the src
      if (img.src && img.src.includes('pointer_0001.png')) {
        if (img.parentNode) {
          img.parentNode.removeChild(img);
        }
      }
    });
  }

  /**
   * Dispose of HTML container and remove from DOM
   */
  private disposeHtmlContainer(): void {
    if (this.htmlQuestionContainer) {
      // Clean up any hover overlays
      const images = this.htmlQuestionContainer.querySelectorAll('img');
      images.forEach(img => {
        const overlay = (img as any).hoverOverlay;
        if (overlay && overlay.parentNode) {
          document.body.removeChild(overlay);
        }
      });
      
      // Remove window resize event listener
      if (this.handleWindowResize) {
        window.removeEventListener('resize', this.handleWindowResize);
      }
      
      // Remove container from DOM
      if (this.htmlQuestionContainer.parentNode) {
        this.htmlQuestionContainer.parentNode.removeChild(this.htmlQuestionContainer);
      }
      this.htmlQuestionContainer = null;
    }
  }

  /**
   * Dispose of HTML answers container and remove from DOM
   */
  private disposeHtmlAnswersContainer(): void {
    if (this.htmlAnswersContainer) {
      document.body.removeChild(this.htmlAnswersContainer);
      this.htmlAnswersContainer = null;
    }
  }

  /**
   * Highlight correct and incorrect answers in the HTML container
   * @param isCorrect Whether the user's answer was correct
   */
  private highlightHtmlAnswers(isCorrect: boolean): void {
    if (!this.htmlAnswersContainer) return;
    
    // Disable all option containers to prevent further interaction
    const optionContainers = this.htmlAnswersContainer.querySelectorAll('div[data-choice-key]');
    optionContainers.forEach(container => {
      (container as HTMLElement).style.pointerEvents = 'none';
    });
    
    // Hide the submit button
    const submitButton = this.htmlAnswersContainer.querySelector('button');
    if (submitButton) {
      (submitButton.parentNode as HTMLElement).style.display = 'none';
    }
    
    // Highlight correct answers in green
    this.correctAnswerKeys.forEach(correctKey => {
      const correctContainer = this.htmlAnswersContainer?.querySelector(`div[data-choice-key="${correctKey}"]`);
      if (correctContainer) {
        (correctContainer as HTMLElement).style.backgroundColor = '#4caf50'; // Green
        (correctContainer as HTMLElement).style.borderColor = '#2e7d32'; // Dark green
        (correctContainer as HTMLElement).style.color = 'white';
        (correctContainer as HTMLElement).style.fontWeight = 'bold';
      }
    });
    
    // Highlight incorrect selections in red
    this.selectedAnswers.forEach(selectedKey => {
      if (!this.correctAnswerKeys.includes(selectedKey)) {
        const incorrectContainer = this.htmlAnswersContainer?.querySelector(`div[data-choice-key="${selectedKey}"]`);
        if (incorrectContainer) {
          (incorrectContainer as HTMLElement).style.backgroundColor = '#f44336'; // Red
          (incorrectContainer as HTMLElement).style.borderColor = '#c62828'; // Dark red
          (incorrectContainer as HTMLElement).style.color = 'white';
        }
      }
    });
    
    // Add a result message at the bottom of the container
    const resultMessage = document.createElement('div');
    resultMessage.style.position = 'absolute';
    resultMessage.style.bottom = '10%';
    resultMessage.style.left = '50%';
    resultMessage.style.transform = 'translateX(-50%)';
    resultMessage.style.padding = '15px 30px';
    resultMessage.style.borderRadius = '8px';
    resultMessage.style.fontWeight = 'bold';
    resultMessage.style.fontSize = '24px';
    resultMessage.style.zIndex = '1002';
    
    if (isCorrect) {
      resultMessage.textContent = 'CORRECT! You caught the fish!';
      resultMessage.style.backgroundColor = '#4caf50'; // Green
      resultMessage.style.color = 'white';
    } else {
      resultMessage.textContent = 'WRONG! The fish got away!';
      resultMessage.style.backgroundColor = '#f44336'; // Red
      resultMessage.style.color = 'white';
    }
    
    document.body.appendChild(resultMessage);
    
    // Remove the result message when the answers are disposed
    this.time.delayedCall(1900, () => {
      if (resultMessage.parentNode) {
        document.body.removeChild(resultMessage);
      }
    });
  }

  /**
   * Create HTML container for answer choices in 2x2 grid layout
   */
  private createHtmlAnswersContainer(): void {
    // Remove any existing HTML answers container
    this.disposeHtmlAnswersContainer();
    
    // Create HTML answers container
    this.htmlAnswersContainer = document.createElement('div');
    
    // Calculate position based on canvas and paper background
    const canvas = this.game.canvas as HTMLCanvasElement;
    const canvasRect = canvas.getBoundingClientRect();
    
    // Get the actual canvas scale factors
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;
    
    // Style the HTML answers container as invisible overlay
    this.htmlAnswersContainer.style.position = 'fixed';
    this.htmlAnswersContainer.style.left = '0px';
    this.htmlAnswersContainer.style.top = '0px';
    this.htmlAnswersContainer.style.width = '100%';
    this.htmlAnswersContainer.style.height = '100%';
    this.htmlAnswersContainer.style.zIndex = '1001'; // Above question container
    this.htmlAnswersContainer.style.pointerEvents = 'none'; // Allow clicks to pass through except on answer buttons
    
    // Calculate grid positions matching the game's 2x2 layout
    const firstButtonY = this.paperBg.y + (this.paperBg.displayHeight * 0.15); // Added 200px to Y position
    const gridSpacingX = 280; // Increased horizontal spacing between buttons (from 220 to 280)
    const gridSpacingY = 150; // Increased vertical spacing between buttons (from 100 to 160)
    
    // Create answer options in 2x2 grid
    this.currentQuestion.choices.forEach((choice, index) => {
      // Process choice text through replaceURL function
      const processedChoiceText = replaceURL(choice.text);
      
      // Calculate position in 2x2 grid (matching original Phaser layout)
      const row = Math.floor(index / 2); // 0 for first row, 1 for second row
      const col = index % 2; // 0 for left column, 1 for right column
      
      // Calculate button position
      const buttonX = (this.cameras.main.width / 2) + ((col === 0) ? -gridSpacingX : gridSpacingX);
      const buttonY = firstButtonY + (row * gridSpacingY);
      
      // Convert world coordinates to screen coordinates
      const screenX = canvasRect.left + (buttonX * scaleX);
      const screenY = canvasRect.top + (buttonY * scaleY);
      
      // Create answer option container
      const optionContainer = document.createElement('div');
      optionContainer.setAttribute('data-choice-key', choice.key); // Add data attribute for highlighting
      optionContainer.style.position = 'absolute';
      optionContainer.style.left = screenX + 'px';
      optionContainer.style.top = screenY + 'px';
      optionContainer.style.transform = 'translate(-50%, -50%)';
      optionContainer.style.width = '350px';
      optionContainer.style.minHeight = '90px';
      optionContainer.style.maxHeight = '200px';
      optionContainer.style.overflow = 'auto';
      optionContainer.style.padding = '15px'; // Increased padding from 15px to 20px
      optionContainer.style.margin = '10px'; // Added margin to prevent stacking
      optionContainer.style.border = '2px solid #90caf9';
      optionContainer.style.borderRadius = '8px';
      optionContainer.style.cursor = 'none';
      optionContainer.style.transition = 'all 0.3s ease';
      optionContainer.style.backgroundColor = '#f5f5f5';
      optionContainer.style.pointerEvents = 'auto'; // Enable clicks on this element
      optionContainer.style.fontSize = '16px';
      optionContainer.style.lineHeight = '1.4';
      optionContainer.style.color = '#000000';
      optionContainer.style.fontFamily = 'Arial, sans-serif';
      optionContainer.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
      optionContainer.dataset.choiceKey = choice.key;
      optionContainer.dataset.choiceIndex = index.toString();
      
      // Add hover effects
      optionContainer.addEventListener('mouseenter', () => {
        if (!this.selectedAnswers.has(choice.key)) {
          optionContainer.style.backgroundColor = '#e3f2fd';
          optionContainer.style.borderColor = '#2196f3';
          optionContainer.style.transform = 'translate(-50%, -50%) scale(1.02)';
        }
      });
      
      optionContainer.addEventListener('mouseleave', () => {
        if (!this.selectedAnswers.has(choice.key)) {
          optionContainer.style.backgroundColor = '#f5f5f5';
          optionContainer.style.borderColor = '#90caf9';
          optionContainer.style.transform = 'translate(-50%, -50%) scale(1)';
        }
      });
      
      // Add click handler
      optionContainer.addEventListener('click', () => {
        this.toggleHtmlAnswer(choice.key, index, optionContainer);
      });
      
      // Create choice label
      const choiceLabel = document.createElement('div');
      choiceLabel.style.fontWeight = 'bold';
      choiceLabel.style.marginBottom = '8px';
      choiceLabel.style.color = '#333';
      choiceLabel.style.fontSize = '18px';
      choiceLabel.textContent = `${choice.key}.`;
      optionContainer.appendChild(choiceLabel);
      
      // Create choice content
      const choiceContent = document.createElement('div');
      choiceContent.innerHTML = processedChoiceText;
      
      // Style images in choice content
      const images = choiceContent.querySelectorAll('img');
      images.forEach(img => {
        (img as HTMLImageElement).style.maxWidth = '100%';
        (img as HTMLImageElement).style.height = 'auto';
        (img as HTMLImageElement).style.borderRadius = '4px';
        (img as HTMLImageElement).style.marginTop = '8px';
      });
      
      optionContainer.appendChild(choiceContent);
      this.htmlAnswersContainer!.appendChild(optionContainer);
    });
    
    // Create submit button positioned below the grid
    const submitButtonContainer = document.createElement('div');
    const submitButtonY = firstButtonY + (Math.ceil(this.currentQuestion.choices.length / 2) * gridSpacingY) + 50;
    const submitScreenX = canvasRect.left + (this.cameras.main.width / 2 * scaleX);
    const submitScreenY = canvasRect.top + (submitButtonY * scaleY);
    
    submitButtonContainer.style.position = 'absolute';
    submitButtonContainer.style.left = submitScreenX + 'px';
    submitButtonContainer.style.top = submitScreenY - 50 + 'px';
    submitButtonContainer.style.transform = 'translate(-50%, -50%)';
    submitButtonContainer.style.pointerEvents = 'auto';
    
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit Answer';
    submitButton.style.padding = '12px 30px';
    submitButton.style.fontSize = '18px';
    submitButton.style.fontWeight = 'bold';
    submitButton.style.backgroundColor = '#4caf50';
    submitButton.style.color = 'white';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '6px';
    submitButton.style.cursor = 'none';
    submitButton.style.transition = 'background-color 0.3s ease';
    submitButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    submitButton.disabled = true;
    submitButton.style.opacity = '0.5';
    
    submitButton.addEventListener('click', () => {
      this.submitHtmlAnswer();
    });
    
    submitButtonContainer.appendChild(submitButton);
    this.htmlAnswersContainer.appendChild(submitButtonContainer);
    
    // Store reference to submit button for enabling/disabling
    (this.htmlAnswersContainer as any).submitButton = submitButton;
    
    // Add to DOM
    document.body.appendChild(this.htmlAnswersContainer);
    
    // Update submit button state
    this.updateHtmlSubmitButton();
  }

  /**
   * Toggle HTML answer selection
   */
  private toggleHtmlAnswer(selectedKey: string, selectedIndex: number, optionContainer: HTMLElement): void {
    // Handle different question types
    if (this.currentQuestion.questionType === 'MC') {
      // Single choice - clear all other selections
      this.selectedAnswers.clear();
      this.selectedAnswers.add(selectedKey);
      
      // Update all option containers visual state
      if (this.htmlAnswersContainer) {
        const allOptions = this.htmlAnswersContainer.querySelectorAll('[data-choice-key]');
        allOptions.forEach(option => {
          const element = option as HTMLElement;
          const key = element.dataset.choiceKey;
          if (key === selectedKey) {
            element.style.backgroundColor = '#c8e6c9';
            element.style.borderColor = '#4caf50';
          } else {
            element.style.backgroundColor = '#f9f9f9';
            element.style.borderColor = '#ddd';
          }
        });
      }
    } else {
      // Multiple selection - toggle this selection
      if (this.selectedAnswers.has(selectedKey)) {
        this.selectedAnswers.delete(selectedKey);
        optionContainer.style.backgroundColor = '#f9f9f9';
        optionContainer.style.borderColor = '#ddd';
      } else {
        this.selectedAnswers.add(selectedKey);
        optionContainer.style.backgroundColor = '#c8e6c9';
        optionContainer.style.borderColor = '#4caf50';
      }
    }
    
    // Update submit button state
    this.updateHtmlSubmitButton();
  }

  /**
   * Update HTML submit button state
   */
  private updateHtmlSubmitButton(): void {
    if (!this.htmlAnswersContainer) return;
    
    const submitButton = (this.htmlAnswersContainer as any).submitButton as HTMLButtonElement;
    if (!submitButton) return;
    
    let shouldEnable = false;
    
    if (this.currentQuestion.questionType === 'MC') {
      // For single choice, enable submit button when exactly one answer is selected
      shouldEnable = this.selectedAnswers.size === 1;
    } else {
      // For multiple selection, enable submit button when at least one answer is selected
      shouldEnable = this.selectedAnswers.size > 0;
    }
    
    submitButton.disabled = !shouldEnable;
    submitButton.style.opacity = shouldEnable ? '1' : '0.5';
    submitButton.style.backgroundColor = shouldEnable ? '#4caf50' : '#cccccc';
    submitButton.style.cursor = 'none';
  }

  /**
   * Submit HTML answer
   */
  private submitHtmlAnswer(): void {
    if (this.selectedAnswers.size === 0) return;
    
    // Disable HTML answer options
    if (this.htmlAnswersContainer) {
      const allOptions = this.htmlAnswersContainer.querySelectorAll('[data-choice-key]');
      allOptions.forEach(option => {
        const element = option as HTMLElement;
        element.style.pointerEvents = 'none';
        element.style.opacity = '0.7';
      });
      
      // Disable submit button
      const submitButton = (this.htmlAnswersContainer as any).submitButton as HTMLButtonElement;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.style.opacity = '0.5';
      }
    }
    
    // Calculate time spent and bonus
    const timeSpent = Math.floor((Date.now() - this.questionStartTime) / 1000);
    const timeBonus = Math.max(0, this.timeRemaining - timeSpent);
    
    // Check if answer is correct
    const selectedArray = Array.from(this.selectedAnswers).sort();
    const correctArray = this.correctAnswerKeys.sort();
    
    let isCorrect = false;
    if (this.currentQuestion.questionType === 'MC') {
      // For single choice, user must select exactly one correct answer
      isCorrect = selectedArray.length === 1 && correctArray.includes(selectedArray[0]);
    } else {
      // For multiple selection, user must select all correct answers and no incorrect ones
      isCorrect = selectedArray.length === correctArray.length && 
                  selectedArray.every(answer => correctArray.includes(answer));
    }
    
    // Stop timer
    if (this.timerEvent) {
      this.timerEvent.remove();
    }
    
    // Create submit answer string
    const submitAnswer = Array.from(this.selectedAnswers).sort().join(',');
    
    // Save question data to API
    const payload = {
      GameAttemptId: window.GAME_ATTEMPT_ID || '',
      questionId: this.currentQuestion.id || '',
      timespent: timeSpent,
      submittedAnswer: submitAnswer
    };
    
    gameSdk.postQuestiion(
      payload,
      (response: any) => {
        console.log('Question saved successfully:', response);
        this.showResult(isCorrect, timeBonus, submitAnswer);
      },
      () => {
        console.error('Failed to save question');
        // Show result even if API fails to prevent blocking the user
        this.showResult(isCorrect, timeBonus, submitAnswer);
      }
    );
  }

  private showResult(isCorrect: boolean, timeBonus: number = 0, userAnswer?: string): void {
    // Instead of disposing HTML answers, highlight correct/incorrect answers
    this.highlightHtmlAnswers(isCorrect);
    
    // Since Phaser buttons are now hidden/commented out, we don't need to disable them
    // The following code is kept for compatibility but won't execute since buttons don't exist
    this.optionButtons.forEach(button => {
      if (button && button.input) {
        button.disableInteractive();
      }
    });

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

    // Since Phaser answer buttons are hidden, we don't highlight them
    // The following code is kept for compatibility but won't execute since buttons don't exist
    this.correctAnswerKeys.forEach(correctKey => {
      const correctAnswerIndex = this.currentQuestion.choices.findIndex(
        choice => choice.key === correctKey
      );

      if (correctAnswerIndex >= 0 && correctAnswerIndex < this.optionButtons.length) {
        this.optionButtons[correctAnswerIndex].setFillStyle(0x00ff00); // Green for correct
      }
    });

    this.selectedAnswers.forEach(selectedKey => {
      if (!this.correctAnswerKeys.includes(selectedKey)) {
        const incorrectIndex = this.currentQuestion.choices.findIndex(
          choice => choice.key === selectedKey
        );

        if (incorrectIndex >= 0 && incorrectIndex < this.optionButtons.length) {
          this.optionButtons[incorrectIndex].setFillStyle(0xff0000); // Red for incorrect
        }
      }
    });

    // Show result text - position it more prominently
    const resultText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 55, // More visible position
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

    // Wait a moment before returning to game (save progress for next fish)
    this.time.delayedCall(2000, () => {
      //console.log('QuizScene: Preparing to return to GameScene...');

      // Clean up HTML containers before transitioning
      this.disposeHtmlAnswersContainer();
      this.disposeHtmlContainer();

      // Increment question index for next fish caught
      this.currentQuestionIndex++;
      
      // Save the current question index to localStorage for persistence
      localStorage.setItem('fishQuizQuestionIndex', this.currentQuestionIndex.toString());
      
      // Always return to GameScene after each question
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

  /**
   * Load the next question in sequence
   */
  private loadNextQuestion(): void {
    // Clean up current question UI
    this.cleanupUIElements();
    
    // Set the current question based on the updated index
    this.currentQuestion = this.questions[this.currentQuestionIndex];
    
    // Parse correct answers for the new question
    this.correctAnswerKeys = this.currentQuestion.correctAnswer.split(',').map(key => key.trim());
    
    // Reset selected answers for new question
    this.selectedAnswers.clear();
    
    // Reset timer for new question
    this.timeRemaining = this.getQuizTimeRemaining();
    this.questionStartTime = Date.now();
    
    // Create new UI for the question
    this.createQuizUI();
    
    // Display the new question content
    this.displayQuestionContent();
    
    // Start the timer for the new question
    this.startTimer();
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

    // Clean up HTML answers container
    this.disposeHtmlAnswersContainer();

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
  /**
   * Get the quiz time remaining value from completion data or use default
   * Centralizes the timer logic in one place
   */
  private getQuizTimeRemaining(): number {
    if (this.completionData && this.completionData.Timers && this.completionData.Timers.length > 0) {
      console.log(`QuizScene: Using timer from completion data: ${this.completionData.Timers[0]} seconds`);
      return this.completionData.Timers[0];
    } else {
      console.log(`QuizScene: Using default timer: ${this.DEFAULT_TIME_REMAINING} seconds`);
      return this.DEFAULT_TIME_REMAINING;
    }
  }

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
    // Clean up HTML containers and cursor before transitioning
    this.disposeHtmlContainer();
    this.disposeHtmlAnswersContainer();
    this.disposeHtmlCursor();

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

    // Reset timer using centralized method
    this.timeRemaining = this.getQuizTimeRemaining();

    // Reset data
    this.selectedAnswers.clear();
    this.correctAnswerKeys = [];
    this.questions = [];
    this.currentQuestion = null as any;
    // Don't reset currentQuestionIndex here to preserve progress
    this.completionData = null;

    //console.log('QuizScene: Scene state reset completed');
  }

  /**
   * Phaser lifecycle method - called when scene is shutdown
   * This is the proper cleanup point for Phaser scenes
   */
  shutdown(): void {
    //console.log('QuizScene: Shutdown called');
    // Ensure HTML container and cursor are disposed before cleanup
    this.disposeHtmlContainer();
    this.disposeHtmlCursor();
    this.cleanup();
  }
}
