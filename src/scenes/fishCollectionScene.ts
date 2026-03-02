import { FishType } from '../const/fishType';
import { FishCollectionManager } from '../managers/fishCollectionManager';
import { FishFactory, FishSizeCategory } from '../factories/fishFactory';
import { CursorManager } from '../managers/cursorManager';

interface FishInfo {
    name: string;
    description: string;
    habitat: string;
    size: string;
    diet: string;
    funFact: string;
    category: string;
}

export class FishCollectionScene extends Phaser.Scene {
    private fishInfoData: { [key: string]: FishInfo } = {};
    private scrollContainer!: Phaser.GameObjects.Container;
    private scrollArea!: Phaser.GameObjects.Rectangle;
    private scrollY: number = 0;
    private maxScrollY: number = 0;
    private returnToScene: string = 'MenuScene'; // Default return scene
    private interactiveCardBackgrounds: Phaser.GameObjects.Rectangle[] = []; // Track interactive cards
    private modalOpen: boolean = false; // Track if modal is currently open
    private modalHtmlContainer: HTMLDivElement | null = null;
    private modalOverlay: Phaser.GameObjects.Graphics | null = null;
    private modalFishSprite: Phaser.GameObjects.Image | null = null;
    private mouseMoveHandler: ((event: MouseEvent) => void) | null = null;
    private htmlCursor: HTMLImageElement | null = null;

    constructor() {
        super({ key: 'FishCollectionScene' });
    }

    init(data: { returnTo?: string } = {}): void {
        this.returnToScene = data.returnTo || 'MenuScene';
    }

    preload(): void {
        // Fish info should already be loaded in PreloadScene, so we don't need to load it again
        // Just check if it exists
        if (!this.cache.json.exists('fishInfo')) {
            console.warn('FishInfo not found in cache - it should have been loaded in PreloadScene');
        }
    }

    create(): void {
        // Load fish info data
        this.fishInfoData = this.cache.json.get('fishInfo') || {};

        // Create background that covers full screen
        this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x2c3e50
        );

