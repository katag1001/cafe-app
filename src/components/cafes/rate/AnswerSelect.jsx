// Independent yes/no toggles per option (PRD.md §9.1), not a single choice —
// one button per option, with the exclusiveOption (e.g. "None") deselecting
// every other option when chosen.
function AnswerSelect({ question, value = [], onChange }) {
  const toggleOption = (option) => {
    if (question.exclusiveOption && option === question.exclusiveOption) {
      onChange(value.includes(option) ? [] : [option]);
      return;
    }

    let next = value.includes(option) ? value.filter((v) => v !== option) : [...value, option];

    if (question.exclusiveOption) {
      next = next.filter((v) => v !== question.exclusiveOption);
    }

    onChange(next);
  };

  const exclusiveSelected = question.exclusiveOption && value.includes(question.exclusiveOption);

  return (
    <div className="answer-row">
      <p>{question.text}</p>
      <div className="answer-options">
        {question.options.map((option) => (
          <button
            key={option}
            type="button"
            className={value.includes(option) ? "active" : ""}
            disabled={exclusiveSelected && option !== question.exclusiveOption}
            onClick={() => toggleOption(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AnswerSelect;
