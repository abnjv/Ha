# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-08-19

This is the first major release after a comprehensive refactoring and feature implementation phase.

### Added
- **Component-Based Architecture**: The entire application was refactored from a single monolithic file into a clean, component-based architecture for better maintainability and scalability.
- **Modern Routing**: Implemented `react-router-dom` for robust, client-side routing, replacing the previous manual state-based system. This enables direct URL access to pages and proper browser history support.
- **Centralized State Management**: Introduced `AuthContext` to manage user authentication state, user profile data, and Firebase instances globally, eliminating prop drilling.
- **Real-Time Chat Room Participants**: The list of participants in a voice chat room is now connected to Firestore and updates in real-time as users join and leave.
- **Real-Time Notification System**: Implemented a fully functional, real-time notification system connected to Firestore, including "mark as read" and "clear all" functionalities.
- **Functional WebRTC Voice Chat**: Replaced the placeholder voice chat with a working WebRTC implementation, including a custom signaling server, to enable real-time audio communication between peers.
- **Friend Management**: Implemented the "Add Friend" and "Remove Friend" features.

### Fixed
- **API Key Security**: Removed hardcoded API keys and configured them to be loaded securely from environment variables.

### Changed
- All page-level components were updated to use `useNavigate` and `useParams` hooks for navigation instead of prop-based callbacks.
