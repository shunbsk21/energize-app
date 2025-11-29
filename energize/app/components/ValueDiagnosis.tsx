// filepath: /Users/shunfurukawa/Desktop/Web-app/energize/app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

const questions = [
  {
    category: 'Personal Growth',
    items: [
      'I prioritize learning new skills.',
      'I seek out new experiences.',
      'I reflect on my personal development regularly.',
      'I set personal goals for myself.'
    ]
  },
  {
    category: 'Relationships',
    items: [
      'I value spending time with family.',
      'I prioritize friendships in my life.',
      'I believe in maintaining healthy relationships.',
      'I communicate openly with loved ones.'
    ]
  },
  {
    category: 'Health',
    items: [
      'I prioritize my physical health.',
      'I make time for exercise.',
      'I eat a balanced diet.',
      'I manage my stress effectively.'
    ]
  },
  {
    category: 'Career',
    items: [
      'I am passionate about my work.',
      'I seek opportunities for advancement.',
      'I value work-life balance.',
      'I network with professionals in my field.'
    ]
  },
  {
    category: 'Community',
    items: [
      'I volunteer my time for causes I care about.',
      'I participate in community events.',
      'I support local businesses.',
      'I believe in giving back to my community.'
    ]
  },
  {
    category: 'Finance',
    items: [
      'I budget my expenses carefully.',
      'I save for the future.',
      'I invest in my financial education.',
      'I prioritize financial stability.'
    ]
  }
];

const ValueDiagnosis: React.FC = () => {
  const [responses, setResponses] = useState<number[][]>(Array(6).fill(Array(4).fill(0)));
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (categoryIndex: number, questionIndex: number, value: number) => {
    const newResponses = [...responses];
    newResponses[categoryIndex][questionIndex] = value;
    setResponses(newResponses);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const calculateResults = () => {
    return responses.map((group) => group.reduce((a, b) => a + b, 0));
  };

  const results = submitted ? calculateResults() : null;

  return (
    <div>
      <h1>Value Diagnosis</h1>
      <form onSubmit={handleSubmit}>
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