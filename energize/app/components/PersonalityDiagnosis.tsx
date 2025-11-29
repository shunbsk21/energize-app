// filepath: /Users/shunfurukawa/Desktop/Web-app/energize/app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

const questions = [
  {
    group: 'Personal Growth',
    items: [
      'How important is personal development to you?',
      'Do you prioritize learning new skills?',
      'Is self-reflection a regular part of your life?',
      'Do you seek feedback from others to improve yourself?',
    ],
  },
  {
    group: 'Relationships',
    items: [
      'How important are your friendships?',
      'Do you value family time?',
      'Is maintaining a romantic relationship important to you?',
      'Do you invest time in networking?',
    ],
  },
  {
    group: 'Health',
    items: [
      'How important is physical health to you?',
      'Do you prioritize mental well-being?',
      'Is maintaining a balanced diet important?',
      'Do you engage in regular exercise?',
    ],
  },
  {
    group: 'Career',
    items: [
      'How important is job satisfaction to you?',
      'Do you seek advancement in your career?',
      'Is work-life balance a priority for you?',
      'Do you value financial stability?',
    ],
  },
  {
    group: 'Community',
    items: [
      'How important is community involvement to you?',
      'Do you participate in local events?',
      'Is volunteering a priority for you?',
      'Do you support local businesses?',
    ],
  },
  {
    group: 'Spirituality',
    items: [
      'How important is spirituality or religion to you?',
      'Do you engage in practices that promote inner peace?',
      'Is connecting with nature important to you?',
      'Do you seek a sense of purpose in life?',
    ],
  },
];

const ValueDiagnosis: React.FC = () => {
  const [responses, setResponses] = useState<number[]>(Array(24).fill(0));
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (index: number, value: number) => {
    const newResponses = [...responses];
    newResponses[index] = value;
    setResponses(newResponses);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const calculateResults = () => {
    const results = questions.map((group, groupIndex) => {
      const score = group.items.reduce((acc, _, index) => acc + responses[groupIndex * 4 + index], 0);
      return { group: group.group, score };
    });
    return results;
  };

  const results = submitted ? calculateResults() : null;

  return (
    <div>
      <h1>Value Diagnosis</h1>
      {!submitted ? (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {questions.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h2>{group.group}</h2>
              {group.items.map((question, index) => (
                <div key={index}>
                  <label>
                    {question}
                    <select
                      value={responses[groupIndex * 4 + index]}
                      onChange={(e) => handleChange(groupIndex * 4 + index, Number(e.target.value))}
                    >
                      <option value={0}>Not Important</option>
                      <option value={1}>Somewhat Important</option>
                      <option value={2}>Important</option>
                      <option value={3}>Very Important</option>
                    </select>
                  </label>
                </div>
              ))}
            </div>
          ))}
          <button type="submit">Submit</button>
        </form>
      ) : (
        <div>
          <h2>Your Results</h2>
          {results?.map((result) => (
            <div key={result.group}>
              <strong>{result.group}:</strong> {result.score}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValueDiagnosis;