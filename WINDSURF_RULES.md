# Windsurf Rules for Fish Quiz Game

This document outlines important development rules and best practices for the Fish Quiz game project.

## Camera Visibility Management

When working with multiple cameras in Phaser (like a main game camera and UI camera), it's crucial to properly manage which game objects are visible to which cameras to prevent duplicate rendering.

### Issue to Avoid

- Game objects (like characters, boats) appearing twice on screen - once in the main game view and once in the UI/minimap view
- This happens when objects are being rendered by both the main camera and the UI camera

### Required Solution

1. **Explicitly set camera visibility for each game object:**

```typescript
// Make gameplay elements only visible to the main camera
uiCamera.ignore(this.player);
uiCamera.ignore(this.map);
uiCamera.ignore(this.character);

// Make UI elements only visible to the UI camera
this.cameras.main.ignore(uiContainer);
```

2. **Set up camera visibility early in the scene creation:**

```typescript
// After creating a new game object, ensure it's only visible to appropriate cameras
for (let i = 1; i < this.cameras.cameras.length; i++) {
  const camera = this.cameras.cameras[i];
  if (camera && camera !== this.cameras.main) {
    camera.ignore(this.newGameObject);
  }
}
```

3. **Implement cleanup methods to prevent duplicate objects:**

```typescript
private cleanup(): void {
  // Clean up existing objects to prevent duplicates
  if (this.gameObject) {
    this.gameObject.destroy();
    this.gameObject = null;
  }
}

// Call cleanup at the start of create()
create(): void {
  this.cleanup();
  // Create new objects...
}
```

### Best Practices

- **Call cleanup() at the start of create()** to prevent duplicate objects
- **Set camera visibility immediately after creating game objects**
- **Use named cameras** (setName()) for easier reference
- **Keep UI elements in containers** that are only visible to the UI camera
- **Keep game elements only visible to the main camera**
- **Check for null** before accessing game objects to prevent TypeScript errors

## Character and Boat Management

- Character scale should be set to 0.5 for proper proportions
- Character Y offset should be +28px to properly position on the boat
- Always update character position in the handlePlayerMovement method
- Use proper null checks when accessing character or player objects

## General TypeScript Rules

- Always use proper null checks before accessing potentially null objects
- Use type assertions carefully and only when necessary
- Define proper interfaces for game state and other data structures
- Use enums for constants like boat types and character types

---

*These rules should be followed by all developers working on the Fish Quiz game project to ensure consistency and prevent common issues.*
