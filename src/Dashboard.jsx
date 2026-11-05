import { useState } from 'react'
import StudentDashboard from './StudentDashboard.jsx'
import TeacherClasses from './TeacherClasses.jsx'
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

  // Teacher: classes landing page -> classroom dashboard.
  if (teacherView === 'course') {
    return (
      <TeacherView
        user={user}
        onLogout={onLogout}
        onBack={() => setTeacherView('classes')}
      />
    )
  }

  return (
    <TeacherClasses
      user={user}
      onLogout={onLogout}
      onViewCourse={() => setTeacherView('course')}
    />
  )
}
