// filepath: /Users/shunfurukawa/Desktop/Web-app/energize/app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

const questions = [
  {
    group: 'Personal Growth',
    items: [
      'How important is personal development to you?',
      'Do you prioritize learning new skills?',
      'Is self-reflection a regular part of your life?',
      'Do you seek feedback to improve yourself?'
    ]
  },
  {
    group: 'Relationships',
    items: [
      'How important are your friendships?',
      'Do you value family time?',
      'Is maintaining a romantic relationship important to you?',
      'Do you invest time in building new relationships?'
    ]
  },
  {
    group: 'Health',
    items: [
      'How important is physical health to you?',
      'Do you prioritize mental well-being?',
      'Is maintaining a balanced diet important?',
      'Do you exercise regularly?'
    ]
  },
  {
    group: 'Career',
    items: [
      'How important is job satisfaction to you?',
      'Do you seek advancement in your career?',
      'Is work-life balance a priority?',
      'Do you value job security?'
    ]
  },
  {
    group: 'Finance',
    items: [
      'How important is financial stability to you?',
      'Do you save for the future?',
      'Is investing important in your life?',
      'Do you budget your expenses?'
    ]
  },
  {
    group: 'Leisure',
    items: [
      'How important is leisure time to you?',
      'Do you prioritize hobbies?',
      'Is travel important in your life?',
      'Do you enjoy spending time in nature?'
    ]
  }
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
      const score = responses.slice(groupIndex * 4, groupIndex * 4 + 4).reduce((a, b) => a + b, 0);
      return { group: group.group, score };
    });
    return results;
  };

  return (
    <div>
      <h1>Value Diagnosis</h1>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {questions.map((questionGroup, groupIndex) => (
          <div key={groupIndex}>
            <h2>{questionGroup.group}</h2>
            {questionGroup.items.map((question, index) => (
              <div key={index}>
                <label>
                  {question}
                  <select value={responses[groupIndex * 4 + index]} onChange={(e) => handleChange(groupIndex * 4 + index, Number(e.target.value))}>
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

      {submitted && (
        <div>
          <h2>Your Results</h2>
          {calculateResults().map((result, index) => (
            <div key={index}>
              <strong>{result.group}:</strong> {result.score} points
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValueDiagnosis;