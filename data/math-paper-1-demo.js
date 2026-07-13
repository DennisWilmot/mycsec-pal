const q = (number, module, topic, objective, profile, prompt, options, correctAnswer, visual = null) => ({
  id: `math-p1-demo-q${number}`,
  number,
  module,
  topic,
  objective,
  profile,
  difficulty: profile === 'R' ? 'hard' : profile === 'AK' ? 'medium' : 'easy',
  prompt,
  options,
  correctAnswer,
  visual,
  status: 'demo_review_pending',
});

const table = (headers, rows, caption) => ({ type: 'table', headers, rows, caption });
const polygon = (points, segments = [], labels = [], options = {}) => ({ type: 'polygon', points, segments, labels, ...options });
const graph = (options) => ({ type: 'graph', xDomain: [0, 10], yDomain: [0, 10], ...options });

export const mathPaper1Demo = {
  id: 'math-p1-demo-form-001',
  displayCode: 'M1-DEMO-001',
  title: 'Mathematics · Paper 1',
  syllabusEra: 'may-june-2027-onward',
  blueprintVersion: 'math-p1-2027-v1',
  durationSeconds: 5400,
  totalMarks: 60,
  status: 'demo_review_pending',
  questions: [
    q(1, 1, 'Number Theory and Computation', 'Significant figures', 'CK', 'The number 48 753 written to 3 significant figures is', ['48 700', '48 800', '48 750', '49 000'], 'B'),
    q(2, 1, 'Number Theory and Computation', 'Scientific notation', 'AK', 'Express 0.000 672 in scientific notation.', ['6.72 × 10⁻³', '6.72 × 10⁻⁴', '67.2 × 10⁻⁵', '0.672 × 10⁻⁴'], 'B'),
    q(3, 1, 'Number Theory and Computation', 'Numerical expressions', 'AK', 'Evaluate (4² + 3²) ÷ 5.', ['4', '5', '7', '25'], 'B'),
    q(4, 1, 'Number Theory and Computation', 'Problem solving', 'R', 'A club has 80 members. If 35% are juniors, how many members are not juniors?', ['28', '45', '52', '63'], 'C'),

    q(5, 1, 'Consumer Arithmetic', 'Profit and loss', 'CK', 'A bag was bought for $2 400 and sold for a profit of 15%. What was the selling price?', ['$2 040', '$2 415', '$2 760', '$3 600'], 'C'),
    q(6, 1, 'Consumer Arithmetic', 'Simple interest', 'AK', 'Find the simple interest on $8 000 for 3 years at 4% per annum.', ['$320', '$640', '$960', '$1 280'], 'C'),
    q(7, 1, 'Consumer Arithmetic', 'Exchange rates', 'AK', 'Using the exchange-rate table, how many Barbados dollars are equivalent to US$45?', ['BBD$45', 'BBD$72', 'BBD$90', 'BBD$112.50'], 'C', table(['Currency', 'Rate'], [['US$1', 'BBD$2.00'], ['TT$3', 'BBD$1.00']], 'Exchange rates')),
    q(8, 1, 'Consumer Arithmetic', 'Utilities', 'R', 'A water bill includes a fixed charge of $25 and $1.50 for each cubic metre used. If the bill was $70, how many cubic metres were used?', ['20', '25', '30', '45'], 'C'),

    q(9, 1, 'Sets', 'Types of sets', 'CK', 'Which set is infinite?', ['Factors of 24', 'Prime numbers below 20', 'Multiples of 7', 'Months beginning with J'], 'C'),
    q(10, 1, 'Sets', 'Venn diagrams', 'AK', 'The shaded region represents', ['A only', 'B only', 'A ∩ B', '(A ∪ B)′'], 'C', { type: 'venn', labels: ['A', 'B'], shade: 'intersection' }),
    q(11, 1, 'Sets', 'Number of elements', 'R', 'In a class of 40 students, 22 study French, 18 study Spanish and 7 study both. How many study neither language?', ['3', '7', '11', '33'], 'B', { type: 'venn', labels: ['French', 'Spanish'], values: { left: 15, intersection: 7, right: 11, outside: 7 } }),

    q(12, 1, 'Measurement', 'Time', 'CK', 'A journey starts at 21:35 and ends at 02:20 the next day. How long is the journey?', ['3 h 45 min', '4 h 15 min', '4 h 45 min', '5 h 15 min'], 'C'),
    q(13, 1, 'Measurement', 'Unit conversion', 'AK', 'A tank holds 2.75 m³ of water. Its capacity in litres is', ['27.5', '275', '2 750', '27 500'], 'C'),
    q(14, 1, 'Measurement', 'Area', 'AK', 'The parallel sides of the trapezium are 8 cm and 14 cm, and its perpendicular height is 6 cm. What is its area?', ['44 cm²', '66 cm²', '84 cm²', '132 cm²'], 'B', polygon({ A: [12, 82], B: [88, 82], C: [72, 24], D: [28, 24] }, [['A','B'],['B','C'],['C','D'],['D','A']], [{ at: [50, 90], text: '14 cm' }, { at: [50, 18], text: '8 cm' }, { at: [76, 53], text: '6 cm' }], { altText: 'Trapezium with parallel sides 14 centimetres and 8 centimetres and height 6 centimetres.' })),
    q(15, 1, 'Measurement', 'Circles', 'R', 'A circular path has outer radius 7 m and inner radius 5 m. What is the area of the path?', ['4π m²', '12π m²', '24π m²', '74π m²'], 'C', { type: 'circle', rings: [{ radius: 42, label: '7 m' }, { radius: 30, label: '5 m' }], shade: 'ring' }),

    q(16, 1, 'Algebra 1', 'Symbolic expressions', 'CK', 'Five less than three times n is written as', ['5 − 3n', '3(n − 5)', '3n − 5', '5n − 3'], 'C'),
    q(17, 1, 'Algebra 1', 'Linear equations', 'AK', 'Solve 5x − 7 = 18.', ['2.2', '5', '11', '25'], 'B'),
    q(18, 1, 'Algebra 1', 'Algebraic fractions', 'R', 'Simplify (6x + 9) ÷ 3.', ['2x + 3', '2x + 9', '6x + 3', '18x + 27'], 'A'),

    q(19, 1, 'Introduction to Graphs', 'Intercepts', 'CK', 'What is the y-intercept of the line shown?', ['−2', '0', '2', '4'], 'D', graph({ lines: [{ points: [[0,4],[8,0]], label: 'L' }], xDomain: [0,8], yDomain: [0,6] })),
    q(20, 1, 'Introduction to Graphs', 'Reading graphs', 'R', 'According to the graph, what is y when x = 6?', ['0', '1', '2', '3'], 'B', graph({ lines: [{ points: [[0,4],[8,0]], label: 'L' }], xDomain: [0,8], yDomain: [0,6] })),

    q(21, 2, 'Statistics 1', 'Frequency tables', 'CK', 'How many observations are represented in the table?', ['10', '15', '20', '25'], 'C', table(['Score', '2', '3', '4', '5'], [['Frequency', '3', '7', '6', '4']], 'Scores in a quiz')),
    q(22, 2, 'Statistics 1', 'Mean', 'AK', 'The mean of 4, 7, 8, 9 and 12 is', ['7', '8', '9', '10'], 'B'),
    q(23, 2, 'Statistics 1', 'Probability', 'AK', 'A bag contains 5 red, 3 blue and 2 green counters. The probability of selecting a blue counter is', ['2/10', '3/10', '5/10', '7/10'], 'B'),
    q(24, 2, 'Statistics 1', 'Problem solving', 'R', 'The mean of six numbers is 14. Five of the numbers have a sum of 61. What is the sixth number?', ['13', '14', '23', '84'], 'C'),

    q(25, 2, 'Algebra 2', 'Factorisation', 'CK', 'Factorise x² + 7x + 12.', ['(x + 2)(x + 6)', '(x + 3)(x + 4)', '(x − 3)(x − 4)', '(x + 1)(x + 12)'], 'B'),
    q(26, 2, 'Algebra 2', 'Changing the subject', 'AK', 'Given v = u + at, make t the subject.', ['t = (v − u)/a', 't = (v + u)/a', 't = a/(v − u)', 't = v − u − a'], 'A'),
    q(27, 2, 'Algebra 2', 'Variation', 'R', 'y is directly proportional to x. When x = 6, y = 15. Find y when x = 14.', ['21', '29', '35', '42'], 'C', table(['x', '6', '14'], [['y', '15', '?']], 'Direct variation')),
    q(28, 2, 'Algebra 2', 'Problem solving', 'R', 'The perimeter of the rectangle and square together is 72 m. Express y in terms of x.', ['y = 18 − 2x', 'y = 24 − 2x', 'y = 36 − 4x', 'y = 72 − 8x'], 'A', { type: 'compositeShapes', shapes: [{ kind: 'rectangle', label: '3x', side: 'x' }, { kind: 'square', side: 'y' }] }),

    q(29, 2, 'Relations, Functions and Graphs 1', 'Straight lines', 'CK', 'A line has gradient 2 and y-intercept −3. Its equation is', ['y = 2x − 3', 'y = −3x + 2', 'y = 2x + 3', 'y = x − 1'], 'A'),
    q(30, 2, 'Relations, Functions and Graphs 1', 'Functions', 'AK', 'If f(x) = 3x − 2, then f(5) is', ['7', '10', '13', '17'], 'C'),
    q(31, 2, 'Relations, Functions and Graphs 1', 'Composite functions', 'AK', 'If f(x) = x + 4 and g(x) = 2x, find f(g(3)).', ['10', '14', '18', '20'], 'A'),
    q(32, 2, 'Relations, Functions and Graphs 1', 'Perpendicular lines', 'R', 'The line L has gradient −2. What is the gradient of a line perpendicular to L?', ['−2', '−1/2', '1/2', '2'], 'C', graph({ lines: [{ points: [[0,8],[4,0]], label: 'L' }], xDomain: [0,6], yDomain: [0,9] })),

    q(33, 2, 'Geometry and Trigonometry 1', 'Pythagoras', 'CK', 'The right-angled triangle has shorter sides 6 cm and 8 cm. Find the hypotenuse.', ['7 cm', '10 cm', '12 cm', '14 cm'], 'B', polygon({ A: [15,80], B: [15,22], C: [88,80] }, [['A','B'],['B','C'],['C','A']], [{ at: [7,52], text: '6 cm' }, { at: [50,90], text: '8 cm' }], { rightAngle: 'A' })),
    q(34, 2, 'Geometry and Trigonometry 1', 'Trigonometric ratios', 'AK', 'For angle θ, which ratio equals 8/10?', ['sin θ', 'cos θ', 'tan θ', '1/tan θ'], 'A', polygon({ A: [15,80], B: [15,22], C: [88,80] }, [['A','B'],['B','C'],['C','A']], [{ at: [7,52], text: '8' }, { at: [52,43], text: '10' }, { at: [82,72], text: 'θ' }], { rightAngle: 'A' })),
    q(35, 2, 'Geometry and Trigonometry 1', 'Bearings', 'AK', 'B is 12 km from A on a bearing of 120°. Which expression gives the distance of B east of A?', ['12 sin 30°', '12 cos 30°', '12 sin 120°', '12 cos 120°'], 'C', { type: 'bearing', bearing: 120, distance: '12 km', from: 'A', to: 'B' }),
    q(36, 2, 'Geometry and Trigonometry 1', 'Similarity', 'R', 'The smaller triangle has one-half the corresponding side lengths of the larger triangle. If the larger area is 48 cm², what is the smaller area?', ['12 cm²', '24 cm²', '36 cm²', '96 cm²'], 'A', { type: 'similarTriangles', scale: 0.5, largerArea: '48 cm²' }),

    q(37, 2, 'Vectors and Matrices 1', 'Order of a matrix', 'CK', 'What is the order of matrix M?', ['2 × 2', '2 × 3', '3 × 2', '3 × 3'], 'C', { type: 'matrix', values: [[2,5],[1,-3],[4,7]], label: 'M' }),
    q(38, 2, 'Vectors and Matrices 1', 'Matrix operations', 'CK', 'If A is 2 × 3 and AB is defined, which could be the order of B?', ['2 × 2', '2 × 3', '3 × 1', '4 × 3'], 'C'),
    q(39, 2, 'Vectors and Matrices 1', 'Scalars and vectors', 'AK', 'Which quantity is a vector?', ['Mass', 'Temperature', 'Displacement', 'Time'], 'C'),
    q(40, 2, 'Vectors and Matrices 1', 'Vector addition', 'R', 'Which diagram represents R = P + Q?', ['A', 'B', 'C', 'D'], 'B', { type: 'vectorOptions' }),

    q(41, 3, 'Statistics 2', 'Grouped data', 'CK', 'What is the modal class?', ['0–9', '10–19', '20–29', '30–39'], 'C', table(['Class', '0–9', '10–19', '20–29', '30–39'], [['Frequency', '4', '7', '12', '5']], 'Grouped scores')),
    q(42, 3, 'Statistics 2', 'Grouped data', 'AK', 'What is the lower class boundary of 20–29?', ['19', '19.5', '20', '20.5'], 'B', table(['Class', '0–9', '10–19', '20–29', '30–39'], [['Frequency', '4', '7', '12', '5']], 'Grouped scores')),
    q(43, 3, 'Statistics 2', 'Cumulative frequency', 'AK', 'According to the curve, the median is approximately', ['30', '40', '50', '70'], 'C', graph({ lines: [{ points: [[0,0],[20,10],[40,25],[50,50],[60,75],[80,100]], curved: true }], xDomain: [0,80], yDomain: [0,100], axisLabels: ['Score','Cumulative frequency'] })),
    q(44, 3, 'Statistics 2', 'Contingency tables', 'R', 'A person is selected from those who own a dog. What is the probability that the person also owns a cat?', ['1/10', '1/4', '1/2', '3/4'], 'B', table(['', 'Dog', 'No dog', 'Total'], [['Cat', '2', '3', '5'], ['No cat', '6', '9', '15'], ['Total', '8', '12', '20']], 'Pet ownership')),

    q(45, 3, 'Relations, Functions and Graphs 2', 'Non-linear graphs', 'CK', 'Which graph represents a linear function?', ['A', 'B', 'C', 'D'], 'C', { type: 'graphOptions' }),
    q(46, 3, 'Relations, Functions and Graphs 2', 'Speed-time graphs', 'CK', 'During which interval is the speed constant?', ['0–2 s', '2–5 s', '5–7 s', '7–10 s'], 'B', graph({ lines: [{ points: [[0,0],[2,4],[5,4],[7,8],[10,0]] }], xDomain: [0,10], yDomain: [0,10], axisLabels: ['Time','Speed'] })),
    q(47, 3, 'Relations, Functions and Graphs 2', 'Speed-time graphs', 'AK', 'What is the acceleration during the first 2 seconds?', ['0.5 m/s²', '2 m/s²', '4 m/s²', '8 m/s²'], 'B', graph({ lines: [{ points: [[0,0],[2,4],[5,4],[7,8],[10,0]] }], xDomain: [0,10], yDomain: [0,10], axisLabels: ['Time','Speed'] })),
    q(48, 3, 'Relations, Functions and Graphs 2', 'Linear inequalities', 'AK', 'Which number line represents −2 ≤ x < 3?', ['A', 'B', 'C', 'D'], 'A', { type: 'numberLineOptions', interval: { from: -2, to: 3, closedFrom: true, closedTo: false } }),
    q(49, 3, 'Relations, Functions and Graphs 2', 'Linear programming', 'R', 'Which point is a vertex of the shaded feasible region?', ['(0, 0)', '(2, 6)', '(4, 4)', '(8, 8)'], 'C', graph({ lines: [{ points: [[0,8],[8,0]] }, { points: [[0,2],[8,6]] }], shade: [[0,2],[0,8],[4,4]], xDomain: [0,8], yDomain: [0,8] })),
    q(50, 3, 'Relations, Functions and Graphs 2', 'Linear programming', 'R', 'For P = 3x + 2y, which listed feasible point gives the greatest value?', ['(0, 2)', '(0, 8)', '(4, 4)', '(8, 0)'], 'D', graph({ lines: [{ points: [[0,8],[8,0]] }, { points: [[0,2],[8,6]] }], shade: [[0,2],[0,8],[4,4],[8,0]], xDomain: [0,8], yDomain: [0,8] })),

    q(51, 3, 'Geometry and Trigonometry 2', 'Reflection', 'CK', 'Triangle A′B′C′ is the reflection of ABC in which line?', ['x = 0', 'y = 0', 'y = x', 'y = −x'], 'A', { type: 'transformationGrid', original: [[1,1],[2,1],[1,3]], image: [[-1,1],[-2,1],[-1,3]] }),
    q(52, 3, 'Geometry and Trigonometry 2', 'Rotation', 'AK', 'The point (3, −2) is rotated 90° anticlockwise about the origin. Its image is', ['(−2, −3)', '(2, 3)', '(−3, 2)', '(3, 2)'], 'B'),
    q(53, 3, 'Geometry and Trigonometry 2', 'Sine rule', 'AK', 'Which expression gives the length b?', ['10 sin 70° / sin 45°', '10 sin 45° / sin 70°', '10 cos 45°', '10 tan 70°'], 'A', polygon({ A: [14,82], B: [50,18], C: [88,82] }, [['A','B'],['B','C'],['C','A']], [{ at: [20,74], text: '45°' }, { at: [80,74], text: '70°' }, { at: [68,48], text: '10' }, { at: [30,48], text: 'b' }])),
    q(54, 3, 'Geometry and Trigonometry 2', 'Bearings', 'AK', 'The bearing of B from A is 235°. What is the bearing of A from B?', ['055°', '125°', '235°', '305°'], 'A', { type: 'bearing', bearing: 235, distance: 'B', from: 'A', to: 'B' }),
    q(55, 3, 'Geometry and Trigonometry 2', 'Circle theorems', 'R', 'Angle ACB subtends diameter AB. What is angle ACB?', ['45°', '60°', '90°', '180°'], 'C', { type: 'circleTriangle', diameter: ['A','B'], point: 'C' }),
    q(56, 3, 'Geometry and Trigonometry 2', 'Combined transformations', 'R', 'The image is obtained by reflecting the shape in the y-axis and then in the x-axis. The single equivalent transformation is', ['a translation', 'a 90° rotation', 'a 180° rotation about the origin', 'an enlargement'], 'C', { type: 'transformationGrid', original: [[2,1],[4,1],[3,3]], image: [[-2,-1],[-4,-1],[-3,-3]] }),

    q(57, 3, 'Vectors and Matrices 2', 'Transformation matrices', 'CK', 'Which transformation is represented by the matrix [[−1,0],[0,1]]?', ['Reflection in the x-axis', 'Reflection in the y-axis', 'Rotation 90°', 'Enlargement scale factor 2'], 'B'),
    q(58, 3, 'Vectors and Matrices 2', 'Determinants', 'CK', 'Find the determinant of [[5,2],[3,4]].', ['14', '17', '20', '26'], 'A', { type: 'matrix', values: [[5,2],[3,4]], label: 'A' }),
    q(59, 3, 'Vectors and Matrices 2', 'Position vectors', 'AK', 'P is (2, 5) and Q is (−1, 9). The vector PQ is', ['(−3, 4)', '(1, 14)', '(3, −4)', '(−1, 4)'], 'A', graph({ points: [{ x: 2, y: 5, label: 'P' }, { x: -1, y: 9, label: 'Q' }], xDomain: [-3,4], yDomain: [0,10] })),
    q(60, 3, 'Vectors and Matrices 2', 'Matrix problem solving', 'R', 'Matrix A maps the point (2, 1) to (5, 4). Which matrix could be A?', ['[[2,1],[1,2]]', '[[1,2],[2,1]]', '[[2,0],[0,2]]', '[[3,1],[1,3]]'], 'A', { type: 'matrixMapping', input: [2,1], output: [5,4] }),
  ],
};
