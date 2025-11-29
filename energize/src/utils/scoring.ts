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
      { id: 3, text: 'How often do you set personal goals?' },
      { id: 4, text: 'Is reading a priority in your life?' },
    ],
  },
  {
    name: 'Relationships',
    questions: [
      { id: 5, text: 'How important are friendships to you?' },
      { id: 6, text: 'Do you value family time?' },
      { id: 7, text: 'How often do you connect with loved ones?' },
      { id: 8, text: 'Is maintaining relationships important to you?' },
    ],
  },
  {
    name: 'Health',
    questions: [
      { id: 9, text: 'How important is physical health to you?' },
      { id: 10, text: 'Do you prioritize mental well-being?' },
      { id: 11, text: 'How often do you exercise?' },
      { id: 12, text: 'Is nutrition a priority in your life?' },
    ],
  },
  {
    name: 'Career',
    questions: [
      { id: 13, text: 'How important is job satisfaction to you?' },
      { id: 14, text: 'Do you seek career advancement?' },
      { id: 15, text: 'How often do you network professionally?' },
      { id: 16, text: 'Is work-life balance important to you?' },
    ],
  },
  {
    name: 'Finance',
    questions: [
      { id: 17, text: 'How important is financial security to you?' },
      { id: 18, text: 'Do you budget your expenses?' },
      { id: 19, text: 'How often do you save money?' },
      { id: 20, text: 'Is investing a priority for you?' },
    ],
  },
  {
    name: 'Leisure',
    questions: [
      { id: 21, text: 'How important is leisure time to you?' },
      { id: 22, text: 'Do you prioritize hobbies?' },
      { id: 23, text: 'How often do you travel?' },
      { id: 24, text: 'Is relaxation a priority in your life?' },
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
                      value={responses[questionIndex + categoryIndex * 4]}
                      onChange={(e) => handleResponseChange(questionIndex + categoryIndex * 4, Number(e.target.value))}
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
              <p>{result.name}: {result.score}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ValueDiagnosis;