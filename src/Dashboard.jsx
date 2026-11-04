import StudentDashboard from './StudentDashboard.jsx'
import TeacherView from './teacher/TeacherView.jsx'

export default function Dashboard({ user, onLogout, onContinueLesson, onViewCourse }) {
  if (user.role === 'student') {
    return (
      <StudentDashboard
        user={user}
        onLogout={onLogout}
        onContinueLesson={onContinueLesson}
        onViewCourse={onViewCourse}
      />
    )
  }

  // Teacher: class roster + per-student detail (see teacher-view-design.md).
  return <TeacherView user={user} onLogout={onLogout} />
}
