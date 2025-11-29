// filepath: /Users/shunfurukawa/Desktop/Web-app/energize/app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

const questions = [
  {
    group: 'Personal Growth',
    items: [
      'How important is personal development to you?',
      'Do you prioritize learning new skills?',
      'Is self-reflection a regular practice for you?',
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
      'Is a balanced diet important in your life?',
      'Do you engage in regular exercise?'
    ]
  },
  {
    group: 'Career',
    items: [
      'How important is job satisfaction to you?',
      'Do you seek career advancement?',
      'Is work-life balance a priority for you?',
      'Do you value professional networking?'
    ]
  },
  {
    group: 'Finance',
    items: [
      'How important is financial security to you?',
      'Do you prioritize saving over spending?',
      'Is investing part of your financial strategy?',
      'Do you have a budget that you follow?'
    ]
  },
  {
    group: 'Leisure',
    items: [
      'How important is leisure time to you?',
      'Do you prioritize hobbies and interests?',
      'Is travel an important aspect of your life?',
      'Do you value relaxation and downtime?'
    ]
  }
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
    return responses.map((group) => group.reduce((a, b) => a + b, 0));
  };

  return (
    <div>
      <h1>Value Diagnosis</h1>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {questions.map((questionGroup, groupIndex) => (
          <div key={groupIndex}>
            <h2>{questionGroup.group}</h2>
            {questionGroup.items.map((question, questionIndex) => (
              <div key={questionIndex}>
                <label>
                  {question}
                  <select
                    value={responses[groupIndex][questionIndex]}
                    onChange={(e) => handleChange(groupIndex, questionIndex, Number(e.target.value))}
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
          <ul>
            {calculateResults().map((score, index) => (
              <li key={index}>
                {questions[index].group}: {score}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ValueDiagnosis;