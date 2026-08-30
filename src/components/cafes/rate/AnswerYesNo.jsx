function AnswerYesNo({ question, value, onChange }) {
  return (
    <div className="answer-row">
      <p>{question.text}</p>
      <div className="answer-options">
        <button
          type="button"
          className={value === true ? "active" : ""}
          onClick={() => onChange(value === true ? undefined : true)}
        >
          Yes
        </button>
        <button
          type="button"
          className={value === false ? "active" : ""}
          onClick={() => onChange(value === false ? undefined : false)}
        >
          No
        </button>
      </div>
    </div>
  );
}

export default AnswerYesNo;
