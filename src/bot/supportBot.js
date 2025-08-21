const faqs = [
  {
    keywords: ['friend', 'add', 'صديق', 'اضافة'],
    answer: 'To add a friend, go to the "Friends" page and click the "Add Friend" button. You will need their unique User ID.'
  },
  {
    keywords: ['group', 'create', 'مجموعة', 'انشاء'],
    answer: 'You can create a new group from the "Friends" page by clicking the "Create Group" button and inviting your friends.'
  },
  {
    keywords: ['video', 'call', 'مكالمة', 'فيديو'],
    answer: 'To start a video call, go into a group chat and click the video camera icon in the header.'
  },
  {
    keywords: ['live', 'stream', 'بث', 'مباشر'],
    answer: 'You can start your own live stream by clicking the "Go Live" button on the Home screen.'
  },
  {
      keywords: ['game', 'play', 'لعبة', 'العب'],
      answer: 'You can play Tic-Tac-Toe with a friend by going to your private chat with them and clicking the gamepad icon in the header.'
  }
];

const defaultResponse = "I'm sorry, I don't have an answer for that. If you need further assistance, please contact our support team at support@example.com.";

export const getBotResponse = (message) => {
  const lowerCaseMessage = message.toLowerCase();

  for (const faq of faqs) {
    for (const keyword of faq.keywords) {
      if (lowerCaseMessage.includes(keyword)) {
        return faq.answer;
      }
    }
  }

  return defaultResponse;
};
