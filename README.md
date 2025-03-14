# Skate with Bitcoin

A sidescrolling skateboarding game built with Next.js and Canvas API.

## Features

- Simple and fun skateboarding game
- Perform tricks by pressing Q, E, and R while in the air
- Global leaderboard to track high scores
- Clean, modern UI
- **Customizable game elements** - add your own images for the player, obstacles, and background

## Technologies Used

- Next.js
- TypeScript
- Canvas API for game rendering
- Tailwind CSS for styling

## Getting Started

### Prerequisites

- Node.js 16.0 or later
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/skatewithbitcoin.git
cd skatewithbitcoin
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Run the development server
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the game

## How to Play

- Use SPACE or UP arrow to jump
- Use LEFT/RIGHT arrows to adjust speed
- While in the air, press Q, E, or R to perform tricks
- Avoid obstacles and score points by doing tricks

## Customizing the Game

You can completely customize the look of the game by replacing the default graphics with your own images.

### Custom Images

The game supports custom images for:
- Player character (different states: idle, skating, jumping, etc.)
- Skateboard
- Obstacles (boxes, ramps, rails)
- Background (parallax layers)

See [CUSTOM_IMAGES_GUIDE.md](CUSTOM_IMAGES_GUIDE.md) for detailed instructions on preparing and adding your own custom images.

## License

MIT 