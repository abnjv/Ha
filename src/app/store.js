import { configureStore } from '@reduxjs/toolkit';
import creatorReducer from '../features/creator/creatorSlice';

export const store = configureStore({
  reducer: {
    creator: creatorReducer,
    // We can add other feature reducers here as the app grows
  },
});
