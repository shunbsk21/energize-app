// File: /Users/shunfurukawa/Desktop/Web-app/energize/app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

const questions = [
  {
    group: 'Personal Growth',
    items: [
      'How important is personal development to you?',
      'Do you prioritize learning new skills?',
      'How often do you seek feedback for improvement?',
      'Do you set personal goals regularly?',
    ],
  },
  {
    group: 'Relationships',
    items: [
      'How important are friendships in your life?',
      'Do you invest time in family relationships?',
      'How often do you communicate with loved ones?',
      'Do you value teamwork and collaboration?',
    ],
  },
  {
    group: 'Health',
    items: [
      'How important is physical health to you?',
      'Do you prioritize mental well-being?',
      'How often do you exercise?',
      'Do you maintain a balanced diet?',
    ],
  },
  {
    group: 'Career',
    items: [
      'How important is job satisfaction to you?',
      'Do you seek advancement in your career?',
      'How often do you network professionally?',
      'Do you value work-life balance?',
    ],
  },
  {
    group: 'Finance',
    items: [
      'How important is financial security to you?',
      'Do you save regularly?',
      'How often do you budget your expenses?',
      'Do you invest in your future?',
    ],
  },
  {
    group: 'Community',
    items: [
      'How important is community involvement to you?',
      'Do you volunteer your time?',
      'How often do you participate in local events?',
      'Do you support local businesses?',
    ],
  },
];

const ValueDiagnosis: React.FC = () => {
  const [responses, setResponses] = useState<number[][]>(Array(6).fill(Array(4).fill(0)));
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (groupIndex: number, questionIndex: number, value: number) => {
    const newResponses = [...responses];
    newResponses[groupIndex][questionIndex] = value;
    setResponses(newResponses);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const calculateResults = () => {
    return responses.map((groupResponses) => groupResponses.reduce((a, b) => a + b, 0));
  };

  const results = submitted ? calculateResults() : null;

  return (
    <div>
      <h1>Value Diagnosis</h1>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {questions.map((group, groupIndex) => (
          <div key={groupIndex}>
            <h2>{group.group}</h2>
            {group.items.map((question, questionIndex) => (
              <div key={questionIndex}>
                <label>{question}</label>
                <select
                  onChange={(e) => handleChange(groupIndex, questionIndex, Number(e.target.value))}
                  defaultValue={responses[groupIndex][questionIndex]}
                >
                  <option value={0}>Not Important</option>
                  <option value={1}>Somewhat Important</option>
                  <option value={2}>Important</option>
                  <option value={3}>Very Important</option>
                </select>
              </div>
            ))}
          </div>
        ))}
        <button type="submit">Submit</button>
      </form>

      {submitted && results && (
        <div>
          <h2>Your Results</h2>
          {results.map((score, index) => (
            <div key={index}>
              <strong>{questions[index].group}:</strong> {score}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValueDiagnosis;