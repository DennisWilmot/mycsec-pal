const part = (id, label, prompt, marks, responseType = 'working', visual = null, markingCriteria = []) => ({ id, label, prompt, marks, responseType, visual, markingCriteria });

export const mathPaper2FormB = {
  id: 'math-p2-review-form-b', displayCode: 'M2-REVIEW-B', title: 'Mathematics · Paper 2 · Form B',
  syllabusEra: 'may-june-2027-onward', blueprintVersion: 'math-p2-2027-v1', durationSeconds: 9600,
  totalMarks: 90, status: 'approved',
  questions: [
    { id:'math-p2-review-b-q1', number:1, module:1, title:'Number and consumer arithmetic', marks:9, parts:[
      part('b1a','(a)','Write 0.004 72 in scientific notation.',2,'short',null,['1 mark for 4.72','1 mark for ×10⁻³']),
      part('b1b','(b)','A refrigerator marked at $128 000 is discounted by 12.5%. Calculate the sale price.',3,'working',null,['1 mark for finding the discount or retained percentage','1 mark for a correct calculation','1 mark for $112 000']),
      part('b1c','(c)','Keisha invests $45 000 at 4.5% simple interest per annum. How many complete years are required for the investment to earn at least $10 000 interest?',4,'working',null,['1 mark for I=Prt','1 mark for substituting values','1 mark for t≈4.938','1 mark for 5 complete years with interpretation']),
    ]},
    { id:'math-p2-review-b-q2', number:2, module:1, title:'Algebra, sets and measurement', marks:12, parts:[
      part('b2a','(a)','Solve 5(2x − 3) − 4 = 31.',3,'working',null,['1 mark for expansion','1 mark for isolating 10x','1 mark for x=5']),
      part('b2b','(b)','In a survey of 60 households, 38 use streaming service A, 27 use service B and 16 use both. Determine how many use neither service.',4,'working',{type:'venn',description:'Two overlapping circles labelled A and B inside a universal set of 60 households',data:['n(A)=38','n(B)=27','n(A∩B)=16']},['1 mark for A only=22','1 mark for B only=11','1 mark for union=49','1 mark for neither=11']),
      part('b2c','(c)','A triangular banner has base 2.4 m and perpendicular height 1.5 m. Calculate its area in square metres.',3,'working',null,['1 mark for ½bh','1 mark for substitution','1 mark for 1.8 m²']),
      part('b2d','(d)','A map scale is 1 : 25 000. A trail is 14.8 cm on the map. Calculate its actual length in kilometres.',2,'working',null,['1 mark for 370 000 cm or 3 700 m','1 mark for 3.7 km']),
    ]},
    { id:'math-p2-review-b-q3', number:3, module:1, title:'Investigation', marks:9, parts:[
      part('b3a','(a)','A sequence of dot patterns contains 7, 12, 17 and 22 dots. Write the next two terms.',2,'short',null,['1 mark for 27','1 mark for 32']),
      part('b3b','(b)','Write an expression for the number of dots, D, in Figure n.',3,'working',null,['1 mark for recognising common difference 5','1 mark for form 5n+c','1 mark for D=5n+2']),
      part('b3c','(c)','Determine the figure number that contains 202 dots.',2,'working',null,['1 mark for 5n+2=202','1 mark for n=40']),
      part('b3d','(d)','Explain why no figure in the pattern contains exactly 100 dots.',2,'working',null,['1 mark for solving 5n+2=100 or modular reasoning','1 mark for explaining n is not a whole number']),
    ]},
    { id:'math-p2-review-b-q4', number:4, module:2, title:'Algebra and functions', marks:12, parts:[
      part('b4a','(a)','Factorise completely: 3x² − 11x − 4.',3,'working',null,['1 mark for product −12','1 mark for splitting −11x correctly','1 mark for (3x+1)(x−4)']),
      part('b4b','(b)','Hence solve 3x² − 11x − 4 = 0.',3,'working',null,['1 mark for each factor equated to zero','1 mark for x=4','1 mark for x=−1/3']),
      part('b4c','(c)','Given f(x)=3x+2 and g(x)=x²−1, determine fg(2).',2,'working',null,['1 mark for g(2)=3','1 mark for f(3)=11']),
      part('b4d','(d)','The function h(x)=x²−6x+5. Determine the coordinates of its turning point and both x-intercepts.',4,'working',null,['1 mark for completing square or symmetry','1 mark for turning point (3,−4)','1 mark for factorisation (x−1)(x−5)','1 mark for intercepts (1,0) and (5,0)']),
    ]},
    { id:'math-p2-review-b-q5', number:5, module:2, title:'Geometry and trigonometry', marks:9, parts:[
      part('b5a','(a)','A right-angled triangle has hypotenuse 17 cm and one shorter side 8 cm. Calculate the other side.',3,'working',null,['1 mark for Pythagoras','1 mark for 17²−8²=225','1 mark for 15 cm']),
      part('b5b','(b)','A similar triangle has a corresponding hypotenuse of 25.5 cm. Determine the length corresponding to the 8 cm side.',3,'working',null,['1 mark for scale factor 1.5','1 mark for correct multiplication','1 mark for 12 cm']),
      part('b5c','(c)','A rescue boat travels 32 km on a bearing of 125°. Calculate the distance travelled east, correct to 1 decimal place.',3,'working',{type:'bearing',description:'North line at departure point and a 32 km path on bearing 125 degrees',data:['bearing=125°','distance=32 km']},['1 mark for identifying 32 sin125°','1 mark for calculation','1 mark for 26.2 km']),
    ]},
    { id:'math-p2-review-b-q6', number:6, module:2, title:'Statistics and matrices', marks:9, parts:[
      part('b6a','(a)','The values 1, 2, 3, 4 and 5 have frequencies 3, 6, 8, 5 and 2 respectively. Calculate the mean.',4,'working',{type:'table',description:'Frequency table for number of goals',data:['values:1,2,3,4,5','frequencies:3,6,8,5,2']},['1 mark for products','1 mark for sum fx=69','1 mark for sum f=24','1 mark for mean=2.875']),
      part('b6b','(b)','A café sells small, medium and large juices for $350, $500 and $650. Write a 3×1 price matrix P.',2,'short',null,['1 mark for correct order','1 mark for correct column matrix']),
      part('b6c','(c)','On Monday the café sells 12 small, 9 medium and 5 large juices. On Tuesday it sells 8 small, 11 medium and 7 large juices. Use matrix multiplication to find the revenue for each day.',3,'working',null,['1 mark for 2×3 sales matrix','1 mark for multiplication by P','1 mark for Monday $11 950 and Tuesday $12 850']),
    ]},
    { id:'math-p2-review-b-q7', number:7, module:3, title:'Vectors and matrices', marks:9, parts:[
      part('b7a','(a)','Points A(−3,1), B(2,6) and C(7,11) are given. Find vectors AB and BC.',3,'working',null,['1 mark for subtraction method','1 mark for AB=(5,5)','1 mark for BC=(5,5)']),
      part('b7b','(b)','State whether A, B and C are collinear and justify your answer.',2,'working',null,['1 mark for yes','1 mark for equal/proportional direction vectors']),
      part('b7c','(c)','Given M=[[3,2],[4,3]], calculate det(M).',2,'working',null,['1 mark for 3×3−2×4','1 mark for determinant 1']),
      part('b7d','(d)','Hence determine M⁻¹.',2,'working',null,['1 mark for swapping diagonal and changing off-diagonal signs','1 mark for [[3,−2],[−4,3]]']),
    ]},
    { id:'math-p2-review-b-q8', number:8, module:3, title:'Geometry and bearings', marks:9, parts:[
      part('b8a','(a)','AB is a diameter of a circle and D is on the circumference. State angle ADB and give a reason.',2,'short',{type:'geometry',description:'Circle with diameter AB and point D on circumference joined to A and B',data:['AB is a diameter']},['1 mark for 90°','1 mark for angle in a semicircle']),
      part('b8b','(b)','In triangle PQR, PQ=13 cm, PR=9 cm and angle QPR=47°. Calculate QR, correct to 3 significant figures.',4,'working',null,['1 mark for cosine rule','1 mark for correct substitution','1 mark for evaluation','1 mark for 9.52 cm']),
      part('b8c','(c)','Town Y is 24 km from town X on a bearing of 042°. Town Z is due east of X and due south of Y. Calculate XZ, correct to 1 decimal place.',3,'working',{type:'bearing',description:'Right triangle XYZ with Y on bearing 042 degrees from X, Z due east of X and south of Y',data:['XY=24 km','bearing Y from X=042°']},['1 mark for recognising east component','1 mark for 24 sin42°','1 mark for 16.1 km']),
    ]},
    { id:'math-p2-review-b-q9', number:9, module:3, title:'Statistics and functions', marks:12, parts:[
      part('b9a','(a)','The grouped times, in minutes, for 40 runners are 20–29: 5, 30–39: 11, 40–49: 15, 50–59: 7, 60–69: 2. Prepare a cumulative-frequency table.',4,'working',{type:'table',description:'Grouped frequency table of runner times',data:['20–29:5','30–39:11','40–49:15','50–59:7','60–69:2']},['1 mark each for cumulative values 5,16,31,38,40 up to 4 marks']),
      part('b9b','(b)','Use linear interpolation in the 40–49 class to estimate the median time.',4,'working',null,['1 mark for median position 20','1 mark for lower boundary 39.5 and class width 10','1 mark for interpolation 39.5+(4/15)×10','1 mark for 42.2 minutes']),
      part('b9c','(c)','A function is defined by f(x)=x²−4x−5 for −2≤x≤6. State its minimum value and solve f(x)=0.',4,'working',null,['1 mark for turning point x=2','1 mark for minimum −9','1 mark for factorisation (x−5)(x+1)','1 mark for x=−1 or 5']),
    ]},
  ],
};
