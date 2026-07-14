import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), 'utf8'));
const englishP1 = await Promise.all(['a','b','c'].map((form) => readJson(`data/english/paper-1-form-${form}-review-candidate.json`)));
const englishP2 = await Promise.all(['a','b','c'].map((form) => readJson(`data/english/paper-2-form-${form}-review-candidate.json`)));

const ledger = {
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
  countingRules: {
    mathematicsPaperOne: 'Individual multiple-choice questions.',
    mathematicsPaperTwo: 'Complete structured questions, including all dependent parts.',
    englishPaperOne: 'Individual questions are counted, but assembly locks each 20-question module to its two source stimuli.',
    englishPaperTwo: 'Printed tasks are counted; Questions 4 and 5 remain one narrative-choice route in the database.',
  },
  subjects: {
    mathematics: {
      status: 'approved',
      paperOne: { forms: 2, poolItems: 120, spineSlots: 60, candidatesPerSlot: 2, launchTarget: 300, progressPercent: 40 },
      paperTwo: { forms: 2, poolItems: 18, spineSlots: 9, candidatesPerSlot: 2, launchTarget: 27, progressPercent: 67 },
    },
    englishA: {
      status: 'approved',
      paperOne: {
        forms: englishP1.length,
        poolItems: englishP1.reduce((sum, paper) => sum + paper.questions.length, 0),
        stimulusBlocks: englishP1.reduce((sum, paper) => sum + paper.modules.reduce((moduleSum, module) => moduleSum + module.stimuli.length, 0), 0),
        moduleBlocks: englishP1.length * 3,
        launchTarget: 300,
        progressPercent: Math.round(englishP1.reduce((sum, paper) => sum + paper.questions.length, 0) / 300 * 100),
      },
      paperTwo: {
        forms: englishP2.length,
        printedTasks: englishP2.reduce((sum, paper) => sum + paper.summaryTasks.length + paper.writingTasks.length, 0),
        assembledRoutesPerForm: 6,
        launchTarget: 35,
        progressPercent: Math.round(englishP2.reduce((sum, paper) => sum + paper.summaryTasks.length + paper.writingTasks.length, 0) / 35 * 100),
      },
    },
  },
};

await writeFile(path.resolve('data/question-pool-progress.json'), `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify(ledger, null, 2));
