export const QUIZ_QUESTIONS = [
  { id: 'g1', category: 'General Knowledge', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], answer: 1, explanation: 'Mars appears reddish because of iron oxide on its surface.', tool: { label: 'Explore everyday utilities', href: '/tools' } },
  { id: 'g2', category: 'General Knowledge', question: 'How many minutes are there in 2.5 hours?', options: ['120', '130', '150', '180'], answer: 2, explanation: '2.5 × 60 = 150 minutes.', tool: { label: 'Explore converters', href: '/tools?category=Everyday' } },
  { id: 'g3', category: 'General Knowledge', question: 'Which is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], answer: 2, explanation: 'The Pacific Ocean is the largest by surface area.', tool: { label: 'Explore everyday utilities', href: '/tools' } },
  { id: 'b1', category: 'Business', question: 'A ₹1,000 item has 18% GST added. What is the total?', options: ['₹1,018', '₹1,180', '₹1,200', '₹1,800'], answer: 1, explanation: '18% of ₹1,000 is ₹180, so the total is ₹1,180.', tool: { label: 'Try GST tools', href: '/tools?category=Finance' } },
  { id: 'b2', category: 'Business', question: 'Revenue is ₹80,000 and expenses are ₹60,000. What is profit?', options: ['₹10,000', '₹20,000', '₹60,000', '₹1,40,000'], answer: 1, explanation: 'Profit = revenue − expenses = ₹20,000.', tool: { label: 'Explore business tools', href: '/tools?category=Business' } },
  { id: 'b3', category: 'Business', question: 'A ₹500 product gets a 10% discount. What is the price?', options: ['₹400', '₹450', '₹490', '₹550'], answer: 1, explanation: '10% of ₹500 is ₹50; discounted price is ₹450.', tool: { label: 'Explore finance calculators', href: '/tools?category=Finance' } },
  { id: 't1', category: 'Technology', question: 'What does JSON stand for?', options: ['Java Source Object Network', 'JavaScript Object Notation', 'Joined System Object Nodes', 'Java Syntax Online Network'], answer: 1, explanation: 'JSON means JavaScript Object Notation, a common data format.', tool: { label: 'Explore developer tools', href: '/tools?category=Developer' } },
  { id: 't2', category: 'Technology', question: 'Which HTTP status code means Not Found?', options: ['200', '301', '404', '500'], answer: 2, explanation: 'HTTP 404 indicates that the requested resource was not found.', tool: { label: 'Explore developer tools', href: '/tools?category=Developer' } },
  { id: 't3', category: 'Technology', question: 'Which of these is a version control system?', options: ['Git', 'CSS', 'HTML', 'JSON'], answer: 0, explanation: 'Git tracks changes to files and supports collaborative development.', tool: { label: 'Explore developer tools', href: '/tools?category=Developer' } },
];

export function dailyQuiz(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return ['g', 'b', 't'].map((category, index) => {
    const choices = QUIZ_QUESTIONS.filter(item => item.id.startsWith(category));
    return choices[(day + index) % choices.length];
  });
}
