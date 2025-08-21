import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  stats: {
    subscribers: 1234, // Using mock data for now
    monthlyRevenue: 5678,
  },
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const creatorSlice = createSlice({
  name: 'creator',
  initialState,
  reducers: {
    // Reducers for synchronous actions can be added here.
    // e.g., itemAdded(state, action) { state.items.push(action.payload); }
  },
  // extraReducers is used for async actions, which we might add later
  // to fetch real stats from a backend.
  extraReducers: (builder) => {},
});

// Selectors to get data from the store
export const selectCreatorStats = (state) => state.creator.stats;
export const selectCreatorItems = (state) => state.creator.items;

// Export the reducer to be used in the store
export default creatorSlice.reducer;
