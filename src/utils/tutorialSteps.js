// src/utils/tutorialSteps.js
import { Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

export const homeScreenTutorialSteps = [
  {
    x: 20,
    y: 150,
    title: 'Welcome to choma!',
    description: 'This is your home screen, where you can find delicious meal plans.',
  },
  {
    x: 20,
    y: 400,
    title: 'Popular Plans',
    description: 'Check out our most popular meal plans here. Swipe to see more!',
  },
  {
    x: 20,
    y: 600,
    title: 'All Meal Plans',
    description: 'Browse through all of our available meal plans.',
  },
  {
    x: 100,
    y: height - 100,
    title: 'Navigation',
    description: 'Use the tabs at the bottom to navigate through the app.',
  },
];
