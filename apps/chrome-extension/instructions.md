# YC AI Application Assistant - Development Instructions

## Product Overview

The YC AI Application Assistant is a browser extension built with Plasmo, designed to streamline and enhance the Y Combinator application process for founders. By leveraging AI technologies and Plasmo's powerful features, this tool provides intelligent assistance, instant feedback, and valuable insights to improve the quality of applications.

## Key Features

1. AI-Powered Auto-Fill: Automatically populate application fields with relevant information.
2. Answer Vibe-Check: Analyze responses for tone, clarity, and impact.
3. Pitch Deck Upload and Analysis: Extract key points from uploaded pitch decks.
4. Instant Feedback: Provide real-time advice on each section of the application.
5. Pitch Practice: Present real YC interview questions with AI-generated feedback.
6. Competitor Check: Analyze the user's idea against the YC company database.

## Project Structure

chrome-extension/
├── package.json
├── tsconfig.json
├── .env
├── src/
│ ├── contents/
│ │ ├── index.tsx
│ │ ├── auto-fill.tsx
│ │ ├── vibe-check.tsx
│ │ ├── textbox-buttons.tsx
│ │ ├── founder-video-button.tsx
│ │ └── header.tsx
│ ├── background/
│ │ └── index.ts
│ ├── popup/
│ │ ├── index.tsx
│ │ └── popup.tsx
│ ├── options/
│ │ └── index.tsx
│ ├── components/
│ │ ├── PitchDeckAnalyzer.tsx
│ │ ├── FeedbackGenerator.tsx
│ │ ├── PitchPractice.tsx
│ │ └── CompetitorCheck.tsx
│ ├── utils/
│ │ ├── ai-services.ts
│ │ └── storage.ts
│ └── assets/
│ └── icon.png
├── assets/
│ └── locales/
│ └── en/
│ └── messages.json
└── README.md

## Development Guidelines

1. Use TypeScript for all components and scripts.
2. Leverage Plasmo's declarative development approach for easier component creation.
3. Utilize React for building user interface components.
4. Use Plasmo's storage API for managing extension data.
5. Implement Plasmo's messaging system for communication between different parts of the extension.
6. Use environment variables for managing API keys and other sensitive information.
7. Leverage Plasmo's built-in support for Tailwind CSS for styling.

## Implementation Steps

1. Set up the Plasmo project structure as outlined above.
2. Implement each feature as a separate component in the `src/components/` directory.
3. Create content scripts in `src/contents/` to inject UI elements into the YC application page.
4. Develop the popup interface in `src/popup/` for easy access to tools and settings.
5. Implement background scripts in `src/background/` for handling API calls and data processing.
6. Use `src/utils/` for shared utility functions and services.

## Testing and Quality Assurance

- Utilize Plasmo's development server for live-reloading during development.
- Develop a comprehensive test suite covering all major features.
- Perform thorough cross-browser testing.
- Conduct user acceptance testing with a group of startup founders.
- Implement analytics to track feature usage and identify areas for improvement.

## Build and Deployment

- Use Plasmo's build command to create production-ready extension files.
- Leverage Plasmo's submission workflow for easier publishing to browser stores.
- Consider using Plasmo's Itero TestBed for beta testing and instant updates to testers.
- Utilize Plasmo Browser Platform Publisher for automating the publishing process to multiple browser stores.

## Maintenance and Updates

- Establish a feedback mechanism for users to report issues and suggest improvements.
- Plan regular updates to enhance features and fix any reported issues.
- Utilize Plasmo's update mechanisms to ensure smooth version transitions for users.

Remember to follow Plasmo's best practices and refer to their documentation (https://docs.plasmo.com/) for detailed implementation guidance.

## User Flow

1. User installs the Chrome extension
2. User navigates to the Y Combinator application page
3. Extension icon becomes active, indicating it's ready to assist
4. User can access features through a sidebar or overlay interface
5. As the user fills out the application, they can utilize various AI assistance features
6. User can review and edit all AI-generated content before submission

## Technical Requirements

- Develop as a Chrome extension compatible with the latest Chrome browser versions
- Implement secure API calls to AI services for various features
- Ensure data privacy and security for user information and uploaded content
- Optimize performance to minimize impact on browser speed and responsiveness

## UI/UX Requirements

- Design a clean, intuitive interface that integrates seamlessly with the YC application page
- Use clear icons and tooltips to explain each feature
- Implement a collapsible sidebar or overlay for easy access to tools
- Ensure responsive design for various screen sizes

## Future Enhancements

- Integration with other popular accelerator applications
- Expanded database of startup pitches and successful applications
- Personalized learning algorithm to tailor advice based on user's industry and background

## Implementation Guidelines

- Use TypeScript for improved code quality and maintainability
- Implement modular architecture for easy feature additions and maintenance
- Utilize React for building the user interface components
- Leverage AI APIs (e.g., OpenAI, Google Cloud AI) for intelligent features
- Implement proper error handling and logging for a smooth user experience
- Ensure compliance with Chrome Web Store policies and guidelines

## Launch and Maintenance Plan

- Submit the extension to the Chrome Web Store for approval
- Develop a marketing strategy to reach potential users (startup forums, social media, etc.)
- Establish a feedback mechanism for users to report issues and suggest improvements
- Plan regular updates to enhance features and fix any reported issues