        // Create title
        this.add.text(
            this.cameras.main.width / 2,
            30,
            'Fish Collection',
            {
                fontSize: '48px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);

        // Get caught fish stats
        const caughtCount = FishCollectionManager.getTotalCaughtCount();
        const totalCount = FishCollectionManager.getTotalFishCount();
        const percentage = FishCollectionManager.getCompletionPercentage();

        // Create stats display
        this.add.text(
            this.cameras.main.width / 2,
            75,
            `Discovered: ${caughtCount}/${totalCount} fish (${percentage}%)`,
            {
                fontSize: '24px',
                color: '#3498db',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);

        // Create scroll area background that covers full width and most of the height
        const scrollAreaY = 150; // Increased spacing from top for better visual separation
        const scrollAreaHeight = this.cameras.main.height - scrollAreaY - 20; // Leave small margin at bottom

        this.scrollArea = this.add.rectangle(
            this.cameras.main.width / 2,
            scrollAreaY + scrollAreaHeight / 2,
            this.cameras.main.width, // Full width
            scrollAreaHeight, // Almost full height
            0x34495e,
            0.8
        );
        this.scrollArea.setStrokeStyle(2, 0x3498db);

        // Create scrollable container that starts right below the stats
        this.scrollContainer = this.add.container(0, scrollAreaY);

        // Create fish grid
        this.createFishGrid();

        // Create back button
        this.createBackButton();

        // Add scroll controls
        this.setupScrolling();

        // Initialize cursor management for this scene
        CursorManager.createCursor(this);
    }

    private createFishGrid(): void {
        const caughtFishTypes = FishCollectionManager.getCaughtFishTypes();
        const allFishTypes = Object.values(FishType);

        // Calculate optimal items per row based on screen width
        const itemWidth = 120;
        const itemHeight = 180;
        const minSpacing = 10; // Minimum spacing between cards
        const sideMargin = 20; // Small margin on each side

        // Calculate how many items can fit per row
        const availableWidth = this.cameras.main.width - (sideMargin * 2);
        const itemsPerRow = Math.floor(availableWidth / (itemWidth + minSpacing));

        // Calculate actual spacing to distribute cards evenly across full width
        const totalItemWidth = itemsPerRow * itemWidth;
        const totalSpacingWidth = availableWidth - totalItemWidth;
        const actualSpacing = totalSpacingWidth / Math.max(1, itemsPerRow - 1);

        // Calculate starting X position to center the grid
        const startX = sideMargin + itemWidth / 2;
        const startY = 150;

        let row = 0;
        let col = 0;

        allFishTypes.forEach((fishType, index) => {
            const isCaught = caughtFishTypes.includes(fishType.toString());

            // Calculate position with proper full-width distribution
            const x = startX + (col * (itemWidth + actualSpacing));
            const y = startY + (row * (itemHeight + 20)); // 20px vertical spacing

            // Create fish card
            this.createFishCard(x, y, fishType, isCaught);

            // Update position for next item
            col++;
            if (col >= itemsPerRow) {
                col = 0;
                row++;
            }
        });

        // Calculate max scroll based on content height
        const totalRows = Math.ceil(allFishTypes.length / itemsPerRow);
        const contentHeight = totalRows * (itemHeight + 20) + 40; // Add padding
        const viewportHeight = this.scrollArea.height;
        this.maxScrollY = Math.max(0, contentHeight - viewportHeight);
    }

    private createFishCard(x: number, y: number, fishType: FishType, isCaught: boolean): void {
        const cardContainer = this.add.container(x, y);

        // Create card background
        const cardBg = this.add.rectangle(0, 0, 100, 160, isCaught ? 0x3498db : 0x7f8c8d, 0.9);
        cardBg.setStrokeStyle(2, isCaught ? 0x2980b9 : 0x95a5a6);

        if (isCaught) {
            // Create fish sprite
            const fishSprite = FishFactory.createFish(this, 0, -30, fishType);
            const sizeCategory = FishFactory.getFishSizeCategory(fishType);

            // Scale based on fish size for better card layout
            let cardScale = 0.5; // Use uniform scale for all fish
            switch (sizeCategory) {
                case FishSizeCategory.LARGE:
                    cardScale = 0.5;
                    break;
                case FishSizeCategory.MEDIUM:
                    cardScale = 0.5;
                    break;
                case FishSizeCategory.SMALL:
                default:
                    cardScale = 0.5;
                    break;
            }
            fishSprite.setScale(cardScale);

            // Fish name - Debug the fish info lookup
            const fishTypeKey = fishType.toString();
            const fishInfo = this.fishInfoData[fishTypeKey];

            const fishName = fishInfo ? fishInfo.name : this.formatFishName(fishType);
            const nameText = this.add.text(0, 20, fishName, {
                fontSize: '12px',
                color: '#ffffff',
                fontStyle: 'bold',
                align: 'center',
                wordWrap: { width: 90 }
            }).setOrigin(0.5);

            // Category
            const category = fishInfo ? fishInfo.category : 'Unknown';
            const categoryText = this.add.text(0, 45, category, {
                fontSize: '10px',
                color: '#ecf0f1',
                align: 'center',
                wordWrap: { width: 90 }
            }).setOrigin(0.5);

            cardContainer.add([cardBg, fishSprite, nameText, categoryText]);

            // Make card interactive to show details
            cardBg.setInteractive();
            cardBg.on('pointerdown', () => {
                // Prevent opening modal if one is already open
                if (!this.modalOpen) {
                    this.showFishDetails(fishType, fishInfo);
                }
            });

            // Hover effect
            cardBg.on('pointerover', () => {
                cardBg.setFillStyle(0x5dade2, 0.9);
                nameText.setColor('#f1c40f');
            });

            cardBg.on('pointerout', () => {
                cardBg.setFillStyle(0x3498db, 0.9);
                nameText.setColor('#ffffff');
            });

            // Track this interactive card background
            this.interactiveCardBackgrounds.push(cardBg);
        } else {
            // Locked/unknown fish
            const lockedIcon = this.add.text(0, -10, '?', {
                fontSize: '48px',
                color: '#95a5a6',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const lockedText = this.add.text(0, 30, 'Not Discovered', {
                fontSize: '10px',
                color: '#bdc3c7',
                align: 'center'
            }).setOrigin(0.5);

            cardContainer.add([cardBg, lockedIcon, lockedText]);
        }

        this.scrollContainer.add(cardContainer);
    }

    private showFishDetails(fishType: FishType, fishInfo?: FishInfo): void {
        // Prevent multiple modals from opening
        if (this.modalOpen) {
            return;
        }

        this.modalOpen = true;

        // If fishInfo wasn't passed, try to look it up again
        if (!fishInfo) {
            const fishTypeKey = fishType.toString();
            fishInfo = this.fishInfoData[fishTypeKey];
        }

        // Create dark overlay
        this.modalOverlay = this.add.graphics();
        this.modalOverlay.fillStyle(0x000000, 0.8);
        this.modalOverlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        this.modalOverlay.setDepth(1000);

        // Create fish sprite
        this.modalFishSprite = FishFactory.createFish(
            this,
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 150,
            fishType
        );
        const sizeCategory = FishFactory.getFishSizeCategory(fishType);
        let modalScale = 0.7;
        switch (sizeCategory) {
            case FishSizeCategory.LARGE:
                modalScale = 0.7;
                break;
            case FishSizeCategory.MEDIUM:
                modalScale = 0.7;
                break;
        }
        this.modalFishSprite.setScale(modalScale);
        this.modalFishSprite.setDepth(1002);

        // Create HTML modal for text
        this.createHtmlModal(fishType, fishInfo);

        // Create HTML cursor overlay
        this.createHtmlCursor();

        // Add global mouse tracking for cursor over modal
        const canvas = this.game.canvas;
        this.mouseMoveHandler = (event: MouseEvent) => {
            if (this.scene.isActive()) {
                const canvasRect = canvas.getBoundingClientRect();
                const scaleX = this.cameras.main.width / canvasRect.width;
                const scaleY = this.cameras.main.height / canvasRect.height;
                const gameX = (event.clientX - canvasRect.left) * scaleX;
                const gameY = (event.clientY - canvasRect.top) * scaleY;
                CursorManager.updatePosition(gameX, gameY);

                // Update HTML cursor position
                if (this.htmlCursor) {
                    this.htmlCursor.style.left = event.clientX + 'px';
                    this.htmlCursor.style.top = event.clientY + 'px';
                }
            }
        };
        document.addEventListener('mousemove', this.mouseMoveHandler);
    }

    private createHtmlModal(fishType: FishType, fishInfo?: FishInfo): void {
        const canvas = this.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();

        // Create HTML container
        this.modalHtmlContainer = document.createElement('div');
        this.modalHtmlContainer.style.position = 'fixed';
        this.modalHtmlContainer.style.left = canvasRect.left + 'px';
        this.modalHtmlContainer.style.top = canvasRect.top + 'px';
        this.modalHtmlContainer.style.width = canvasRect.width + 'px';
        this.modalHtmlContainer.style.height = canvasRect.height + 'px';
        this.modalHtmlContainer.style.pointerEvents = 'none';
        this.modalHtmlContainer.style.zIndex = '1000';
        this.modalHtmlContainer.style.display = 'flex';
        this.modalHtmlContainer.style.alignItems = 'center';
        this.modalHtmlContainer.style.justifyContent = 'center';

        // Create modal card
        const modalCard = document.createElement('div');
        modalCard.style.width = 'min(90%, 600px)';
        modalCard.style.maxHeight = '70%';
        modalCard.style.backgroundColor = 'rgba(44, 62, 80, 0.98)';
        modalCard.style.border = '3px solid #3498db';
        modalCard.style.borderRadius = '12px';
        modalCard.style.padding = '20px';
        modalCard.style.boxSizing = 'border-box';
        modalCard.style.overflowY = 'auto';
        modalCard.style.pointerEvents = 'auto';
        modalCard.style.cursor = 'none';
        modalCard.style.fontFamily = 'Arial, sans-serif';
        modalCard.style.color = '#ecf0f1';
        modalCard.style.marginTop = '100px'; // Leave space for fish sprite above

        // Get fish info
        const info = fishInfo || {
            name: this.formatFishName(fishType),
            description: 'No description available.',
            habitat: 'Unknown',
            size: 'Unknown',
            diet: 'Unknown',
            funFact: 'This fish is mysterious!',
            category: 'Unknown'
        };

        // Create content
        modalCard.innerHTML = `
            <h2 style="font-size: clamp(20px, 3.5vh, 32px); color: #3498db; margin: 0 0 15px 0; text-align: center; text-shadow: 2px 2px 4px #000;">${info.name}</h2>
            <p style="font-size: clamp(12px, 2vh, 18px); margin: 10px 0; text-align: center; color: #f39c12; font-weight: bold;">${info.category}</p>
            <p style="font-size: clamp(13px, 2.2vh, 20px); line-height: 1.6; margin: 15px 0;">${info.description}</p>
            <div style="font-size: clamp(12px, 2vh, 18px); line-height: 1.8; margin: 15px 0;">
                <p style="margin: 8px 0;"><strong style="color: #3498db;">Habitat:</strong> ${info.habitat}</p>
                <p style="margin: 8px 0;"><strong style="color: #3498db;">Size:</strong> ${info.size}</p>
                <p style="margin: 8px 0;"><strong style="color: #3498db;">Diet:</strong> ${info.diet}</p>
            </div>
            <p style="font-size: clamp(12px, 2vh, 18px); line-height: 1.6; margin: 15px 0; padding: 12px; background: rgba(52, 152, 219, 0.2); border-radius: 8px; border-left: 4px solid #3498db;">
                <strong style="color: #f39c12;">Fun Fact:</strong> ${info.funFact}
            </p>
            <div style="text-align: center; margin-top: 25px;">
                <button id="closeModalBtn" style="
                    background-color: #e74c3c;
                    border: 2px solid #c0392b;
                    color: white;
                    padding: 12px 30px;
                    font-size: clamp(14px, 2.2vh, 20px);
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: none;
                    transition: all 0.2s;
                ">
                    Close
                </button>
            </div>
        `;

        this.modalHtmlContainer.appendChild(modalCard);
        document.body.appendChild(this.modalHtmlContainer);

        // Add close button handler
        const closeBtn = document.getElementById('closeModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.backgroundColor = '#c0392b';
                closeBtn.style.transform = 'scale(1.05)';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.backgroundColor = '#e74c3c';
                closeBtn.style.transform = 'scale(1)';
            });
        }

        // Handle window resize
        const resizeHandler = () => {
            if (this.modalHtmlContainer) {
                const rect = canvas.getBoundingClientRect();
                this.modalHtmlContainer.style.left = rect.left + 'px';
                this.modalHtmlContainer.style.top = rect.top + 'px';
                this.modalHtmlContainer.style.width = rect.width + 'px';
                this.modalHtmlContainer.style.height = rect.height + 'px';
            }
        };
        window.addEventListener('resize', resizeHandler);
        this.events.once('shutdown', () => {
            window.removeEventListener('resize', resizeHandler);
        });
    }

    private createHtmlCursor(): void {
        // Create HTML cursor image that sits above modal
        this.htmlCursor = document.createElement('img');
        this.htmlCursor.src = 'assets/ui/control_ui/pointer_0001.png';
        this.htmlCursor.style.position = 'fixed';
        this.htmlCursor.style.pointerEvents = 'none';
        this.htmlCursor.style.zIndex = '10000'; // Higher than modal (1000)
        this.htmlCursor.style.width = '30px'; // Adjust size as needed
        this.htmlCursor.style.height = '30px';
        this.htmlCursor.style.transform = 'scale(3)';
        this.htmlCursor.style.transformOrigin = 'top left';
        document.body.appendChild(this.htmlCursor);
    }

    private closeModal(): void {
        // Cleanup overlay graphics
        if (this.modalOverlay) {
            this.modalOverlay.destroy();
            this.modalOverlay = null;
        }

        // Cleanup fish sprite
        if (this.modalFishSprite) {
            this.modalFishSprite.destroy();
            this.modalFishSprite = null;
        }

        // Cleanup HTML container
        if (this.modalHtmlContainer && this.modalHtmlContainer.parentNode) {
            this.modalHtmlContainer.parentNode.removeChild(this.modalHtmlContainer);
            this.modalHtmlContainer = null;
        }

        // Cleanup HTML cursor
        if (this.htmlCursor && this.htmlCursor.parentNode) {
            this.htmlCursor.parentNode.removeChild(this.htmlCursor);
            this.htmlCursor = null;
        }

        // Remove mouse move handler
        if (this.mouseMoveHandler) {
            document.removeEventListener('mousemove', this.mouseMoveHandler);
            this.mouseMoveHandler = null;
        }

        // Reset modal state
        this.modalOpen = false;

        // Re-enable interactive cards
        this.interactiveCardBackgrounds.forEach(bg => {
            if (bg && bg.active && bg.scene) {
                bg.setInteractive();
            }
        });
    }

    private createBackButton(): void {
        const backButton = this.add.rectangle(70, 50, 120, 40, 0x27ae60);
        backButton.setStrokeStyle(2, 0x2ecc71);
        backButton.setInteractive();

        const backText = this.add.text(70, 50, 'Back', {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        backButton.on('pointerdown', () => {
            // Handle different return scenarios
            if (this.returnToScene === 'GameScene') {
                // If returning to game scene, resume it instead of starting it
                this.scene.stop();
                this.scene.resume('GameScene');
            } else {
                // For other scenes (like MenuScene), start them normally
                this.scene.start(this.returnToScene);
            }
        });

        // Hover effect
        backButton.on('pointerover', () => {
            backButton.setFillStyle(0x2ecc71);
            backText.setColor('#f1c40f');
        });

        backButton.on('pointerout', () => {
            backButton.setFillStyle(0x27ae60);
            backText.setColor('#ffffff');
        });
    }

    private setupScrolling(): void {
        // Add mouse wheel scrolling
        this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
            this.scroll(deltaY > 0 ? 50 : -50);
        });

        // Add touch/drag scrolling
        let isDragging = false;
        let lastY = 0;

        this.scrollArea.setInteractive();
        this.scrollArea.on('pointerdown', (pointer: any) => {
            isDragging = true;
            lastY = pointer.y;
        });

        this.input.on('pointermove', (pointer: any) => {
            if (isDragging) {
                const deltaY = pointer.y - lastY;
                this.scroll(-deltaY);
                lastY = pointer.y;
            }
        });

        this.input.on('pointerup', () => {
            isDragging = false;
        });
    }

    private scroll(deltaY: number): void {
        this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY, 0, this.maxScrollY);
        const scrollAreaY = 150; // Same value used in create()
        this.scrollContainer.setY(scrollAreaY - this.scrollY);
    }

    private formatFishName(fishType: FishType): string {
        return fishType
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
} 