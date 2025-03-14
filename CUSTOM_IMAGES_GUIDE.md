# Custom Images Guide for Skate with Bitcoin

This guide explains how to customize your game with custom images for the player, skateboard, obstacles, and background.

## Required Images

### Player Character Images

Create the following images for different player states:

1. **player-idle.png**
   - Size: 60px × 120px (width × height)
   - Format: PNG with transparency
   - Description: Player standing still

2. **player-skating.png**
   - Size: 60px × 120px
   - Format: PNG with transparency
   - Description: Player in skating pose

3. **player-jumping.png**
   - Size: 60px × 120px
   - Format: PNG with transparency
   - Description: Player in jumping pose

4. **player-falling.png**
   - Size: 60px × 120px
   - Format: PNG with transparency
   - Description: Player falling

5. **player-grinding.png**
   - Size: 60px × 120px
   - Format: PNG with transparency
   - Description: Player grinding on rails

6. **player-crashed.png**
   - Size: 60px × 120px
   - Format: PNG with transparency
   - Description: Player crashed (fallen over)

### Skateboard Image

1. **skateboard.png**
   - Size: 50px × 10px
   - Format: PNG with transparency
   - Description: A simple skateboard

### Obstacle Images

1. **obstacle-box.png**
   - Size: 50px × 50px
   - Format: PNG with transparency
   - Description: Box obstacles to jump over

2. **obstacle-ramp.png**
   - Size: 70px × 60px
   - Format: PNG with transparency
   - Description: Ramp obstacles

3. **obstacle-rail.png**
   - Size: 100px × 20px
   - Format: PNG with transparency
   - Description: Rail obstacles for grinding

### Background Images

1. **background-sky.jpg**
   - Size: 800px × 500px
   - Format: JPG (no transparency needed)
   - Description: Sky background (furthest layer)

2. **background-mountains.png**
   - Size: 800px × 300px
   - Format: PNG with transparency
   - Description: Mountain silhouettes (distant background)

3. **background-buildings.png**
   - Size: 800px × 250px
   - Format: PNG with transparency
   - Description: Buildings silhouettes (middle distance)

4. **background-ground.png**
   - Size: 800px × 100px
   - Format: PNG with optional transparency
   - Description: Ground texture (closest layer)

## Image Directory Structure

All images should be placed in the `/public/images/` directory of your project:

```
public/
  images/
    player-idle.png
    player-skating.png
    player-jumping.png
    player-falling.png
    player-grinding.png
    player-crashed.png
    skateboard.png
    obstacle-box.png
    obstacle-ramp.png
    obstacle-rail.png
    background-sky.jpg
    background-mountains.png
    background-buildings.png
    background-ground.png
```

## Tips for Creating Custom Images

1. **Image Dimensions**: Try to match the recommended dimensions for smoother gameplay.

2. **Transparency**: Player, skateboard, and obstacle images should have transparent backgrounds.

3. **Background Images**: For parallax scrolling to work properly, the background images should be able to tile horizontally.

4. **Visual Consistency**: Keep a consistent art style across all images.

5. **File Size**: Keep image file sizes small for better performance.

## Testing Your Custom Images

1. Start the development server with `npm run dev`
2. Observe your game to see if the images are loading correctly
3. Check the browser console for any image loading errors

## Troubleshooting

- If images aren't appearing, check the browser console for loading errors
- Ensure the file names match exactly what the code expects
- Verify the image paths are correct
- Make sure the images are in the correct format (PNG with transparency for most elements) 