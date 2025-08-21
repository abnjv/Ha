// This file simulates a response from a Large Language Model (LLM).
// In a real application, this would be replaced with an API call to a service like OpenAI, Google AI, etc.

const knowledgeBase = {
  greeting: {
    keywords: ['hello', 'hi', 'hey', 'مرحبا', 'اهلا'],
    response: "Hello there! I'm the support assistant. How can I help you with the platform today?"
  },
  addFriend: {
    keywords: ['friend', 'add', 'صديق', 'اضافة'],
    response: "Of course! To add a friend, you can navigate to the 'Friends' section and use the 'Add Friend' feature. You'll typically need their unique user ID to send a request."
  },
  createGroup: {
    keywords: ['group', 'create', 'مجموعة', 'انشاء'],
    response: "Creating a group is easy! Just go to your friends list where you'll find an option to 'Create a New Group'. From there, you can select which friends to invite."
  },
  videoCall: {
    keywords: ['video', 'call', 'مكالمة', 'فيديو'],
    response: "To initiate a video call, you first need to be in a room with other participants. Once you've joined a room, you'll see controls at the bottom to start your video and microphone."
  },
  liveStream: {
    keywords: ['live', 'stream', 'بث', 'مباشر'],
    response: "Interested in broadcasting? You can start your own live stream directly from the Home screen by clicking the 'Go Live' button. Your stream will then be visible to others on the platform."
  },
  games: {
    keywords: ['game', 'play', 'لعبة', 'العب'],
    response: "Yes, we have games! You can challenge a friend to a game like Tic-Tac-Toe directly from your private chat window. We also have a Game Lobby where you can find public games to join."
  },
  creator: {
      keywords: ['creator', 'dashboard', 'upload', 'content', 'مبدع', 'محتوى'],
      response: "The Creator Platform is for users who want to share their own content! If you have creator access, you can find your Creator Dashboard link on the home screen to upload items, view stats, and more."
  },
  subscription: {
      keywords: ['subscribe', 'subscription', 'premium', 'vip', 'اشتراك'],
      response: "You can support your favorite creators by subscribing to their content. Visit the 'Subscriptions' page from the home screen to see the available plans."
  },
  thankYou: {
      keywords: ['thanks', 'thank you', 'شكرا'],
      response: "You're very welcome! Is there anything else I can help you with today?"
  }
};

const defaultResponse = "That's a great question. I'm still in training and don't have the answer for that right now. For more complex issues, you can always reach out to our human support team at support@example.com.";
const confusedResponse = "I'm not quite sure what you mean. Could you please rephrase your question?";

/**
 * Simulates getting a response from an LLM by parsing the user's message.
 * @param {string} message The user's input message.
 * @returns {string} The simulated AI response.
 */
export const getBotResponse = (message) => {
  const lowerCaseMessage = message.toLowerCase().trim();

  if (lowerCaseMessage.length === 0) {
    return confusedResponse;
  }

  let foundTopics = [];

  for (const topic in knowledgeBase) {
    for (const keyword of knowledgeBase[topic].keywords) {
      if (lowerCaseMessage.includes(keyword)) {
        foundTopics.push(knowledgeBase[topic]);
        break;
      }
    }
  }

  if (foundTopics.length === 1) {
    return foundTopics[0].response;
  }

  if (foundTopics.length > 1) {
    return "It sounds like you're asking about a few things. Could you please focus on one question at a time so I can provide the best help?";
  }

  return defaultResponse;
};
