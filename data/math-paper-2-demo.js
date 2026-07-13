const part = (id, label, prompt, marks, visual = null, responseType = 'working') => ({ id, label, prompt, marks, visual, responseType });
const table = (headers, rows, caption) => ({ type: 'table', headers, rows, caption });
const polygon = (points, segments, labels = [], options = {}) => ({ type: 'polygon', points, segments, labels, ...options });
const graph = (options) => ({ type: 'graph', xDomain: [0, 10], yDomain: [0, 10], ...options });

export const mathPaper2Demo = {
  id: 'math-p2-demo-form-001',
  displayCode: 'M2-DEMO-001',
  title: 'Mathematics · Paper 2',
  syllabusEra: 'may-june-2027-onward',
  blueprintVersion: 'math-p2-2027-v1',
  durationSeconds: 9600,
  totalMarks: 90,
  status: 'demo_review_pending',
  questions: [
    {
      id: 'math-p2-demo-q1', number: 1, module: 1, title: 'Number and consumer arithmetic', marks: 9,
      parts: [
        part('1a', '(a)', 'Express 0.000 864 in scientific notation.', 2),
        part('1b', '(b)', 'A laptop is marked at $96 000. During a sale, its price is reduced by 15%. Calculate the sale price.', 3),
        part('1c', '(c)', 'Jada invests $81 600 at 5% simple interest per annum. Calculate the number of years required for the investment to earn $16 320 in interest.', 4),
      ],
    },
    {
      id: 'math-p2-demo-q2', number: 2, module: 1, title: 'Algebra, sets and measurement', marks: 12,
      parts: [
        part('2a', '(a)', 'Solve 3(2x − 5) + 4 = 19.', 3),
        part('2b', '(b)', 'In a group of 42 students, 25 study French, 21 study Spanish and 9 study both languages. Determine the number who study neither language.', 4, { type: 'venn', labels: ['French', 'Spanish'] }),
        part('2c', '(c)', 'The diagram shows a trapezium with parallel sides 18 cm and 10 cm and perpendicular height 7 cm. Calculate its area.', 3, polygon({ A: [12,82], B: [90,82], C: [70,24], D: [30,24] }, [['A','B'],['B','C'],['C','D'],['D','A']], [{ at: [48,92], text: '18 cm' }, { at: [47,18], text: '10 cm' }, { at: [75,55], text: '7 cm' }])),
        part('2d', '(d)', 'A map uses the scale 1 : 50 000. A road measures 8.4 cm on the map. Calculate the actual distance in kilometres.', 2),
      ],
    },
    {
      id: 'math-p2-demo-q3', number: 3, module: 1, title: 'Investigation', marks: 9,
      parts: [
        part('3a', '(a)', 'Complete the table for the growing tile pattern.', 3, table(['Figure number, n', '1', '2', '3', '4'], [['Number of tiles, T', '5', '8', '11', '?']], 'Growing tile pattern'), 'short'),
        part('3b', '(b)', 'Write an expression for T in terms of n.', 2),
        part('3c', '(c)', 'Determine the number of tiles in Figure 25.', 2),
        part('3d', '(d)', 'Explain why a figure in this pattern cannot contain exactly 100 tiles.', 2),
      ],
    },
    {
      id: 'math-p2-demo-q4', number: 4, module: 2, title: 'Algebra and functions', marks: 12,
      parts: [
        part('4a', '(a)', 'Factorise completely: 2x² − 9x + 4.', 3),
        part('4b', '(b)', 'Hence solve 2x² − 9x + 4 = 0.', 3),
        part('4c', '(c)', 'Given f(x) = 2x − 1 and g(x) = x² + 3, determine gf(2).', 2),
        part('4d', '(d)', 'The graph of y = x² − 4x − 5 is shown. State the coordinates of its turning point and its positive x-intercept.', 4, graph({ xDomain: [-2,8], yDomain: [-10,12], xTicks: [-2,0,2,4,6,8], yTicks: [-10,-5,0,5,10], lines: [{ points: [[-1,0],[0,-5],[1,-8],[2,-9],[3,-8],[4,-5],[5,0],[6,7]] }], axisLabels: ['x','y'] })),
      ],
    },
    {
      id: 'math-p2-demo-q5', number: 5, module: 2, title: 'Geometry and trigonometry', marks: 9,
      parts: [
        part('5a', '(a)', 'Calculate the length BC in the right-angled triangle. Give your answer to 3 significant figures.', 3, polygon({ A: [14,82], B: [14,22], C: [88,82] }, [['A','B'],['B','C'],['C','A']], [{ at: [6,53], text: '9 cm' }, { at: [52,92], text: '12 cm' }], { altText: 'Right-angled triangle ABC with AB 9 centimetres and AC 12 centimetres.' })),
        part('5b', '(b)', 'A second triangle is similar to ABC and has a corresponding hypotenuse of 25 cm. Determine its shortest side.', 3),
        part('5c', '(c)', 'From point P, the bearing of Q is 128° and PQ = 18 km. Calculate the component of PQ due east of P.', 3, { type: 'bearing', bearing: 128, distance: '18 km', from: 'P', to: 'Q' }),
      ],
    },
    {
      id: 'math-p2-demo-q6', number: 6, module: 2, title: 'Statistics and matrices', marks: 9,
      parts: [
        part('6a', '(a)', 'The table shows the number of books read by 30 students. Calculate the mean number of books read.', 4, table(['Books', '0', '1', '2', '3', '4'], [['Frequency', '2', '5', '10', '8', '5']], 'Books read in one month')),
        part('6b', '(b)', 'A team receives 3 points for a win, 1 point for a draw and 0 points for a loss. Write a 3 × 1 matrix P to represent the points awarded.', 2, { type: 'matrix', values: [[3],[1],[0]], label: 'P' }),
        part('6c', '(c)', 'Team A recorded 6 wins, 3 draws and 1 loss. Team B recorded 4 wins, 5 draws and 1 loss. Write a matrix R and use matrix multiplication to calculate the points earned by both teams.', 3),
      ],
    },
    {
      id: 'math-p2-demo-q7', number: 7, module: 3, title: 'Vectors and matrices', marks: 9,
      parts: [
        part('7a', '(a)', 'Points P(−2, 3), Q(4, 7) and R(7, 9) are shown. Find the vectors PQ and QR.', 3, graph({ xDomain: [-4,10], yDomain: [0,11], xTicks: [-4,-2,0,2,4,6,8,10], yTicks: [0,2,4,6,8,10], points: [{x:-2,y:3,label:'P'},{x:4,y:7,label:'Q'},{x:7,y:9,label:'R'}] })),
        part('7b', '(b)', 'Use your vectors to determine whether P, Q and R are collinear. Give a reason for your answer.', 2),
        part('7c', '(c)', 'Given A = [[4,1],[2,3]], calculate det(A).', 2, { type: 'matrix', values: [[4,1],[2,3]], label: 'A' }),
        part('7d', '(d)', 'Hence determine A⁻¹.', 2),
      ],
    },
    {
      id: 'math-p2-demo-q8', number: 8, module: 3, title: 'Geometry and bearings', marks: 9,
      parts: [
        part('8a', '(a)', 'AB is a diameter of the circle and C lies on the circumference. State angle ACB and give a reason.', 2, { type: 'circleTriangle', diameter: ['A','B'], point: 'C' }),
        part('8b', '(b)', 'In triangle ABC, AB = 14 cm, AC = 11 cm and angle BAC = 58°. Calculate BC.', 4, polygon({ A: [12,82], B: [88,82], C: [42,22] }, [['A','B'],['B','C'],['C','A']], [{at:[48,92],text:'14 cm'},{at:[22,48],text:'11 cm'},{at:[18,75],text:'58°'}])),
        part('8c', '(c)', 'A boat travels from M to N on a bearing of 065°. Determine the bearing of M from N.', 3, { type: 'bearing', bearing: 65, distance: 'MN', from: 'M', to: 'N' }),
      ],
    },
    {
      id: 'math-p2-demo-q9', number: 9, module: 3, title: 'Statistics, relations and motion', marks: 12,
      parts: [
        part('9a', '(a)', 'The grouped table shows the time taken by 40 students to complete a task. Copy and complete the cumulative-frequency column.', 3, table(['Time, t (min)', 'Frequency', 'Cumulative frequency'], [['0 < t ≤ 5','4','4'],['5 < t ≤ 10','9','?'],['10 < t ≤ 15','15','?'],['15 < t ≤ 20','8','?'],['20 < t ≤ 25','4','?']], 'Task completion times')),
        part('9b', '(b)', 'Draw a cumulative-frequency curve and use it to estimate the median time.', 4, graph({ xDomain: [0,25], yDomain: [0,40], xTicks: [0,5,10,15,20,25], yTicks: [0,5,10,15,20,25,30,35,40], xSnap: 1, ySnap: 1, axisLabels: ['Time (min)','Cumulative frequency'] }), 'graph'),
        part('9c', '(c)', 'The velocity-time graph shows a vehicle accelerating uniformly from 0 to 20 m/s in 8 seconds, travelling at constant velocity for 6 seconds, then decelerating to rest in 4 seconds. Calculate the total distance travelled.', 5, graph({ xDomain: [0,18], yDomain: [0,24], xTicks: [0,2,4,6,8,10,12,14,16,18], yTicks: [0,4,8,12,16,20,24], lines: [{ points: [[0,0],[8,20],[14,20],[18,0]] }], axisLabels: ['Time (s)','Velocity (m/s)'] })),
      ],
    },
  ],
};
