// filepath: /Users/shunfurukawa/Desktop/Web-app/energize/app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

interface Question {
  id: number;
  text: string;
  category: string;
}

const questions: Question[] = [
  { id: 1, text: 'How important is family to you?', category: 'Family' },
  { id: 2, text: 'How much do you value friendships?', category: 'Friendship' },
  { id: 3, text: 'How important is career success to you?', category: 'Career' },
  { id: 4, text: 'How much do you value personal growth?', category: 'Personal Growth' },
  { id: 5, text: 'How important is health to you?', category: 'Health' },
  { id: 6, text: 'How much do you value financial stability?', category: 'Finance' },
  { id: 7, text: 'How important is community involvement to you?', category: 'Community' },
  { id: 8, text: 'How much do you value creativity?', category: 'Creativity' },
  { id: 9, text: 'How important is spirituality to you?', category: 'Spirituality' },
  { id: 10, text: 'How much do you value adventure?', category: 'Adventure' },
  { id: 11, text: 'How important is education to you?', category: 'Education' },
  { id: 12, text: 'How much do you value work-life balance?', category: 'Work-Life Balance' },
  { id: 13, text: 'How important is environmental sustainability to you?', category: 'Environment' },
  { id: 14, text: 'How much do you value social justice?', category: 'Social Justice' },
  { id: 15, text: 'How important is technology in your life?', category: 'Technology' },
  { id: 16, text: 'How much do you value leisure time?', category: 'Leisure' },
  { id: 17, text: 'How important is travel to you?', category: 'Travel' },
  { id: 18, text: 'How much do you value family traditions?', category: 'Family' },
  { id: 19, text: 'How important is mental health to you?', category: 'Health' },
  { id: 20, text: 'How much do you value cultural experiences?', category: 'Culture' },
  { id: 21, text: 'How important is self-care to you?', category: 'Personal Growth' },
  { id: 22, text: 'How much do you value philanthropy?', category: 'Community' },
  { id: 23, text: 'How important is personal integrity to you?', category: 'Integrity' },
  { id: 24, text: 'How much do you value family time?', category: 'Family' },
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
      results[question.category] = (results[question.category] || 0) + responses[index];
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
            <label>
              {question.text}
              <select value={responses[index]} onChange={(e) => handleChange(index, Number(e.target.value))}>
                <option value={0}>Not Important</option>
                <option value={1}>Somewhat Important</option>
                <option value={2}>Important</option>
                <option value={3}>Very Important</option>
              </select>
            </label>
          </div>
        ))}
        <button type="submit">Submit</button>
      </form>

      {submitted && results && (
        <div>
          <h2>Your Results</h2>
          <ul>
            {Object.entries(results).map(([category, score]) => (
              <li key={category}>
                {category}: {score}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ValueDiagnosis;