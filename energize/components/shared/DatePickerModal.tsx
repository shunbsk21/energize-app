// filepath: /Users/shunfurukawa/Desktop/Web-app/energize/app/components/ValueDiagnosis.tsx

import React, { useState } from 'react';

interface Question {
  id: number;
  text: string;
}

interface Category {
  name: string;
  questions: Question[];
}

const categories: Category[] = [
  {
    name: 'Personal Growth',
    questions: [
      { id: 1, text: 'How important is self-improvement to you?' },
      { id: 2, text: 'Do you value lifelong learning?' },
      { id: 3, text: 'How much do you prioritize your mental health?' },
      { id: 4, text: 'Is setting personal goals important for you?' },
    ],
  },
  {
    name: 'Relationships',
    questions: [
      { id: 5, text: 'How important are friendships in your life?' },
      { id: 6, text: 'Do you value family connections?' },
      { id: 7, text: 'How much do you prioritize romantic relationships?' },
      { id: 8, text: 'Is community involvement important to you?' },
    ],
  },
  {
    name: 'Career',
    questions: [
      { id: 9, text: 'How important is job satisfaction to you?' },
      { id: 10, text: 'Do you value work-life balance?' },
      { id: 11, text: 'How much do you prioritize career advancement?' },
      { id: 12, text: 'Is financial stability important for you?' },
    ],
  },
  {
    name: 'Health',
    questions: [
      { id: 13, text: 'How important is physical fitness to you?' },
      { id: 14, text: 'Do you value a healthy diet?' },
      { id: 15, text: 'How much do you prioritize mental well-being?' },
      { id: 16, text: 'Is regular medical check-up important for you?' },
    ],
  },
  {
    name: 'Leisure',
    questions: [
      { id: 17, text: 'How important is leisure time to you?' },
      { id: 18, text: 'Do you value hobbies and interests?' },
      { id: 19, text: 'How much do you prioritize travel and exploration?' },
      { id: 20, text: 'Is spending time in nature important for you?' },
    ],
  },
  {
    name: 'Spirituality',
    questions: [
      { id: 21, text: 'How important is spirituality or religion to you?' },
      { id: 22, text: 'Do you value mindfulness and meditation?' },
      { id: 23, text: 'How much do you prioritize personal reflection?' },
      { id: 24, text: 'Is connecting with a higher purpose important for you?' },
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
    const scores = categories.map((category, index) => {
      const categoryScore = responses.slice(index * 4, index * 4 + 4).reduce((a, b) => a + b, 0);
      return { name: category.name, score: categoryScore };
    });
    return scores;
  };

  return (
    <div>
      <h1>Value Diagnosis</h1>
      {!submitted ? (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {categories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h2>{category.name}</h2>
              {category.questions.map((question, questionIndex) => (
                <div key={question.id}>
                  <label>
                    {question.text}
                    <select
                      value={responses[question.id - 1]}
                      onChange={(e) => handleChange(question.id - 1, Number(e.target.value))}
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
      ) : (
        <div>
          <h2>Results</h2>
          {calculateResults().map((result) => (
            <div key={result.name}>
              <strong>{result.name}:</strong> {result.score}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValueDiagnosis;