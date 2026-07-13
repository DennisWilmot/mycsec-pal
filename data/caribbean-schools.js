export const gradeOrFormOptions = [
  'Grade 7 / Form 1',
  'Grade 8 / Form 2',
  'Grade 9 / Form 3',
  'Grade 10 / Form 4',
  'Grade 11 / Form 5',
  'Grade 12 / Lower 6',
  'Grade 13 / Upper 6',
];

export const caribbeanSchools = {
  Jamaica: [
    'Ardenne High School', 'Campion College', 'Calabar High School', 'Cornwall College',
    'Holy Childhood High School', 'Immaculate Conception High School', 'Jamaica College',
    'Kingston College', 'Manchester High School', 'Mona High School', 'Montego Bay High School',
    'St Andrew High School for Girls', "St George's College", 'Westwood High School',
    "Wolmer's Boys' School", "Wolmer's Girls' School",
  ],
  'Trinidad and Tobago': [
    "Bishop Anstey High School", 'Fatima College', 'Hillview College', 'Holy Name Convent',
    'Naparima College', 'Naparima Girls’ High School', 'Presentation College Chaguanas',
    'Presentation College San Fernando', "Queen's Royal College", "St Joseph's Convent Port of Spain",
    "St Joseph's Convent San Fernando", 'Trinity College East',
  ],
  Barbados: [
    'Alexandra School', 'Christ Church Foundation School', 'Combermere School', 'Harrison College',
    'Queen’s College', 'Springer Memorial School', 'The Lodge School', 'The St Michael School',
  ],
  Guyana: [
    'Anna Regina Multilateral School', "Bishop's High School", 'New Amsterdam Secondary School',
    "President's College", "Queen's College", "St Joseph High School", "St Rose's High School",
    'St Stanislaus College',
  ],
  'The Bahamas': [
    'C. C. Sweeting Senior High School', 'C. R. Walker Senior High School', 'C. V. Bethel Senior High School',
    'Doris Johnson Senior High School', "Queen's College", "St Augustine's College",
  ],
  Belize: [
    'Belmopan Comprehensive School', 'Edward P. Yorke High School', 'Pallotti High School',
    'Sacred Heart College', "St Catherine Academy", "St John's College",
  ],
  'Antigua and Barbuda': ['Antigua Girls’ High School', 'Antigua Grammar School', 'Christ the King High School', 'Princess Margaret School'],
  Dominica: ['Convent High School', 'Dominica Grammar School', 'Goodwill Secondary School', 'St Martin Secondary School'],
  Grenada: ['Grenada Boys’ Secondary School', 'St Joseph’s Convent Grenville', 'St Joseph’s Convent St George’s', 'Wesley College'],
  'Saint Kitts and Nevis': ['Basseterre High School', 'Charlestown Secondary School', 'Cayon High School', 'Verchilds High School'],
  'Saint Lucia': ['Castries Comprehensive Secondary School', 'Leon Hess Comprehensive Secondary School', 'St Joseph’s Convent', 'Vieux Fort Comprehensive Secondary School'],
  'Saint Vincent and the Grenadines': ['St Vincent Boys’ Grammar School', 'St Vincent Girls’ High School', 'St Joseph’s Convent Kingstown', 'Thomas Saunders Secondary School'],
};

export function schoolsForCountry(country) {
  return ['Homeschooled', ...(caribbeanSchools[country] || [])];
}
