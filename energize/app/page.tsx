// filepath: /Users/shunfurukawa/Desktop/Web-app/energize/app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

const questions = [
  {
    group: 'Personal Growth',
    items: [
      'How important is personal development to you?',
      'Do you prioritize learning new skills?',
      'Is self-reflection a regular practice for you?',
      'Do you seek feedback from others to improve?'
    ]
  },
  {
    group: 'Relationships',
    items: [
      'How important are your friendships?',
      'Do you invest time in family relationships?',
      'Is maintaining a work-life balance important to you?',
      'Do you value open communication in relationships?'
    ]
  },
  {
    group: 'Health',
    items: [
      'How important is physical health to you?',
      'Do you prioritize mental well-being?',
      'Is regular exercise a part of your routine?',
      'Do you pay attention to your diet?'
    ]
  },
  {
    group: 'Career',
    items: [
      'How important is job satisfaction to you?',
      'Do you seek advancement in your career?',
      'Is work-life balance important in your job?',
      'Do you value teamwork and collaboration?'
    ]
  },
  {
    group: 'Finance',
    items: [
      'How important is financial security to you?',
      'Do you budget your expenses?',
      'Is saving for the future a priority?',
      'Do you invest in your financial education?'
    ]
  },
  {
    group: 'Community',
    items: [
      'How important is giving back to the community?',
      'Do you participate in community events?',
      'Is environmental sustainability important to you?',
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

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const calculateResults = () => {
    const scores = questions.map((group, groupIndex) => {
      const groupScore = responses.slice(groupIndex * 4, groupIndex * 4 + 4).reduce((a, b) => a + b, 0);
      return { group: group.group, score: groupScore };
    });
    return scores;
  };

  const results = submitted ? calculateResults() : null;

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

      {submitted && results && (
        <div>
          <h2>Your Results</h2>
          <ul>
            {results.map((result, index) => (
              <li key={index}>
                {result.group}: {result.score}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ValueDiagnosis;