// filepath: /Users/shunfurukawa/Desktop/Web-app/energize/app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

const questions = [
  {
    group: 'Personal Growth',
    items: [
      'How important is personal development to you?',
      'Do you prioritize learning new skills?',
      'How often do you set personal goals?',
      'Do you seek feedback to improve yourself?'
    ]
  },
  {
    group: 'Relationships',
    items: [
      'How important are friendships in your life?',
      'Do you value family time?',
      'How often do you communicate with loved ones?',
      'Do you prioritize building new relationships?'
    ]
  },
  {
    group: 'Health',
    items: [
      'How important is physical health to you?',
      'Do you prioritize mental well-being?',
      'How often do you exercise?',
      'Do you maintain a balanced diet?'
    ]
  },
  {
    group: 'Career',
    items: [
      'How important is job satisfaction to you?',
      'Do you seek career advancement?',
      'How often do you network professionally?',
      'Do you value work-life balance?'
    ]
  },
  {
    group: 'Finance',
    items: [
      'How important is financial security to you?',
      'Do you save regularly?',
      'How often do you budget your expenses?',
      'Do you invest for the future?'
    ]
  },
  {
    group: 'Community',
    items: [
      'How important is community involvement to you?',
      'Do you volunteer your time?',
      'How often do you participate in local events?',
      'Do you support local businesses?'
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const calculateResults = () => {
    const scores = questions.map((group, groupIndex) => {
      const groupScore = responses.slice(groupIndex * 4, groupIndex * 4 + 4).reduce((a, b) => a + b, 0);
      return { group: group.group, score: groupScore };
    });
    return scores;
  };

  return (
    <div>
      <h1>Value Diagnosis</h1>
      <form onSubmit={handleSubmit}>
        {questions.map((questionGroup, groupIndex) => (
          <div key={groupIndex}>
            <h2>{questionGroup.group}</h2>
            {questionGroup.items.map((question, questionIndex) => (
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
              <strong>{result.group}:</strong> {result.score}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValueDiagnosis;