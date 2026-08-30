function AnswerTime({ question, value = {}, onChange }) {
  return (
    <div className="answer-row">
      <p>{question.text}</p>
      <div className="answer-options">
        <input
          type="time"
          value={value.start || ""}
          onChange={(e) => onChange({ ...value, start: e.target.value })}
        />
        <span>to</span>
        <input
          type="time"
          value={value.end || ""}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
        />
      </div>
    </div>
  );
}

export default AnswerTime;
