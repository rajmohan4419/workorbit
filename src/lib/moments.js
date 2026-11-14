export const MOMENTS = [
  { slug: 'diwali', title: 'Diwali', emoji: '🪔', prompt: 'Tap to light the diya', reveal: 'May your Diwali shine with joy and new beginnings!', action: 'Light the diya', invitation: 'A little light for you' },
  { slug: 'birthday', title: 'Birthday', emoji: '🎂', prompt: 'Make a birthday wish', reveal: 'Happy Birthday! Here’s to a wonderful year ahead!', action: 'Make a wish', invitation: 'A wish made just for you' },
  { slug: 'anniversary', title: 'Anniversary', emoji: '💍', prompt: 'Celebrate your story', reveal: 'Happy Anniversary! May your journey together keep blooming.', action: 'Celebrate', invitation: 'Here’s to your story' },
  { slug: 'announcement', title: 'Announcement', emoji: '📣', prompt: 'Ready for the big reveal?', reveal: 'Something wonderful is happening!', action: 'Reveal', invitation: 'A little news to share' },
  { slug: 'celebrations', title: 'Celebrations', emoji: '🎉', prompt: 'Let the celebration begin', reveal: 'Congratulations! Here’s to this special milestone!', action: 'Celebrate', invitation: 'This moment is yours' },
  { slug: 'chhath-puja', title: 'Chhath Puja', emoji: '🌅', prompt: 'Watch the sun rise over the river', reveal: 'May the rising sun bring peace, health and happiness to your home. Happy Chhath Puja!', action: 'Watch the sunrise', invitation: 'A wish with the rising sun' },
  { slug: 'christmas', title: 'Christmas', emoji: '✦', prompt: 'Light the Christmas star', reveal: 'Wishing you a Christmas filled with warmth, joy and good company!', action: 'Light the star', invitation: 'A little Christmas wonder' },
];

export const MOMENT_SLUGS = MOMENTS.map(({ slug }) => slug);
export const MOMENT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'mr', label: 'मराठी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];
export const MOMENT_LANGUAGE_CODES = new Set(MOMENT_LANGUAGES.map(({ code }) => code));
export const MOMENT_SHARE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const SHARED_MOMENT_PATH = '/moments/shared';
