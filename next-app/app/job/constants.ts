export const committees = [
  {
    id: 'media',
    name: 'Media Committee',
    nameAr: 'لجنة الميديا',
    emoji: '🎨',
    description: 'Design posts, edit media, photography & presentations',
  },
  {
    id: 'mentor',
    name: 'Mentorship Committee',
    nameAr: 'لجنة المينتور',
    emoji: '🧠',
    description: 'Guide teams, track progress & bridge with instructors',
  },
  {
    id: 'organizing',
    name: 'Organizing Committee',
    nameAr: 'لجنة التنظيم',
    emoji: '👔',
    description: 'Manage events, welcome newcomers & represent ICPC HUE',
  },
  {
    id: 'instructor',
    name: 'Instructor',
    nameAr: 'إنستراكتور',
    emoji: '🎓',
    description: 'Teach algorithms, data structures & competitive programming',
  },
] as const;

export const mediaSkills = [
  'Graphic Design (Photoshop / Illustrator / Canva)',
  'Video Editing & Reels',
  'PowerPoint / Presentation Design',
  'Photography & Videography',
] as const;

export const tshirtSizes = ['S', 'M', 'L', 'XL', '2XL'] as const;

export const weeklyHoursOptions = ['3–5 hours', '5–10 hours', '10+ hours'] as const;
