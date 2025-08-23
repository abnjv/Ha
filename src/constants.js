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

export const getFriendRequestsPath = (appId) => `${getPublicDataPath(appId)}/friend_requests`;

export const getInvitationsPath = (appId) => `${getPublicDataPath(appId)}/invitations`;

export const getTicketsPath = (appId) => `${getPublicDataPath(appId)}/tickets`;

// --- Group Paths ---
export const getGroupsPath = (appId) => `${getPublicDataPath(appId)}/groups`;
export const getGroupPath = (appId, groupId) => `${getGroupsPath(appId)}/${groupId}`;
export const getGroupMessagesPath = (appId, groupId) => `${getGroupPath(appId, groupId)}/messages`;


// --- User-Specific Data Paths ---
const getUsersPath = (appId) => `${getArtifactsPath(appId)}/users`;

export const getUserPath = (appId, userId) => `${getUsersPath(appId)}/${userId}`;

export const getUserProfilePath = (appId, userId) => `${getUserPath(appId, userId)}/profile/data`;

export const getUserFriendsPath = (appId, userId) => `${getUserPath(appId, userId)}/friends`;

export const getUserNotificationsPath = (appId, userId) => `${getUserPath(appId, userId)}/notifications`;

// --- Virtual User Constants ---
export const SUPPORT_BOT_ID = 'support-bot-01';
export const SUPPORT_BOT_NAME = 'Support Bot';
export const SUPPORT_BOT_AVATAR = 'https://placehold.co/128x128/6B46C1/FFFFFF?text=BOT';
