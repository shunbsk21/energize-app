// filepath: /Users/shunfurukawa/Desktop/Web-app/energize/app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

const questions = [
  {
    category: 'Personal Growth',
    items: [
      'How important is personal development to you?',
      'Do you prioritize learning new skills?',
      'How often do you set personal goals?',
      'Do you seek feedback to improve yourself?',
    ],
  },
  {
    category: 'Relationships',
    items: [
      'How important are your friendships?',
      'Do you value family time?',
      'How often do you communicate with loved ones?',
      'Do you invest time in building new relationships?',
    ],
  },
  {
    category: 'Health',
    items: [
      'How important is physical health to you?',
      'Do you prioritize mental well-being?',
      'How often do you exercise?',
      'Do you maintain a balanced diet?',
    ],
  },
  {
    category: 'Career',
    items: [
      'How important is job satisfaction to you?',
      'Do you seek advancement in your career?',
      'How often do you network professionally?',
      'Do you value work-life balance?',
    ],
  },
  {
    category: 'Finance',
    items: [
      'How important is financial security to you?',
      'Do you budget your expenses?',
      'How often do you save money?',
      'Do you invest for the future?',
    ],
  },
  {
    category: 'Community',
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

  const handleChange = (categoryIndex: number, questionIndex: number, value: number) => {
    const newResponses = [...responses];
    newResponses[categoryIndex][questionIndex] = value;
    setResponses(newResponses);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const calculateResults = () => {
    return responses.map((group) => group.reduce((a, b) => a + b, 0));
  };

  const results = submitted ? calculateResults() : null;

  return (
    <div>
      <h1>Value Diagnosis</h1>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {questions.map((group, categoryIndex) => (
          <div key={categoryIndex}>
            <h2>{group.category}</h2>
            {group.items.map((question, questionIndex) => (
              <div key={questionIndex}>
                <label>
                  {question}
                  <select
                    value={responses[categoryIndex][questionIndex]}
                    onChange={(e) => handleChange(categoryIndex, questionIndex, Number(e.target.value))}
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

      {submitted && results && (
        <div>
          <h2>Your Results</h2>
          {results.map((score, index) => (
            <div key={index}>
              <strong>{questions[index].category}:</strong> {score}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValueDiagnosis;