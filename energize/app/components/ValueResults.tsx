// filepath: /Users/shunfurukawa/Desktop/Web-app/energize/app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

interface Question {
  id: number;
  text: string;
  category: string;
}

const questions: Question[] = [
  { id: 1, text: 'How important is family to you?', category: 'Family' },
  { id: 2, text: 'How important is career success to you?', category: 'Career' },
  { id: 3, text: 'How important is health to you?', category: 'Health' },
  { id: 4, text: 'How important is personal growth to you?', category: 'Personal Growth' },
  { id: 5, text: 'How important is community involvement to you?', category: 'Community' },
  { id: 6, text: 'How important is financial stability to you?', category: 'Finance' },
  // Add more questions here...
];

const ValueDiagnosis: React.FC = () => {
  const [responses, setResponses] = useState<{ [key: number]: number }>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (id: number, value: number) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const calculateResults = () => {
    const results: { [key: string]: number } = {};
    questions.forEach((question) => {
      const category = question.category;
      const score = responses[question.id] || 0;
      results[category] = (results[category] || 0) + score;
    });
    return results;
  };

  const results = submitted ? calculateResults() : null;

  return (
    <div>
      <h1>Value Diagnosis</h1>
      <form onSubmit={handleSubmit}>
        {questions.map((question) => (
          <div key={question.id}>
            <label>{question.text}</label>
            <select onChange={(e) => handleChange(question.id, Number(e.target.value))}>
              <option value="0">Not Important</option>
              <option value="1">Somewhat Important</option>
              <option value="2">Important</option>
              <option value="3">Very Important</option>
            </select>
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