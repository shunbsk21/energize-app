// filepath: /Users/shunfurukawa/Desktop/Web-app/energize/app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

const questions = [
  {
    category: 'Personal Growth',
    items: [
      'How important is personal development to you?',
      'Do you prioritize learning new skills?',
      'Is self-reflection a regular part of your life?',
      'Do you seek feedback to improve yourself?',
    ],
  },
  {
    category: 'Relationships',
    items: [
      'How important are your friendships?',
      'Do you value family time?',
      'Is maintaining a romantic relationship important to you?',
      'Do you invest time in building new relationships?',
    ],
  },
  {
    category: 'Health',
    items: [
      'How important is physical health to you?',
      'Do you prioritize mental well-being?',
      'Is maintaining a balanced diet important?',
      'Do you exercise regularly?',
    ],
  },
  {
    category: 'Career',
    items: [
      'How important is job satisfaction to you?',
      'Do you seek career advancement?',
      'Is work-life balance important?',
      'Do you value job security?',
    ],
  },
  {
    category: 'Finance',
    items: [
      'How important is financial stability to you?',
      'Do you prioritize saving for the future?',
      'Is investing important to you?',
      'Do you budget your expenses?',
    ],
  },
  {
    category: 'Community',
    items: [
      'How important is giving back to the community?',
      'Do you participate in community events?',
      'Is environmental sustainability important to you?',
      'Do you support local businesses?',
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
    const results = questions.map((group, index) => {
      const score = responses.slice(index * 4, index * 4 + 4).reduce((a, b) => a + b, 0);
      return { category: group.category, score };
    });
    return results;
  };

  return (
    <div>
      <h1>Value Diagnosis</h1>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {questions.map((group, groupIndex) => (
          <div key={groupIndex}>
            <h2>{group.category}</h2>
            {group.items.map((question, questionIndex) => (
              <div key={questionIndex}>
                <label>
                  {question}
                  <select
                    value={responses[groupIndex * 4 + questionIndex]}
                    onChange={(e) => handleChange(groupIndex * 4 + questionIndex, Number(e.target.value))}
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

      {submitted && (
        <div>
          <h2>Your Results</h2>
          {calculateResults().map((result, index) => (
            <div key={index}>
              <strong>{result.category}:</strong> {result.score}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValueDiagnosis;