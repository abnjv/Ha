// This file contains constant values used throughout the application,
// particularly for database collection paths to avoid magic strings.

// The root path for all application-specific data.
const getArtifactsPath = (appId) => `/artifacts/${appId}`;

// --- Public Data Paths ---
const getPublicDataPath = (appId) => `${getArtifactsPath(appId)}/public/data`;

export const getRoomsPath = (appId) => `${getPublicDataPath(appId)}/rooms`;

export const getVoiceRoomPath = (appId, roomId) => `${getPublicDataPath(appId)}/voice_rooms/${roomId}`;

export const getVoiceRoomMessagesPath = (appId, roomId) => `${getVoiceRoomPath(appId, roomId)}/messages`;

export const getVoiceRoomParticipantsPath = (appId, roomId) => `${getVoiceRoomPath(appId, roomId)}/participants`;

export const getPrivateChatsPath = (appId, chatPartnersId) => `${getPublicDataPath(appId)}/private_chats/${chatPartnersId}`;

export const getPrivateChatMessagesPath = (appId, chatPartnersId) => `${getPrivateChatsPath(appId, chatPartnersId)}/messages`;


// --- User-Specific Data Paths ---
const getUsersPath = (appId) => `${getArtifactsPath(appId)}/users`;

export const getUserPath = (appId, userId) => `${getUsersPath(appId)}/${userId}`;

export const getUserProfilePath = (appId, userId) => `${getUserPath(appId, userId)}/profile/data`;

export const getUserFriendsPath = (appId, userId) => `${getUserPath(appId, userId)}/friends`;

export const getUserNotificationsPath = (appId, userId) => `${getUserPath(appId, userId)}/notifications`;
