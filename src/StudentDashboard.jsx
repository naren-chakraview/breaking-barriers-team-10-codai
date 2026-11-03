const COURSES = [
  {
    id: 'hour-of-ai-2026',
    title: 'Hour of AI 2026 - Adaptive Weblab',
    currentUnit: 'Unit 1 - Hour of AI 2026 - Adaptive Weblab',
    progress: 15,
  },
]

export default function StudentDashboard({ user, onLogout }) {
  return (
    <div className="dash">
      <header className="dash-header">
        <div className="dash-brand">
          <span className="badge badge--student">student</span>
          <span className="dash-user">{user.username}</span>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onLogout}>
          Sign out
        </button>
      </header>

      <main className="dash-main">
        <h1 className="section-title">My Courses</h1>

        {COURSES.map((course) => (
          <section key={course.id} className="course">
            <div className="course-banner">
              <h2 className="course-title">{course.title}</h2>
            </div>

            <div className="course-body">
              <div className="course-info">
                <p>
                  You are currently working on {course.currentUnit}.
                </p>
                <p className="course-hint">
                  Continue lesson to jump to where you left off or view the whole
                  course to see an overview of your progress.
                </p>

                <div className="progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <span className="progress-label">{course.progress}% complete</span>
                </div>
              </div>

              <div className="course-actions">
                <button type="button" className="btn btn--outline">
                  View course
                </button>
                <button type="button" className="btn btn--primary">
                  Continue lesson
                </button>
              </div>
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
