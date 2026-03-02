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
    private htmlContainer: HTMLDivElement | null = null;
    private resizeHandler: (() => void) | null = null;

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

        // Create overlay that blocks all interaction with background elements
        this.overlay = this.scene.add.graphics();
        this.overlay.fillStyle(0x000000, 0.95);
        this.overlay.fillRect(0, 0, camera.width, camera.height);
        this.overlay.setDepth(50000);
        this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, camera.width, camera.height), Phaser.Geom.Rectangle.Contains);

        // Create modal container at screen center
        this.container = this.scene.add.container(
            camera.width / 2,
            camera.height / 2
        );
        this.container.setDepth(50001);

        // Create modal background
        const modalBg = this.scene.add.rectangle(0, 0, 800, 700, 0xf0f0f0, 1.0);
        modalBg.setStrokeStyle(4, 0x333333);
        modalBg.setDepth(50002);

        // Create HTML overlay for text content
        this.createHtmlOverlay(quizData);

        // Text content is now in HTML overlay

        // Close button (Phaser for interaction, HTML for text)
        const closeButton = this.scene.add.rectangle(0, 270, 160, 50, 0xe74c3c);
        closeButton.setStrokeStyle(3, 0xffffff);
        closeButton.setInteractive({ useHandCursor: true });
        closeButton.setDepth(50003);

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

        // Add elements to modal container
        this.container.add([modalBg, closeButton]);

        // Make modal elements visible ONLY to UI camera
        this.scene.cameras.main.ignore([this.overlay, this.container]);
        this.scene.cameras.main.ignore([modalBg, closeButton]);

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
     * Close the modal and cleanup HTML elements
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
        this.disposeHtmlOverlay();
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
     * Create HTML overlay for text content
     */
    private createHtmlOverlay(quizData: FishQuizData): void {
        this.disposeHtmlOverlay();

        const canvas = this.scene.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();

        // Create HTML container
        this.htmlContainer = document.createElement('div');
        this.htmlContainer.style.position = 'fixed';
        this.htmlContainer.style.left = canvasRect.left + 'px';
        this.htmlContainer.style.top = canvasRect.top + 'px';
        this.htmlContainer.style.width = canvasRect.width + 'px';
        this.htmlContainer.style.height = canvasRect.height + 'px';
        this.htmlContainer.style.pointerEvents = 'none';
        this.htmlContainer.style.zIndex = '9000'; // Below HTML cursor (10000)
        this.htmlContainer.style.display = 'flex';
        this.htmlContainer.style.flexDirection = 'column';
        this.htmlContainer.style.alignItems = 'center';
        this.htmlContainer.style.justifyContent = 'center';
        this.htmlContainer.style.overflow = 'hidden';

        // Create content container (centered modal)
        const contentDiv = document.createElement('div');
        contentDiv.style.width = '800px';
        contentDiv.style.maxWidth = '90%';
        contentDiv.style.height = '700px';
        contentDiv.style.maxHeight = '90%';
        contentDiv.style.padding = '20px';
        contentDiv.style.boxSizing = 'border-box';
        contentDiv.style.display = 'flex';
        contentDiv.style.flexDirection = 'column';
        contentDiv.style.alignItems = 'center';
        contentDiv.style.color = '#333333';
        contentDiv.style.fontFamily = 'Arial, sans-serif';
        contentDiv.style.cursor = 'none';

        // Fish name title
        const fishName = this.formatFishName(quizData.fishType);
        const titleDiv = document.createElement('div');
        titleDiv.textContent = fishName;
        titleDiv.style.fontSize = '36px';
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.marginBottom = '20px';
        titleDiv.style.textAlign = 'center';
        contentDiv.appendChild(titleDiv);

        // Question header
        const questionHeader = document.createElement('div');
        questionHeader.textContent = 'Question:';
        questionHeader.style.fontSize = '28px';
        questionHeader.style.fontWeight = 'bold';
        questionHeader.style.marginBottom = '10px';
        contentDiv.appendChild(questionHeader);

        // Question content
        const questionDiv = document.createElement('div');
        questionDiv.innerHTML = quizData.question;
        questionDiv.style.fontSize = '20px';
        questionDiv.style.marginBottom = '20px';
        questionDiv.style.textAlign = 'center';
        questionDiv.style.maxWidth = '750px';
        questionDiv.style.lineHeight = '1.5';
        contentDiv.appendChild(questionDiv);

        // Choices header
        const choicesHeader = document.createElement('div');
        choicesHeader.textContent = 'Answer Choices:';
        choicesHeader.style.fontSize = '24px';
        choicesHeader.style.fontWeight = 'bold';
        choicesHeader.style.marginBottom = '10px';
        contentDiv.appendChild(choicesHeader);

        // Choices container
        const choicesContainer = document.createElement('div');
        choicesContainer.style.width = '700px';
        choicesContainer.style.maxWidth = '100%';
        choicesContainer.style.marginBottom = '20px';

        quizData.choices.forEach((choice) => {
            const isCorrect = choice.key === quizData.correctAnswer;
            const wasUserChoice = choice.key === quizData.userAnswer;

            const choiceDiv = document.createElement('div');
            choiceDiv.style.padding = '10px';
            choiceDiv.style.marginBottom = '8px';
            choiceDiv.style.borderRadius = '4px';
            choiceDiv.style.border = '2px solid';
            choiceDiv.style.fontSize = '18px';
            choiceDiv.style.textAlign = 'center';

            // Set colors based on state
            if (isCorrect && wasUserChoice) {
                choiceDiv.style.backgroundColor = '#e8f5e8';
                choiceDiv.style.borderColor = '#00aa00';
            } else if (isCorrect) {
                choiceDiv.style.backgroundColor = '#f0f8f0';
                choiceDiv.style.borderColor = '#00aa00';
            } else if (wasUserChoice) {
                choiceDiv.style.backgroundColor = '#fff0f0';
                choiceDiv.style.borderColor = '#aa0000';
            } else {
                choiceDiv.style.backgroundColor = '#ffffff';
                choiceDiv.style.borderColor = '#cccccc';
            }

            // Add indicator
            let indicator = '';
            if (isCorrect && wasUserChoice) {
                indicator = '✓ ';
            } else if (isCorrect) {
                indicator = '✓ ';
            } else if (wasUserChoice) {
                indicator = '✗ ';
            }

            choiceDiv.innerHTML = `${choice.key}. ${indicator}${choice.text}`;
            choicesContainer.appendChild(choiceDiv);
        });

        contentDiv.appendChild(choicesContainer);

        // Result and time bonus
        const resultText = quizData.isCorrect ? 'Correct!' : 'Incorrect';
        const resultColor = quizData.isCorrect ? '#00aa00' : '#aa0000';
        const bonusText = quizData.timeBonus > 0 ? ` (Time bonus: ${quizData.timeBonus}s)` : '';

        const resultDiv = document.createElement('div');
        resultDiv.textContent = `${resultText}${bonusText}`;
        resultDiv.style.fontSize = '24px';
        resultDiv.style.fontWeight = 'bold';
        resultDiv.style.color = resultColor;
        resultDiv.style.marginBottom = '20px';
        contentDiv.appendChild(resultDiv);

        // Close button text (positioned absolutely to match Phaser button)
        const closeButtonText = document.createElement('div');
        closeButtonText.textContent = 'Close';
        closeButtonText.style.position = 'absolute';
        closeButtonText.style.fontSize = '20px';
        closeButtonText.style.fontWeight = 'bold';
        closeButtonText.style.color = '#ffffff';
        closeButtonText.style.pointerEvents = 'none';
        // Position at bottom of modal
        closeButtonText.style.bottom = '80px';
        contentDiv.style.position = 'relative';
        contentDiv.appendChild(closeButtonText);

        this.htmlContainer.appendChild(contentDiv);
        document.body.appendChild(this.htmlContainer);

        // Handle resize
        this.resizeHandler = () => {
            if (this.htmlContainer) {
                const rect = canvas.getBoundingClientRect();
                this.htmlContainer.style.left = rect.left + 'px';
                this.htmlContainer.style.top = rect.top + 'px';
                this.htmlContainer.style.width = rect.width + 'px';
                this.htmlContainer.style.height = rect.height + 'px';
            }
        };
        window.addEventListener('resize', this.resizeHandler);
    }

    /**
     * Dispose of HTML overlay
     */
    private disposeHtmlOverlay(): void {
        if (this.htmlContainer && this.htmlContainer.parentNode) {
            this.htmlContainer.parentNode.removeChild(this.htmlContainer);
            this.htmlContainer = null;
        }

        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
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