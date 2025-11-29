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
      { id: 2, text: 'Do you prioritize learning new skills?' },
      { id: 3, text: 'Is personal development a key focus in your life?' },
      { id: 4, text: 'How often do you seek feedback for growth?' },
    ],
  },
  {
    name: 'Relationships',
    questions: [
      { id: 5, text: 'How important are your friendships?' },
      { id: 6, text: 'Do you value family time?' },
      { id: 7, text: 'Is maintaining relationships a priority for you?' },
      { id: 8, text: 'How often do you connect with loved ones?' },
    ],
  },
  {
    name: 'Health',
    questions: [
      { id: 9, text: 'How important is physical health to you?' },
      { id: 10, text: 'Do you prioritize mental well-being?' },
      { id: 11, text: 'Is exercise a regular part of your routine?' },
      { id: 12, text: 'How often do you focus on nutrition?' },
    ],
  },
  {
    name: 'Career',
    questions: [
      { id: 13, text: 'How important is career advancement to you?' },
      { id: 14, text: 'Do you seek job satisfaction?' },
      { id: 15, text: 'Is work-life balance a priority?' },
      { id: 16, text: 'How often do you pursue professional development?' },
    ],
  },
  {
    name: 'Finance',
    questions: [
      { id: 17, text: 'How important is financial security to you?' },
      { id: 18, text: 'Do you prioritize saving money?' },
      { id: 19, text: 'Is investing a key focus in your life?' },
      { id: 20, text: 'How often do you budget your expenses?' },
    ],
  },
  {
    name: 'Community',
    questions: [
      { id: 21, text: 'How important is community involvement to you?' },
      { id: 22, text: 'Do you volunteer regularly?' },
      { id: 23, text: 'Is supporting local businesses a priority?' },
      { id: 24, text: 'How often do you participate in community events?' },
    ],
  },
];

const ValueDiagnosis: React.FC = () => {
  const [responses, setResponses] = useState<number[]>(Array(24).fill(0));
  const [submitted, setSubmitted] = useState(false);

  const handleResponseChange = (index: number, value: number) => {
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
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={responses[question.id - 1]}
                      onChange={(e) => handleResponseChange(question.id - 1, Number(e.target.value))}
                    />
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