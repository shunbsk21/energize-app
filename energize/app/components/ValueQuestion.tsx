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
      'Is work-life balance a priority?',
      'Do you value financial stability?',
    ],
  },
  {
    group: 'Community',
    items: [
      'How important is community involvement to you?',
      'Do you volunteer your time for causes you care about?',
      'Is supporting local businesses important?',
      'Do you participate in community events?',
    ],
  },
  {
    group: 'Spirituality',
    items: [
      'How important is spirituality or religion in your life?',
      'Do you engage in practices that promote inner peace?',
      'Is connecting with nature important to you?',
      'Do you seek a sense of purpose in life?',
    ],
  },
];

const ValueDiagnosis: React.FC = () => {
  const [responses, setResponses] = useState<number[]>(Array(questions.length * 4).fill(0));
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
      {!submitted ? (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {questions.map((questionGroup, groupIndex) => (
            <div key={groupIndex}>
              <h2>{questionGroup.group}</h2>
              {questionGroup.items.map((question, questionIndex) => (
                <div key={questionIndex}>
                  <label>{question}</label>
                  <select onChange={(e) => handleChange(groupIndex * 4 + questionIndex, Number(e.target.value))}>
                    <option value="0">Not Important</option>
                    <option value="1">Somewhat Important</option>
                    <option value="2">Important</option>
                    <option value="3">Very Important</option>
                  </select>
                </div>
              ))}
            </div>
          ))}
          <button type="submit">Submit</button>
        </form>
      ) : (
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