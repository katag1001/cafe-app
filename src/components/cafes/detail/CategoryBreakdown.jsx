// Read-only display of the aggregated tallies from Cafe.ratingSummary,
// mirroring the answer types from the rating form (PRD.md §9.1) but
// never editable here.

function statusLabel(yesPercent) {
  if (yesPercent < 40) return "No";
  if (yesPercent < 65) return "Maybe";
  return "Yes";
}

function YesNoDisplay({ question, tally }) {
  const total = tally.yes + tally.no;
  const yesPercent = total ? Math.round((tally.yes / total) * 100) : 0;

  return (
    <div className="breakdown-row">
      <p>{question.text}</p>
      <p className="status-label">{statusLabel(yesPercent)}</p>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${yesPercent}%` }} />
      </div>
      <p className="progress-caption">
        {yesPercent}% yes ({total} response{total === 1 ? "" : "s"})
      </p>
    </div>
  );
}

function SelectDisplay({ question, tally }) {
  return (
    <div className="breakdown-row">
      <p>{question.text}</p>
      {question.options.map((option) => {
        const optionTally = tally[option] || { yes: 0, no: 0 };
        const total = optionTally.yes + optionTally.no;
        const percent = total ? Math.round((optionTally.yes / total) * 100) : 0;

        return (
          <div className="select-option-row" key={option}>
            <span>{option}</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <span>{percent}%</span>
          </div>
        );
      })}
    </div>
  );
}

// Deliberately simple sizing/opacity scaling for the "largest share shown
// bigger, color-graded" spec (PRD.md §9.1) — a real visual pass comes later
// (design is explicitly deferred project-wide for now).
function ScaleDisplay({ question, tally }) {
  const total = question.options.reduce((sum, option) => sum + (tally[option] || 0), 0);

  return (
    <div className="breakdown-row">
      <p>{question.text}</p>
      <div className="scale-buckets">
        {question.options.map((option) => {
          const count = tally[option] || 0;
          const percent = total ? Math.round((count / total) * 100) : 0;

          return (
            <span
              key={option}
              className="scale-bucket"
              style={{ fontSize: `${14 + percent * 0.2}px`, opacity: 0.4 + percent / 150 }}
            >
              {option} ({percent}%)
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TimeDisplay({ question, tally }) {
  return (
    <div className="breakdown-row">
      <p>{question.text}</p>
      <p>
        {tally.medianStart && tally.medianEnd
          ? `Typically ${tally.medianStart}–${tally.medianEnd}`
          : "No data yet"}
      </p>
    </div>
  );
}

const DISPLAY_COMPONENTS = {
  yesno: YesNoDisplay,
  select: SelectDisplay,
  scale: ScaleDisplay,
  quality: ScaleDisplay,
  time: TimeDisplay,
};

function CategoryBreakdown({ categoryDef, categorySummary }) {
  if (!categoryDef) return null;

  const answersByQuestion = new Map((categorySummary?.answers || []).map((a) => [a.questionId, a.tally]));

  return (
    <div className="category-breakdown">
      <p>
        Score: {categorySummary ? categorySummary.average.toFixed(1) : "—"} / 5{" "}
        ({categorySummary?.count || 0} ratings)
      </p>

      {categoryDef.questions.map((question) => {
        const tally = answersByQuestion.get(question.id);
        if (!tally) return null;

        const DisplayComponent = DISPLAY_COMPONENTS[question.type];
        if (!DisplayComponent) return null;

        return <DisplayComponent key={question.id} question={question} tally={tally} />;
      })}
    </div>
  );
}

export default CategoryBreakdown;
