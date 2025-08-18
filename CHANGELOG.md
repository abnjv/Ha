# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Implemented real-time participant list in chat rooms using Firestore.
- Implemented room sorting by last activity on the dashboard.
- Added error logging to Firestore for the `sendNotification` function.
- Created `CHANGELOG.md` to track project changes.

### Changed
- Major refactor from a single-file application to a component-based architecture.
- Replaced manual, state-based routing with `react-router-dom` for robust navigation.
- Centralized user and Firebase state management into a dedicated `AuthContext` to eliminate prop drilling.

### Fixed
- Implemented robust error handling for sending notifications.
