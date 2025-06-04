import { FishType } from '../const/fishType';
import { FishCollectionManager } from '../managers/fishCollectionManager';
import { FishFactory, FishSizeCategory } from '../factories/fishFactory';

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

        // Debug: Check if fish info data is loaded
        console.log('Fish info data loaded:', Object.keys(this.fishInfoData).length, 'fish types');
        if (Object.keys(this.fishInfoData).length > 0) {
            console.log('First few fish keys:', Object.keys(this.fishInfoData).slice(0, 10));
            console.log('Sample fish data for bass:', this.fishInfoData['bass'] || 'bass not found');
            console.log('Sample fish data for clown_fish:', this.fishInfoData['clown_fish'] || 'clown_fish not found');
        } else {
            console.warn('FishInfo data is empty! This will cause fish details to show fallback data.');
        }

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

            // Adjust scale for card display
            let cardScale = 2.0;
            switch (sizeCategory) {
                case FishSizeCategory.LARGE:
                    cardScale = 1.5;
                    break;
                case FishSizeCategory.MEDIUM:
                    cardScale = 1.8;
                    break;
                case FishSizeCategory.SMALL:
                default:
                    cardScale = 2.0;
                    break;
            }
            fishSprite.setScale(cardScale);

            // Fish name - Debug the fish info lookup
            const fishTypeKey = fishType.toString();
            const fishInfo = this.fishInfoData[fishTypeKey];

            // Debug: Check fish info lookup
            if (!fishInfo) {
                console.log(`Fish info not found for key: "${fishTypeKey}"`);
                console.log('Available keys:', Object.keys(this.fishInfoData).slice(0, 5), '...'); // Show first 5 keys
            }

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
                this.showFishDetails(fishType, fishInfo);
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
        // If fishInfo wasn't passed, try to look it up again
        if (!fishInfo) {
            const fishTypeKey = fishType.toString();
            fishInfo = this.fishInfoData[fishTypeKey];
            console.log(`Looking up fish info for ${fishTypeKey}:`, fishInfo ? 'found' : 'not found');
        }

        // Create modal overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.8);
        overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        overlay.setDepth(1000);

        // Create modal background
        const modalWidth = Math.min(600, this.cameras.main.width - 40);
        const modalHeight = Math.min(500, this.cameras.main.height - 40);
        const modalBg = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            modalWidth,
            modalHeight,
            0x2c3e50
        );
        modalBg.setStrokeStyle(3, 0x3498db);
        modalBg.setDepth(1001);

        // Create fish sprite
        const fishSprite = FishFactory.createFish(
            this,
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 150,
            fishType
        );
        const sizeCategory = FishFactory.getFishSizeCategory(fishType);
        let modalScale = 4.0;
        switch (sizeCategory) {
            case FishSizeCategory.LARGE:
                modalScale = 3.0;
                break;
            case FishSizeCategory.MEDIUM:
                modalScale = 3.5;
                break;
        }
        fishSprite.setScale(modalScale);
        fishSprite.setDepth(1002);

        // Create info text
        const info = fishInfo || {
            name: this.formatFishName(fishType),
            description: 'No description available.',
            habitat: 'Unknown',
            size: 'Unknown',
            diet: 'Unknown',
            funFact: 'This fish is mysterious!',
            category: 'Unknown'
        };

        const infoText = `${info.description}\n\nHabitat: ${info.habitat}\nSize: ${info.size}\nDiet: ${info.diet}\n\nFun Fact: ${info.funFact}`;

        const detailsText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 20,
            infoText,
            {
                fontSize: '16px',
                color: '#ecf0f1',
                align: 'center',
                wordWrap: { width: modalWidth - 40 },
                lineSpacing: 8
            }
        ).setOrigin(0.5);
        detailsText.setDepth(1002);

        // Create close button
        const closeButton = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 180,
            120,
            40,
            0xe74c3c
        );
        closeButton.setStrokeStyle(2, 0xc0392b);
        closeButton.setInteractive();
        closeButton.setDepth(1002);

        const closeText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 180,
            'Close',
            {
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        closeText.setDepth(1003);

        // Close modal function
        const closeModal = () => {
            overlay.destroy();
            modalBg.destroy();
            fishSprite.destroy();
            detailsText.destroy();
            closeButton.destroy();
            closeText.destroy();
        };

        closeButton.on('pointerdown', closeModal);
        overlay.setInteractive();
        overlay.on('pointerdown', closeModal);

        // Hover effect for close button
        closeButton.on('pointerover', () => {
            closeButton.setFillStyle(0xc0392b);
            closeText.setColor('#f1c40f');
        });

        closeButton.on('pointerout', () => {
            closeButton.setFillStyle(0xe74c3c);
            closeText.setColor('#ffffff');
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