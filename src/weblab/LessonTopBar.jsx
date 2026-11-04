// Top bar from the wireframe: logo + project name, live lesson-progress meter,
// Save and Deploy actions, and the user avatar. Dashboard / skill-tree links
// are small text buttons so the student can always get back out.
export default function LessonTopBar({
  user, completedCount, total, onExit, onViewSkillTree,
  saveStatus, onSave, deployState, onDeploy,
}) {
  const pct = total ? Math.round((completedCount / total) * 100) : 0
  const saveText =
    saveStatus === 'dirty' ? 'Unsaved changes' : saveStatus === 'saving' ? 'Saving…' : 'All changes saved'
  const initials = (user?.username || 'You').slice(0, 2)

  return (
    <header className="wf-top">
      <div className="wf-brand">
        <span className="wf-logo" aria-hidden="true" />
        <span className="wf-brand-name">CodeAI</span>
        <span className="wf-project">Project: My First Website</span>
        <button type="button" className="wf-textbtn" onClick={onExit}>← Dashboard</button>
        <button type="button" className="wf-textbtn" onClick={onViewSkillTree}>Skill tree</button>
      </div>

      <div className="wf-progress" role="group" aria-label="Lesson progress">
        <span className="wf-progress-label">LESSON PROGRESS</span>
        <div className="wf-progress-row">
          <div
            className="wf-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completedCount}
            aria-label="Objectives completed"
          >
            <div className="wf-bar-fill wf-bar-fill--blue" style={{ width: `${pct}%` }} />
          </div>
          <span className="wf-progress-count" role="status">
            {total ? `${completedCount} / ${total} objectives` : 'No objectives yet'}
          </span>
        </div>
      </div>

      <div className="wf-actions">
        <span className="wf-savetext" role="status">{saveText}</span>
        <button type="button" className="wf-btn wf-btn--light" onClick={onSave}>Save</button>
        <button
          type="button"
          className="wf-btn wf-btn--green"
          onClick={onDeploy}
          disabled={deployState === 'deploying'}
        >
          {deployState === 'deploying' ? 'Deploying…' : deployState === 'deployed' ? 'Deployed ✓' : 'Deploy'}
        </button>
        <span className="wf-avatar" aria-label={`Signed in as ${user?.username || 'you'}`}>{initials}</span>
      </div>
    </header>
  )
}
