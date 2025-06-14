import { FishType } from '../const/fishType';

// Interface for storing fish with their quiz data
export interface FishQuizData {
    fishType: FishType;
    question: string;
    choices: { key: string; text: string }[];
    correctAnswer: string;
    userAnswer?: string;
    isCorrect: boolean;
    timeBonus: number;
}

export class FishQuizModal {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container | null = null;
    private overlay: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Show the quiz review modal
     * @param quizData The quiz data to display
     */
    public show(quizData: FishQuizData): void {
        // Remove existing modal if any
        this.close();

        // Get camera properties for proper positioning
        const camera = this.scene.cameras.main;

        // Create overlay that blocks all interaction with background elements - following MenuScene pattern
        this.overlay = this.scene.add.graphics();
        this.overlay.fillStyle(0x000000, 0.95);
        this.overlay.fillRect(0, 0, camera.width, camera.height);
        this.overlay.setDepth(50000);
        // Make overlay interactive to block all clicks behind modal
        this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, camera.width, camera.height), Phaser.Geom.Rectangle.Contains);

        // Create modal container at screen center - following MenuScene pattern
        this.container = this.scene.add.container(
            camera.width / 2,
            camera.height / 2
        );
        this.container.setDepth(50001);

        // Create larger modal background
        const modalBg = this.scene.add.rectangle(0, 0, 800, 700, 0xf0f0f0, 1.0);
        modalBg.setStrokeStyle(4, 0x333333);
        modalBg.setDepth(50002); // Ensure modal background is above overlay

        // Fish name title (larger)
        const fishName = this.formatFishName(quizData.fishType);
        const titleText = this.scene.add.text(0, -300, fishName, {
            fontSize: '36px',
            color: '#333333',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(50003);

        // Question text (larger)
        const questionText = this.scene.add.text(0, -220, 'Question:', {
            fontSize: '28px',
            color: '#333333',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(50003);

        // Parse and display question content with HTML support
        const questionContent = this.parseQuestionContent(quizData.question);
        const questionContentText = this.scene.add.text(0, -160, questionContent, {
            fontSize: '20px',
            color: '#333333',
            align: 'center',
            wordWrap: { width: 750 },
            lineSpacing: 5
        }).setOrigin(0.5).setDepth(50003);

        // Choices header (larger)
        const choicesText = this.scene.add.text(0, -60, 'Answer Choices:', {
            fontSize: '24px',
            color: '#333333',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(50003);

        // Create choice displays with proper formatting
        const choiceElements = this.createChoiceElements(quizData, -10);

        // Result and time bonus (larger)
        const resultText = quizData.isCorrect ? 'Correct!' : 'Incorrect';
        const resultColor = quizData.isCorrect ? '#00aa00' : '#aa0000';
        const bonusText = quizData.timeBonus > 0 ? ` (Time bonus: ${quizData.timeBonus}s)` : '';

        const resultDisplay = this.scene.add.text(0, 200, `${resultText}${bonusText}`, {
            fontSize: '24px',
            color: resultColor,
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(50003);

        // Larger close button
        const closeButton = this.scene.add.rectangle(0, 270, 160, 50, 0xe74c3c);
        closeButton.setStrokeStyle(3, 0xffffff);
        closeButton.setInteractive({ useHandCursor: true });
        closeButton.setDepth(50003);

        const closeButtonText = this.scene.add.text(0, 270, 'Close', {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(50004);

        // Close button interactions
        closeButton.on('pointerover', () => {
            closeButton.setFillStyle(0xc0392b);
        });

        closeButton.on('pointerout', () => {
            closeButton.setFillStyle(0xe74c3c);
        });

        closeButton.on('pointerdown', () => {
            this.close();
        });

        // Add all elements to modal container (following MenuScene pattern)
        const allElements = [
            modalBg, titleText, questionText, questionContentText,
            choicesText, ...choiceElements, resultDisplay, closeButton, closeButtonText
        ];

        this.container.add(allElements);

        // IMPORTANT: Make modal elements visible ONLY to UI camera (ignore main camera)
        // This prevents the zoomed duplicate from appearing - following WINDSURF_RULES.md
        this.scene.cameras.main.ignore([this.overlay, this.container]);
        this.scene.cameras.main.ignore([
            modalBg, titleText, questionText, questionContentText,
            choicesText, ...choiceElements, resultDisplay, closeButton, closeButtonText
        ]);

        // Scale animation
        this.container.setScale(0);
        this.scene.tweens.add({
            targets: this.container,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });


    }

    /**
     * Close the modal - following MenuScene cleanup pattern
     */
    public close(): void {
        if (this.overlay) {
            this.overlay.destroy();
            this.overlay = null;
        }
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }

    /**
     * Parse question content and strip HTML properly
     * @param questionHtml The HTML question content
     * @returns Clean text content
     */
    private parseQuestionContent(questionHtml: string): string {
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(questionHtml, 'text/html');

        // Function to check if an element has display:none
        const hasDisplayNone = (element: Element): boolean => {
            if (element.getAttribute('style')?.includes('display:none') ||
                element.getAttribute('style')?.includes('display: none')) {
                return true;
            }
            return element.parentElement ? hasDisplayNone(element.parentElement) : false;
        };

        // Process nodes and filter out display:none elements
        const processNode = (node: Node): string => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent || '';
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;

                // Skip image tags and hidden elements
                if (element.tagName.toLowerCase() === 'img' || hasDisplayNone(element)) {
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
        let textContent = '';
        Array.from(htmlDoc.body.childNodes).forEach(node => {
            textContent += processNode(node);
        });

        return textContent.trim();
    }

    /**
     * Create choice elements with proper styling and indicators
     * @param quizData The quiz data
     * @param startY Starting Y position for choices
     * @returns Array of choice display elements
     */
    private createChoiceElements(quizData: FishQuizData, startY: number): Phaser.GameObjects.GameObject[] {
        const elements: Phaser.GameObjects.GameObject[] = [];
        const choiceSpacing = 35;

        quizData.choices.forEach((choice, index) => {
            const yPos = startY + (index * choiceSpacing);
            const isCorrect = choice.key === quizData.correctAnswer;
            const wasUserChoice = choice.key === quizData.userAnswer;

            // Create choice background
            let bgColor = 0xffffff;
            let borderColor = 0xcccccc;

            if (isCorrect && wasUserChoice) {
                bgColor = 0xe8f5e8; // Light green for correct user choice
                borderColor = 0x00aa00;
            } else if (isCorrect) {
                bgColor = 0xf0f8f0; // Very light green for correct answer
                borderColor = 0x00aa00;
            } else if (wasUserChoice) {
                bgColor = 0xfff0f0; // Light red for wrong user choice
                borderColor = 0xaa0000;
            }

            const choiceBg = this.scene.add.rectangle(0, yPos, 700, 30, bgColor);
            choiceBg.setStrokeStyle(2, borderColor);
            choiceBg.setDepth(50002);

            // Create choice text with indicator
            let indicator = '';
            if (isCorrect && wasUserChoice) {
                indicator = '✓ '; // Correct and user's choice
            } else if (isCorrect) {
                indicator = '✓ '; // Correct answer
            } else if (wasUserChoice) {
                indicator = '✗ '; // User's wrong choice
            }

            // Strip HTML from choice text
            const cleanChoiceText = this.parseQuestionContent(choice.text);
            const choiceText = this.scene.add.text(0, yPos, `${choice.key}. ${indicator}${cleanChoiceText}`, {
                fontSize: '18px',
                color: '#333333',
                wordWrap: { width: 650 },
                align: 'center'
            }).setOrigin(0.5, 0.5).setDepth(50003);

            elements.push(choiceBg, choiceText);
        });

        return elements;
    }

    /**
     * Format fish name for display
     * @param fishType The fish type
     * @returns Formatted fish name
     */
    private formatFishName(fishType: FishType): string {
        return fishType
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Check if the modal is currently open
     * @returns True if modal is open
     */
    public isOpen(): boolean {
        return this.container !== null;
    }
} 