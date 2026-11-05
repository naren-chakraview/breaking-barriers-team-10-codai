import StudentDashboard from './StudentDashboard.jsx'
import TeacherView from './weblab/TeacherView.jsx'

export default function Dashboard({ user, onLogout, onContinueLesson, onStartLesson, onViewCourse }) {
  if (user.role === 'student') {
    return (
      <StudentDashboard
        user={user}
        onLogout={onLogout}
        onContinueLesson={onContinueLesson}
        onStartLesson={onStartLesson}
        onViewCourse={onViewCourse}
      />
    )
  }

  // Teacher: the lesson view (roster + student detail) from teacher-view-design.md.
  // Uses my weblab/ implementation (persona-driven). The team's src/teacher/
  // version is also present on main but not wired in here (Option B).
  return <TeacherView user={user} onLogout={onLogout} />
}
