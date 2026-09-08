function AnswerQuality({ question, value, onChange }) {
  return (
    <div className="answer-row">
      <p>{question.text}</p>
      <div className="answer-options">
        {question.options.map((option) => (
          <button
            key={option}
            type="button"
            className={value === option ? "active" : ""}
            onClick={() => onChange(value === option ? undefined : option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AnswerQuality;
