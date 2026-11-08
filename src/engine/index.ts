// Public engine API.
export { normalize, buildProfile, indexFromMean } from './scoring';
export { nextLevel, MIN_LEVEL, MAX_LEVEL } from './adaptive';
export { pickForm, planForToday, GAME_FOR } from './forms';
export { updateIndex } from './wittioIndex';
export { demoNow, dayKey, addDays } from './days';
export { errorBand, ERROR_BAND, classifyChange, scoreRange, weakestStable, illustrativePractice } from './errorBands';
export { economics } from './economics';
