// /app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

interface Question {
  id: number;
  text: string;
  group: string;
}

const questions: Question[] = [
  { id: 1, text: 'How important is family to you?', group: 'Family' },
  { id: 2, text: 'How important is career success to you?', group: 'Career' },
  { id: 3, text: 'How important is health to you?', group: 'Health' },
  { id: 4, text: 'How important is personal growth to you?', group: 'Personal Growth' },
  { id: 5, text: 'How important is community involvement to you?', group: 'Community' },
  { id: 6, text: 'How important is financial stability to you?', group: 'Finance' },
  // Add more questions as needed
];

const ValueDiagnosis: React.FC = () => {
  const [responses, setResponses] = useState<number[]>(Array(questions.length).fill(0));
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
    const results: { [key: string]: number } = {};
    questions.forEach((question, index) => {
      if (!results[question.group]) {
        results[question.group] = 0;
      }
      results[question.group] += responses[index];
    });
    return results;
  };

  const results = submitted ? calculateResults() : null;

  return (
    <div>
      <h1>Value Diagnosis</h1>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {questions.map((question, index) => (
          <div key={question.id}>
            <label>{question.text}</label>
            <select value={responses[index]} onChange={(e) => handleChange(index, Number(e.target.value))}>
              <option value={0}>Not Important</option>
              <option value={1}>Somewhat Important</option>
              <option value={2}>Important</option>
              <option value={3}>Very Important</option>
            </select>
          </div>
        ))}
        <button type="submit">Submit</button>
      </form>

      {submitted && results && (
        <div>
          <h2>Your Results</h2>
          <ul>
            {Object.entries(results).map(([group, score]) => (
              <li key={group}>
                {group}: {score}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ValueDiagnosis;